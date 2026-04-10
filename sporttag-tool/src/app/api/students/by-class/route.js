export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Schüler einer bestimmten Klasse abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { searchParams } = new URL(req.url);
    const class_group = searchParams.get("class_group");

    // Klasse prüfen
    if (!class_group) {
        return new Response(JSON.stringify({ error: "Klasse fehlt" }), { status: 400 });
    }

    // Schüler aus der Datenbank laden
    const data = await sql`
        SELECT *
        FROM students
        WHERE class_group = ${class_group}
    `;

    if (!data || data.length === 0) {
        return new Response(JSON.stringify({ error: "Keine Schüler gefunden" }), { status: 500 });
    }

    // Schülerliste zurückgeben
    return new Response(JSON.stringify({ data }), { status: 200 });
}
