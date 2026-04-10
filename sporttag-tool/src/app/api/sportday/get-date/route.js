export const dynamic = 'force-dynamic';

import sql from "@/app/lib/db";

// Sporttag-Datum abrufen
export async function GET() {
    const data = await sql`
        SELECT date
        FROM sportdays
        LIMIT 1
    `;

    if (!data || data.length === 0) {
        return new Response(JSON.stringify({ error: "Keine Daten gefunden" }), { status: 500 });
    }

    return new Response(JSON.stringify({ date: data[0].date }), { status: 200 });
};

