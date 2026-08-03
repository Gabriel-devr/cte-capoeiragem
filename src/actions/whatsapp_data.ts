"use server"

import { randomUUID } from "crypto";
import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import { logOutboundCobranca } from "./whatsapp_messages_data";
import { renderTemplateCobranca } from "@/utils/whatsappTemplates";

export interface CobrancaItem {
  student_id: string;
  full_name: string;
  nickname: string | null;
  telephone: string | null;
  plano_nome: string;
  valor_original: number;
  valor_desconto: number | null;
  valor_familia: number | null;
}

export interface HistoricoMensagem {
  id: string;
  mensagem: string;
  scheduled_date: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  sent_at: string | null;
}

// Alunos com matrícula ativa, prontos para receber cobrança via WhatsApp.
export async function listCobrancas() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        student_id,
        student (student_id, full_name, nickname, telephone),
        plano (nome_plano, preco_original, preco_desconto, preco_familia)
      `)
      .eq("status", "active");

    if (error) throw error;

    const cobrancas: CobrancaItem[] = (data || [])
      .filter((row: any) => row.student && row.plano)
      .map((row: any) => ({
        student_id: row.student.student_id,
        full_name: row.student.full_name,
        nickname: row.student.nickname,
        telephone: row.student.telephone,
        plano_nome: row.plano.nome_plano,
        valor_original: Number(row.plano.preco_original),
        valor_desconto: row.plano.preco_desconto != null ? Number(row.plano.preco_desconto) : null,
        valor_familia: row.plano.preco_familia != null ? Number(row.plano.preco_familia) : null,
      }))
      .sort((a: CobrancaItem, b: CobrancaItem) => a.full_name.localeCompare(b.full_name));

    return { result: "sucesso", cobrancas };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

// Registra a cobrança (aluno + mensagem já com placeholders substituídos) e
// dispara o webhook do n8n. O corpo do POST não carrega os itens, só o
// lote_id gerado pra esse clique - do lado do n8n, o workflow busca as
// linhas pendentes direto no Supabase (Get Many Rows na view
// vw_cobrancas_agendadas_pendentes) e processa uma a uma COM DELAY entre
// cada envio (evita mandar tudo de uma vez e levar ban do WhatsApp).
// O lote_id existe pra o Get Many Rows filtrar só as linhas DESSE disparo,
// e não qualquer pendência antiga que ainda esteja com status "pending".
// IMPORTANTE: depois de mandar cada mensagem, o n8n precisa atualizar aquela
// linha pra status "sent" (Update Row). Sem esse passo, a mesma linha nunca
// sai de "pending" e volta a ser reenviada em toda execução futura.
// A URL do webhook fica em variável de ambiente (não é editável pelo admin
// pela UI) porque é uma configuração de infraestrutura de quem sobe o projeto,
// não algo que o cliente final deva mexer.
export async function enviarCobrancas(
  items: { student_id: string; full_name: string; telephone: string; valor: number }[]
) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    if (items.length === 0) return { result: "erro", details: "Nenhum aluno selecionado." };

    const hoje = new Date().toISOString().split("T")[0];

    // Evita duplicar disparo pro mesmo aluno no mesmo dia (ex: admin clica
    // "Enviar Cobranças" mais de uma vez antes do n8n processar a anterior).
    const { data: jaPendentes, error: checkError } = await supabase
      .from("whatsapp_cobrancas_agendadas")
      .select("student_id")
      .eq("scheduled_date", hoje)
      .eq("status", "pending")
      .in("student_id", items.map((item) => item.student_id));

    if (checkError) throw checkError;

    const idsJaPendentes = new Set((jaPendentes || []).map((r: any) => r.student_id));
    const itemsParaEnviar = items.filter((item) => !idsJaPendentes.has(item.student_id));

    if (itemsParaEnviar.length === 0) {
      return { result: "erro", details: "Todos os alunos selecionados já têm uma cobrança de hoje aguardando envio." };
    }

    const loteId = randomUUID();

    // Mensagem renderizada a partir do template aprovado na Meta (único
    // texto que reflete o que o cliente de fato recebe hoje - não existe
    // mais template livre editável pelo admin). Calculada uma vez por item e
    // reaproveitada tanto no histórico de cobranças quanto no espelho
    // unificado da tela Mensagens, pra não correr risco dos dois textos
    // divergirem.
    const itemsComMensagem = itemsParaEnviar.map((item) => ({
      ...item,
      mensagem: renderTemplateCobranca(item.full_name.split(" ")[0], item.valor),
    }));

    const { error } = await supabase
      .from("whatsapp_cobrancas_agendadas")
      .insert(
        itemsComMensagem.map((item) => ({
          student_id: item.student_id,
          full_name: item.full_name,
          telephone: item.telephone,
          mensagem: item.mensagem,
          valor: item.valor,
          scheduled_date: hoje,
          status: "pending",
          lote_id: loteId,
        }))
      );

    if (error) throw error;
    revalidatePath("/dashboard/account");

    // Espelha cada cobrança no histórico unificado de conversas (tela
    // Mensagens), pra o gestor ver o que foi mandado pra cada aluno junto
    // com as respostas dele. Best-effort - não pode travar a régua de
    // cobrança em si.
    await Promise.all(
      itemsComMensagem.map((item) =>
        logOutboundCobranca({
          student_id: item.student_id,
          telephone: item.telephone,
          display_name: item.full_name,
          content: item.mensagem,
        })
      )
    );

    const webhookUrl = process.env.WHATSAPP_N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("WHATSAPP_N8N_WEBHOOK_URL não configurada no .env");
      return { result: "erro", details: "As cobranças foram registradas, mas o envio automático não está configurado. Contate o suporte técnico." };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lote_id: loteId }),
      });
      if (!response.ok) {
        return { result: "erro", details: `As cobranças foram registradas, mas o webhook do N8N retornou status ${response.status}.` };
      }
    } catch (webhookErr: any) {
      return { result: "erro", details: `As cobranças foram registradas, mas não foi possível acionar o envio automático: ${webhookErr.message}` };
    }

    const ignorados = items.length - itemsParaEnviar.length;
    return {
      result: "sucesso",
      enviados: itemsParaEnviar.length,
      ignorados,
    };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

// Histórico de mensagens agendadas/enviadas para um aluno específico.
export async function listHistoricoAluno(student_id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("whatsapp_cobrancas_agendadas")
      .select("id, mensagem, scheduled_date, status, sent_at")
      .eq("student_id", student_id)
      .order("scheduled_date", { ascending: false });

    if (error) throw error;
    return { result: "sucesso", historico: data as HistoricoMensagem[] };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}
