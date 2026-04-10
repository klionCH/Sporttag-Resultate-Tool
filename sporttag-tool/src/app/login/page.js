"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Cookies mit der Anfrage senden
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unbekannter Fehler");
        setIsLoading(false);
        return;
      }

      // Speichert das Token im localStorage für das Menü
      localStorage.setItem("authToken", data.token);

      router.replace("/menu");
    } catch (error) {
      console.error("Login error:", error);
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container text-center flex justify-center items-center">
          <section>
            <h1 className="text-5xl font-light text-gray-900 mb-10">
              Leichtathletik Sporttag
            </h1>
            <p className="text-4xl text-gray-700 mb-6">Login</p>
          </section>

          <section>
            <form onSubmit={handleLogin} className="flex flex-col space-y-4 items-center">
              <label className="text-lg font-semibold text-gray-900">
                Benutzername
              </label>
              <input
                  type="text"
                  className="bg-white/60 text-gray-900 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
              />

              <label className="text-lg font-semibold text-gray-900">
                Passwort
              </label>
              <input
                  type="password"
                  className="bg-white/60 text-gray-900 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
              />

              {error && <p className="text-red-600 mt-2">{error}</p>}

              <button
  type="submit"
  disabled={isLoading}
  className={`group relative inline-flex items-center gap-2 rounded-lg border border-blue-600 px-6 py-2 text-blue-600 transition-all duration-200 focus:outline-none ${
    isLoading
      ? "opacity-70 cursor-not-allowed"
      : "hover:bg-blue-600 hover:text-white hover:shadow-md"
  }`}
>
  <span className="relative z-10 transition-colors duration-200 group-hover:text-white">
    {isLoading ? "WIRD GELADEN..." : "LOGIN"}
  </span>

  {!isLoading && (
    <svg
      className="w-4 h-4 transition-transform duration-200 transform group-hover:translate-x-1 group-hover:text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  )}
</button>
            </form>
          </section>
        </div>
      </div>
  );
}
