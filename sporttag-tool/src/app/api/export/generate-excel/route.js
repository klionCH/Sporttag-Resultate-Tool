export const dynamic = 'force-dynamic';
import * as XLSX from "xlsx";
import {requireAnyRole} from "@/app/lib/auth";

// POST-Handler für Excel-Export, nur für Lehrer erlaubt
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // Request-Daten extrahieren
        const { exportData, showDetails, showGrades } = await req.json();
        const { ranglisten, titles, sportHeaders, sportUnitMap, sportNameMap } = exportData;

        // Einzelne Disziplin-Zelle formatieren
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

        // Disziplin-Zellen für eine ganze Zeile generieren
        const generateDisziplinZellen = (s, sportHeaders, sportUnitMap) => {
            return sportHeaders.map(sport => formatDisziplinZelle(s, sport, sportUnitMap));
        };

        // Eine vollständige Zeile pro Schüler erzeugen
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

        // Neues Excel-Arbeitsbuch erzeugen
        const wb = XLSX.utils.book_new();

        // Für jede Rangliste ein eigenes Tabellenblatt anlegen
        Object.keys(ranglisten).forEach((key) => {
            const list = ranglisten[key];

            if (list.length === 0) return;

            // Spaltenüberschriften
            const headers = [
                "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                ...(showGrades ? ["Note"] : []),
                ...(showDetails ? sportHeaders.map(code => sportNameMap?.[code] || code) : [])
            ];

            // Datenzeilen generieren
            const rows = list.map((s, i) => generateExportRow(s, i, sportHeaders, sportUnitMap));
            // Sheet aus Header + Daten erstellen
            const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

            // Sheet zur Excel-Datei hinzufügen (max. 31 Zeichen für Tabellennamen)
            const safeSheetName = key.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, sheet, safeSheetName);
        });

        // Excel-Datei als Buffer erzeugen
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Excel-Datei als Download zurückgeben
        return new Response(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="rangliste.xlsx"'
            }
        });
    } catch (error) {
        console.error("Excel Export Error:", error);
        return Response.json({ error: error.message || "Fehler beim Generieren der Excel-Datei" }, { status: 500 });
    }
}