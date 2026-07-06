import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export default async function middleware(request: NextRequest) {
  // Inicializa a resposta padrão.
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Cria o cliente do Supabase pro servidor
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Atualiza os cookies na requisição (pra o servidor saber)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          supabaseResponse = NextResponse.next({
            request,
          })

          // Atualiza os cookies na resposta (pra o navegador salvar)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      cookieOptions: { name: 'sb-admin-auth' },
    }
  )

  // Consulta o Supabase pra ver se o token no cookie é válido.
  // Importante: se o access token estiver perto de expirar, essa chamada pode
  // rotacionar o refresh token e gravar o cookie novo em `supabaseResponse`
  // (via setAll acima). Por isso, QUALQUER response que devolvermos daqui pra
  // frente precisa carregar os cookies de `supabaseResponse` - caso contrário
  // o navegador fica com o refresh token antigo (já invalidado no Supabase) e,
  // ao tentar usá-lo de novo, o Supabase revoga a sessão inteira (efeito de
  // "desloga sozinho rápido" logo após o login).
  const { data: { user } } = await supabase.auth.getUser()

  // Helper: redireciona preservando os cookies (possivelmente renovados) da supabaseResponse.
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // Variável que captura a url que o usuário tá tentando acessar
  const pathname = request.nextUrl.pathname

  // Chamadas de Server Actions são POSTs para a URL da página atual (ex: getUser()
  // disparado pelo AuthContext enquanto o usuário ainda está em "/", logo após o
  // login, antes do router.push("/dashboard") completar). Se aplicarmos as regras
  // de redirect de página nessas requisições, a Server Action é interrompida no
  // meio (recebe um 307 no lugar do payload esperado), o Next.js acusa "unexpected
  // response was received from the server" e o fluxo de auth quebra - parecendo
  // um logoff. Deixa essas requisições passarem direto pro handler da action.
  const isServerAction = request.headers.has('next-action')
  if (isServerAction) {
    return supabaseResponse
  }

  // Requisições de dados RSC (navegação client-side / revalidação, identificadas
  // pelo header "rsc") não devem ser barradas por um redirect de página aqui. O
  // Next.js dispara várias delas em paralelo (ex: ao entrar no dashboard), e nessa
  // rajada uma chamada ocasional de getUser() pode não enxergar o cookie a tempo
  // (corrida de rede/timing), o que fazia o roteador do Next tratar isso como
  // logoff e navegar a página inteira de volta pro login. A proteção real dos
  // dados continua garantida pelo RLS e pelo assertAdmin() de cada Server Action;
  // aqui só evitamos usar um request de dados possivelmente racy pra decidir
  // navegação. A entrada real na rota (hard navigation, sem esse header) continua
  // sendo validada normalmente logo abaixo.
  const isRscDataRequest = request.headers.get('rsc') === '1'
  if (isRscDataRequest) {
    return supabaseResponse
  }

  // regras de redirecionamento:

  // Acesso à raiz do site
  if (pathname === '/') {
    if (user) {
      return redirectTo('/dashboard')
    } else {
      // Como não temos uma rota /login explícita (a raiz é o login no seu projeto atual)
      // Mantemos o comportamento ou redirecionamos se necessário.
      // No seu caso, o '/' renderiza o Login, então se não houver user, apenas continua.
      return supabaseResponse
    }
  }

  // Proteção das outras páginas (Dashboard)
  if (!user && pathname.startsWith('/dashboard')) {
    return redirectTo('/')
  }

  // Este é o app do Administrador: bloqueia quem está logado mas não é admin
  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('role')
      .eq('profile_id', user.id)
      .maybeSingle()

    // Falha transitória ao consultar o profile (rede, timeout, etc.) não deve
    // ser tratada como "não é admin" - só derruba a sessão quando o profile
    // foi lido com sucesso e o role confirmado é diferente de admin.
    if (!profileError && profile?.role !== 'admin') {
      await supabase.auth.signOut()
      return redirectTo('/')
    }
  }

  return supabaseResponse
}

// Configuração do Middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
