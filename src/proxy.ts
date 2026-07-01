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
    }
  )

  // Consulta o Supabase pra ver se o token no cookie é válido
  const { data: { user } } = await supabase.auth.getUser()

  // Variável que captura a url que o usuário tá tentando acessar
  const pathname = request.nextUrl.pathname

  // Agrupamento de todas as rotas que são exclusivas para quem não está logado
  const authRoutes = ['/signup', '/forgot-password']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route)) || pathname === '/'


  // regras de redirecionamento:

  // Acesso à raiz do site
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      // Como não temos uma rota /login explícita (a raiz é o login no seu projeto atual)
      // Mantemos o comportamento ou redirecionamos se necessário.
      // No seu caso, o '/' renderiza o Login, então se não houver user, apenas continua.
      return supabaseResponse
    }
  }

  // Proteção das outras páginas (Dashboard)
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Este é o app do Administrador: bloqueia quem está logado mas não é admin
  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profile')
      .select('role')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Pula as telas de login para quem já está logado
  if (user && isAuthRoute && pathname !== '/dashboard') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

// Configuração do Middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
