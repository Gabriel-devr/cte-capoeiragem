import { createHmac, timingSafeEqual } from "crypto";

// Valida o header X-Hub-Signature-256 que a Meta manda em toda chamada ao webhook -
// sem isso, /api/whatsapp/webhook seria um endpoint público que qualquer um poderia
// usar pra injetar linhas em whatsapp_messages/whatsapp_conversations. Precisa rodar
// sobre o corpo cru (string), antes de qualquer JSON.parse.
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);

  // timingSafeEqual lança se os buffers tiverem tamanhos diferentes - checar antes
  // em vez de deixar estourar, já que um comprimento diferente também deve só significar
  // "assinatura inválida", não um erro 500.
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
