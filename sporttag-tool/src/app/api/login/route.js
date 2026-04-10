export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import sql from '../../lib/db';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

// POST-Handler für Login
export async function POST(req) {
    try {
        // Anmeldedaten aus dem Request auslesen
        const { username, password } = await req.json();

        // Benutzer aus der Datenbank holen
        const user = await sql`
            SELECT id, username, password, role
            FROM profiles
            WHERE username = ${username}
            LIMIT 1
        `;

        // Fehler wenn Benutzer nicht existiert
        if (!user || user.length === 0) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 401 });
        }

        // Passwort überprüfen mit bcrypt
        const bcrypt = await import('bcryptjs');
        const isPasswordValid = await bcrypt.compare(password, user[0].password);
        // Fehler wenn Passwort falsch ist
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
        }

        // JWT-Token erstellen mit Benutzerinfo (id, username, role)
        const token = jwt.sign(
            { id: user[0].id, username: user[0].username, role: user[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Cookie serialisieren (HttpOnly, Secure, Strict)
        const cookie = serialize('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        // Antwort mit Cookie und Rolle zurückgeben
        const response = NextResponse.json({ success: true, role: user[0].role });
        response.headers.set('Set-Cookie', cookie);

        return response;
    } catch (err) {
        // Fehler bei Serverproblemen
        console.log(err);
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }

}