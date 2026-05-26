"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, ClipboardList } from "lucide-react";
import BackButton from "@/app/components/BackButton";


const UnsavedChangesModal = ({ isOpen, onClose, onSave, isSaving }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 px-4 transition-opacity duration-300 ease-in-out">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Ungespeicherte Änderungen
                </h2>
                <p className="text-gray-700 mb-6">
                    Es gibt ungespeicherte Änderungen auf dieser Seite. Möchten Sie speichern, bevor Sie fortfahren?
                </p>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={!isSaving ? onSave : undefined}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Speichert..." : "Speichern und fortfahren"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function GroupResults() {
    const {sport, group} = useParams();
    const router = useRouter();
    const groupKeys = group.split(",");


    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [attemptHeights, setAttemptHeights] = useState({});
    const [results, setResults] = useState({});
    const [scores, setScores] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showScale, setShowScale] = useState(false);
    const [pointsData, setPointsData] = useState([]);
    const [sportName, setSportName] = useState("");
    const [skippedStudents, setSkippedStudents] = useState({});
    const [isOpen, setIsOpen] = useState(false);
    const [openAccordion, setOpenAccordion] = useState(null);
    const storageKey = `sportresults_${sport}_${group}`;

    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    const [sportConfig, setSportConfig] = useState({
        attempts: 4,
        unit: '',
        checkFails: false,
    });

    const fetchStudents = async () => {
        try {
            const response = await fetch(`/api/students?gruppen=${groupKeys.join(",")}`, {credentials: "include",});
            const json = await response.json();

            if (!response.ok) {
                console.error("Fehler beim Laden der Schüler:", json.error);
                return;
            }

            const data = json.data;
            const numAttempts = sportConfig.attempts || 3;

            setStudents(data);

            const initialSkipped = {};
            const initialAttemptHeights = {};
            const initialResults = {};
            const initialScores = {};

            data.forEach(student => {
                initialSkipped[student.id] = false;
                initialAttemptHeights[student.id] = Array(numAttempts).fill("");
                initialResults[student.id] = Array(numAttempts).fill(null);
                initialScores[student.id] = Array(numAttempts).fill("");
            });

            setSkippedStudents(initialSkipped);
            setAttemptHeights(initialAttemptHeights);
            setResults(initialResults);
            setScores(initialScores);

            fetchExistingResults(data.map(s => s.id));
        } catch (err) {
            console.error("Fehler bei fetchStudents:", err);
        }
    };
    const fetchSportConfig = async () => {
        try {
            const res = await fetch(`/api/sports?sport=${sport}`, {credentials: "include",});
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || "Fehler beim Laden der Sport-Konfiguration");

            const data = json.data;

            setSportConfig({
                code: data.code,
                attempts: data.attempts,
                unit: data.mesure_unit_short,
                checkFails: data.check_fail,
                time_measure: data.time_measure,
                measure: data.measure,
            });

            setSportName(data.name);
        } catch (error) {
            console.error("Fehler beim Laden der Sportdaten:", error);
        }
    };

    const fetchScale = async () => {
        const genderList = ["maennlich", "weiblich"];
        const allData = [];

        for (const genderValue of genderList) {
            const res = await fetch(`/api/points?sport=${sport}&gender=${genderValue}`, {
                credentials: "include",
            });

            const json = await res.json();

            if (res.ok && json.data?.length > 0) {
                allData.push({ gender: genderValue, data: json.data });
            } else {
                console.error("Fehler beim Laden der Punkteskala für", genderValue, ":", json.error);
            }
        }

        setPointsData(allData);

    };

    const fetchExistingResults = async (studentIds) => {
        try {
            const res = await fetch("/api/results/results-by-students", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentIds, sport }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Fehler beim Laden der bestehenden Resultate.");

            const data = json.data;
            if (!data || data.length === 0) return;

            const numAttempts = sportConfig.attempts || 3;

            setAttemptHeights(prev => {
                const next = { ...prev };
                data.forEach(result => {
                    if (result.heights) {
                        next[result.student_id] = normalizeArray(result.heights, numAttempts, null);
                    }
                });
                return next;
            });

            setResults(prev => {
                const next = { ...prev };
                data.forEach(result => {
                    if (result.attempt_results) {
                        next[result.student_id] = normalizeArray(result.attempt_results, numAttempts, null);
                    }
                });
                return next;
            });

            setScores(prev => {
                const next = { ...prev };
                data.forEach(result => {
                    if (result.scores) {
                        next[result.student_id] = normalizeArray(result.scores, numAttempts, null);
                    }
                });
                return next;
            });

            setSkippedStudents(prev => {
                const next = { ...prev };
                data.forEach(result => {
                    if (result.skipped !== undefined) next[result.student_id] = result.skipped;
                });
                return next;
            });

            setHasChanges(false);
        } catch (err) {
            console.error("Fehler bei fetchExistingResults:", err);
        }
    };

    const normalizeArray = (arr, length, fillValue) => {
        let base = arr;

        if (typeof base === "string") {
            try {
                base = JSON.parse(base);
            } catch {
                base = [];
            }
        }

        if (base && typeof base === "object" && !Array.isArray(base)) {
            const keys = Object.keys(base);
            if (keys.every(k => !isNaN(Number(k)))) {
                const max = Math.max(...keys.map(Number), -1);
                base = Array.from({ length: max + 1 }, (_, i) => base[i] ?? fillValue);
            }
        }

        if (!Array.isArray(base)) base = [];

        if (base.length >= length) return base.slice(0, length);
        return [...base, ...Array(length - base.length).fill(fillValue)];
    };

    const saveResults = useCallback(async (onComplete) => {
        setSaved(false);
        setIsSaving(true);

        try {
            const response = await fetch("/api/results", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    students,
                    sport,
                    group,
                    skippedStudents,
                    attemptHeights,
                    results,
                    scores,
                    sportConfig
                })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Fehler beim Speichern");

            setSaved(true);
            setHasChanges(false);

            if (typeof onComplete === 'function') {
                onComplete();
            }
        } catch (error) {
            console.error("Speicherfehler:", error);
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaved(false), 2500);
        }
    }, [students, sport, group, skippedStudents, attemptHeights, results, scores, sportConfig]);

    const handleInputChange = (studentId, index, value, type) => {
        const setter = type === "height" ? setAttemptHeights : setScores;

        setter(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));

        setHasChanges(true);
    };

    const handleResultChange = (studentId, index, value) => {
        setResults(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));

        setHasChanges(true);
    };

    const handleCheckboxChange = (studentId, checked) => {
        setSkippedStudents(prev => ({
            ...prev,
            [studentId]: checked,
        }));

        setHasChanges(true);
    };

    const renderInputFields = (student, type) => {
    const numAttempts = sportConfig.attempts || 3;
    const values = type === "height"
        ? (attemptHeights[student.id] ?? Array(numAttempts).fill(""))
        : (scores[student.id] ?? Array(numAttempts).fill(""));

        return Array.from({ length: numAttempts }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
                <span className="font-semibold">{index + 1}.</span>
                <input
                    type="number"
                    step="0.01"
                    className="w-24 px-3 py-2 text-center border border-blue-600 rounded-md placeholder-blue-600 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={values[index] || ""}
                    onChange={(e) => handleInputChange(student.id, index, e.target.value, type)}
                    disabled={!!skippedStudents[student.id]}
                    title={skippedStudents[student.id] ? "Nicht teilgenommen" : ""}
                />
                {sportConfig.unit}
                {type === "height" && (
                    <>
                        <button
                            className={`p-2 rounded-lg ${results[student.id][index] === true ? 'bg-green-400' : 'bg-gray-200'}`}
                            onClick={() => handleResultChange(student.id, index, true)}
                        >✔</button>
                        <button
                            className={`p-2 rounded-lg ${results[student.id][index] === false ? 'bg-red-400' : 'bg-gray-200'}`}
                            onClick={() => handleResultChange(student.id, index, false)}
                        >✘</button>
                    </>
                )}
            </div>
        ));
    };

    useEffect(() => {
        fetchSportConfig();
        fetchScale();
    }, [sport]);

    useEffect(() => {
        if (sportConfig.attempts) fetchStudents();
    }, [sportConfig]);

    useEffect(() => {
        const result = students.filter(student => {
            const present = student.present_bool === true;
            const notHelper = !student.assistant_bool;
            const matches = !searchQuery || `${student.name} ${student.surname}`.toLowerCase().includes(searchQuery.toLowerCase());
            return present && notHelper && matches;
        });

        result.sort((a, b) => {
            const nameA = `${a.surname} ${a.name}`.toLowerCase();
            const nameB = `${b.surname} ${b.name}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        setFilteredStudents(result);
    }, [searchQuery, students]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasChanges && students.length > 0 && !saved) {
                e.preventDefault();

                e.returnValue = "";

                setShowUnsavedModal(true);
                setPendingAction('reload');

                return "";
            }
        };

        const handleClick = (e) => {
            const anchor = e.target.closest('a');
            if (anchor && anchor.href && hasChanges && students.length > 0 && !saved) {
                e.preventDefault();
                setShowUnsavedModal(true);
                setPendingAction(anchor.href);
            }
        };

        const handleRouteChange = (url) => {
            if (hasChanges && students.length > 0 && !saved) {
                setShowUnsavedModal(true);
                setPendingAction(url);
                router.events?.emit('routeChangeError');
                throw 'Navigation wegen ungespeicherten Änderungen abgebrochen.';
            }
        };

        const handlePopState = (e) => {
            if (hasChanges && students.length > 0 && !saved) {
                history.pushState(null, document.title, window.location.href);
                setShowUnsavedModal(true);
                setPendingAction('back');
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("click", handleClick);
        window.addEventListener("popstate", handlePopState);

        if (hasChanges && students.length > 0) {
            history.pushState(null, document.title, window.location.href);
        }

        if (router.events) {
            router.events.on("routeChangeStart", handleRouteChange);
        }

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("click", handleClick);
            window.removeEventListener("popstate", handlePopState);
            if (router.events) {
                router.events.off("routeChangeStart", handleRouteChange);
            }
        };
    }, [hasChanges, students, saved, router]);   
    const handleSaveAndContinue = () => {
        saveResults(() => {
            setHasChanges(false);

            if (pendingAction === 'reload') {
                window.location.reload();
            } else if (pendingAction === 'back') {
                window.history.back();
            } else if (typeof pendingAction === 'string') {
                const isExternal = !pendingAction.startsWith("/") && !pendingAction.includes(window.location.origin);

                if (!isExternal) {
                    router.push(pendingAction);
                } else {
                    window.location.href = pendingAction;
                }
            }

            setPendingAction(null);
            setShowUnsavedModal(false);
        });
    };


    const handleCancelSave = () => {
        setShowUnsavedModal(false);
        setPendingAction(null);
    };

    return (
        <div className="wrapper-container p-4">
            <div className="transparent-container mb-15">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">
                    Ergebnisse für {sportName || sport}
                </h1>

                {/* Top button section */}
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => setShowScale(true)}
                        className="inline-flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-600 hover:text-white hover:shadow-md transition-all duration-200 focus:outline-none"
                    >
                        <ClipboardList className="w-5 h-5" />
                        <span>Punkteskala</span>
                    </button>
                </div>

                {/* Search input */}
                <div className="mb-4 w-full relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Schüler suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-blue-600 rounded-md text-gray-900 placeholder-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                    />
                </div>

                {/* Student list with inputs */}
                <div className="flex-grow overflow-y-auto flex flex-col gap-4">
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            className={`bg-white shadow-md p-4 rounded-xl border border-gray-300 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between
              ${skippedStudents[student.id] ? "opacity-50 line-through" : ""}`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-2">
                                <label className="flex items-center gap-2 text-sm text-gray-500">
                                    <input
                                        type="checkbox"
                                        checked={!!skippedStudents[student.id]}
                                        onChange={(e) => handleCheckboxChange(student.id, e.target.checked)}
                                        className="accent-red-500 scale-110"
                                    />
                                    <span>Nicht teilgenommen</span>
                                </label>
                                <p className="text-lg font-semibold text-gray-900">
                                    {student.name} {student.surname}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4 justify-center text-gray-900">
                                {sportConfig.checkFails === true
                                    ? renderInputFields(student, "height")
                                    : renderInputFields(student, "score")}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Save button */}
                {students.length > 0 && (
                    <div className="mt-6 flex flex-col items-center">
                        <button
                            onClick={() => saveResults()}
                            disabled={isSaving}
                            className={`inline-flex items-center gap-2 px-6 py-2 rounded-md border border-blue-600 text-blue-600 font-semibold transition-all duration-200 shadow-sm
              ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white hover:shadow-md'}`}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Speichern...
                                </>
                            ) : saved ? (
                                <>
                                    <CheckCircle size={18} />
                                    Gespeichert!
                                </>
                            ) : (
                                'Ergebnisse speichern'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Points scale modal */}
            {showScale && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 px-4 transition-opacity duration-300 ease-in-out"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowScale(false);
                    }}
                >
                    <div className="bg-white w-full max-w-2xl p-6 rounded-2xl shadow-xl border border-gray-200 overflow-y-auto max-h-[80vh] transform transition-all duration-300 ease-out">
                        {/* Modal content */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">
                                Punkteskala – {sportName || sport}
                            </h2>
                            <button
                                onClick={() => setShowScale(false)}
                                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {pointsData.length === 0 && (
                            <div className="text-center p-6 text-gray-600 rounded-md border border-dashed border-gray-300 bg-gray-50">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="mt-2 font-medium">Keine Punkteskala gefunden.</p>
                                <p className="text-sm mt-1">Für diese Sportart sind keine Punktedaten verfügbar.</p>
                            </div>
                        )}

                        {/* Desktop Grid View */}
                        <div className="hidden md:grid grid-cols-2 gap-6">
                            {pointsData.map(({ gender, data }) => (
                                <div key={gender} className="rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md duration-200">
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 py-3 px-4 border-b border-gray-200">
                                        <h3 className="text-md font-semibold text-gray-800 text-center">
                                            {gender === "maennlich" ? "♂ Männlich" : "♀ Weiblich"}
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm text-left text-gray-700">
                                            <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-gray-700">Leistung</th>
                                                <th className="px-4 py-3 font-semibold text-right text-gray-700">Punkte</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {data.map((row, i) => (
                                                <tr key={i} className="hover:bg-blue-50 transition-colors duration-200">
                                                    <td className="px-4 py-2">{row.performance} {sportConfig.unit}</td>
                                                    <td className="px-4 py-2 text-right font-medium">{row.points}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            {pointsData.length === 1 && <div />}
                        </div>

                        {/* Mobile Accordion View - Now Scrollable */}
                        <div className="block md:hidden space-y-4 text-gray-800">
                            {pointsData.map(({ gender, data }, index) => (
                                <div
                                    key={gender}
                                    className="border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all"
                                >
                                    <button
                                        onClick={() => setOpenAccordion(openAccordion === index ? null : index)}
                                        className="w-full bg-gradient-to-r from-blue-50 to-blue-100 py-3 px-4 font-semibold text-left cursor-pointer flex items-center justify-between transition-colors hover:from-blue-100 hover:to-blue-200"
                                    >
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600">
                        {gender === "maennlich" ? "♂" : "♀"}
                      </span>
                      <span>{gender === "maennlich" ? "Männlich" : "Weiblich"}</span>
                    </span>
                                        <svg
                                            className={`w-5 h-5 text-blue-600 transform transition-transform duration-300 ${
                                                openAccordion === index ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Animation container */}
                                    <div
                                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                            openAccordion === index ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
                                        }`}
                                        style={{
                                            transitionProperty: 'max-height, opacity',
                                            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        {/* Scrollable container */}
                                        <div className="max-h-60 overflow-y-auto bg-white">
                                            <table className="w-full text-sm text-left text-gray-700 divide-y divide-gray-200">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-2 text-gray-700">Leistung</th>
                                                    <th className="px-4 py-2 text-right text-gray-700">Punkte</th>
                                                </tr>
                                                </thead>
                                                <tbody className="bg-white">
                                                {data.map((row, j) => (
                                                    <tr key={j} className="hover:bg-blue-50 transition-colors">
                                                        <td className="px-4 py-2">{row.performance} {sportConfig.unit}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{row.points}</td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setShowScale(false)}
                                className="inline-flex items-center gap-2 border-2 border-blue-600 text-blue-600 px-5 py-2 rounded-md hover:bg-blue-600 hover:text-white hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Schliessen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsaved Changes Modal */}
            <UnsavedChangesModal
                isOpen={showUnsavedModal}
                onClose={handleCancelSave}
                onSave={handleSaveAndContinue}
                isSaving={isSaving}
            />


            <BackButton />
        </div>
    );
}