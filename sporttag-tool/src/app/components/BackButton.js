"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import ExportPopup from "@/app/components/ExportPopup";


export default function BackButton() {
    const router = useRouter();
    const [showExport, setShowExport] = useState(false);
    const [role, setRole] = useState(null);

    // Rolle des Benutzers abrufen
    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await fetch("/api/me", { cache: "no-store", credentials: "include",});
                if (!res.ok) {
                    if (res.status === 403) {
                        router.push("/login");
                        return;
                    }
                    if (res.status === 401) {
                        console.warn("Token abgelaufen. Weiterleitung zur Login-Seite...");
                        window.location.href = "/login";
                        return;
                    }
                    setRole(null);
                } else {
                    const data = await res.json();
                    setRole(data.role ?? null);
                }
            } catch {
                setRole(null);
            }
        };
        fetchRole();
    }, []);

    return (
        <>
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-wrap justify-center gap-4 rounded-md sm:rounded-xl px-4 py-2 sm:px-6 sm:py-4 w-fit max-w-[90%] shadow-lg shadow-black/30 backdrop-blur-md border border-gray-300 bg-white/20 hover:scale-105 transition-all duration-200">
                {/* Zurück-Button */}
                <button
                    onClick={() => router.back()}
                    className="group relative inline-flex items-center gap-2 rounded-lg border border-blue-600 px-5 py-2 text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:shadow-md focus:outline-none bg-white/30">
                    <ArrowLeft className="w-5 h-5 transition-transform duration-200 transform group-hover:-translate-x-1 group-hover:text-white" />
                    <span className="hidden sm:inline relative z-10 transition-colors duration-200 group-hover:text-white">
                        Zurück
                    </span>
                </button>

                {/* Exportieren-Button */}
                {role === "teacher" && (
                    <button
                        onClick={() => setShowExport(true)}
                        className="group relative inline-flex items-center gap-2 rounded-lg border border-blue-600 px-5 py-2 text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:shadow-md focus:outline-none bg-white/30">
                        <Upload className="w-5 h-5 transition-transform duration-200 transform group-hover:-translate-y-0.5 group-hover:text-white" />
                        <span className="hidden sm:inline relative z-10 transition-colors duration-200 group-hover:text-white">
                            Exportieren
                        </span>
                    </button>
                )}
            </div>

            {/* Export Popup */}
            {showExport && <ExportPopup onClose={() => setShowExport(false)} />}
        </>
    );
}