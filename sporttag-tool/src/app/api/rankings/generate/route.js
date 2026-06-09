export const dynamic = 'force-dynamic';
import {requireAnyRole} from "@/app/lib/auth";

// POST-Handler zur Generierung von Ranglisten für Export (CSV, PDF, Excel)
export async function POST(req) {

    try {
        const user = requireAnyRole(req, ["teacher"]);
        const { mode, preset, filters, showDetails, showGrades } = await req.json();

        const cookie = req.headers.get("cookie");
        const protocol = "http";
        const host = req.headers.get("host");
        const baseUrl = `${protocol}://${host}`;

        const rankingsRes = await fetch(`${baseUrl}/api/rankings/with-details`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Cookie": cookie
            }
        });
        if (!rankingsRes.ok) {
            throw new Error("Fehler beim Laden der Rankings");
        }

        const json = await rankingsRes.json();
        const { rankings, results, sports, students: studentDetails } = json;

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

            // Filter keys based on preset
            const keyPrefix = preset === "preset1" ? "category__" : "class__";
            const relevantKeys = Object.keys(rankings).filter(key => key.startsWith(keyPrefix));

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
            // Alle Schüler aus Rankings sammeln (Duplikate entfernen)
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

        // 📤 JSON-Antwort für Export
        return Response.json({
            ranglisten: listen,
            titles,
            sportHeaders,
            sportUnitMap,
            sportNameMap
        });
    } catch (error) {
        console.error("API Error:", error);
        return Response.json({ error: error.message || "Interner Serverfehler" }, { status: 500 });
    }
}