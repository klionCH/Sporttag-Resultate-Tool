// app/context/RoleContext.js
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const RoleContext = createContext();

export function RoleProvider({ children }) {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await fetch("/api/me",{credentials: "include",});
                const data = await res.json();
                setRole(data.role || null);
            } catch {
                setRole(null);
            } finally {
                setLoading(false);
            }
        };
        fetchRole();
    }, []);

    return (
        <RoleContext.Provider value={{ role, loading }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    return useContext(RoleContext);
}
