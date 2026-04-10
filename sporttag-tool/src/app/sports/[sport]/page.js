"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation"
import BackButton from "@/app/components/BackButton";


export default function GroupOverview() {
    const { sport } = useParams();
    const [groups, setGroups] = useState([]);
    const [sportName, setSportName] = useState("");
    const [selectedGroups, setSelectedGroups] = useState([]);

    const toggleGroup = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleGoToResults = () => {
        if (selectedGroups.length > 0) {
            const groupParam = selectedGroups.join(",");
            window.location.href = `/sports/${sport}/${groupParam}`;
        }
    };

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await fetch("/api/students/groups", {credentials: "include",});
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);

                const sorted = json.data.sort((a, b) => {
                    if (a.class_group === b.class_group) {
                        return a.gender.localeCompare(b.gender);
                    }
                    return a.class_group.localeCompare(b.class_group, undefined, { numeric: true });
                });

                setGroups(sorted);
            } catch (err) {
                console.error("Fehler beim Laden der Gruppen:", err);
            }
        };

        fetchGroups();
    }, []);

    useEffect(() => {
        const fetchSportName = async () => {
            try {
                const res = await fetch(`/api/sports?sport=${sport}`, {credentials: "include",});
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);
                setSportName(json.data.name);
            } catch (error) {
                console.error("Fehler beim Laden des Sportnamens:", error);
            }
        };

        if (sport) fetchSportName();
    }, [sport]);

    return (
        <div className="wrapper-container min-h-screen flex flex-col overflow-auto">
            <div
                className="transparent-container relative w-full flex flex-col items-center sm:min-h-[90dvh] sm:max-h-[90dvh] sm:overflow-hidden overflow-visible">

                <div className="w-full py-6 flex items-center justify-center rounded-t-lg">
                    <h1 className="text-4xl font-light text-gray-900">
                        Gruppen für {sportName || sport}
                    </h1>
                </div>

                <div className="w-full z-10 flex justify-center sm:sticky sm:top-[1rem] sm:bg-transparent">
                    <button
                        onClick={handleGoToResults}
                        disabled={selectedGroups.length === 0}
                        className={`group relative inline-flex items-center gap-2 rounded-lg border px-6 py-2 transition-all duration-200 focus:outline-none ${
                            selectedGroups.length === 0
                                ? 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100'
                                : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-md'
                        }`}
                    >
                        <span
                            className="relative z-10 transition-colors duration-200 group-hover:text-inherit sm:text-lg text-sm">
                            Ergebnisse eintragen <br></br> ({selectedGroups.length} Gruppen)
                        </span>
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 transform ${
                                selectedGroups.length === 0
                                    ? 'text-gray-400'
                                    : 'group-hover:translate-x-1 group-hover:text-white'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                        </svg>
                    </button>
                </div>

                <div className="w-full flex-1 flex justify-center items-start px-4 py-8 overflow-auto">
                    <div className="w-full max-w-6xl">
                        <div
                            className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                            {groups.map(({id, class_group, gender}) => (
                                <div
                                    key={id}
                                    onClick={() => toggleGroup(id)}
                                    className={`cursor-pointer relative aspect-square border-2 ${
                                        selectedGroups.includes(id) ? 'border-blue-600 bg-blue-50' : 'border-green-500'
                                    } rounded-lg transition flex flex-col items-center justify-center p-2 sm:p-3 md:p-4`}
                                >
                                    <p className="text-gray-700 text-base sm:text-lg md:text-xl font-semibold text-center">
                                        {class_group}
                                    </p>
                                    <div
                                        className={`absolute bottom-0 right-0 w-0 h-0 
                        border-b-[15px] border-l-[15px] 
                        sm:border-b-[25px] sm:border-l-[25px] 
                        md:border-b-[30px] md:border-l-[30px]
                        border-transparent rounded-br-md ${
                                            gender === 'weiblich' ? 'border-b-pink-500' : 'border-b-blue-500'
                                        }`}
                                    ></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <BackButton/>
        </div>
    );
}
