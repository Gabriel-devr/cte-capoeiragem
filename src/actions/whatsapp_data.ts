"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";

export interface WhatsappSettings {
  message_template: string;
}

export interface CobrancaItem {
  student_id: string;
  full_name: string;
  nickname: string | null;
  telephone: string | null;
  plano_nome: string;
  valor: number;
}

export interface HistoricoMensagem {
  id: string;
  mensagem: string;
  scheduled_date: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  sent_at: string | null;
}

export async function getWhatsappSettings() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("whatsapp_settings")
      .select("message_template")
      .eq("id", 1)
      .single();

    if (error) throw error;
    return { result: "sucesso", settings: data as WhatsappSettings };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function updateWhatsappSettings(data: WhatsappSettings) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase
      .from("whatsapp_settings")
      .update({
        message_template: data.message_template,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) throw error;
    revalidatePath("/dashboard/account");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
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
        plano (nome_plano, preco_original, preco_desconto)
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
        valor: Number(row.plano.preco_desconto ?? row.plano.preco_original),
      }))
      .sort((a: CobrancaItem, b: CobrancaItem) => a.full_name.localeCompare(b.full_name));

    return { result: "sucesso", cobrancas };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

// Registra a cobrança (aluno + mensagem já com placeholders substituídos) e
// dispara o webhook do n8n UMA ÚNICA VEZ nesse clique, mandando no corpo do
// POST exatamente a lista de alunos selecionados (com o id do registro recém
// criado). O n8n processa essa lista diretamente - não faz uma busca separada
// por "pendentes" no banco, então nunca reenvia sobras de outro clique nem
// deixa de processar alguém que foi selecionado agora.
// A URL do webhook fica em variável de ambiente (não é editável pelo admin
// pela UI) porque é uma configuração de infraestrutura de quem sobe o projeto,
// não algo que o cliente final deva mexer.
export async function enviarCobrancas(
  items: { student_id: string; full_name: string; telephone: string; mensagem: string }[]
) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    if (items.length === 0) return { result: "erro", details: "Nenhum aluno selecionado." };

    const hoje = new Date().toISOString().split("T")[0];

    const { data: inseridos, error } = await supabase
      .from("whatsapp_cobrancas_agendadas")
      .insert(
        items.map((item) => ({
          student_id: item.student_id,
          full_name: item.full_name,
          telephone: item.telephone,
          mensagem: item.mensagem,
          scheduled_date: hoje,
          status: "pending",
        }))
      )
      .select("id, full_name, telephone, mensagem");

    if (error) throw error;
    revalidatePath("/dashboard/account");

    const webhookUrl = process.env.WHATSAPP_N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("WHATSAPP_N8N_WEBHOOK_URL não configurada no .env");
      return { result: "erro", details: "As cobranças foram registradas, mas o envio automático não está configurado. Contate o suporte técnico." };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inseridos),
      });
      if (!response.ok) {
        return { result: "erro", details: `As cobranças foram registradas, mas o webhook do N8N retornou status ${response.status}.` };
      }
    } catch (webhookErr: any) {
      return { result: "erro", details: `As cobranças foram registradas, mas não foi possível acionar o envio automático: ${webhookErr.message}` };
    }

    return { result: "sucesso", enviados: items.length };
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
