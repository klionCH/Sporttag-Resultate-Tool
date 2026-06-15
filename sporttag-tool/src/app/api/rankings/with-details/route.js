export const dynamic = 'force-dynamic';
import sql from "../../../lib/db";
import {requireAnyRole} from "@/app/lib/auth";

export async function getRankingsWithDetails() {
        const t0 = Date.now();
        console.log("[rankings/with-details] Start: Lade Daten aus DB");

        const students = await sql`
            SELECT id, name, surname, class_group, date_of_birth, gender, age_category, grade, present_bool, total_points, assistant_bool
            FROM students
        `;

        if (!students) {
            throw new Error("Fehler beim Laden der Schüler");
        }
        console.log(`[rankings/with-details] Schüler geladen: ${students.length}`);

        const results = await sql`
            SELECT student_id, sport, best_result, skipped, points, grade
            FROM results
        `;

        if (!results) {
            throw new Error("Fehler beim Laden der Resultate");
        }
        console.log(`[rankings/with-details] Resultate geladen: ${results.length}`);

        const sports = await sql`
            SELECT code, name, mesure_unit_short
            FROM sports
        `;

        if (!sports) {
            throw new Error("Fehler beim Laden der Sportarten");
        }
        console.log(`[rankings/with-details] Sportarten geladen: ${sports.length} (${sports.map(s => s.code).join(", ")})`);

        // Punkte pro Schüler berechnen (nur wenn skipped = false)
        const punkteMap = new Map();
        for (const r of results) {
            if (!r.student_id || r.points == null || r.skipped === true) continue;
            punkteMap.set(r.student_id, (punkteMap.get(r.student_id) || 0) + Number(r.points));
        }
        console.log(`[rankings/with-details] Punkte berechnet für ${punkteMap.size} Schüler, schreibe in DB`);

        // Punkte in DB zurückschreiben (optional, falls noch nicht gespeichert)
        for (const [studentId, points] of punkteMap.entries()) {
            await sql`
                UPDATE students
                SET total_points = ${points}
                WHERE id = ${studentId}
            `;
        }
        console.log(`[rankings/with-details] Punkte in DB geschrieben`);

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
            const keyCategory = `category__${eintrag.kategorie}__${eintrag.gender}`;
            if (!gruppierteRanglisten[keyCategory]) {
                gruppierteRanglisten[keyCategory] = [];
            }
            gruppierteRanglisten[keyCategory].push(eintrag);

            const keyClass = `class__${eintrag.class_group}__${eintrag.gender}`;
            if (!gruppierteRanglisten[keyClass]) {
                gruppierteRanglisten[keyClass] = [];
            }
            gruppierteRanglisten[keyClass].push(eintrag);
        }

        for (const key in gruppierteRanglisten) {
            gruppierteRanglisten[key].sort((a, b) => b.total_points - a.total_points);
        }

        const groupKeys = Object.keys(gruppierteRanglisten);
        console.log(`[rankings/with-details] Ranglisten gruppiert: ${groupKeys.length} Gruppen (${groupKeys.join(", ")})`);
        console.log(`[rankings/with-details] Fertig in ${Date.now() - t0}ms`);

        return {
            rankings: gruppierteRanglisten,
            results,
            sports,
            students: daten
        };
}

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher"]);
    try {
        const data = await getRankingsWithDetails();
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
        console.error("Fehler in /api/rankings/with-details:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}