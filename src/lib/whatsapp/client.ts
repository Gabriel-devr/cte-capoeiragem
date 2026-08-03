// Cliente fino pra WhatsApp Cloud API (Graph API da Meta) - substitui as credenciais
// "whatsAppApi"/"whatsAppTriggerApi" que antes viviam só dentro do n8n. Server-only:
// depende de WHATSAPP_ACCESS_TOKEN (token permanente de System User) e nunca deve ser
// importado de um Client Component.

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

function assertConfigured() {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID não configurados no ambiente."
    );
  }
}

type SendResult =
  | { ok: true; whatsappMessageId: string }
  | { ok: false; error: string };

async function postMessage(body: Record<string, unknown>): Promise<SendResult> {
  assertConfigured();

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.messages?.[0]?.id) {
    const error = data?.error?.message || `Graph API retornou status ${res.status}`;
    return { ok: false, error };
  }

  return { ok: true, whatsappMessageId: data.messages[0].id };
}

export function sendTemplateMessage(params: {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
}): Promise<SendResult> {
  return postMessage({
    to: params.to,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode },
      components: [
        {
          type: "body",
          parameters: params.bodyParams.map((text) => ({ type: "text", text })),
        },
      ],
    },
  });
}

export function sendTextMessage(params: { to: string; body: string }): Promise<SendResult> {
  return postMessage({
    to: params.to,
    type: "text",
    text: { body: params.body },
  });
}

type MediaMetadataResult =
  | { ok: true; url: string; mimeType: string }
  | { ok: false; error: string };

export async function getMediaMetadata(mediaId: string): Promise<MediaMetadataResult> {
  assertConfigured();

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.url) {
    return { ok: false, error: data?.error?.message || `Graph API retornou status ${res.status}` };
  }

  return { ok: true, url: data.url, mimeType: data.mime_type };
}

export async function downloadMedia(url: string): Promise<{ buffer: ArrayBuffer; contentType: string | null }> {
  assertConfigured();

  const res = await fetch(url, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
  if (!res.ok) throw new Error(`Falha ao baixar mídia da Meta (status ${res.status})`);

  return { buffer: await res.arrayBuffer(), contentType: res.headers.get("content-type") };
}
