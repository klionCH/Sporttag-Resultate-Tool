export const dynamic = 'force-dynamic';
import sql from "../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Schüler aus mehreren Gruppen (Klasse-Geschlecht) abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    const { searchParams } = new URL(req.url);
    const gruppenParam = searchParams.get("gruppen");

    // Gruppen-Parameter prüfen
    if (!gruppenParam) {
        return new Response(JSON.stringify({ error: "Gruppe fehlt." }), { status: 400 });
    }

    const gruppen = gruppenParam.split(",");

    try {
        const conditions = gruppen.map(g => {
            const [class_group, gender] = g.split("-");
            return sql`(class_group = ${class_group} AND gender = ${gender})`;
        });

        const data = await sql`
            SELECT * FROM students
            WHERE ${conditions.reduce((acc, condition, i) => 
                i === 0 ? condition : sql`${acc} OR ${condition}`
            )}
        `;

        return new Response(JSON.stringify({ data }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
