export const dynamic = 'force-dynamic';
import {requireAnyRole} from "@/app/lib/auth";
import {getRankingsWithDetails} from "@/app/api/rankings/with-details/route";

// POST-Handler zur Generierung von Ranglisten für Export (CSV, PDF, Excel)
export async function POST(req) {

    try {
        const user = requireAnyRole(req, ["teacher"]);
        const { mode, preset, filters, showDetails, showGrades } = await req.json();

        console.log(`[rankings/generate] Anfrage von User ${user.username} | mode=${mode} preset=${preset ?? "-"} filters=${JSON.stringify(filters ?? {})}`);

        const { rankings, results, sports, students: studentDetails } = await getRankingsWithDetails();
        console.log(`[rankings/generate] Daten geladen: ${studentDetails.length} Schüler, ${results.length} Resultate, ${sports.length} Sportarten, ${Object.keys(rankings).length} Ranking-Gruppen`);

        const studentMap = {};
        for (const student of studentDetails) {
            studentMap[student.id] = student;
        }

        const resultsMap = {};
        for (const r of results) {
            if (!resultsMap[r.student_id]) resultsMap[r.student_id] = {};
            resultsMap[r.student_id][r.sport] = {
                value: r.best_result?.value ?? r.best_result,
                skipped: r.skipped,
                grade: r.grade ?? null,
                points: r.points ?? null
            };
        }

        const sportUnitMap = {};
        const sportNameMap = {};
        for (const s of sports) {
            sportUnitMap[s.code] = s.mesure_unit_short;
            sportNameMap[s.code] = s.name;
        }

        const titles = {};
        let listen = {};

        if (mode === "preset") {

            const keyPrefix = preset === "preset1" ? "category__" : "class__";
            const relevantKeys = Object.keys(rankings).filter(key => key.startsWith(keyPrefix));
            console.log(`[rankings/generate] Preset-Modus: ${preset}, ${relevantKeys.length} Gruppen gefunden (${relevantKeys.join(", ")})`);


            for (const key of relevantKeys) {
                const parts = key.split("__");


                const type = parts[0];
                const value = parts[1];
                const gender = parts[2];

                // Ranking vorbereiten, Daten anreichern, sortieren und ränge vergeben
                const list = rankings[key];
                let rankCounter = 1;
                listen[key] = list
                    .map((s) => ({
                        ...s,
                        name: s.name,
                        surname: s.surname,
                        total_points: studentMap[s.id]?.total_points || 0,
                        grade: studentMap[s.id]?.grade,
                        resultDetails: resultsMap[s.id] || {},
                        assistant_bool: studentMap[s.id]?.assistant_bool,
                        present_bool: studentMap[s.id]?.present_bool
                    }))
                    .sort((a, b) => {
                        // Sortierlogik: Anwesenheit → Helfer → Punkte
                        if (!a.present_bool && b.present_bool) return 1;
                        if (a.present_bool && !b.present_bool) return -1;
                        if (a.assistant_bool && !b.assistant_bool && a.present_bool && b.present_bool) return 1;
                        if (!a.assistant_bool && b.assistant_bool && a.present_bool && b.present_bool) return -1;
                        return b.total_points - a.total_points;
                    })
                    .map(student => {
                        if (student.present_bool === true && student.assistant_bool === false) {
                            student.rang = rankCounter++;
                        } else if (student.present_bool === false) {
                            student.rang = "Abwesend";
                        } else {
                            student.rang = "Helfer";
                        }
                        return student;
                    });

                // Titel für Rangliste formatieren
                const formatAgeCategory = (kat) => {
                    switch (kat) {
                        case "-15":
                            return "bis 15";
                        case "16-17":
                            return "16 bis 17";
                        case "18+":
                            return "18+";
                        default:
                            return "Unbekannt";
                    }
                };

                if (type === "category") {
                    titles[key] = `Rangliste für ${gender === "maennlich" ? "Männlich" : "Weiblich"} in der Alterskategorie ${formatAgeCategory(value)}`;
                } else if (type === "class") {
                    titles[key] = `Rangliste für ${gender === "maennlich" ? "Männlich" : "Weiblich"} in der Klasse ${value}`;
                }
            }
        }
        // 🔧 Modus: Benutzerdefinierte Filter (z. B. ExportPopup)
        else {
            console.log(`[rankings/generate] Custom-Modus: Filter gender=${filters?.gender} altersgruppe=${filters?.altersgruppe} class_group=${filters?.class_group}`);
            let allStudents = [];
            for (const list of Object.values(rankings)) {
                allStudents = [...allStudents, ...list];
            }

            const seenIds = new Set();
            allStudents = allStudents.filter(s => {
                if (seenIds.has(s.id)) return false;
                seenIds.add(s.id);
                return true;
            });

            // Zusatzinfos anreichern
            allStudents = allStudents.map(s => ({
                ...s,
                name: s.name,
                surname: s.surname,
                total_points: studentMap[s.id]?.total_points || 0,
                grade: studentMap[s.id]?.grade,
                resultDetails: resultsMap[s.id] || {},
                assistant_bool: studentMap[s.id]?.assistant_bool,
                present_bool: studentMap[s.id]?.present_bool
            }));

            // Filter anwenden
            let filteredStudents = allStudents;

            if (filters.gender !== "alle") {
                filteredStudents = filteredStudents.filter(s => s.gender === filters.gender);
            }


            if (filters.altersgruppe !== "alle") {
                filteredStudents = filteredStudents.filter(s => s.kategorie === filters.altersgruppe);
            }

            if (filters.class_group !== "alle") {
                filteredStudents = filteredStudents.filter(s => s.class_group === filters.class_group);
            }

            // Sortieren + Ränge
            let rankCounter = 1;
            filteredStudents = filteredStudents.sort((a, b) => {
                if (!a.present_bool && b.present_bool) return 1;
                if (a.present_bool && !b.present_bool) return -1;
                if (a.assistant_bool && !b.assistant_bool && a.present_bool && b.present_bool) return 1;
                if (!a.assistant_bool && b.assistant_bool && a.present_bool && b.present_bool) return -1;
                return b.total_points - a.total_points;
            }).map(student => {
                if (student.present_bool === true && student.assistant_bool === false) {
                    student.rang = rankCounter++;
                } else if (student.present_bool === false) {
                    student.rang = "Abwesend";
                } else {
                    student.rang = "Helfer";
                }
                return student;
            });

            console.log(`[rankings/generate] Custom-Modus: ${filteredStudents.length} Schueler nach Filterung`);
            listen = {
                "Benutzerdefiniert": filteredStudents
            };

            // Dynamischen Titel generieren
            const genderText = filters.gender === "alle" ? "Alle" :
                (filters.gender === "maennlich" ? "Männlich" : "Weiblich");

            const altersText = filters.altersgruppe === "alle" ? "alle Altersgruppen" :
                (filters.altersgruppe === "-15" ? "bis 15 Jahre" :
                    (filters.altersgruppe === "16-17" ? "16 bis 17 Jahre" : "18+ Jahre"));

            const klasseText = filters.class_group === "alle" ? "alle Klassen" : `Klasse ${filters.class_group}`;

            titles["Benutzerdefiniert"] = `Rangliste für ${genderText} in ${altersText}, ${klasseText}`;
        }

        // Alle Disziplinen aus resultDetails extrahieren
        const allSports = new Set();
        for (const studentId in resultsMap) {
            for (const sport in resultsMap[studentId]) {
                allSports.add(sport);
            }
        }

        const sportHeaders = Array.from(allSports);

        const listKeys = Object.keys(listen);
        const totalStudents = listKeys.reduce((sum, k) => sum + listen[k].length, 0);
        console.log(`[rankings/generate] Fertig: ${listKeys.length} Listen, ${totalStudents} Eintraege, ${sportHeaders.length} Sportarten`);

        return Response.json({
            ranglisten: listen,
            titles,
            sportHeaders,
            sportUnitMap,
            sportNameMap
        });
    } catch (error) {
        console.error("[rankings/generate] Fehler:", error?.message ?? error);
        console.error("[rankings/generate] Stack:", error?.stack ?? "(kein Stack)");
        return Response.json({ error: error.message || "Interner Serverfehler" }, { status: 500 });
    }
}