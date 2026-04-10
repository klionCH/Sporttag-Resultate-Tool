export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Sporttag-Datum setzen (oder aktualisieren)
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);

    const body = await req.json();
    const { date } = body;

    // Datum prüfen
    if (!date) {
        return new Response(JSON.stringify({ error: "Kein Datum übergeben." }), { status: 400 });
    }

    // Eintrag mit id: 1 upserten
    const existingData = await sql`
        SELECT id
        FROM sportdays
        WHERE id = 1
        LIMIT 1
    `;

    if (existingData.length > 0) {
        await sql`
            UPDATE sportdays
            SET date = ${date}
            WHERE id = 1
        `;
    } else {
        await sql`
            INSERT INTO sportdays (id, date)
            VALUES (1, ${date})
        `;
    }

    // Erfolgsmeldung zurückgeben
    return new Response(JSON.stringify({ success: true, date }), { status: 200 });
}
