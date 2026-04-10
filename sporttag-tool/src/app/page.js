"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatedTooltip } from "./components/AnimatedTooltip"; // ggf. Pfad anpassen

export default function Home() {
  const [logoFadeOut, setLogoFadeOut] = useState(false);
  const [bgFadeOut, setBgFadeOut] = useState(false);
  const [removeSplash, setRemoveSplash] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoFadeOut(true), 1400);
    const t2 = setTimeout(() => setBgFadeOut(true), 1000);
    const t3 = setTimeout(() => setRemoveSplash(true), 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const people = [
    {
      id: 1,
      name: "Dominik Hämmerle",
      designation: "Frontend Engineer & Doc-Author",
      image: "https://images.weserv.nl/?url=github.com/thats-dominik.png",
      github: "https://github.com/thats-dominik/",
    },
    {
      id: 2,
      name: "Sven Lübcke",
      designation: "Backend Developer & Chief of Developement",
      image: "https://images.weserv.nl/?url=github.com/klionCH.png",
      github: "https://github.com/klionCH/",
    },
    {
      id: 3,
      name: "Devin Mugglin",
      designation: "Chief of Testing / aromatischer Zwischenmoment-Kurator",
      image: "https://qcxsrkpddxkljwaiqyux.supabase.co/storage/v1/object/sign/images/devin.JPG?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWFnZXMvZGV2aW4uSlBHIiwiaWF0IjoxNzQ0MjA2Mzg2LCJleHAiOjIwMjgwMzAzODZ9.5Wmt7DL5TTb6Tc-xv88FJYzm8Knqo2gCEbQn36QMyew",
      github: "https://github.com/de27vin/",
    }
  ];

  return (
    <div className="relative min-h-screen">
      {/* Splash Overlay */}
      {!removeSplash && (
        <div className={`fixed inset-0 z-50 bg-white flex items-center justify-center ${bgFadeOut ? "animate-fade-out" : ""}`}>
          <Image
            src="/resulta-x-kbw.svg"
            alt="Splash Logo"
            width={800}
            height={400}
            className={`object-contain ${logoFadeOut ? "animate-fade-out" : "animate-fade-in"}`}
          />
        </div>
      )}

      {/* Hauptinhalt */}
      <div className="wrapper-container">
        <div className="transparent-container text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Willkommen zum Leichtathletik-Sporttag!
          </h1>
          <p className="text-lg text-gray-700 mb-4">
            Ein Projekt im Rahmen der IDPA – entwickelt zur einfachen Verwaltung von Ergebnissen und Teilnehmern.  
            Logge dich ein, um Schülerdaten zu verwalten und Leistungen zu erfassen.
          </p>
          <Link href="/login">
  <button className="group relative inline-flex items-center gap-2 rounded-lg border border-blue-600 px-6 py-2 text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:shadow-md focus:outline-none">
    <span className="relative z-10 transition-colors duration-200 group-hover:text-white">
      Zum Login
    </span>
    <svg
      className="w-4 h-4 transition-transform duration-200 transform group-hover:translate-x-1 group-hover:text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  </button>
</Link>
          <div className="flex items-center justify-center gap-16 mt-4">
  {/* RESULTA Logo */}
  <div className="flex justify-end w-[280px]">
    <Image
      src="/resulta.svg"
      alt="RESULTA Logo"
      width={200}
      height={200}
      className="object-contain max-h-40"
    />
  </div>

  {/* Trennlinie (zentriert, dick, #0A74BB) */}
  <div className="w-[4px] h-32 rounded-full" style={{ backgroundColor: '#0A74BB' }} />

  {/* KBW Logo */}
  <div className="flex justify-start w-[280px]">
    <Image
      src="/kbw.svg"
      alt="Kantonsschule Büelrain"
      width={250}
      height={210}
      className="object-contain max-h-40"
    />
  </div>
</div>
      {/* AnimatedTooltip */}
      <div className="mt-16 flex justify-center">
        <div className="flex justify-between mr-3">
          <AnimatedTooltip items={people} />
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}