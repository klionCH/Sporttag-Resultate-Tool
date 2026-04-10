"use client";
import { useEffect } from "react";

export default function CalendarModal({ children, onClose }) {
    useEffect(() => {
        // ESC schließt das Modal
        const handleEsc = (e) => {
            if (e.key  === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "auto";
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm backdrop-saturate-150 transition-all duration-300">
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
            >
              &times;
            </button>
            
            <h2 className="text-lg font-semibold text-center mb-4 text-gray-800">
              Wähle das Datum des Sporttages aus
            </h2>
      
            {children}
          </div>
        </div>
      );
}