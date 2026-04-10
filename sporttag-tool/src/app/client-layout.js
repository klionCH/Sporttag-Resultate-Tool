// app/client-layout.js
"use client";

import BackButton from "./components/BackButton";

export default function ClientLayout({ children }) {
    return (
        <>
            {children}
            <BackButton />
        </>
    );
}
