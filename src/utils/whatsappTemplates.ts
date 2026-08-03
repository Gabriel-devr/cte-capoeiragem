// Redação exata do template de cobrança aprovado na Meta Business Manager
// (HSM, pt_BR, 2 variáveis: {{1}} = primeiro nome do aluno, {{2}} = valor).
// Fica num arquivo compartilhado (sem "use server") porque tanto a server
// action que envia a cobrança quanto a tela que exibe o preview pro admin
// precisam do mesmo texto - se o template for reaprovado/editado na Meta,
// atualizar só aqui.
export const META_TEMPLATE_COBRANCA = `Olá, {{1}}! Tudo bem?

Passando para lembrar que a mensalidade do seu plano na Escola CTE Capoeiragem está próxima do vencimento.

💰 Valor: R$ {{2}}
💰 Chave Pix: 33.644.045/0001-58 - (CNPJ Flavia Nunes Veiga)

Após realizar o pagamento, por favor, envie o comprovante por aqui para darmos baixa no sistema.

Se tiver qualquer dúvida ou se o pagamento já foi realizado, pode desconsiderar esta mensagem. Estamos à disposição! Axé! 👊🏿 🙏🏿`;

export function renderTemplateCobranca(primeiroNome: string, valor: number) {
  return META_TEMPLATE_COBRANCA.replace("{{1}}", primeiroNome).replace("{{2}}", valor.toFixed(2));
}
