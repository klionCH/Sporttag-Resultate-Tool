// File: /app/api/students/recalculate-age/route.js
export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

// Alterskategorie anhand Geburtsdatum und Veranstaltungsdatum berechnen
function calculateAgeCategory(date_of_birth, veranstaltungsDatumStr) {
    const veranstaltungsDatum = new Date(veranstaltungsDatumStr);
    const geburtsdatumDate = new Date(date_of_birth);
    const diffInJahren = veranstaltungsDatum.getFullYear() - geburtsdatumDate.getFullYear();
    const adjust = veranstaltungsDatum < new Date(geburtsdatumDate.setFullYear(veranstaltungsDatum.getFullYear()));
    const alter = adjust ? diffInJahren - 1 : diffInJahren;

    if (alter < 16) return "-15";
    if (alter >= 16 && alter <= 17) return "16-17";
    return "18+";
}

// Alterskategorien aller Schüler neu berechnen
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);
    try {
        // Sporttag-Datum laden
        const sportdayData = await sql`
            SELECT date
            FROM sportdays
            LIMIT 1
        `;

        if (!sportdayData || sportdayData.length === 0) {
            console.error("Fehler beim Laden des Sporttag-Datums");
            return new Response(JSON.stringify({ error: "Veranstaltungsdatum konnte nicht geladen werden." }), { status: 500 });
        }

        const veranstaltungsDatum = sportdayData[0].date;

        // Schüler laden
        const students = await sql`
            SELECT id, date_of_birth
            FROM students
        `;

        if (!students || students.length === 0) {
            console.error("Fehler beim Laden der Schülerdaten");
            return new Response(JSON.stringify({ error: "Schülerdaten konnten nicht geladen werden." }), { status: 500 });
        }

        // Neue Alterskategorien berechnen
        const updates = students.map((student) => ({
            id: student.id,
            age_category: calculateAgeCategory(student.date_of_birth, veranstaltungsDatum),
        }));

        // Alterskategorien speichern
        for (const update of updates) {
            const { error: updateError } = await sql`
                UPDATE students
                SET age_category = ${update.age_category}
                WHERE id = ${update.id}
            `;

            if (updateError) {
                console.error(`Fehler beim Aktualisieren von ID ${update.id}:`, updateError);
                return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
            }
        }


        return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
    } catch (err) {
        console.error("Unerwarteter Fehler in recalculate-age:", err);
        return new Response(JSON.stringify({ error: "Interner Fehler" }), { status: 500 });
    }
}
