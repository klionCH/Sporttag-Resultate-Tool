export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // Schülerdaten abrufen
        const students = await sql`
            SELECT id, name, surname, class_group, date_of_birth, gender, age_category, grade, present_bool, total_points, assistant_bool
            FROM students
        `;

        if (!students) {
            throw new Error("Fehler beim Laden der Schüler");
        }

        // Resultate abrufen (z.B. für Punkte & Detailanzeige)
        const results = await sql`
            SELECT student_id, sport, best_result, skipped, points, grade
            FROM results
        `;

        if (!results) {
            throw new Error("Fehler beim Laden der Resultate");
        }

        // Sportarten (für Namen & Einheiten im Export)
        const sports = await sql`
            SELECT code, name, mesure_unit_short
            FROM sports
        `;

        if (!sports) {
            throw new Error("Fehler beim Laden der Sportarten");
        }

        // Punkte pro Schüler berechnen (nur wenn skipped = false)
        const punkteMap = new Map();
        for (const r of results) {
            if (!r.student_id || r.points == null || r.skipped === true) continue;
            punkteMap.set(r.student_id, (punkteMap.get(r.student_id) || 0) + Number(r.points));
        }

        // Punkte in DB zurückschreiben (optional, falls noch nicht gespeichert)
        for (const [studentId, points] of punkteMap.entries()) {
            await sql`
                UPDATE students
                SET total_points = ${points}
                WHERE id = ${studentId}
            `;
        }

        // Daten in ein einheitliches Format bringen
        const daten = students.map((s) => ({
            id: s.id,
            name: s.name,
            surname: s.surname,
            class_group: s.class_group,
            gender: s.gender,
            alter: s.alter,
            kategorie: s.age_category,
            total_points: s.total_points || 0,
            grade: s.grade,
            assistant_bool: s.assistant_bool,
            present_bool: s.present_bool
        }));

        // Rankings nach Alterskategorie & Klasse gruppieren
        const gruppierteRanglisten = {};

        for (const eintrag of daten) {
            // Preset1 → Gruppierung nach Alterskategorie + Geschlecht
            const keyCategory = `category__${eintrag.kategorie}__${eintrag.gender}`;
            if (!gruppierteRanglisten[keyCategory]) {
                gruppierteRanglisten[keyCategory] = [];
            }
            gruppierteRanglisten[keyCategory].push(eintrag);

            // Preset2 → Gruppierung nach Klasse + Geschlecht
            const keyClass = `class__${eintrag.class_group}__${eintrag.gender}`;
            if (!gruppierteRanglisten[keyClass]) {
                gruppierteRanglisten[keyClass] = [];
            }
            gruppierteRanglisten[keyClass].push(eintrag);
        }

        // Innerhalb jeder Gruppe nach Punkten sortieren (absteigend)
        for (const key in gruppierteRanglisten) {
            gruppierteRanglisten[key].sort((a, b) => b.total_points - a.total_points);
        }

        // Response: Rankings + alle benötigten Zusatzdaten
        return new Response(JSON.stringify({
            rankings: gruppierteRanglisten,
            results,
            sports,
            students: daten
        }), { status: 200 });

    } catch (error) {
        console.error("Fehler in /api/rankings/with-details:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}