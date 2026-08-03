// Server Component só pra elevar o teto de duração da Server Action enviarCobrancas
// (whatsapp_data.ts), que agora envia via Graph API síncrono em lotes concorrentes -
// no default de 10s essa Server Action arriscaria estourar num disparo pros ~80
// alunos ativos da escola. page.tsx é "use client" e não pode exportar essa
// configuração de route segment diretamente.
export const maxDuration = 60;

export default function FinancialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
