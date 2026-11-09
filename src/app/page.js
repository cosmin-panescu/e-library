import { getAllBooks } from "@/lib/books";
import BookCatalog from "@/components/BookCatalog";
import ShinyText from "@/components/ShinyText";
import SideRays from "@/components/SideRays";

export default function Home() {
  const books = getAllBooks();

  return (
    <div className="min-h-screen bg-[#120f17]">
      {/* HERO */}
      <div className="relative overflow-hidden bg-[#120f17] py-16 sm:py-24">
        {/* SideRays */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <SideRays
            origin="top-right"
            speed={1.5}
            rayColor1="#EAB308"
            rayColor2="#96c8ff"
            intensity={2.6}
            spread={2.6}
            falloff={1.05}
            saturation={1.6}
            opacity={0.9}
            blend={0.75}
          />
        </div>

        {/* Titlu */}
        <section className="flex items-center justify-center text-center px-4 max-w-4xl mx-auto relative z-10">
          <ShinyText
            text={`${books.length} ${books.length === 1 ? "carte" : "cărți"}`}
            speed={2.5}
            color="#b5b5b5"
            shineColor="#ffffff"
            spread={120}
            className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight cursor-default select-none"
          />
        </section>
      </div>

      {/* BIBLIOTECA */}
      <BookCatalog books={books} />
    </div>
  );
}
