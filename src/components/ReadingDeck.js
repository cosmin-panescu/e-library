"use client";

import { useState, useMemo, useEffect } from "react";
import { useDeck } from "@/context/DeckContext";
import { motion, AnimatePresence } from "motion/react";

export default function ReadingDeck() {
  const {
    deck,
    removeFromDeck,
    clearDeck,
    isDeckOpen,
    setIsDeckOpen,
    recentlyAddedId,
    toastMessage,
    setToastMessage,
  } = useDeck();

  const [copied, setCopied] = useState(false);

  // Inchidere la Esc
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isDeckOpen) {
        setIsDeckOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeckOpen, setIsDeckOpen]);

  // Modal deschis => blocare scroll body
  useEffect(() => {
    if (isDeckOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDeckOpen]);

  // Generare share link cu parametru ?deck=id1,id2
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    if (deck.length === 0) return baseUrl;
    const ids = deck.map((b) => b.id).join(",");
    return `${baseUrl}?deck=${encodeURIComponent(ids)}`;
  }, [deck]);

  // Formatare text partajare
  const shareMessage = useMemo(() => {
    if (deck.length === 0) return "";
    const list = deck
      .map(
        (b, i) => {
          const authorStr = Array.isArray(b.author)
            ? b.author.join(", ")
            : (b.author || "Autor necunoscut");
          return `${i + 1}. "${b.title}" — ${authorStr}${
            b.originalYear || b.year ? ` (${b.originalYear || b.year})` : ""
          }`;
        }
      )
      .join("\n");

    return `📚 Am selectat ${deck.length} ${
      deck.length === 1 ? "carte" : "cărți"
    } din Biblioteca Mea Digitală:\n\n${list}\n\n👉 Descoperă colecția completă aici: ${shareUrl}`;
  }, [deck, shareUrl]);

  // WhatsApp
  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // SMS
  const handleShareSMS = () => {
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? "&" : "?";
    const smsUrl = `sms:${separator}body=${encodeURIComponent(shareMessage)}`;
    window.location.href = smsUrl;
  };

  // Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Biblioteca Mea Digitală — Selecție Cărți",
          text: shareMessage,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Eroare la partajare nativă:", err);
        }
      }
    } else {
      handleCopyClipboard();
    }
  };

  // Copy to Clipboard
  const handleCopyClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareMessage).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  // Ultimele 3 carti adaugate pt preview-ul stivei 3D - bottom right
  const stackCards = useMemo(() => {
    return deck.slice(-3);
  }, [deck]);

  return (
    <>
      {/* Toast notification - ex: incarcare deck din URL */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-5 right-4 left-4 sm:left-auto sm:right-6 z-50 max-w-sm px-4 py-3 rounded-2xl bg-[#1c1626]/95 backdrop-blur-xl border border-amber-500/40 text-white text-xs shadow-2xl shadow-black/80 flex items-center gap-3"
          >
            <span className="text-base">✨</span>
            <span className="flex-1 font-medium">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pachet 3D compact - bottom right */}
      <div className="reading-deck-widget fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 select-none transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsDeckOpen(true)}
          className="group relative flex flex-col items-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label={`Deschide pachetul de cărți (${deck.length} cărți selectate)`}
        >
          {deck.length === 0 ? (
            /* Empty state */
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#191424]/85 hover:bg-[#231a33]/95 backdrop-blur-xl border border-white/[0.12] hover:border-amber-500/40 shadow-[0_12px_30px_rgba(0,0,0,0.7)] transition-all duration-200 hover:scale-105">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="text-left pr-1">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <span>Pachet Cărți</span>
                  <span className="w-4 h-4 rounded-full bg-white/[0.08] text-zinc-400 text-[10px] flex items-center justify-center font-mono">
                    0
                  </span>
                </div>
                <div className="text-[9px] text-zinc-400 font-medium">
                  Ține apăsat 2s pe o carte
                </div>
              </div>
            </div>
          ) : (
            /* Active state - 3D stack */
            <div className="flex flex-col items-center">
              <div
                className="relative w-14 h-20 sm:w-16 sm:h-22 transition-transform duration-300 group-hover:scale-105"
                style={{ perspective: "600px" }}
              >
                {stackCards.length >= 3 && (
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden border border-white/20 shadow-md transition-all duration-300 group-hover:-translate-x-3.5 group-hover:translate-y-1 group-hover:-rotate-12"
                    style={{
                      backgroundImage: `url(${stackCards[0].cover})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      transform: "rotate(-8deg) translate(-3px, 4px)",
                      filter: "brightness(0.75)",
                    }}
                  />
                )}

                {stackCards.length >= 2 && (
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden border border-white/25 shadow-lg transition-all duration-300 group-hover:translate-x-3 group-hover:translate-y-0.5 group-hover:rotate-10"
                    style={{
                      backgroundImage: `url(${
                        stackCards[stackCards.length >= 3 ? 1 : 0].cover
                      })`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      transform: "rotate(6deg) translate(2px, -2px)",
                      filter: "brightness(0.9)",
                    }}
                  />
                )}

                <div
                  className="absolute inset-0 rounded-lg overflow-hidden border-2 border-amber-400/80 shadow-[0_12px_28px_rgba(0,0,0,0.85),0_0_14px_rgba(245,158,11,0.3)] transition-all duration-300 group-hover:-translate-y-1.5"
                  style={{
                    backgroundImage: `url(${stackCards[stackCards.length - 1].cover})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: "rotate(-2deg)",
                  }}
                />

                {/* Badge nr. carti in deck */}
                <div
                  className={`absolute -top-2.5 -right-2.5 z-30 min-w-5 h-5 px-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[11px] font-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.6)] border border-amber-200 ${
                    recentlyAddedId ? "animate-bounce" : ""
                  }`}
                >
                  {deck.length}
                </div>
              </div>

              {/* Eticheta deck */}
              <div className="mt-2 px-3 py-1 rounded-full bg-[#181423]/90 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-wide shadow-xl flex items-center gap-1.5 group-hover:bg-amber-500 group-hover:text-black transition-colors duration-200">
                <span>Pachetul Tău</span>
                <span className="opacity-70 group-hover:opacity-100">↗</span>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Modal deck */}
      <AnimatePresence>
        {isDeckOpen && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-backdrop-fade-in"
            onClick={() => setIsDeckOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-2xl bg-[#191424] border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_30px_rgba(245,158,11,0.15)] relative max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg sm:text-xl tracking-tight">
                      Pachetul Tău de Cărți
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {deck.length === 0
                        ? "Nu ai adăugat încă nicio carte în pachet"
                        : `${deck.length} ${
                            deck.length === 1
                              ? "carte selectată"
                              : "cărți selectate"
                          } gata de partajare`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {deck.length > 0 && (
                    <button
                      type="button"
                      onClick={clearDeck}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Golește pachetul"
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
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="hidden sm:inline">Golește tot</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDeckOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Închide fereastra"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content Modal */}
              {deck.length === 0 ? (
                /* empty state */
                <div className="py-12 px-4 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5">
                    Pachetul este gol momentan
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
                    Mergi în catalogul de cărți și{" "}
                    <strong className="text-amber-300 font-semibold">
                      ține apăsat 2 secunde
                    </strong>{" "}
                    pe coperta oricărei cărți pe care vrei să o salvezi. Aceasta va
                    apărea automat aici în teanc!
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDeckOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Explorează catalogul
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lista carduri */}
                  <div>
                    <div className="flex gap-3 overflow-x-auto pb-3 pt-1 custom-scrollbar-slim">
                      {deck.map((book) => (
                        <div
                          key={book.id}
                          className="flex-shrink-0 w-28 group/item relative flex flex-col items-center bg-white/[0.03] hover:bg-white/[0.06] p-2 rounded-xl border border-white/[0.08] transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => removeFromDeck(book.id)}
                            className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md transition-transform hover:scale-110 cursor-pointer"
                            title={`Elimină ${book.title}`}
                          >
                            ✕
                          </button>

                          <div
                            className="w-full aspect-[9/14] rounded-lg overflow-hidden bg-[#241c33] shadow-md border border-white/10 relative"
                            style={{
                              backgroundImage: `url(${book.cover})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          />

                          <div className="w-full mt-2 text-center">
                            <h5
                              className="text-[11px] font-bold text-white line-clamp-1 leading-tight"
                              title={book.title}
                            >
                              {book.title}
                            </h5>
                            <p
                              className="text-[10px] text-zinc-400 line-clamp-1 italic mt-0.5"
                              title={
                                Array.isArray(book.author)
                                  ? book.author.join(", ")
                                  : (book.author || "")
                              }
                            >
                              {Array.isArray(book.author)
                                ? book.author.join(", ")
                                : (book.author || "")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mesaj de trimis */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Previzualizare Mesaj
                    </label>
                    <div className="relative rounded-2xl bg-black/45 border border-white/[0.09] p-3.5 text-xs font-mono text-zinc-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-all custom-scrollbar">
                      {shareMessage}
                    </div>
                  </div>

                  {/* Share links */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2.5">
                      Distribuie pe:
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* WhatsApp */}
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-bold text-xs shadow-lg shadow-[#25D366]/20 transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.983.537 1.777.818 2.792.818 3.182 0 5.768-2.587 5.768-5.768.001-3.181-2.584-5.768-5.768-5.768zm0 10.372c-.896 0-1.637-.249-2.385-.694l-.17-.101-1.579.414.421-1.539-.112-.178c-.488-.775-.747-1.517-.746-2.508.001-2.539 2.066-4.605 4.606-4.605 2.54 0 4.607 2.066 4.607 4.605 0 2.54-2.067 4.606-4.607 4.606z" />
                        </svg>
                        <span>WhatsApp</span>
                      </button>

                      {/* SMS */}
                      <button
                        type="button"
                        onClick={handleShareSMS}
                        className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold text-xs shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
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
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                          />
                        </svg>
                        <span>SMS</span>
                      </button>

                      {/* Web Share API */}
                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-bold text-xs shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
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
                            strokeWidth="2.2"
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        <span>Altele</span>
                      </button>

                      {/* Copy to clipboard */}
                      <button
                        type="button"
                        onClick={handleCopyClipboard}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all active:scale-98 cursor-pointer ${
                          copied
                            ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                            : "bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12]"
                        }`}
                      >
                        {copied ? (
                          <>
                            <svg
                              className="w-4 h-4 text-black"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>Copiat!</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 text-zinc-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                              />
                            </svg>
                            <span>Copiază</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
