import "./globals.css";
import "@/styles/main.scss";
import { DeckProvider } from "@/context/DeckContext";
import ReadingDeck from "@/components/ReadingDeck";

export const metadata = {
  title: "Biblioteca Mea Digitală | Catalog & Inventar Cărți",
  description: "Platformă personală pentru inventarierea și prezentarea bibliotecii fizice.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro" className="bg-[#120f17]" style={{ colorScheme: "dark" }}>
      <body className="bg-[#120f17] text-slate-100 min-h-screen antialiased relative overflow-x-hidden">
        <DeckProvider>
          {children}
          <ReadingDeck />
        </DeckProvider>
      </body>
    </html>
  );
}

