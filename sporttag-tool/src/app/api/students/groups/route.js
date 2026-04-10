export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Alle vorhandenen Klassen-Geschlecht-Kombinationen abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const data = await sql`
        SELECT class_group, gender
        FROM students
        WHERE class_group IS NOT NULL
    `;

    if (!data || data.length === 0) {
        return new Response(JSON.stringify({
            error: "Keine Gruppen gefunden"
        }), { status: 500 });
    }

    const groupMap = new Map();

    // Gruppen nach Klasse + Geschlecht aufbauen
    data.forEach(student => {
        const groupKey = `${student.class_group}-${student.gender.toLowerCase()}`;
        if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
                id: groupKey,
                class_group: student.class_group,
                gender: student.gender.toLowerCase()
            });
        }
    });

    // Gruppenliste zurückgeben
    return new Response(JSON.stringify({
        data: Array.from(groupMap.values())
    }), { status: 200 });
}
