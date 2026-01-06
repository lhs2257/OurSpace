import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
    const supabase = await createClient()

    // 세션 새로고침
    const {
        data: { session },
    } = await supabase.auth.getSession()

    // 로그인 페이지는 인증 없이 접근 가능
    if (request.nextUrl.pathname === '/login') {
        // 이미 로그인한 사용자는 대시보드로 리다이렉트
        if (session) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return NextResponse.next()
    }

    // 루트 경로
    if (request.nextUrl.pathname === '/') {
        if (session) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 나머지 모든 경로는 인증 필요
    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
