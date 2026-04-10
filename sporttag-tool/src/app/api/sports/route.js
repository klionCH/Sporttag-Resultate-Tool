export const dynamic = 'force-dynamic';
import sql from "../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Sportkonfiguration anhand des Sportcodes abrufen
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    // Sportcode prüfen
    if (!sport) {
        return new Response(JSON.stringify({ error: "Sportcode fehlt." }), { status: 400 });
    }

    // Sportkonfiguration laden
    const data = await sql`
        SELECT attempts, mesure_unit_short, code, check_fail, time_measure, measure, name
        FROM sports
        WHERE code = ${sport}
        LIMIT 1
    `;

    if (!data || data.length === 0) {
        return new Response(JSON.stringify({ error: "Fehler beim Laden der Sportart." }), { status: 500 });
    }

    // Konfiguration zurückgeben
    return new Response(JSON.stringify({ success: true, data: data[0] }), { status: 200 });
}
