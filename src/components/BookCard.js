"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import VanillaTilt from "vanilla-tilt";
import { motion, AnimatePresence } from "motion/react";
import { useDeck } from "@/context/DeckContext";

export default function BookCard({
  book,
  onAuthorClick,
  isConfirmOpen = false,
  onToggleConfirm,
  onCloseConfirm,
}) {
  const cardRef = useRef(null);
  const authorContainerRef = useRef(null);

  const formattedAuthor = Array.isArray(book.author)
    ? book.author.join(", ")
    : (book.author || "");

  const { addToDeck, removeFromDeck, isInDeck } = useDeck();
  const isSaved = isInDeck(book.id);

  // Efectul 'Hold to deck'
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const [justRemoved, setJustRemoved] = useState(false);

  const animFrameRef = useRef(null);
  const graceTimerRef = useRef(null);
  const startPosRef = useRef(null);
  const cleanupWindowListenersRef = useRef(null);

  // Intrerupere 'Hold to deck'
  const cancelHold = useCallback(() => {
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (cleanupWindowListenersRef.current) {
      cleanupWindowListenersRef.current();
      cleanupWindowListenersRef.current = null;
    }
    startPosRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Declansare intentie de hold (timp de gratie de 140ms pentru a nu interfera cu swipe / drag)
  const startHoldIntent = useCallback(
    (clientX, clientY, isTouchEvent = false) => {
      cancelHold();

      startPosRef.current = { x: clientX, y: clientY };
      const pressStartTime = performance.now();
      const TOTAL_DURATION = 2000;
      const GRACE_DELAY = 140;
      const MOVE_THRESHOLD = isTouchEvent ? 10 : 6;

      // Listener global pt. miscarea cursorului sau degetului
      const handleGlobalPointerMove = (e) => {
        if (!startPosRef.current) return;
        const currentX = e.touches ? e.touches[0]?.clientX : e.clientX;
        const currentY = e.touches ? e.touches[0]?.clientY : e.clientY;
        if (currentX === undefined || currentY === undefined) return;

        const dx = Math.abs(currentX - startPosRef.current.x);
        const dy = Math.abs(currentY - startPosRef.current.y);

        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
          cancelHold();
        }
      };

      // Listener global la ridicarea mouse-ului sau degetului
      const handleGlobalPointerUp = () => {
        cancelHold();
      };

      // Detectare miscare oriunde pe ecran
      if (isTouchEvent) {
        window.addEventListener("touchmove", handleGlobalPointerMove, { passive: true });
        window.addEventListener("touchend", handleGlobalPointerUp, { passive: true });
        window.addEventListener("touchcancel", handleGlobalPointerUp, { passive: true });
        cleanupWindowListenersRef.current = () => {
          window.removeEventListener("touchmove", handleGlobalPointerMove);
          window.removeEventListener("touchend", handleGlobalPointerUp);
          window.removeEventListener("touchcancel", handleGlobalPointerUp);
        };
      } else {
        window.addEventListener("mousemove", handleGlobalPointerMove, { passive: true });
        window.addEventListener("mouseup", handleGlobalPointerUp, { passive: true });
        cleanupWindowListenersRef.current = () => {
          window.removeEventListener("mousemove", handleGlobalPointerMove);
          window.removeEventListener("mouseup", handleGlobalPointerUp);
        };
      }

      // Perioada de gratie: nu afisam overlay-ul instantaneu la primul contact.
      graceTimerRef.current = setTimeout(() => {
        graceTimerRef.current = null;
        setIsHolding(true);

        const tick = (now) => {
          const elapsed = now - pressStartTime;
          const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
          setHoldProgress(progress);

          if (elapsed >= TOTAL_DURATION) {
            // 2 secunde atinse cu succes
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([60, 40, 90]);
            }

            if (isSaved) {
              removeFromDeck(book.id);
              setJustRemoved(true);
              setTimeout(() => setJustRemoved(false), 2200);
            } else {
              addToDeck(book);
              setJustAdded(true);
              setTimeout(() => setJustAdded(false), 2600);
            }

            cancelHold();
          } else {
            animFrameRef.current = requestAnimationFrame(tick);
          }
        };

        animFrameRef.current = requestAnimationFrame(tick);
      }, GRACE_DELAY);
    },
    [isSaved, addToDeck, removeFromDeck, book, cancelHold]
  );

  // Evenimente mouse pt desktop
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    startHoldIntent(e.clientX, e.clientY, false);
  };

  // Evenimente touch pt mobil
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    startHoldIntent(touch.clientX, touch.clientY, true);
  };

  // Curatare timer si listeners
  useEffect(() => {
    return () => {
      cancelHold();
    };
  }, [cancelHold]);

  // Pozitionare dinamica a cardului de confirmare
  const [placement, setPlacement] = useState({ v: "top", h: "center" });

  const displayYear = book.originalYear || book.year || null;

  // Lazy Tilt: initializare doar la primul hover real pe card
  const handleMouseEnter = useCallback(() => {
    const node = cardRef.current;
    if (!node) return;

    if (!node.vanillaTilt) {
      VanillaTilt.init(node, {
        max: 12,
        speed: 500,
        perspective: 1400,
        glare: true,
        "max-glare": 0.12,
        scale: 1.04,
        reset: true,
        gyroscope: false,
      });
      node.vanillaTilt.onMouseEnter?.();
    }
  }, []);

  useEffect(() => {
    const node = cardRef.current;
    return () => {
      if (node && node.vanillaTilt) {
        node.vanillaTilt.destroy();
      }
    };
  }, []);

  // Calcul pozitie adaptiva (auto-flip sus / jos)
  const updatePlacement = useCallback(() => {
    if (!authorContainerRef.current) return;
    const rect = authorContainerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    const v = spaceAbove < 160 && spaceBelow >= spaceAbove ? "bottom" : "top";

    // Verificare orizontala pt. ecran ingust
    let h = "center";
    if (rect.left + 210 > window.innerWidth) {
      h = "right";
    } else if (rect.left - 50 < 0) {
      h = "left";
    }

    setPlacement({ v, h });
  }, []);

  // Inchidere la click in afara popover-ului, Escape, si adaptare la scroll/resize
  useEffect(() => {
    if (!isConfirmOpen) return;

    updatePlacement();

    const handleClickOutside = (e) => {
      if (
        authorContainerRef.current &&
        !authorContainerRef.current.contains(e.target)
      ) {
        onCloseConfirm?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseConfirm?.();
      }
    };

    const handleScrollOrResize = () => {
      updatePlacement();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isConfirmOpen, onCloseConfirm, updatePlacement]);

  const isTop = placement.v === "top";
  const popoverPosClass = isTop ? "bottom-full mb-2.5" : "top-full mt-2.5";
  const popoverAlignClass =
    placement.h === "right"
      ? "right-0"
      : placement.h === "left"
      ? "left-0"
      : "left-1/2 -translate-x-1/2";

  const arrowPosClass = isTop
    ? "top-full -mt-[1px] border-x-[6px] border-x-transparent border-t-[6px] border-t-[#1c1626]"
    : "bottom-full -mb-[1px] border-x-[6px] border-x-transparent border-b-[6px] border-b-[#1c1626]";

  const arrowAlignClass =
    placement.h === "right"
      ? "right-4"
      : placement.h === "left"
      ? "left-4"
      : "left-1/2 -translate-x-1/2";

  return (
    <article
      id={book.id}
      className={`group flex flex-col items-center w-full max-w-[160px] mx-auto scroll-mt-8 select-none ${
        isConfirmOpen ? "relative z-40" : "relative z-0"
      }`}
    >
      {/* Cardul cu coperta (hold 2 sec to add or remove from deck) */}
      <div
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => {
          if (isHolding || justAdded || justRemoved) e.preventDefault();
        }}
        title="Ține apăsat 2 secunde pentru a adăuga pe pachetul de share"
        className={`book-tilt-card relative w-full aspect-[9/14] rounded-xl overflow-hidden cursor-pointer select-none transition-transform duration-200 ${
          isHolding ? "scale-[0.96]" : ""
        }`}
        style={{
          backgroundImage: book.cover ? `url(${book.cover})` : "none",
          backgroundColor: !book.cover ? "#2a2035" : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: isSaved
            ? "0 0 0 2px #EAB308, 0 0 20px 4px rgba(234, 179, 8, 0.25)"
            : "0 0 0 1.5px rgba(255,255,255,0.1), 0 0 14px 3px rgba(255,255,255,0.06)",
          transformStyle: "preserve-3d",
          willChange: "transform, box-shadow",
          transition: "box-shadow 0.4s ease-out, background-size 1.2s ease-out, transform 0.2s ease",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation",
        }}
      >
        {/* Badge carte salvata in pachet */}
        {isSaved && !isHolding && !justAdded && !justRemoved && (
          <div
            className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/40"
            style={{
              transform: "translateZ(50px)",
              willChange: "transform",
            }}
          >
            <svg
              className="w-2.5 h-2.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>În pachet</span>
          </div>
        )}

        {/* Badge anul operei */}
        {displayYear && (
          <div
            className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              transform: "translateZ(50px)",
              willChange: "transform",
            }}
          >
            {displayYear}
          </div>
        )}

        {/* Overlay pt 'Hold to deck' */}
        {isHolding && (
          <div
            className="absolute inset-0 z-30 bg-black/80 backdrop-blur-[3px] flex flex-col items-center justify-center p-2 text-center select-none"
            style={{ transform: "translateZ(60px)" }}
          >
            <div className="relative w-16 h-16 flex items-center justify-center mb-1.5">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="4.5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={isSaved ? "#f43f5e" : "#EAB308"}
                  strokeWidth="4.5"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - holdProgress / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[12px] font-black font-mono text-white leading-none">
                  {Math.max(0, 2 - (holdProgress / 100) * 2).toFixed(1)}s
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider ${
                isSaved ? "text-rose-400" : "text-amber-300"
              }`}
            >
              {isSaved ? "Scoate..." : "Adaugă..."}
            </span>
            <span className="text-[8px] text-zinc-400 mt-0.5">
              menține apăsat
            </span>
          </div>
        )}

        {/* Feedback la finalul celor 2 secunde */}
        {justAdded && (
          <div
            className="absolute inset-0 z-30 bg-gradient-to-b from-amber-500 to-amber-600 backdrop-blur-md flex flex-col items-center justify-center p-2 text-center select-none shadow-2xl"
            style={{ transform: "translateZ(60px)" }}
          >
            <span className="text-3xl mb-1 animate-bounce">🎉</span>
            <span className="text-xs font-black text-black uppercase tracking-wider">
              Adăugat în Pachet!
            </span>
            <span className="text-[9px] text-black/80 font-bold mt-1">
              Găsești cartea în dreapta-jos ↘
            </span>
          </div>
        )}

        {/* Feedback eliminare la finalul celor 2 secunde */}
        {justRemoved && (
          <div
            className="absolute inset-0 z-30 bg-rose-600/90 backdrop-blur-md flex flex-col items-center justify-center p-2 text-center select-none"
            style={{ transform: "translateZ(60px)" }}
          >
            <span className="text-2xl mb-1">✕</span>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Eliminat din Pachet
            </span>
          </div>
        )}

        {/* Fallback text daca nu exista coperta */}
        {!book.cover && (
          <div className="absolute inset-0 flex items-center justify-center z-5">
            <span className="text-white/60 text-xs font-medium text-center px-3 leading-tight">
              {book.title}
            </span>
          </div>
        )}
      </div>

      {/* Sub card => Titlu & autor */}
      <div className={`mt-4 flex flex-col justify-start w-full relative ${isConfirmOpen ? "z-40" : "z-0"}`}>
        <h3
          title={book.title}
          className="font-bold text-white text-[13px] leading-tight line-clamp-2"
        >
          {book.title}
        </h3>

        {formattedAuthor && (
          <div ref={authorContainerRef} className={`relative mt-1 w-fit ${isConfirmOpen ? "z-50" : ""}`}>
            {/* Nume autor (click 1: selectare & deschidere popover / click 2: confirmare) */}
            <button
              type="button"
              title={
                isConfirmOpen
                  ? "Apasă din nou pentru a căuta"
                  : `Selectează autorul ${formattedAuthor}`
              }
              onClick={(e) => {
                e.stopPropagation();
                if (isConfirmOpen) {
                  onCloseConfirm?.();
                  onAuthorClick?.(formattedAuthor);
                } else {
                  updatePlacement();
                  onToggleConfirm?.();
                }
              }}
              className={`text-[12px] italic transition-all cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 select-none flex items-center gap-1.5 text-left ${
                isConfirmOpen
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/60 font-medium shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "text-zinc-400 hover:text-amber-300 hover:bg-white/[0.05] font-normal line-clamp-1"
              }`}
            >
              <span>{formattedAuthor}</span>
              {isConfirmOpen && (
                <span className="pointer-events-none relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>

            {/* Popover confirmare */}
            <AnimatePresence>
              {isConfirmOpen && (
                <motion.div
                  initial={{ opacity: 0, y: isTop ? 8 : -8, scale: 0.93 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isTop ? 6 : -6, scale: 0.93 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute ${popoverPosClass} ${popoverAlignClass} w-[200px] p-2.5 rounded-xl bg-[#1c1626]/95 backdrop-blur-xl border border-amber-500/40 shadow-[0_16px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.2)] z-[100] text-left select-none`}
                >
                  <div className={`absolute ${arrowPosClass} ${arrowAlignClass} w-0 h-0`} />

                  <div className="flex items-center justify-between text-zinc-400 text-[10px] pb-1.5 border-b border-white/[0.08]">
                    <span className="flex items-center gap-1 font-semibold text-amber-400 tracking-wider uppercase">
                      <svg
                        className="w-3 h-3 text-amber-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Filtru Autor
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseConfirm?.();
                      }}
                      className="hover:text-white text-zinc-400 transition-colors p-0.5 -mr-1 cursor-pointer"
                      title="Închide"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] leading-snug text-zinc-300">
                    Vezi toate cărțile scrise de{" "}
                    <span className="font-semibold text-amber-200">
                      {formattedAuthor}
                    </span>
                    ?
                  </p>

                  {/* Buton confirmare */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseConfirm?.();
                      onAuthorClick?.(formattedAuthor);
                    }}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M21 21l-4.35-4.35m1.85-5.65a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                      />
                    </svg>
                    Filtrează cărțile
                  </button>

                  <div className="mt-1.5 text-[9px] text-zinc-400 text-center">
                    sau apasă din nou pe nume
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </article>
  );
}
