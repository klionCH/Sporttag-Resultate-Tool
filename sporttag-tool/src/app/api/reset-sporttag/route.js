export const dynamic = 'force-dynamic';
import sql from "@/app/lib/db";
import { requireAnyRole } from "@/app/lib/auth";

// Nur Lehrer dürfen alle Schüler- und Resultatdaten löschen
export async function DELETE(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // Alle Einträge aus "results" löschen
        await sql`
            DELETE FROM results
            WHERE id IS NOT NULL
        `;

        // Alle Einträge aus "students" löschen
        await sql`
            DELETE FROM students
            WHERE id IS NOT NULL
        `;

        // Erfolgsmeldung zurückgeben
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Fehler beim Zurücksetzen des Sporttags:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
