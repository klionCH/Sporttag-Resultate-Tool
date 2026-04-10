export const dynamic = 'force-dynamic';
import {requireAnyRole} from "@/app/lib/auth";

// Nur Lehrer dürfen diese Route nutzen
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // Eingabedaten aus dem Request lesen
        const { exportData, showDetails, showGrades } = await req.json();
        const { ranglisten, titles, sportHeaders, sportUnitMap, sportNameMap } = exportData;

        // Einzelne Zelle für eine Disziplin formatieren
        const formatDisziplinZelle = (s, sport, sportUnitMap) => {
            if (s.assistant_bool) return "-";
            const detail = s.resultDetails?.[sport];
            if (detail?.skipped) return "Übersprungen";

            const value = detail?.value;
            const unit = sportUnitMap[sport] || "";
            const points = detail?.points;
            const grade = detail?.grade;

            const parts = [];
            if (value !== undefined && value !== null) parts.push(`${value} ${unit}`.trim());
            if (points != null) parts.push(`${points} Pkt.`);
            if (grade != null) parts.push(`Note: ${grade}`);

            return parts.join(" | ");
        };

        // Alle Disziplin-Zellen für einen Schüler generieren
        const generateDisziplinZellen = (s, sportHeaders, sportUnitMap) => {
            return sportHeaders.map(sport => formatDisziplinZelle(s, sport, sportUnitMap));
        };

        // Komplette Zeile für einen Schüler generieren
        const generateExportRow = (s, i, sportHeaders, sportUnitMap) => {
            const rankDisplay = s.rang || (s.assistant_bool ? "Helfer" : (i + 1));
            return [
                rankDisplay,
                s.name,
                s.surname,
                s.class_group,
                s.total_points,
                ...(showGrades ? [s.grade ?? "-"] : []),
                ...(showDetails ? generateDisziplinZellen(s, sportHeaders, sportUnitMap) : [])
            ];
        };

        let csv = "";

        // Jede Rangliste durchgehen
        Object.keys(ranglisten).forEach((key) => {
            const list = ranglisten[key];

            if (list.length === 0) return;

            // Titel schreiben
            csv += `\n"${titles[key] || key}"\n`;

            // Kopfzeile
            const headers = [
                "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                ...(showGrades ? ["Note"] : []),
                ...(showDetails ? sportHeaders.map(code => sportNameMap?.[code] || code) : [])
            ];
            csv += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

            list.forEach((s, i) => {
                const formattedRow = generateExportRow(s, i, sportHeaders, sportUnitMap).map(val =>
                    `"${String(val).replace(/"/g, '""')}"`
                );
                csv += formattedRow.join(",") + "\n";
            });
        });

        // CSV zurückgeben
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv;charset=utf-8;',
                'Content-Disposition': 'attachment; filename="rangliste.csv"'
            }
        });
    } catch (error) {
        console.error("CSV Export Error:", error);
        return Response.json({ error: error.message || "Fehler beim Generieren des CSV" }, { status: 500 });
    }
}