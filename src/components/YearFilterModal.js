"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

// Perioade istorice standard pentru clasificare
const HISTORICAL_PERIODS = [
  { label: "Antichitate", from: -3000, to: 476, desc: "până în 476 d.Hr." },
  { label: "Ev Mediu", from: 476, to: 1400, desc: "476 – 1400" },
  { label: "Renaștere", from: 1400, to: 1600, desc: "1400 – 1600" },
  { label: "Baroc & Clasicism", from: 1600, to: 1750, desc: "1600 – 1750" },
  { label: "Iluminism", from: 1750, to: 1800, desc: "1750 – 1800" },
  { label: "Romantism", from: 1800, to: 1850, desc: "1800 – 1850" },
  { label: "Realism & Naturalism", from: 1850, to: 1900, desc: "1850 – 1900" },
  { label: "Modernism", from: 1900, to: 1945, desc: "1900 – 1945" },
  { label: "Postmodern", from: 1945, to: 1990, desc: "1945 – 1990" },
  { label: "Contemporan", from: 1990, to: 2100, desc: "1990 – prezent" },
];

// Grupare ani in decenii pentru histograma
function buildHistogramData(books, yearType) {
  const yearMap = {};
  books.forEach((book) => {
    const yr = yearType === "original" ? book.originalYear : book.editionYear;
    if (!yr || typeof yr !== "number") return;
    const decade = Math.floor(yr / 10) * 10;
    yearMap[decade] = (yearMap[decade] || 0) + 1;
  });
  const decades = Object.keys(yearMap)
    .map(Number)
    .sort((a, b) => a - b);
  const max = Math.max(...Object.values(yearMap), 1);
  return { yearMap, decades, max };
}

function getBookYear(book, yearType) {
  return yearType === "original" ? book.originalYear : book.editionYear;
}

