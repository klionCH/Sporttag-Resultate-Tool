export const dynamic = 'force-dynamic';
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs' // nötig für JWT in Next.js Edge/API Routes

// GET-Handler zum Überprüfen des Auth-Tokens
export async function GET(req) {
    // Cookies auslesen
    const cookie = req.headers.get("cookie") || "";

    // authToken aus dem Cookie extrahieren
    const token = cookie
        .split(";")
        .find(c => c.trim().startsWith("authToken="))
        ?.split("=")[1];

    // Kein Token gefunden → 401 Unauthorized
    if (!token) {
        return new Response(JSON.stringify({ error: "Kein Token" }), { status: 401 });
    }

    try {
        // Token mit Secret verifizieren
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Erfolgreich: Benutzerinfos ausgeben
        return new Response(JSON.stringify({
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        // Token ungültig oder abgelaufen → 403 Forbidden
        return new Response(JSON.stringify({ error: "Token ungültig" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
