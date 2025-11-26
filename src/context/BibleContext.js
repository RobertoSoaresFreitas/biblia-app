"use client";

import { createContext, useContext, useState } from "react";

const BibleContext = createContext();

export function BibleProvider({ children }) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  function selectChapter(book, chapter) {
    setSelectedBook(book);
    setSelectedChapter(chapter);
  }

  return (
    <BibleContext.Provider value={{ selectedBook, selectedChapter, selectChapter }}>
      {children}
    </BibleContext.Provider>
  );
}

export function useBible() {
  return useContext(BibleContext);
}
