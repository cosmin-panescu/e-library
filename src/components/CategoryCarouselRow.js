"use client";

import { useRef, useState, useEffect } from "react";
import BookCard from "./BookCard";
import ShinyText from "./ShinyText";

export default function CategoryCarouselRow({
  category,
  books = [],
  onAuthorClick,
  activeConfirmBookId,
  onToggleConfirm,
  onCloseConfirm,
  onViewCategoryAll,
}) {
  const scrollRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const isDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragCleanupRef = useRef(null);

  // Inertie la eliberare glisare
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const inertiaAnimRef = useRef(null);



  // Drag-to-scroll
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    // Nu declansam drag daca se da click pe autor, popover sau controale
    if (e.target.closest("button") || e.target.closest("a")) return;

    // Oprim animatie inertie daca utilizatorul prinde din nou caruselul
    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }

    if (dragCleanupRef.current) {
      dragCleanupRef.current();
    }

    isDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.pageX;
    scrollLeftRef.current = scrollRef.current ? scrollRef.current.scrollLeft : 0;

    // Masurare viteza efect de inertie
    lastXRef.current = e.pageX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    const handleWindowMouseMove = (moveEvent) => {
      if (!isDownRef.current || !scrollRef.current) return;
      const dx = moveEvent.pageX - startXRef.current;

      // Prag minim 5px pentru a deosebi drag-ul de un simplu click sau intentie de hold pe carte
      if (Math.abs(dx) > 5) {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          setIsMouseDown(true);
        }
        moveEvent.preventDefault();
        scrollRef.current.scrollLeft = scrollLeftRef.current - dx * 1.0;

        const now = performance.now();
        const dt = now - lastTimeRef.current;
        if (dt > 10) {
          const instantVel = (moveEvent.pageX - lastXRef.current) / dt;
          velocityRef.current = velocityRef.current * 0.3 + instantVel * 0.7;
          lastXRef.current = moveEvent.pageX;
          lastTimeRef.current = now;
        }
      }
    };

    const handleWindowMouseUp = () => {
      isDownRef.current = false;
      setIsMouseDown(false);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      dragCleanupRef.current = null;

      // Prevenire declansare click accidental
      if (isDraggingRef.current) {
        const preventClickCapture = (clickEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener("click", preventClickCapture, true);
        };
        window.addEventListener("click", preventClickCapture, true);
        setTimeout(() => {
          window.removeEventListener("click", preventClickCapture, true);
          isDraggingRef.current = false;
        }, 80);

        // Aplicare efect inertie
        const timeSinceLastMove = performance.now() - lastTimeRef.current;
        if (timeSinceLastMove > 80) {
          velocityRef.current = 0;
        }

        if (Math.abs(velocityRef.current) > 0.08) {
          let currentVelocity = velocityRef.current * 16;
          const MAX_SPEED = 28;
          currentVelocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, currentVelocity));

          const friction = 0.93;

          const runInertia = () => {
            if (!scrollRef.current) return;
            currentVelocity *= friction;
            if (Math.abs(currentVelocity) < 0.25) {
              inertiaAnimRef.current = null;
              return;
            }

            scrollRef.current.scrollLeft -= currentVelocity;
            inertiaAnimRef.current = requestAnimationFrame(runInertia);
          };

          inertiaAnimRef.current = requestAnimationFrame(runInertia);
        }
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    dragCleanupRef.current = () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  };

  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
      }
      if (inertiaAnimRef.current) {
        cancelAnimationFrame(inertiaAnimRef.current);
      }
    };
  }, []);

  return (
    <section className="carousel-row-reveal mb-10 sm:mb-12">
      {/* Header carousel row: Titlu Categorie + Buton "Vezi tot" */}
      <div className="flex items-center justify-between mb-3 px-1 sm:px-2 gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-baseline gap-2 select-none py-1">
          <ShinyText
            text={category}
            speed={2.8}
            color="#9ca3af"
            shineColor="#ffffff"
            spread={120}
            className="text-sm sm:text-base font-medium tracking-wide uppercase select-none cursor-default"
          />
          <span className="text-xs font-mono text-zinc-500 font-normal select-none">
            ({books.length})
          </span>
        </div>

        <button
          type="button"
          onClick={() => onViewCategoryAll?.(category)}
          className="group flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer select-none py-1"
          title={`Vezi toate cele ${books.length} cărți din categoria ${category} în format grilă`}
        >
          <span>Vezi tot</span>
          <svg
            className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transform group-hover:translate-x-0.5 transition-all"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Row glisant cu drag & scroll */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onDragStart={(e) => e.preventDefault()}
        className={`flex gap-4 sm:gap-6 overflow-x-auto py-8 -my-4 px-3 sm:px-4 no-scrollbar select-none ${
          isMouseDown ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {books.map((book) => {
          const cardConfirmId = `${category}-${book.id}`;
          const isCardConfirmOpen = activeConfirmBookId === cardConfirmId;
          return (
            <div
              key={book.id}
              className={`flex-shrink-0 w-[140px] sm:w-[155px] ${
                isMouseDown ? "pointer-events-none select-none" : ""
              } ${isCardConfirmOpen ? "relative z-40" : "relative z-0"}`}
            >
              <BookCard
                book={book}
                onAuthorClick={onAuthorClick}
                isConfirmOpen={isCardConfirmOpen}
                onToggleConfirm={() => onToggleConfirm(cardConfirmId)}
                onCloseConfirm={onCloseConfirm}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
