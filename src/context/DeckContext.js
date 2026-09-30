"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAllBooks } from "@/lib/books";

const DeckContext = createContext(null);

const STORAGE_KEY = "e_library_reading_deck_v1";

export function DeckProvider({ children }) {
  const [deck, setDeck] = useState([]);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Incarcare initiala: localStorage | parametrul URL (?deck=id1,id2)
  useEffect(() => {
    try {
      const allBooks = getAllBooks();
      const params = new URLSearchParams(window.location.search);
      const sharedDeckParam = params.get("deck");

      if (sharedDeckParam) {
        // din share link
        const ids = sharedDeckParam.split(",").map((id) => id.trim());
        const sharedBooks = allBooks.filter((book) => ids.includes(book.id));
        if (sharedBooks.length > 0) {
          setDeck(sharedBooks);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedBooks.map((b) => b.id)));
          setToastMessage(`Am încărcat ${sharedBooks.length} cărți recomandate din link!`);
          setTimeout(() => setToastMessage(null), 5000);
          return;
        }
      }

      // din localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedIds = JSON.parse(saved);
        if (Array.isArray(savedIds)) {
          const matchedBooks = allBooks.filter((b) => savedIds.includes(b.id));
          setDeck(matchedBooks);
        }
      }
    } catch (e) {
      console.warn("Eroare la citirea deck-ului din stocare:", e);
    }
  }, []);

  // Salvare in localStorage la orice modificare a deck-ului
  const persistDeck = useCallback((newDeck) => {
    try {
      const ids = newDeck.map((b) => b.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.warn("Eroare la salvarea deck-ului:", e);
    }
  }, []);

  // Adaugare carte in deck
  const addToDeck = useCallback(
    (book) => {
      setDeck((prev) => {
        if (prev.some((b) => b.id === book.id)) {
          return prev;
        }
        const updated = [...prev, book];
        persistDeck(updated);
        return updated;
      });

      setRecentlyAddedId(book.id);
      setTimeout(() => setRecentlyAddedId(null), 2500);
    },
    [persistDeck]
  );

  // Stergere carte din deck
  const removeFromDeck = useCallback(
    (bookId) => {
      setDeck((prev) => {
        const updated = prev.filter((b) => b.id !== bookId);
        persistDeck(updated);
        return updated;
      });
    },
    [persistDeck]
  );

  // Golire deck
  const clearDeck = useCallback(() => {
    setDeck([]);
    persistDeck([]);
  }, [persistDeck]);

  // Daca o carte e in deck
  const isInDeck = useCallback(
    (bookId) => {
      return deck.some((b) => b.id === bookId);
    },
    [deck]
  );

  return (
    <DeckContext.Provider
      value={{
        deck,
        addToDeck,
        removeFromDeck,
        clearDeck,
        isInDeck,
        isDeckOpen,
        setIsDeckOpen,
        recentlyAddedId,
        toastMessage,
        setToastMessage,
      }}
    >
      {children}
    </DeckContext.Provider>
  );
}

const DEFAULT_DECK_VALUE = {
  deck: [],
  addToDeck: () => {},
  removeFromDeck: () => {},
  clearDeck: () => {},
  isInDeck: () => false,
  isDeckOpen: false,
  setIsDeckOpen: () => {},
  recentlyAddedId: null,
  toastMessage: null,
  setToastMessage: () => {},
};

export function useDeck() {
  const context = useContext(DeckContext);
  return context || DEFAULT_DECK_VALUE;
}
