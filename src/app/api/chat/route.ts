import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import { listStudent } from "@/actions/student_data";
import { listMatriculas } from "@/actions/matricula_data";
import { listTransactions } from "@/actions/financial_data";
import { listPlanos } from "@/actions/plano_data";
import { listProdutos } from "@/actions/produto_data";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Você é o assistente virtual da CTE Capoeiragem, uma escola de capoeira.
Você está sendo usado no painel do Administrador, então tem ferramentas para consultar
dados reais de TODA a escola: alunos, matrículas, planos, produtos e o financeiro completo.

Regras:
- Para QUALQUER pergunta sobre alunos, matrículas, planos, produtos ou financeiro,
  você DEVE chamar a ferramenta correspondente antes de responder — mesmo que ache
  que já sabe a resposta. Nunca responda esse tipo de pergunta de memória.
- Se uma ferramenta retornar erro, NÃO chame ela de novo — explique o erro ao
  usuário em uma única resposta curta e pare.
- Nunca invente dados que não vieram de uma ferramenta.
- Seja conciso e direto nas respostas.
- Responda SEMPRE em português do Brasil, nunca em inglês, mesmo em mensagens de erro.`;

// Ferramentas "sem parâmetro" com z.object({}) podem fazer alguns modelos via
// Groq mandarem input: null em vez de {}, quebrando a chamada. Um campo
// opcional fictício evita isso.
const NO_PARAMS = z.object({
  motivo: z.string().optional().describe("Motivo opcional da consulta."),
});

const tools = {
  listar_alunos: tool({
    description:
      "Lista os alunos cadastrados na escola, com nome, apelido, telefone e status de matrícula. " +
      "Chame sempre que a pergunta envolver quantidade de alunos, dados de um aluno específico, ou status de matrícula.",
    inputSchema: NO_PARAMS,
    execute: async () => {
      const res = await listStudent();
      if (res.result !== "sucesso") return { erro: res.details };
      return {
        alunos: (res.students ?? []).map((s: any) => ({
          nome: s.full_name,
          apelido: s.nickname,
          telefone: s.telephone,
          email: s.email,
          status_matricula:
            s.enrollments?.find((e: any) => e.status === "active")?.status ??
            s.enrollments?.[0]?.status ??
            "sem matrícula",
        })),
      };
    },
  }),

  listar_matriculas: tool({
    description:
      "Lista as matrículas: aluno, plano contratado, valor, produtos vinculados, data de início e status. " +
      "Chame sempre que a pergunta envolver matrículas ativas/canceladas ou qual plano um aluno tem.",
    inputSchema: NO_PARAMS,
    execute: async () => {
      const res = await listMatriculas();
      if (res.result !== "sucesso") return { erro: res.details };
      return {
        matriculas: (res.matriculas ?? []).map((m: any) => ({
          aluno: m.student?.full_name,
          plano: m.plano?.nome_plano,
          valor: m.plano?.preco_desconto ?? m.plano?.preco_original,
          produtos: m.enrollment_products?.map((ep: any) => ep.produtos?.nome_produto),
          inicio: m.start_date,
          status: m.status,
        })),
      };
    },
  }),

  listar_financeiro: tool({
    description:
      "Lista as cobranças/mensalidades da escola inteira: aluno, descrição, valor, vencimento, pagamento e status. " +
      "Chame sempre que a pergunta envolver mensalidades, cobranças, pagamentos pendentes ou valores devidos.",
    inputSchema: NO_PARAMS,
    execute: async () => {
      const res = await listTransactions();
      if (res.result !== "sucesso") return { erro: res.details };
      return {
        cobrancas: (res.data ?? []).map((t: any) => ({
          aluno: t.student?.full_name,
          descricao: t.title,
          valor: t.amount,
          vencimento: t.due_date,
          pagamento: t.payment_date,
          status: t.status,
        })),
      };
    },
  }),

  listar_planos: tool({
    description:
      "Lista os planos de matrícula disponíveis, com preço e frequência. " +
      "Chame sempre que a pergunta envolver quais planos existem, preços ou frequência semanal.",
    inputSchema: NO_PARAMS,
    execute: async () => {
      const res = await listPlanos();
      if (res.result !== "sucesso") return { erro: res.details };
      return {
        planos: (res.planos ?? []).map((p: any) => ({
          nome: p.nome_plano,
          tipo: p.tipo_plano,
          frequencia_semanal: p.frequencia,
          preco: p.preco_desconto ?? p.preco_original,
          periodo: p.periodos?.nome_periodo,
        })),
      };
    },
  }),

  listar_produtos: tool({
    description:
      "Lista os produtos vendidos pela escola (uniformes, cordas, etc). " +
      "Chame sempre que a pergunta envolver quais produtos existem ou preços de produtos.",
    inputSchema: NO_PARAMS,
    execute: async () => {
      const res = await listProdutos();
      if (res.result !== "sucesso") return { erro: res.details };
      return {
        produtos: (res.produtos ?? []).map((p: any) => ({
          nome: p.nome_produto,
          tipo: p.tipo_produto,
          descricao: p.descricao_produto,
        })),
      };
    },
  }),
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    // Sem isso, o SDK para assim que o modelo chama uma tool e nunca volta
    // pra gerar a resposta final em texto (fica "sem resposta" no chat).
    stopWhen: stepCountIs(5),
    // Modelos via Groq às vezes mandam um input vazio/malformado
    // pra essas tools sem parâmetro obrigatório. Como toda tool aqui aceita {} como
    // entrada válida, corrige pra {} em vez de deixar a chamada falhar.
    experimental_repairToolCall: async ({ toolCall }) => ({
      ...toolCall,
      input: "{}",
    }),
  });

  return result.toUIMessageStreamResponse();
}