export default function YearFilterModal({
  isOpen,
  onClose,
  books = [],
  yearType,
  setYearType,
  yearFrom,
  yearTo,
  setYearFrom,
  setYearTo,
  onApply,
  onReset,
}) {
  const overlayRef = useRef(null);

  // Input local (string) pentru validare
  const [localFrom, setLocalFrom] = useState(yearFrom !== null ? String(yearFrom) : "");
  const [localTo, setLocalTo] = useState(yearTo !== null ? String(yearTo) : "");

  // Tooltip la hover pe deceniu
  const [hoveredDecade, setHoveredDecade] = useState(null);

  // Sincronizare stare locala
  useEffect(() => {
    setLocalFrom(yearFrom !== null ? String(yearFrom) : "");
    setLocalTo(yearTo !== null ? String(yearTo) : "");
  }, [yearFrom, yearTo]);

  // Inchidere la Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Blocare scroll body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const { yearMap, decades, max } = useMemo(
    () => buildHistogramData(books, yearType),
    [books, yearType]
  );

  // Range ani disponibili
  const allYears = useMemo(() => {
    return books
      .map((b) => getBookYear(b, yearType))
      .filter((y) => y && typeof y === "number");
  }, [books, yearType]);
  const minYear = allYears.length > 0 ? Math.min(...allYears) : 1800;
  const maxYear = allYears.length > 0 ? Math.max(...allYears) : new Date().getFullYear();

  // Filtrare
  const previewCount = useMemo(() => {
    const from = parseInt(localFrom) || null;
    const to = parseInt(localTo) || null;
    return books.filter((book) => {
      const yr = getBookYear(book, yearType);
      if (!yr) return false;
      if (from !== null && yr < from) return false;
      if (to !== null && yr > to) return false;
      return true;
    }).length;
  }, [books, localFrom, localTo, yearType]);

  const handleApply = () => {
    const from = parseInt(localFrom) || null;
    const to = parseInt(localTo) || null;
    setYearFrom(from);
    setYearTo(to);
    onApply(from, to);
    onClose();
  };

  const handleReset = () => {
    setLocalFrom("");
    setLocalTo("");
    setYearFrom(null);
    setYearTo(null);
    onReset();
    onClose();
  };

  const handlePeriod = (period) => {
    const from = Math.max(period.from, minYear);
    const to = Math.min(period.to, maxYear);
    setLocalFrom(String(from));
    setLocalTo(String(to));
  };

  const handleDecadeClick = (decade) => {
    setLocalFrom(String(decade));
    setLocalTo(String(decade + 9));
  };

  // Culorile barelor din histograma in functie de rangeul selectat
  const isDecadeInRange = (decade) => {
    const from = parseInt(localFrom) || null;
    const to = parseInt(localTo) || null;
    if (from === null && to === null) return true;
    const decadeEnd = decade + 9;
    if (from !== null && decadeEnd < from) return false;
    if (to !== null && decade > to) return false;
    return true;
  };

  const hasActiveFilter = localFrom !== "" || localTo !== "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="year-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Panoul modalului */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full sm:max-w-[560px] bg-[#16112a] border border-white/[0.1] sm:rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Filtrare după An</h2>
                  <p className="text-[11px] text-zinc-400">
                    {minYear} – {maxYear} · {books.length} cărți în bibliotecă
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-5 max-h-[80vh] overflow-y-auto">

              {/* 1. Tip an */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Tipul de an
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "original", label: "An apariție", icon: "✍️", desc: "Publicarea originală a operei" },
                    { id: "edition", label: "An ediție", icon: "📖", desc: "Ediția din bibliotecă" },
                  ].map(({ id, label, icon, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setYearType(id)}
                      className={`flex-1 flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        yearType === id
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                          : "bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      <span className="text-sm font-semibold flex items-center gap-1.5">
                        <span>{icon}</span>
                        <span>{label}</span>
                      </span>
                      <span className="text-[10px] opacity-70">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Histograma pe decenii */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  Distribuție · click pe bară pentru a selecta deceniul
                </label>
                <div className="relative pt-8">
                  <div
                    className="flex items-end gap-[2px] h-20 w-full"
                    onMouseLeave={() => setHoveredDecade(null)}
                  >
                    {decades.map((decade) => {
                      const count = yearMap[decade] || 0;
                      const heightPct = Math.max(4, Math.round((count / max) * 100));
                      const inRange = isDecadeInRange(decade);
                      const isHovered = hoveredDecade === decade;
                      return (
                        <button
                          key={decade}
                          type="button"
                          className="flex-1 flex flex-col justify-end items-center cursor-pointer h-full focus:outline-none relative"
                          onMouseEnter={() => setHoveredDecade(decade)}
                          onClick={() => handleDecadeClick(decade)}
                          title={`${decade}–${decade + 9}: ${count} ${count === 1 ? "carte" : "cărți"}`}
                        >
                          {isHovered && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#1c1626] border border-white/[0.12] text-[9px] text-zinc-200 whitespace-nowrap shadow-lg pointer-events-none z-10">
                              {decade}s · <strong className="text-amber-400">{count}</strong>
                            </div>
                          )}
                          <div
                            className={`w-full rounded-sm transition-all duration-200 ${
                              isHovered
                                ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                : inRange
                                ? "bg-amber-500/65 hover:bg-amber-400/80"
                                : "bg-white/[0.08] hover:bg-white/20"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Etichete ani */}
                  {decades.length > 0 && (
                    <div className="flex justify-between mt-1 text-[9px] text-zinc-600">
                      <span>{decades[0]}</span>
                      {decades.length > 4 && <span>{decades[Math.floor(decades.length / 2)]}</span>}
                      <span>{decades[decades.length - 1]}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Inputuri interval manual */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Interval personalizat
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localFrom}
                      onChange={(e) => setLocalFrom(e.target.value)}
                      placeholder={`De la (ex: ${minYear})`}
                      min={minYear}
                      max={maxYear}
                      className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] text-white placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-sm border border-white/[0.08] focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                  <div className="text-zinc-600 text-xl font-light flex-shrink-0">—</div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localTo}
                      onChange={(e) => setLocalTo(e.target.value)}
                      placeholder={`Până la (ex: ${maxYear})`}
                      min={minYear}
                      max={maxYear}
                      className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] text-white placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-sm border border-white/[0.08] focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Perioade predeterminate */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
                  Perioade istorice
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {HISTORICAL_PERIODS.map((period) => {
                    const count = books.filter((b) => {
                      const yr = getBookYear(b, yearType);
                      return yr && yr >= period.from && yr <= period.to;
                    }).length;
                    if (count === 0) return null;

                    const isActive =
                      localFrom !== "" &&
                      localTo !== "" &&
                      parseInt(localFrom) === Math.max(period.from, minYear) &&
                      parseInt(localTo) === Math.min(period.to, maxYear);

                    return (
                      <button
                        key={period.label}
                        type="button"
                        onClick={() => handlePeriod(period)}
                        className={`flex flex-col items-start px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                            : "bg-white/[0.03] border-white/[0.07] text-zinc-300 hover:bg-white/[0.07] hover:border-white/[0.15]"
                        }`}
                      >
                        <span className="text-[11px] font-semibold leading-tight">{period.label}</span>
                        <span className="text-[9px] mt-0.5 opacity-60">{period.desc}</span>
                        <span className={`text-[9px] font-bold mt-0.5 ${isActive ? "text-amber-400" : "text-zinc-500"}`}>
                          {count} {count === 1 ? "carte" : "cărți"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/[0.07] flex items-center justify-between gap-3 bg-[#16112a]">
              <div className="text-sm">
                {hasActiveFilter ? (
                  <span>
                    <strong className="text-amber-400 text-base font-bold">{previewCount}</strong>
                    <span className="text-zinc-500 ml-1.5 text-xs">{previewCount === 1 ? "carte" : "cărți"} găsite</span>
                  </span>
                ) : (
                  <span className="text-zinc-600 text-xs">Niciun filtru selectat</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer"
                  >
                    Resetează
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!hasActiveFilter}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    hasActiveFilter
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/25 cursor-pointer"
                      : "bg-white/[0.05] text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  Aplică filtrul
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
