export const dynamic = 'force-dynamic';
import sql from "../../lib/db";
import { requireAnyRole } from "@/app/lib/auth";

function toArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) return [];
        const max = Math.max(...keys.map(Number).filter(n => !isNaN(n)));
        return Array.from({ length: max + 1 }, (_, i) => value[i] ?? undefined);
    }
    return [];
}

function getBestResult(scoresRaw, heightsRaw, resultsRaw, config) {
    const scores  = toArray(scoresRaw);
    const heights = toArray(heightsRaw);
    const results = toArray(resultsRaw);

    if (config.time_measure === false && config.checkFails === true) {
        const cleared = heights.reduce((best, val, i) => {
            if (results[i] === true) {
                const h = parseFloat(val);
                if (!isNaN(h) && h > best) return h;
            }
            return best;
        }, 0);
        return cleared;
    }

    if (config.time_measure === true) {
        const times = scores
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v) && v > 0);
        return times.length > 0 ? Math.min(...times) : 0;
    }

    const distances = scores
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v) && v > 0);
    return distances.length > 0 ? Math.max(...distances) : 0;
}

async function fetchPointsForStudents(students, sport, sportConfig) {
    const byGender = {};
    for (const { studentId, gender, bestResult } of students) {
        if (!byGender[gender]) byGender[gender] = [];
        byGender[gender].push({ studentId, bestResult });
    }

    const pointMap = new Map();

    for (const [gender, group] of Object.entries(byGender)) {
        const timeMeasure = sportConfig.time_measure;

        const rows = await sql`
            SELECT performance, points
            FROM points_table
            WHERE gender     = ${gender}
            AND   sport_code = ${sport}
            ORDER BY performance ${timeMeasure ? sql`ASC` : sql`DESC`}
        `;

        for (const { studentId, bestResult } of group) {
            if (bestResult === 0) {
                pointMap.set(studentId, null);
                continue;
            }

            const match = rows.find(row =>
                timeMeasure
                    ? row.performance >= bestResult
                    : row.performance <= bestResult
            );

            pointMap.set(studentId, match ? match.points : 0);
        }
    }

    return pointMap;
}

async function fetchGradesForStudents(gradeLookups) {
    if (gradeLookups.length === 0) return new Map();

    const gradeMap = new Map();

    const pairs = [...new Map(
        gradeLookups.map(g => [`${g.gender}|${g.ageCategory}`, g])
    ).values()];

    for (const { gender, ageCategory } of pairs) {
        const rows = await sql`
            SELECT average_points_per_category, grade
            FROM grades_table
            WHERE gender       = ${gender}
            AND   age_category = ${ageCategory}
            ORDER BY average_points_per_category DESC
        `;

        const studentsForPair = gradeLookups.filter(
            g => g.gender === gender && g.ageCategory === ageCategory
        );

        for (const { studentId, points } of studentsForPair) {
            const match = rows.find(r => r.average_points_per_category <= points);
            gradeMap.set(studentId, match ? match.grade : 1);
        }
    }

    return gradeMap;
}

export async function POST(req) {
    requireAnyRole(req, ["teacher", "assistant"]);

    const body = await req.json();
    const {
        students,
        sport,
        skippedStudents  = {},
        attemptHeights   = {},
        results          = {},
        scores           = {},
        sportConfig,
    } = body;

    if (!students?.length || !sport || !sportConfig) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter." }), { status: 400 });
    }

    try {
        const studentIds = students.map(s => s.id);

        const studentInfos = await sql`
            SELECT id, gender, age_category, class_group
            FROM students
            WHERE id = ANY(${studentIds})
        `;

        const infoById = Object.fromEntries(studentInfos.map(s => [s.id, s]));

        const validStudents = [];

        for (const student of students) {
            const info = infoById[student.id];
            if (!info) {
                console.warn(`⚠️  Kein Profil gefunden für ID ${student.id}`);
                continue;
            }
            const isSkipped  = !!skippedStudents[student.id];
            const bestResult = isSkipped
                ? 0
                : getBestResult(
                    scores[student.id],
                    attemptHeights[student.id],
                    results[student.id],
                    sportConfig
                  );

            validStudents.push({ student, info, isSkipped, bestResult });
        }

        const pointInputs = validStudents
            .filter(({ isSkipped }) => !isSkipped)
            .map(({ student, info, bestResult }) => ({
                studentId:   student.id,
                gender:      info.gender,
                bestResult,
            }));

        const pointMap = await fetchPointsForStudents(pointInputs, sport, sportConfig);

        const gradeLookups = validStudents
            .filter(({ isSkipped }) => !isSkipped)
            .flatMap(({ student, info }) => {
                const points = pointMap.get(student.id);
                if (points === null || points === undefined) return [];
                return [{
                    studentId:   student.id,
                    gender:      info.gender,
                    ageCategory: info.age_category,
                    points,
                }];
            });

        const gradeMap = await fetchGradesForStudents(gradeLookups);

        const existingRows = await sql`
            SELECT id, student_id
            FROM results
            WHERE student_id = ANY(${studentIds})
            AND   sport      = ${sport}
        `;
        const existingById = Object.fromEntries(existingRows.map(r => [r.student_id, r.id]));

        for (const { student, info, isSkipped, bestResult } of validStudents) {
            const points = isSkipped ? null : (pointMap.get(student.id) ?? 0);
            const grade  = isSkipped ? null : (gradeMap.get(student.id) ?? null);

            const heightsArr        = sportConfig.checkFails
                ? toArray(attemptHeights[student.id]).map(v => v === "" ? null : parseFloat(v) || null)
                : null;

            const attemptResultsArr = sportConfig.checkFails
                ? toArray(results[student.id]).map(v => v === null || v === undefined ? null : Boolean(v))
                : null;

            const scoresArr         = !sportConfig.checkFails
                ? toArray(scores[student.id]).map(v => v === "" ? null : v)
                : null;

            const update = {
                student_id:      student.id,
                sport,
                group:           `${info.class_group}-${info.gender}`,
                heights:         heightsArr        !== null ? JSON.stringify(heightsArr)        : null,
                attempt_results: attemptResultsArr !== null ? JSON.stringify(attemptResultsArr) : null,
                scores:          scoresArr         !== null ? JSON.stringify(scoresArr)         : null,
                best_result:     isSkipped ? null : bestResult || null,
                points,
                skipped:         isSkipped,
                grade,
            };

            const existingId = existingById[student.id];

            if (existingId) {
                await sql`
                    UPDATE results
                    SET    ${sql(update)}
                    WHERE  id = ${existingId}
                `;
            } else {
                await sql`INSERT INTO results ${sql(update)}`;
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (e) {
        console.error("🚨 Fehler beim Speichern der Resultate:", e?.message ?? e);
        if (e?.query)  console.error("   Query:", e.query);
        if (e?.detail) console.error("   Detail:", e.detail);
        return new Response(
            JSON.stringify({ error: "Fehler beim Speichern.", detail: e?.message ?? String(e) }),
            { status: 500 }
        );
    }
}