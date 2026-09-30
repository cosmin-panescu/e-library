"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import BookCard from "./BookCard";
import CategoryCarouselRow from "./CategoryCarouselRow";
import MysteryBookModal from "./MysteryBookModal";
import YearFilterModal from "./YearFilterModal";

// Normalizare text pentru search
function normalizeText(text) {
  if (!text) return "";
  if (Array.isArray(text)) {
    text = text.join(" ");
  }
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function BookCatalog({ books = [] }) {
  const [viewMode, setViewMode] = useState("categories"); // mod afisare: 'categories' (default) | 'grid'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeConfirmBookId, setActiveConfirmBookId] = useState(null);
  const [isMysteryOpen, setIsMysteryOpen] = useState(false);

  // Filtru ani
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [yearType, setYearType] = useState("original"); // 'original' | 'edition'
  const [yearFrom, setYearFrom] = useState(null);
  const [yearTo, setYearTo] = useState(null);

  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const booksContainerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Afisare graduala la scroll
  const BATCH_SIZE = 28;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  // La orice filtrare (cautare sau categorie) => afisare grid
  // Fara filtre active => afisare categorii (default la incarcare)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (searchQuery.trim() || selectedCategory !== "all" || yearFrom !== null || yearTo !== null) {
      setViewMode("grid");
    } else {
      setViewMode("categories");
    }
  }, [searchQuery, selectedCategory, yearFrom, yearTo]);

  // Click pe autor => cautare autor + scroll top
  const handleAuthorClick = (authorName) => {
    setActiveConfirmBookId(null);
    setSelectedCategory("all");
    setSearchQuery(
      Array.isArray(authorName) ? authorName.join(", ") : String(authorName || "")
    );
    searchContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Extragere categorii (array | string)
  const categories = useMemo(() => {
    const set = new Set();
    books.forEach((b) => {
      if (Array.isArray(b.category)) {
        b.category.forEach((cat) => {
          if (cat && typeof cat === "string" && cat.trim()) {
            set.add(cat.trim());
          }
        });
      } else if (typeof b.category === "string" && b.category.trim()) {
        set.add(b.category.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ro"));
  }, [books]);

  // Verificare daca sunt filtre active
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCategory !== "all" || yearFrom !== null || yearTo !== null);

  // Resetare filtre (revine automat pe categorii)
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setYearFrom(null);
    setYearTo(null);
  };

  // Buton "Vezi tot"
  const handleViewCategoryAll = useCallback((catName) => {
    setSelectedCategory(catName);
    booksContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Filtrare carti
  const filteredBooks = useMemo(() => {
    const q = normalizeText(searchQuery);

    return books.filter((book) => {
      // 1. dupa titlu sau autor
      if (q) {
        const titleNorm = normalizeText(book.title);
        const authorNorm = normalizeText(book.author);
        if (!titleNorm.includes(q) && !authorNorm.includes(q)) {
          return false;
        }
      }

      // 2. dupa categorie
      if (selectedCategory !== "all") {
        if (!book.category) return false;
        const selLower = selectedCategory.toLowerCase().trim();
        if (Array.isArray(book.category)) {
          const hasMatch = book.category.some(
            (c) => typeof c === "string" && c.toLowerCase().trim() === selLower
          );
          if (!hasMatch) return false;
        } else if (
          typeof book.category === "string" &&
          book.category.toLowerCase().trim() !== selLower
        ) {
          return false;
        }
      }

      // 3. dupa an
      if (yearFrom !== null || yearTo !== null) {
        const yr = yearType === "original" ? book.originalYear : book.editionYear;
        if (!yr) return false;
        if (yearFrom !== null && yr < yearFrom) return false;
        if (yearTo !== null && yr > yearTo) return false;
      }

      return true;
    });
  }, [books, searchQuery, selectedCategory, yearFrom, yearTo, yearType]);

  // Grupare carti pe categorii => carousel row per categorie
  const booksByCategory = useMemo(() => {
    const result = [];
    const catsToDisplay =
      selectedCategory !== "all" ? [selectedCategory] : categories;

    catsToDisplay.forEach((cat) => {
      const catLower = cat.toLowerCase().trim();
      const catBooks = filteredBooks.filter((b) => {
        if (!b.category) return false;
        if (Array.isArray(b.category)) {
          return b.category.some(
            (c) => typeof c === "string" && c.toLowerCase().trim() === catLower
          );
        }
        return (
          typeof b.category === "string" &&
          b.category.toLowerCase().trim() === catLower
        );
      });
      if (catBooks.length > 0) {
        result.push({
          category: cat,
          books: catBooks,
        });
      }
    });

    // Sortare categorii descrescator nr carti
    result.sort((a, b) => {
      if (b.books.length !== a.books.length) {
        return b.books.length - a.books.length;
      }
      return a.category.localeCompare(b.category, "ro");
    });

    const uncategorized = filteredBooks.filter(
      (b) =>
        !b.category ||
        (Array.isArray(b.category) && b.category.length === 0) ||
        (typeof b.category === "string" && !b.category.trim())
    );
    if (uncategorized.length > 0 && selectedCategory === "all") {
      result.push({
        category: "Alte volume",
        books: uncategorized,
      });
    }

    return result;
  }, [categories, selectedCategory, filteredBooks]);

  // Afisare treptata la scroll
  const displayedBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleCount);
  }, [filteredBooks, visibleCount]);

  // Incarcare automata pt. urmatoareale BATCH_SIZE carti la scroll
  useEffect(() => {
    if (viewMode !== "grid") return;
    if (visibleCount >= filteredBooks.length) return;

    const sentinel = loadMoreRef.current;
    let observer = null;

    if (sentinel && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredBooks.length));
          }
        },
        {
          root: null,
          rootMargin: "450px",
          threshold: 0.01,
        }
      );
      observer.observe(sentinel);
    }

    // Fallback pt. ecrane mari sau device-uri care nu suporta IntersectionObserver
    const handleScroll = () => {
      const scrollPos = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 550;
      if (scrollPos >= threshold) {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredBooks.length));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [viewMode, filteredBooks.length, visibleCount]);

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 relative">
      {/* Container inputuri filtrare */}
      <div
        ref={searchContainerRef}
        className="scroll-mt-4 sm:scroll-mt-6 relative z-30 bg-[#181423]/70 backdrop-blur-xl border border-white/[0.09] rounded-2xl p-4 pb-3.5 sm:px-5 sm:pt-5 sm:pb-4 shadow-2xl mb-8 transition-all"
      >
        {/* 
            MOBIL: Randul 1 (Searchbar full-width) + Randul 2 (Categorie flex-1 + Switcher Categorii/Grila)
            DESKTOP: Rand unic flex-row (Searchbar flex-1 + Categorie min-w-[190px] + Switcher)
        */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
          <div className="flex items-center gap-2.5 w-full md:contents">
            {/* Searchbar */}
            <div className="relative flex-1 group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400 group-focus-within:text-amber-400 transition-colors">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-4.35-4.35m1.85-5.65a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                  />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută după titlu sau autor..."
                aria-label="Caută cărți după titlu sau autor"
                className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] text-white placeholder-zinc-500 rounded-xl pl-10 pr-9 py-2.5 text-sm border border-white/[0.08] focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Șterge căutarea"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Buton "Surprinde-mă" */}
            <button
              type="button"
              onClick={() => setIsMysteryOpen(true)}
              aria-label="Surprinde-mă cu o carte aleatorie"
              className="relative flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-4 h-[42px] rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 text-sm font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/5 flex-shrink-0 group"
              title="Descoperă o carte aleatorie printr-o experiență misterioasă"
            >
              <span className="relative flex items-center justify-center">
                <svg
                  className="w-5 h-5 md:w-4 md:h-4 text-amber-400 group-hover:rotate-12 transition-transform duration-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4" />
                  <path d="M19 17v4" />
                  <path d="M3 5h4" />
                  <path d="M17 19h4" />
                </svg>
              </span>
              <span className="hidden md:inline font-bold">Surprinde-mă</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0">
            {/* Buton filtru ani */}
            <button
              type="button"
              onClick={() => setIsYearModalOpen(true)}
              aria-label="Filtrare după an"
              title="Filtrare după an de apariție sau ediție"
              className={`relative flex items-center justify-center gap-1.5 px-3 h-[42px] rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer flex-shrink-0 ${
                yearFrom !== null || yearTo !== null
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
                  : "bg-white/[0.05] hover:bg-white/[0.09] border-white/[0.08] text-zinc-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {(yearFrom !== null || yearTo !== null) && (
                <span className="hidden sm:inline">
                  {yearFrom ?? "…"} – {yearTo ?? "…"}
                </span>
              )}
              {yearFrom === null && yearTo === null && (
                <span className="hidden sm:inline">An</span>
              )}
            </button>
            {/* Filtru categorie */}
            <div className="relative flex-1 md:flex-initial md:min-w-[190px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-white/[0.05] hover:bg-white/[0.08] text-white text-sm rounded-xl pl-3.5 pr-9 py-2.5 border border-white/[0.08] focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer transition-all"
              >
                <option value="all" className="bg-[#181423] text-white">
                  Toate categoriile
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#181423] text-white">
                    {cat}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </div>

            {/* Switcher vizualizare */}
            <div className="flex items-center bg-white/[0.05] p-1 rounded-xl border border-white/[0.08] flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("categories")}
                aria-label="Afișare pe categorii"
                className={`relative flex items-center justify-center gap-1.5 px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === "categories"
                    ? "text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Afișare pe categorii (rânduri glisante)"
              >
                {viewMode === "categories" && (
                  <motion.div
                    layoutId="viewModePill"
                    className="absolute inset-0 bg-amber-500 rounded-lg shadow-md shadow-amber-500/25"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 6h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1v1a1 1 0 001 1zm0 7h16a1 1 0 001-1v-1a1 1 0 00-1-1H4a1 1 0 00-1 1v1a1 1 0 001 1zm0 7h16a1 1 0 001-1v-1a1 1 0 00-1-1H4a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                  <span className="hidden md:inline">Categorii</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Afișare grilă completă"
                className={`relative flex items-center justify-center gap-1.5 px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Afișare grilă completă"
              >
                {viewMode === "grid" && (
                  <motion.div
                    layoutId="viewModePill"
                    className="absolute inset-0 bg-amber-500 rounded-lg shadow-md shadow-amber-500/25"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                  </svg>
                  <span className="hidden md:inline">Grilă</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sumar rezultate */}
        <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between min-h-[28px] text-xs text-zinc-400 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
            <span className="font-medium h-7 flex items-center whitespace-nowrap">
              {filteredBooks.length === books.length ? (
                <>Toate cele <strong className="text-zinc-200 font-semibold ml-1">{books.length}</strong>&nbsp;cărți</>
              ) : (
                <>
                  Afișate: <strong className="text-amber-400 font-semibold mx-1">{filteredBooks.length}</strong> din {books.length} cărți
                </>
              )}
            </span>

            {/* Tag categorie activa */}
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex-shrink-0">
                <span className="truncate max-w-[140px] sm:max-w-none">Categorie: {selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="hover:text-white cursor-pointer ml-0.5 p-0.5 text-zinc-400 hover:text-white transition-colors"
                  title="Elimină filtrul de categorie"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Tag cautare activa */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-white/[0.08] border border-white/[0.1] text-zinc-300 text-[11px] font-medium max-w-[200px] sm:max-w-xs flex-shrink-0">
                <span className="truncate">„{searchQuery}”</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-white cursor-pointer ml-0.5 p-0.5 text-zinc-400 hover:text-white transition-colors"
                  title="Șterge căutarea"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Tag an activ */}
            {(yearFrom !== null || yearTo !== null) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex-shrink-0">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate max-w-[140px] sm:max-w-none">
                  {yearFrom !== null && yearTo !== null && yearFrom === yearTo
                    ? yearFrom
                    : `${yearFrom ?? "…"} – ${yearTo ?? "…"}`}
                </span>
                <button
                  type="button"
                  onClick={() => { setYearFrom(null); setYearTo(null); }}
                  className="hover:text-white cursor-pointer ml-0.5 p-0.5 text-zinc-400 hover:text-white transition-colors"
                  title="Elimină filtrul de an"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          {/* Resetare filtre */}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 border border-amber-500/20 hover:border-amber-500/40 font-medium text-xs transition-all duration-150 cursor-pointer self-start sm:self-auto flex-shrink-0"
              title="Resetează toate filtrele"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <span className="whitespace-nowrap">Resetează filtrele</span>
              <svg
                className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="hidden sm:block h-7" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Catalogul de carti */}
      <div ref={booksContainerRef} className="scroll-mt-6 min-h-[75vh]">
        {filteredBooks.length > 0 ? (
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "categories" ? (
              /* Afisare pe categorii (slider) */
              <motion.div
                key="categories-layout"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 sm:space-y-6"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {booksByCategory.map((group) => (
                    <motion.div
                      key={group.category}
                      layout="position"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14, scale: 0.98 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <CategoryCarouselRow
                        category={group.category}
                        books={group.books}
                        onAuthorClick={handleAuthorClick}
                        activeConfirmBookId={activeConfirmBookId}
                        onToggleConfirm={(confirmId) =>
                          setActiveConfirmBookId((prev) => (prev === confirmId ? null : confirmId))
                        }
                        onCloseConfirm={() => setActiveConfirmBookId(null)}
                        onViewCategoryAll={handleViewCategoryAll}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* Afisare grila */
              <motion.div
                key="grid-layout"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  layout="position"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 sm:gap-x-6 gap-y-8"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {displayedBooks.map((book) => {
                      const cardConfirmId = `grid-${book.id}`;
                      const isCardConfirmOpen = activeConfirmBookId === cardConfirmId;
                      return (
                        <motion.div
                          key={book.id}
                          layout="position"
                          initial={{ opacity: 0, scale: 0.92, y: 14 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: -10 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className={`book-reveal-card w-full flex justify-center ${
                            isCardConfirmOpen ? "relative z-40" : "relative z-0"
                          }`}
                        >
                          <BookCard
                            book={book}
                            onAuthorClick={handleAuthorClick}
                            isConfirmOpen={isCardConfirmOpen}
                            onToggleConfirm={() =>
                              setActiveConfirmBookId((prev) =>
                                prev === cardConfirmId ? null : cardConfirmId
                              )
                            }
                            onCloseConfirm={() => setActiveConfirmBookId(null)}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                {visibleCount < filteredBooks.length ? (
                  /* mai sunt carti de afisat */
                  <div
                    ref={loadMoreRef}
                    onClick={() =>
                      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredBooks.length))
                    }
                    className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 select-none cursor-pointer group"
                    title="Apasă pentru a încărca mai multe cărți"
                  >
                    <div className="w-5 h-5 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                    <span className="text-xs text-zinc-500 group-hover:text-amber-400 font-medium tracking-wide transition-colors">
                      Se încarcă mai multe cărți ({visibleCount} din {filteredBooks.length})...
                    </span>
                  </div>
                ) : (
                  /* toate cartile au fost afisate */
                  <div className="py-12 text-center text-xs text-zinc-500 font-medium select-none">
                    Ai parcurs toate cele {filteredBooks.length} cărți din catalog ✨
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Empty State cand nu sunt rezultate */
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-4">
              <svg
                className="w-8 h-8 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-1">
              Nicio carte găsită
            </h4>
            <p className="text-sm text-zinc-400 max-w-sm mb-6">
              Nu am găsit cărți care să corespundă filtrelor sau termenului de căutare introdus.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors shadow-lg"
            >
              Resetează toate filtrele
            </button>
          </div>
        )}
      </div>

      {/* Modalul - carte surpriza */}
      <MysteryBookModal
        isOpen={isMysteryOpen}
        onClose={() => setIsMysteryOpen(false)}
        books={books}
        onAuthorClick={handleAuthorClick}
      />

      {/* Modalul - filtru ani */}
      <YearFilterModal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        books={books}
        yearType={yearType}
        setYearType={setYearType}
        yearFrom={yearFrom}
        yearTo={yearTo}
        setYearFrom={setYearFrom}
        setYearTo={setYearTo}
        onApply={(from, to) => {
          setYearFrom(from);
          setYearTo(to);
        }}
        onReset={() => {
          setYearFrom(null);
          setYearTo(null);
        }}
      />
    </main>
  );
}
