export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Alle eindeutigen Klassen abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const data = await sql`
        SELECT DISTINCT class_group
        FROM students
        WHERE class_group IS NOT NULL
        ORDER BY class_group ASC
    `;

    if (!data || data.length === 0) {
        return new Response(JSON.stringify({
            error: "Keine Klassen gefunden"
        }), { status: 500 });
    }

    // Duplikate entfernen
    const uniqueClasses = [...new Set(data
        .map((student) => student.class_group)
    )];
    // Klassenliste zurückgeben
    return new Response(JSON.stringify({
        classes: uniqueClasses
    }), { status: 200 });
}
