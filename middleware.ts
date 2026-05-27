import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextRequest, NextResponse } from 'next/server'

const intl = createIntlMiddleware(routing)

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect admin routes — redirect to login if no session cookie
  const isAdmin = /^\/(es\/|en\/)?admin(\/|$)/.test(pathname)
  const isLogin = /\/admin\/login/.test(pathname)

  if (isAdmin && !isLogin) {
    const token = req.cookies.get('admin_token')?.value
    if (!token) {
      const locale = pathname.startsWith('/en/') ? 'en' : 'es'
      const loginUrl = new URL(`/${locale}/admin/login`, req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return intl(req)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
