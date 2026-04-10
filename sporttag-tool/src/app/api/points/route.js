export const dynamic = 'force-dynamic';
import sql from "../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// GET-Handler: Punktetabelle für Sportart + Geschlecht abrufen
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const gender = searchParams.get("gender");
    // Nur Lehrer oder Assistenten dürfen zugreifen
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    // Fehlende Parameter → Bad Request
    if (!sport || !gender) {
        return new Response(JSON.stringify({ error: "sport und gender sind erforderlich." }), { status: 400 });
    }

    // Punktetabelle aus der Datenbank abfragen
    const pointsTable = await sql`
        SELECT performance, points
        FROM points_table
        WHERE sport_code = ${sport} AND gender = ${gender}
        ORDER BY performance DESC
    `;

    // Fehler bei der Abfrage → Internal Server Error
    if (!pointsTable) {
        return new Response(JSON.stringify({ error: "Fehler bei der Abfrage" }), { status: 500 });
    }

    // Erfolgreich: Punktetabelle zurückgeben
    return new Response(JSON.stringify({ data: pointsTable }), { status: 200 });
}
