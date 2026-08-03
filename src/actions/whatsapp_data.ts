"use server"

import { randomUUID } from "crypto";
import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import { logOutboundCobranca } from "./whatsapp_messages_data";
import { renderTemplateCobranca } from "@/utils/whatsappTemplates";
import { buildWaId } from "@/utils/formatters";
import { sendTemplateMessage } from "@/lib/whatsapp/client";

type SupabaseServerClient = Awaited<ReturnType<typeof createClientServer>>;

interface AgendamentoParaEnvio {
  id: string;
  telephone: string | null;
  full_name: string;
  valor: number;
  mirror_message_id: string | null;
}

// Quantos envios simultâneos por lote - a escola tem ~80 alunos ativos e a
// proprietária pode disparar cobrança pra todos de uma vez, então o envio não pode
// ser sequencial (80 requisições em série arriscam estourar o limite de execução da
// Server Action no plano Hobby da Vercel). Lotes de 10 em paralelo processam os 80
// em poucos segundos, bem longe de qualquer rate limit real da Graph API.
const WHATSAPP_SEND_CONCURRENCY = Number(process.env.WHATSAPP_SEND_CONCURRENCY) || 10;

async function processarEnvioCobranca(row: AgendamentoParaEnvio, supabase: SupabaseServerClient) {
  try {
    const to = buildWaId(row.telephone);
    const primeiroNome = row.full_name.split(" ")[0];

    const sendResult = to
      ? await sendTemplateMessage({
          to,
          templateName: "cobranca_mensalidade_aluno",
          languageCode: "pt_BR",
          bodyParams: [primeiroNome, Number(row.valor).toFixed(2)],
        })
      : { ok: false as const, error: "Telefone inválido." };

    const status = sendResult.ok ? "sent" : "failed";
    const sentAt = new Date().toISOString();

    await supabase
      .from("whatsapp_cobrancas_agendadas")
      .update({
        status,
        sent_at: sentAt,
        ...(sendResult.ok ? { whatsapp_message_id: sendResult.whatsappMessageId } : {}),
      })
      .eq("id", row.id);

    // Reflete o mesmo resultado na linha espelho de whatsapp_messages (tela
    // Mensagens), senão ela fica presa em "pending" pra sempre mesmo com a
    // cobrança já enviada/falhada de verdade.
    if (row.mirror_message_id) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status,
          ...(sendResult.ok ? { whatsapp_message_id: sendResult.whatsappMessageId } : {}),
        })
        .eq("id", row.mirror_message_id);
    }
  } catch (err) {
    console.error(`Falha ao processar envio de cobrança (id ${row.id}):`, err);
    try {
      await supabase
        .from("whatsapp_cobrancas_agendadas")
        .update({ status: "failed", sent_at: new Date().toISOString() })
        .eq("id", row.id);
    } catch {
      // Melhor esforço - se nem essa atualização for possível, a linha fica
      // "pending" e vai aparecer pro admin reenviar manualmente depois.
    }
  }
}

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

// Registra a cobrança (aluno + mensagem já com placeholders substituídos) e envia
// via WhatsApp Cloud API na hora, em lotes concorrentes (ver
// WHATSAPP_SEND_CONCURRENCY acima) - sem fila/cron externo, porque o volume atual
// (dezenas de alunos por disparo) termina em poucos segundos. O lote_id segue
// existindo só como identificador do disparo (útil pra rastrear/depurar), não é
// mais usado por nenhum processo externo pra buscar linhas pendentes.
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

    // Cria a linha espelho em whatsapp_messages ANTES do insert em
    // whatsapp_cobrancas_agendadas, pra guardar o id dela como mirror_message_id -
    // é esse vínculo que permite atualizar o espelho de "pending" pra "sent"/"failed"
    // depois do envio de verdade, mais abaixo.
    const itemsComMirror = await Promise.all(
      itemsComMensagem.map(async (item) => {
        const mirror = await logOutboundCobranca({
          student_id: item.student_id,
          telephone: item.telephone,
          display_name: item.full_name,
          content: item.mensagem,
        });
        return { ...item, mirror_message_id: mirror.messageId ?? null };
      })
    );

    const { data: agendamentos, error } = await supabase
      .from("whatsapp_cobrancas_agendadas")
      .insert(
        itemsComMirror.map((item) => ({
          student_id: item.student_id,
          full_name: item.full_name,
          telephone: item.telephone,
          mensagem: item.mensagem,
          valor: item.valor,
          scheduled_date: hoje,
          status: "pending",
          lote_id: loteId,
          mirror_message_id: item.mirror_message_id,
        }))
      )
      .select("id, telephone, full_name, valor, mirror_message_id");

    if (error) throw error;
    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/mensagens");

    // Envia de verdade via Graph API, em lotes concorrentes (ver
    // processarEnvioCobranca/WHATSAPP_SEND_CONCURRENCY acima). Cada lote espera
    // terminar antes do próximo começar; uma falha isolada não derruba os outros.
    const fila = (agendamentos ?? []) as AgendamentoParaEnvio[];
    for (let i = 0; i < fila.length; i += WHATSAPP_SEND_CONCURRENCY) {
      const lote = fila.slice(i, i + WHATSAPP_SEND_CONCURRENCY);
      await Promise.all(lote.map((row) => processarEnvioCobranca(row, supabase)));
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
