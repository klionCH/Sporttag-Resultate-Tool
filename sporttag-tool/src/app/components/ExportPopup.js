"use client";

import { useState, useEffect } from "react";


// Popup-Komponente für Export von Ranglisten
export default function ExportPopup({ onClose }) {
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState("");
    // Filterzustände für benutzerdefinierten Export
    const [filters, setFilters] = useState({ gender: "alle", altersgruppe: "alle", class_group: "alle" });
    // Optional: Ranglisten speichern (derzeit nicht verwendet)
    const [ranglisten, setRanglisten] = useState({});
    // Exportkonfiguration
    const [exportType, setExportType] = useState("csv");
    const [preset, setPreset] = useState("preset1");
    const [mode, setMode] = useState("preset");
    const [showDetails, setShowDetails] = useState(false);
    const [showGrades, setShowGrades] = useState(false);

    const [klassen, setKlassen] = useState([]);
    const [exportData, setExportData] = useState(null);
    const [isClosing, setIsClosing] = useState(false);


    // Klassen aus DB laden
    useEffect(() => {
        const fetchKlassen = async () => {
            try {
                const response = await fetch("/api/students/classes", {
                    credentials: "include",
                });
                if (!response.ok) throw new Error("Fehler beim Laden der Klassen");
                const data = await response.json();
                setKlassen(data.classes || []);
            } catch (error) {
                console.error("Fehler beim Abrufen der Klassen:", error);
            }
        };

        fetchKlassen();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (e.target.classList.contains("popup-overlay")) {
                handleClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Generiert Dateinamen basierend auf Auswahl
    const generateExportFilename = () => {
        if (mode === "preset") {
            return preset === "preset1"
                ? "Rangliste_Altersgruppe_Geschlecht"
                : "Rangliste_Klasse_Geschlecht";
        } else {
            const gender = filters.gender === "alle" ? "Alle" : filters.gender;
            const altersgruppe = filters.altersgruppe === "alle" ? "Alle" : filters.altersgruppe;
            const class_group = filters.class_group === "alle" ? "Alle" : filters.class_group;
            return `Rangliste_${gender}_${altersgruppe}_${class_group}`;
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };


    // Führt den Export aus (je nach Format)
    const handleExport = async () => {
        const filename = generateExportFilename();

        if (exportType === "pdf") {
            try {
                setIsGenerating(true);
                const response = await fetch("/api/export/generate-pdf", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        exportData,
                        showDetails,
                        showGrades
                    })
                });

                if (!response.ok) throw new Error("PDF-Export fehlgeschlagen");

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${filename}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Fehler beim PDF-Export:", error);
                setMessage("❌ Fehler beim PDF-Export");
            } finally {
                setIsGenerating(false);
            }
        } else if (exportType === "csv") {
            try {
                setIsGenerating(true);
                const response = await fetch("/api/export/generate-csv", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        exportData,
                        showDetails,
                        showGrades
                    })
                });

                if (!response.ok) throw new Error("CSV-Export fehlgeschlagen");

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${filename}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Fehler beim CSV-Export:", error);
                setMessage("❌ Fehler beim CSV-Export");
            } finally {
                setIsGenerating(false);
            }
        } else if (exportType === "excel") {
            try {
                setIsGenerating(true);
                const response = await fetch("/api/export/generate-excel", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        exportData,
                        showDetails,
                        showGrades
                    })
                });

                if (!response.ok) throw new Error("Excel-Export fehlgeschlagen");

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${filename}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Fehler beim Excel-Export:", error);
                setMessage("❌ Fehler beim Excel-Export");
            } finally {
                setIsGenerating(false);
            }
        }
    };

    // Berechnet Noten & generiert Ranglisten
    const handleGenerateRanking = async () => {
        setIsGenerating(true);
        setMessage("");

        try {
            // 1. Noten & Punkte zuerst berechnen
            const gradeRes = await fetch("/api/students/calculate-grade", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" }
            });

            const gradeResult = await gradeRes.json();

            if (!gradeRes.ok) {
                throw new Error(gradeResult.error || "Fehler bei der Notenberechnung");
            }

            // 2. Danach Rangliste holen
            const res = await fetch("/api/rankings/generate", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode,
                    preset,
                    filters,
                    showDetails,
                    showGrades
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Fehler beim Laden der Rangliste");
            }

            const data = await res.json();
            setRanglisten(data.ranglisten);
            setExportData(data);
            setStep(2);
            setMessage(`✅ Ranglisten für Export generiert`);
        } catch (err) {
            console.error("❌ Fehler beim Generieren:", err);
            setMessage("❌ Fehler: " + (err.message || JSON.stringify(err)));
        } finally {
            setIsGenerating(false);
        }
    };





    return (
        <div className="fixed inset-0 popup-overlay bg-black/20 z-50 flex items-end justify-center">
            <div
                className={`bg-white w-full max-w-md rounded-t-2xl p-6 shadow-xl ${isClosing ? "animate-slideOutDown" : "animate-slideInUp"}`}>
                {/* Schritt 1: Konfiguration */}
                {step === 1 && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rangliste generieren</h2>
                        <p className="text-gray-700 mb-4">Wähle eine Vorlage oder definiere eigene Filter.</p>

                        {/* Modus: preset oder custom */}
                        <div className="mb-4 text-gray-900">
                            <label className="block mb-2 font-medium text-sm">Modus wählen:</label>
                            <select value={mode} onChange={e => setMode(e.target.value)}
                                    className="w-full p-2 border rounded">
                                <option value="preset">Vorlage verwenden</option>
                                <option value="custom">Eigene Filter definieren</option>
                            </select>
                        </div>

                        {/* Vorlage oder Filter anzeigen */}
                        {mode === "preset" ? (
                            <div className="mb-4 text-gray-900">
                                <label className="block mb-2 font-medium text-sm">Vorlage:</label>
                                <select value={preset} onChange={e => setPreset(e.target.value)}
                                        className="w-full p-2 border rounded">
                                    <option value="preset1">Nach Alterskategorie & Geschlecht</option>
                                    <option value="preset2">Nach Klasse & Geschlecht</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 mb-4 text-gray-900">
                                <label className="text-sm">Geschlecht</label>
                                <select
                                    value={filters.gender}
                                    onChange={e => setFilters(prev => ({...prev, gender: e.target.value}))}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="alle">Alle</option>
                                    <option value="maennlich">Männlich</option>
                                    <option value="weiblich">Weiblich</option>
                                </select>

                                <label className="text-sm">Altersgruppe</label>
                                <select
                                    value={filters.altersgruppe}
                                    onChange={e => setFilters(prev => ({...prev, altersgruppe: e.target.value}))}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="alle">Alle</option>
                                    <option value="-15">-15</option>
                                    <option value="16-17">16-17</option>
                                    <option value="18+">18+</option>
                                </select>

                                <label className="text-sm">Klasse</label>
                                <select
                                    value={filters.class_group}
                                    onChange={e => setFilters(prev => ({...prev, class_group: e.target.value}))}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="alle">Alle Klassen</option>
                                    {klassen.map(k => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Anzeigeoptionen */}
                        <div className="mb-4">
                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <h3 className="font-medium text-blue-800 mb-1">Anzeigeoptionen</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showDetails"
                                            checked={showDetails}
                                            onChange={() => setShowDetails(prev => !prev)}
                                        />
                                        <label htmlFor="showDetails" className="text-sm text-gray-800">Disziplin-Resultate
                                            anzeigen</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showGrades"
                                            checked={showGrades}
                                            onChange={() => setShowGrades(prev => !prev)}
                                        />
                                        <label htmlFor="showGrades" className="text-sm text-gray-800">Noten
                                            anzeigen</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Format auswählen */}
                        <div className="text-gray-900 mb-4">
                            <label className="block mb-2 font-medium text-sm">Exportformat:</label>
                            <select value={exportType} onChange={e => setExportType(e.target.value)}
                                    className="w-full p-2 border rounded">
                                <option value="csv">CSV</option>
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onClick={async () => {
                                    await handleGenerateRanking(); // dann Rangliste generieren
                                }}
                                disabled={isGenerating}
                                className={`py-3 rounded-lg font-semibold ${isGenerating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                            >
                                {isGenerating ? "Generiere..." : "Ranglisten generieren"}
                            </button>
                        </div>

                        {message && <p className="mt-2 text-sm text-center text-gray-800">{message}</p>}
                    </>
                )}

                {/* Schritt 2: Exportieren */}
                {step === 2 && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Exportieren</h2>
                        <p className="text-gray-700 mb-4">Exportiere deine generierte Rangliste im gewählten Format.</p>
                        <button
                            onClick={handleExport}
                            className="w-full py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                            disabled={isGenerating}
                        >
                            {isGenerating ? "Wird exportiert..." : `Exportieren als ${exportType.toUpperCase()}`}
                        </button>
                    </>
                )}

                {/* Fenster schliessen */}
                <div className="mt-6 text-center">
                    <button onClick={handleClose} className="text-sm text-gray-500 hover:underline">
                        Fenster schliessen
                    </button>
                </div>
            </div>

            <style jsx>{`
                .animate-slideInUp {
                    animation: slideInUp 0.3s ease-out;
                }

                .animate-slideOutDown {
                    animation: slideOutDown 0.3s ease-in;
                }

                @keyframes slideInUp {
                    0% {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOutDown {
                    0% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                }
            `}</style>

        </div>
    );
}