export const dynamic = 'force-dynamic';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {requireAnyRole} from "@/app/lib/auth";

// Nur Lehrer dürfen PDF-Export durchführen
export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);


    try {
        // Daten aus dem Request extrahieren
        const { exportData, showDetails, showGrades } = await req.json();
        const { ranglisten, titles, sportHeaders, sportUnitMap, sportNameMap } = exportData;

        const doc = new jsPDF();
        let pos = 10;  // vertikale Startposition

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

        // Alle Disziplin-Zellen für eine Zeile erzeugen
        const generateDisziplinZellen = (s, sportHeaders, sportUnitMap) => {
            return sportHeaders.map(sport => formatDisziplinZelle(s, sport, sportUnitMap));
        };

        // Komplette Zeile für einen Schüler erzeugen
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

        // Jede Rangliste in eigenes Tabellen-Layout packen
        Object.keys(ranglisten).forEach((key, idx) => {
            const list = ranglisten[key];
            if (list.length === 0) return;

            // Titel der Tabelle
            doc.setFont("helvetica", "bold");
            doc.text(titles[key] || key, 10, pos);
            doc.setFont("helvetica", "normal");
            pos += 6;

            // Tabellenkopf
            const headers = [
                "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                ...(showGrades ? ["Note"] : []),
                ...(showDetails ? sportHeaders.map(code => sportNameMap?.[code] || code) : [])
            ];

            // Tabellenkörper
            const body = list.map((s, i) => generateExportRow(s, i, sportHeaders, sportUnitMap));

            // Tabelle mit Styling erstellen
            autoTable(doc, {
                startY: pos,
                head: [headers],
                body,
                theme: "striped",
                headStyles: { fillColor: [41, 128, 185], fontSize: 7 },
                styles: { fontSize: 7, cellPadding: 1 },
                // Zellen individuell stylen
                didParseCell: function (data) {
                    const student = list[data.row.index];

                    // Top 3 farbig markieren
                    if (data.section === 'body' && student) {
                        data.cell.styles.textColor = [0, 0, 0];
                        data.cell.styles.fillColor = null;
                        data.cell.styles.fontStyle = 'normal';

                        // Abwesend grau markieren
                        if (student.assistant_bool !== true) {
                            if (data.row.index === 0) data.cell.styles.fillColor = [255, 223, 100];
                            else if (data.row.index === 1) data.cell.styles.fillColor = [220, 220, 220];
                            else if (data.row.index === 2) data.cell.styles.fillColor = [205, 127, 50];
                            else if (student.total_points === 0) data.cell.styles.fillColor = [255, 102, 102];
                        } else if (data.column.index === 0) {
                            data.cell.styles.fontStyle = 'bold';
                        }

                        // Disziplin übersprungen (hellrot)
                        if (student.rang === "Abwesend") {
                            data.cell.styles.fillColor = [240, 240, 240];
                            data.cell.styles.fontStyle = 'bold';
                        }

                        if (showDetails) {
                            const fixedColumnCount = 5 + (showGrades ? 1 : 0);
                            if (data.column.index >= fixedColumnCount) {
                                const sportIndex = data.column.index - fixedColumnCount;
                                if (sportIndex >= 0 && sportIndex < sportHeaders.length) {
                                    const sportCode = sportHeaders[sportIndex];
                                    const detail = student.resultDetails?.[sportCode];
                                    if (detail && detail.skipped === true) {
                                        data.cell.styles.fillColor = [255, 204, 203];
                                        data.cell.styles.textColor = [150, 150, 150];
                                        data.cell.styles.fontStyle = 'normal';
                                    }
                                }
                            }
                        }
                    }
                }
            });
            // Position für nächste Tabelle oder neue Seite
            pos = doc.lastAutoTable.finalY + 10;

            if (idx < Object.keys(ranglisten).length - 1) {
                doc.addPage();
                pos = 10;
            }
        });

        // PDF als Blob erzeugen und zurückgeben
        const pdfBlob = doc.output('blob');
        return new Response(pdfBlob, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="rangliste.pdf"'
            }
        });
    } catch (error) {
        console.error("PDF Export Error:", error);
        return Response.json({ error: error.message || "Fehler beim Generieren des PDFs" }, { status: 500 });
    }
}