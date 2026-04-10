import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login']

export function middleware(req) {
    const { pathname } = req.nextUrl
    const tokenCookie = req.cookies.get('authToken')

    // ✅ Öffentliche Pfade erlauben
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // ❌ Kein Token vorhanden → Weiterleitung zu /login
    if (!tokenCookie) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    try {
        const token = tokenCookie.value
        const payloadBase64 = token.split('.')[1]
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString())

        const userRole = decoded.role

        // 🛑 Upload-Zugriff nur für Lehrer
        if (pathname.startsWith('/upload') && userRole !== 'teacher') {
            // Custom Header: Zugriff verweigert
            const response = NextResponse.next()
            response.headers.set('X-Access-Denied', 'true')
            return response
        }



        // ✅ Zugriff erlaubt
        return NextResponse.next()

    } catch (error) {
        // Fehler beim JWT → Weiterleitung zu Login
        return NextResponse.redirect(new URL('/login', req.url))
    }
}

// 👇 Middleware aktiv für:
export const config = {
    matcher: [
        '/menu',
        '/sports/:path*',
        '/upload',
    ],
}
