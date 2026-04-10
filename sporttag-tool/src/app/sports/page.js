"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import Image from "next/image"
import PlaceholderImage from "../../../public/placeholder.png"
import BackButton from "@/app/components/BackButton";


export default function SportsOverview() {
    const [sports, setSports] = useState([])

    const fetchSports = async () => {
        try {
            const res = await fetch("/api/sports/all", {credentials: "include",});
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setSports(json.data);
        } catch (error) {
            console.error("Fehler beim Laden der Sportarten:", error);
        }
    };

    useEffect(() => {
        fetchSports();
    }, []);

    return (
        <div className="wrapper-container h-screen flex items-center justify-center">
            <div className="transparent-container">

                {/* Sportarten Auswahl Titel */}
                <div className="w-full py-6 flex items-center justify-center">
                    <h1 className="text-4xl font-light text-gray-900">Sportarten auswählen</h1>
                </div>

                {/* Responsive Grid bleibt im transparent-container */}
                <div className="w-full flex-1 flex justify-center items-center">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                        {sports.map((sport) => (
                            <Link href={`/sports/${sport.code}`} key={sport.id}>
                                <div className="aspect-square border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition flex flex-col items-center justify-center p-4">

                                    {/* Bild */}
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex items-center justify-center">
                                    {
                                sport.svg_url ? (
                                    <img
                                    src={sport.svg_url}
                                    alt={sport.name}
                                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
                                    />
                                ) : (
                                    <Image
                                    src={PlaceholderImage}
                                    alt={sport.name}
                                    width={150}
                                    height={150}
                                    />
                                )
                                }
                                    </div>

                                    {/* Name Disziplin */}
                                    <p className="text-gray-700 text-lg sm:text-xl md:text-2xl font-semibold text-center mt-2">{sport.name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
            <BackButton/>

        </div>
    )
}
