"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDeck } from "@/context/DeckContext";

export default function MysteryBookModal({
  isOpen,
  onClose,
  books = [],
  onAuthorClick,
}) {
  const { addToDeck, removeFromDeck, isInDeck } = useDeck();

  const [currentBook, setCurrentBook] = useState(null);
  const [stage, setStage] = useState("sealed"); // "sealed" | "breaking" | "revealed"
  const [isParcelFading, setIsParcelFading] = useState(false);
  const [isParcelGone, setIsParcelGone] = useState(false);
  const [isOverlayFaded, setIsOverlayFaded] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [particles, setParticles] = useState([]);
  const timersRef = useRef([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Preincarcare imagini
  useEffect(() => {
    if (isOpen) {
      const imagesToPreload = [
        "/mystery/parcel.webp",
        "/mystery/wax_seal.webp",
        "/mystery/wax_seal_left.webp",
        "/mystery/wax_seal_right.webp",
      ];
      imagesToPreload.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [isOpen]);

  // Resetare si alegere carte noua
  const pickRandomBook = useCallback(() => {
    clearAllTimers();
    if (!books || books.length === 0) return;
    const randomIndex = Math.floor(Math.random() * books.length);
    setCurrentBook(books[randomIndex]);
    setStage("sealed");
    setIsParcelFading(false);
    setIsParcelGone(false);
    setIsOverlayFaded(false);
    setIsDetailsVisible(false);
    setParticles([]);
  }, [books, clearAllTimers]);

  useEffect(() => {
    if (isOpen) {
      pickRandomBook();
    } else {
      clearAllTimers();
    }
  }, [isOpen, pickRandomBook, clearAllTimers]);

  // Inchidere la Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  // Ordine declansare animatie:
  // 1. Sigiliul se sparge in doua (0s)
  // 2. Dupa 450ms, pachetul se dizolva lent si animat (1.3s durata)
  // 3. In acelasi loc apare cartea cu overlay negru si semnul de intrebare (1800ms)
  // 4. Semnul de intrebare se dizolva gradual (2500ms), dezvaluind cartea
  // 5. Apar detaliile pe un singur rand (3600ms)
  const handleStartUnwrapping = () => {
    if (stage !== "sealed") return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 80]);
    }

    // Particule de ceara si praf auriu
    const newParticles = Array.from({ length: 32 }).map((_, i) => {
      const angle = (i / 32) * 360 + (Math.random() * 20 - 10);
      const distance = 85 + Math.random() * 130;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance,
        size: 3.5 + Math.random() * 4.5,
        color: i % 3 === 0 ? "#F59E0B" : i % 3 === 1 ? "#B91C1C" : "#FBBF24",
      };
    });
    setParticles(newParticles);

    // Pas 1: Ruperea sigiliului
    setStage("breaking");

    // Pas 2: Pachetul incepe sa se dizolve lent si animat
    const t1 = setTimeout(() => {
      setIsParcelFading(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
    }, 450);

    // Pas 3: Pachetul s-a dizolvat complet
    const t2 = setTimeout(() => {
      setIsParcelGone(true);
      setStage("revealed");
    }, 1750);

    // Pas 4: Semnul mare de intrebare se dizolva gradual
    const t3 = setTimeout(() => {
      setIsOverlayFaded(true);
    }, 2450);

    // Pas 5: Randul compact cu titlul, autorul, categoria si butonul '+' apar lin
    const t4 = setTimeout(() => {
      setIsDetailsVisible(true);
    }, 3550);

    timersRef.current = [t1, t2, t3, t4];
  };

  const isSavedInDeck = currentBook ? isInDeck(currentBook.id) : false;

  const handleToggleDeck = () => {
    if (!currentBook) return;
    if (isSavedInDeck) {
      removeFromDeck(currentBook.id);
    } else {
      addToDeck(currentBook);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentBook && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        >
          {/* Overlay negru */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/92 backdrop-blur-md cursor-pointer"
          />

          {/* Buton inchidere modal animatie */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Inchide"
            className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer shadow-2xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Container central */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="relative z-50 flex flex-col items-center justify-center select-none w-full max-w-[360px] sm:max-w-[420px] my-auto"
          >
            <div className="relative w-[78vw] max-w-[310px] sm:w-72 sm:max-w-none md:w-80 aspect-[9/14] flex items-center justify-center">
              {/* 1. Cartea (apare cand pachetul se dizolva) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isParcelFading ? 1 : 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-white/15 bg-[#161220] z-10"
              >
                {/* Coperta cartii */}
                {currentBook.cover ? (
                  <img
                    src={currentBook.cover}
                    alt={currentBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1c1827] flex items-center justify-center p-3 text-center text-white text-xs font-serif font-bold">
                    {currentBook.title}
                  </div>
                )}

                {/* Badge anul aparitiei */}
                {(currentBook.originalYear || currentBook.year) && (
                  <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md text-xs font-bold text-amber-300 border border-amber-400/35 shadow-lg">
                    {currentBook.originalYear || currentBook.year}
                  </div>
                )}

                {/* Overlay negru cu semnul mare de intrebare */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isOverlayFaded ? 0 : 1 }}
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                  className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center pointer-events-none"
                >
                  <motion.span
                    animate={{
                      scale: isOverlayFaded ? 1.15 : [1, 1.05, 1],
                    }}
                    transition={{
                      scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className="text-7xl sm:text-8xl md:text-9xl font-serif font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.8)] select-none"
                  >
                    ?
                  </motion.span>
                </motion.div>
              </motion.div>

              {/* glow effect cand cartea este activă */}
              {isParcelFading && (
                <div className="absolute -inset-5 bg-amber-500/15 rounded-3xl blur-2xl pointer-events-none z-0" />
              )}

              {/* 2. Imagine pachet mystery */}
              {!isParcelGone && (
                <motion.div
                  initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  animate={{
                    opacity: isParcelFading ? 0 : 1,
                    scale: isParcelFading ? 1.04 : 1,
                    filter: isParcelFading ? "blur(8px)" : "blur(0px)",
                  }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 z-40 flex items-center justify-center filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)]"
                >
                  <img
                    src="/mystery/parcel.webp"
                    alt="Pachet sigilat misterios"
                    className="w-full h-full object-fill pointer-events-none"
                  />

                  {/* sigiliu ceara intact */}
                  {stage === "sealed" && (
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleStartUnwrapping}
                      className="absolute z-50 w-32 h-32 sm:w-34 sm:h-34 md:w-36 md:h-36 cursor-pointer filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.95)]"
                      title="Apasă pe sigiliu pentru a desface pachetul"
                    >
                      <img
                        src="/mystery/wax_seal.webp"
                        alt="Sigiliu de ceară autentic"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                      {/* glow pulse efect */}
                      <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-md pointer-events-none animate-pulse" />
                    </motion.div>
                  )}

                  {/* animatie rupere sigiliu */}
                  {stage === "breaking" && (
                    <div className="absolute z-50 w-32 h-32 sm:w-34 sm:h-34 md:w-36 md:h-36 pointer-events-none">
                      <motion.img
                        src="/mystery/wax_seal_left.webp"
                        alt="Sigiliu stânga"
                        initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                        animate={{ x: -80, y: 35, rotate: -35, opacity: 0 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <motion.img
                        src="/mystery/wax_seal_right.webp"
                        alt="Sigiliu dreapta"
                        initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                        animate={{ x: 80, y: 35, rotate: 35, opacity: 0 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full object-contain"
                      />

                      {/* particule ceara aur */}
                      {particles.map((p) => (
                        <motion.span
                          key={p.id}
                          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                          animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: p.size,
                            height: p.size,
                            borderRadius: "50%",
                            backgroundColor: p.color,
                            boxShadow: `0 0 10px ${p.color}`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              <div className="absolute top-[calc(100%+16px)] left-0 right-0 pointer-events-auto">
                {/* Textul sub pachet când este sigilat */}
                <AnimatePresence>
                  {stage === "sealed" && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm sm:text-base text-amber-200/95 font-semibold tracking-wide text-center drop-shadow-md whitespace-nowrap"
                    >
                      Atinge sigiliul pentru a desface pachetul
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Categorie, titlu, autor si buton "+" */}
                <AnimatePresence>
                  {isDetailsVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="w-full flex items-center justify-between gap-3 px-1"
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 truncate">
                            {Array.isArray(currentBook.category)
                              ? currentBook.category.join(", ")
                              : (currentBook.category || "Literatură")}
                          </span>
                        </div>
                        <h3
                          title={currentBook.title}
                          className="text-base sm:text-lg font-bold text-white leading-tight truncate mt-0.5"
                        >
                          {currentBook.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const authorStr = Array.isArray(currentBook.author)
                              ? currentBook.author.join(", ")
                              : currentBook.author;
                            if (authorStr && onAuthorClick) {
                              onAuthorClick(authorStr);
                              onClose();
                            }
                          }}
                          className="text-sm text-zinc-300 hover:text-amber-300 transition-colors truncate cursor-pointer mt-0.5 inline-block text-left"
                          title={`Caută cărți de ${
                            Array.isArray(currentBook.author)
                              ? currentBook.author.join(", ")
                              : (currentBook.author || "")
                          }`}
                        >
                          de{" "}
                          {Array.isArray(currentBook.author)
                            ? currentBook.author.join(", ")
                            : currentBook.author}{" "}
                          ↗
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleDeck}
                        aria-label={isSavedInDeck ? "Elimină din Pachet" : "Adaugă în Pachet"}
                        title={isSavedInDeck ? "În Pachet (Apasă pt. a elimina)" : "Adaugă în Pachetul Meu"}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer shadow-lg ${
                          isSavedInDeck
                            ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                            : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30 hover:scale-105 active:scale-95"
                        }`}
                      >
                        {isSavedInDeck ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
