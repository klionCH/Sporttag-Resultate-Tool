// app/layout.js
import "./globals.css";
import ClientLayout from "./client-layout";

export const metadata = {
    title: "Sporttag App",
    description: "Tool für Resultate",
};

export default function RootLayout({ children }) {
    return (
        <html lang="de">
        <body>
            {children}
        </body>
        </html>
    );
}
