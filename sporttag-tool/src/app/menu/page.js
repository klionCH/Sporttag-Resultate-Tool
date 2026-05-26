"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, PieChart } from "lucide-react";
import BackButton from "@/app/components/BackButton";
import { useRouter } from "next/navigation";

export default function Menu() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();
        if (data.role) setRole(data.role);

        router.refresh();
      } catch (err) {
        console.warn("Nicht eingeloggt oder Fehler beim Abrufen der Rolle.");
        router.push("/login");
      }
    };
    checkRole();
  }, []);


  return (
      <div className="wrapper-container">
        <div className="transparent-container text-center flex justify-center items-center">
          <h1 className="big-title">Leichtathletik Sporttag</h1>

          <div className="flex gap-8 md:flex-row flex-col mt-2">
            {role === "teacher" && (
                <Link href="/upload">
                  <div className="w-52 h-52 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition">
                    <div className="bg-blue-100 p-5 rounded-full flex items-center justify-center">
                      <Upload size={40} className="text-blue-600" />
                    </div>
                    <p className="mt-4 text-lg text-gray-700 font-medium text-center">
                      Dashboard
                    </p>
                  </div>
                </Link>
            )}

            <Link href="/sports">
              <div className="w-52 h-52 border-2 border-green-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition">
                <div className="bg-green-100 p-5 rounded-full flex items-center justify-center">
                  <PieChart size={40} className="text-green-600" />
                </div>
                <p className="mt-4 text-lg text-gray-700 font-medium text-center">
                  Ergebnisse / <br /> Rangliste
                </p>
              </div>
            </Link>

          </div>

        </div>
          <BackButton/>

      </div>
  );
}
