export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Alle Sportarten abrufen (id, code, name, svg_url)
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const data = await sql`
        SELECT id, code, name, svg_url
        FROM sports
        ORDER BY name ASC
    `;
    return new Response(JSON.stringify({ data }), { status: 200 });
}
