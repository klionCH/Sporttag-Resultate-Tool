export const dynamic = 'force-dynamic';
import sql from "../../lib/db";
import { requireAnyRole } from "@/app/lib/auth";

// Bestleistung je nach Konfiguration berechnen
function getBestResult(scoresRaw, heightsRaw, resultsRaw, config) {
    const scores = Array.isArray(scoresRaw) ? scoresRaw : [];
    const heights = Array.isArray(heightsRaw) ? heightsRaw : [];
    const results = Array.isArray(resultsRaw) ? resultsRaw : [];

    // z.B. Hochsprung (Versuchslogik)
    if (config.time_measure === false && config.checkFails === true) {
        const heightResults = heights.map((val, i) =>
            results[i] === true ? parseFloat(val) || 0 : 0
        );
        return Math.max(...heightResults);
    }

    // z.B. Sprint (Zeitmessung)
    if (config.time_measure === true) {
        const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
        return numeric.length > 0 ? Math.min(...numeric) : 0;
    }

    // z.B. Weitsprung, Kugelstossen (Weite)
    const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return numeric.length > 0 ? Math.max(...numeric) : 0;
}

// Punktwert aus Punktetabelle abrufen
async function fetchPointData({ gender, sportCode, bestResult, timeMeasure }) {

    const data = await sql`
        SELECT performance, points
        FROM points_table
        WHERE gender = ${gender}
        AND sport_code = ${sportCode}
        ORDER BY performance ${timeMeasure ? sql`ASC` : sql`DESC`}
    `;

    if (!data) {
        console.error("[fetchPointData] Fehler: Keine Daten gefunden");
        throw new Error("Keine Daten gefunden");
    }

    // passenden Eintrag filtern
    const sorted = data.filter(row =>
        timeMeasure ? row.performance >= bestResult : row.performance <= bestResult
    );

    return sorted.length > 0 ? [sorted[0]] : [];
}

// Ergebnisse speichern
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const body = await req.json();
    const { students, sport, group, skippedStudents, attemptHeights, results, scores, sportConfig } = body;

    try {
        // Schülerinfos abrufen
        const studentInfos = await sql`
            SELECT id, gender, age_category, class_group
            FROM students
            WHERE id = ANY(${students.map(s => s.id)})
        `;

        if (!studentInfos) throw new Error("Fehler beim Abrufen der Schülerinformationen");

        for (const student of students) {
            const studentInfo = studentInfos.find(s => s.id === student.id);
            if (!studentInfo) {
                console.warn(`❌ Kein Profil gefunden für ID ${student.id}`);
                continue;
            }

            const isSkipped = !!skippedStudents[student.id];
            const bestResult = getBestResult(scores[student.id], attemptHeights[student.id], results[student.id], sportConfig);

            // Punkte bestimmen (oder null)
            let pointData = bestResult === 0
                ? [{ points: null }]
                : await fetchPointData({
                    gender: studentInfo.gender,
                    sportCode: sport,
                    bestResult,
                    timeMeasure: sportConfig.time_measure
                });

            const points = pointData.length > 0 ? pointData[0].points : 0;

            // Note berechnen
            let note = null;
            if (!isSkipped && points !== null) {
                const gradeData = await sql`
                    SELECT grade
                    FROM grades_table
                    WHERE gender = ${studentInfo.gender}
                    AND age_category = ${studentInfo.age_category}
                    AND average_points_per_category <= ${points}
                    ORDER BY average_points_per_category DESC
                    LIMIT 1
                `;

                note = gradeData[0]?.grade ?? 1;
            }
            // Eintrag vorbereiten
            const update = {
                student_id: student.id,
                sport,
                group: `${studentInfo.class_group}-${studentInfo.gender}`,
                heights: sportConfig.checkFails ? attemptHeights[student.id] : null,
                attempt_results: sportConfig.checkFails ? results[student.id] : null,
                scores: !sportConfig.checkFails ? scores[student.id] : null,
                best_result: isSkipped ? null : bestResult,
                points: isSkipped ? null : points,
                skipped: isSkipped,
                grade: isSkipped ? null : note
            };


            // Prüfen ob Resultat existiert
            const existingData = await sql`
                SELECT id
                FROM results
                WHERE student_id = ${student.id}
                AND sport = ${sport}
                LIMIT 1
            `;

            // Update oder Insert
            if (existingData.length > 0) {
                await sql`
                    UPDATE results
                    SET ${sql(update)}
                    WHERE id = ${existingData[0].id}
                `;
            } else {
                await sql`
                    INSERT INTO results ${sql(update)}
                `;
            }

        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (e) {
        console.error("🚨 Fehler beim Speichern der Resultate:", e);
        return new Response(JSON.stringify({ error: "Fehler beim Speichern." }), { status: 500 });
    }
}
