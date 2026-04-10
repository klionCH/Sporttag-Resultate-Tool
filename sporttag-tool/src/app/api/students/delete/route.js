export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Schüler einer Klasse löschen
export async function DELETE(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { class_group } = await req.json();

    // Klasse prüfen
    if (!class_group) {
        return new Response(JSON.stringify({ error: "Klasse fehlt" }), { status: 400 });
    }

    // Schüler aus Klasse löschen
    const { error } = await sql`
        DELETE FROM students
        WHERE class_group = ${class_group}
    `;

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Erfolg zurückgeben
    return new Response(JSON.stringify({
        success: true
    }), { status: 200 });
}
