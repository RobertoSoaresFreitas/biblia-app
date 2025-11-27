"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useBible } from "../context/BibleContext";
import books from "../data/bible.json";

export default function Home() {
  const { selectedBook, selectedChapter, selectChapter } = useBible();

  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState("chapter");

  // RESPONSIVIDADE ------------------------
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // fecha automaticamente o drawer depois que o usuário seleciona capítulo
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      setMobileSidebarOpen(false);
    }
  }, [selectedBook, selectedChapter]);

  // box fixo (desktop)
  const [scrolled, setScrolled] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    function onScroll() {
      const limiar = 140;
      const y = window.scrollY || window.pageYOffset;
      setScrolled(y > limiar);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function normalize(text = "") {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function highlight(text = "", query = "") {
    if (!query) return text;
    const nText = normalize(text);
    const nQuery = normalize(query);
    const idx = nText.indexOf(nQuery);
    if (idx === -1) return text;
    const len = query.length;

    return (
      <>
        {text.slice(0, idx)}
        <strong>{text.slice(idx, idx + len)}</strong>
        {text.slice(idx + len)}
      </>
    );
  }

  const verses =
    selectedBook && selectedChapter && Array.isArray(selectedBook.chapters)
      ? selectedBook.chapters[selectedChapter - 1] || []
      : [];

  let versesToSearch = [];

  if (searchScope === "chapter") {
    versesToSearch = verses.map((v, i) => ({
      v,
      book: selectedBook?.name,
      abbrev: selectedBook?.abbrev,
      c: selectedChapter,
      i
    }));
  } else if (searchScope === "book" && selectedBook) {
    versesToSearch = selectedBook.chapters.flatMap((chapter, ci) =>
      chapter.map((v, vi) => ({
        v,
        book: selectedBook.name,
        abbrev: selectedBook.abbrev,
        c: ci + 1,
        i: vi
      }))
    );
  } else if (searchScope === "bible") {
    versesToSearch = books.flatMap((book) =>
      book.chapters.flatMap((chapter, ci) =>
        chapter.map((v, vi) => ({
          v,
          book: book.name,
          abbrev: book.abbrev,
          c: ci + 1,
          i: vi
        }))
      )
    );
  }

  const nSearch = normalize(search);
  const filteredVerses = nSearch
    ? versesToSearch.filter((item) => normalize(item.v).includes(nSearch))
    : versesToSearch;

  function gotoChapter(cap) {
    if (!selectedBook) return;
    const max = selectedBook.chapters.length;
    if (cap < 1 || cap > max) return;

    selectChapter(selectedBook, cap);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 140, behavior: "smooth" });
    }
  }

  const showBox = pinned || (scrolled && !closed);

  return (
    <div className="flex min-h-screen relative">

      {/* ========== SIDEBAR FIXO (DESKTOP) ========== */}
      <div className="hidden md:block">
        <Sidebar />

        {/* HEADER MOBILE FIXO COM HAMBURGER + NAVEGAÇÃO */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm flex items-center justify-between px-3 py-2">

          {/* Botão Hamburger */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded border bg-white shadow-sm"
            aria-label="Abrir menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Botões Navegação ← → */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => gotoChapter((selectedChapter || 1) - 1)}
              className="px-3 py-1 border rounded bg-white shadow-sm"
            >
              ←
            </button>

            <button
              onClick={() => gotoChapter((selectedChapter || 1) + 1)}
              className="px-3 py-1 border rounded bg-white shadow-sm"
            >
              →
            </button>
          </div>
        </div>

      </div>
      {/* ========== BOTÃO HAMBURGER (MOBILE) ========== */}
      {!showBox && (
        <div className="md:hidden p-3 absolute top-2 left-2 z-50">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded border bg-white shadow-md"
            aria-label="Abrir menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      {/* ========== DRAWER MOBILE ========== */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Painel lateral */}
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-full bg-white shadow-xl overflow-y-auto">

            {/* Botão fechar */}
            <div className="p-3 border-b">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="px-3 py-1 border rounded bg-white"
              >
                Fechar
              </button>
            </div>

            <Sidebar />
          </div>
        </div>
      )}

      {/* ========== CONTEÚDO PRINCIPAL ========== */}
      <main className="flex-1 bg-gray-50 pt-20 md:pt-0">

        {/* BOX FIXO (desktop somente) */}
        {showBox && (
          <>
            {/* DESKTOP */}
            <div className="hidden md:block fixed top-6 right-6 z-50">
              <div className="bg-white border rounded-lg shadow-md w-80 p-3">
                {/* linha superior */}
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {selectedBook
                        ? `${selectedBook.name} | Capítulo ${selectedChapter}`
                        : "Leitor da Bíblia"}
                    </div>

                    {selectedBook && (
                      <div className="text-xs text-gray-500">
                        {selectedBook.abbrev?.toUpperCase()} •{" "}
                        {selectedBook.chapters.length} capítulos
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPinned((s) => !s)}
                      className={`px-2 py-1 border rounded text-sm ${pinned ? "bg-gray-100" : "bg-white"
                        }`}
                    >
                      {pinned ? "📌" : "📍"}
                    </button>

                    <button
                      onClick={() => setClosed(true)}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Navegação */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => gotoChapter((selectedChapter || 1) - 1)}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                    >
                      ←
                    </button>

                    <button
                      onClick={() => gotoChapter((selectedChapter || 1) + 1)}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                    >
                      →
                    </button>

                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="p-2 border rounded bg-white hover:bg-gray-50 flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 4l-7 7h4v7h6v-7h4l-7-7z" />
                      </svg>
                    </button>
                  </div>

                  <select
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value)}
                    className="px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value="chapter">Capítulo</option>
                    <option value="book">Livro</option>
                    <option value="bible">Bíblia</option>
                  </select>
                </div>

                {/* Busca */}
                <input
                  type="text"
                  placeholder="Pesquisar (ignora acentos)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
                />
              </div>
            </div>

            {/* MOBILE */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-md p-3">
              <div className="max-w-3xl mx-auto">

                {/* Título resumido */}
                <div className="flex items-start justify-between mb-2">
                  <div className="truncate">
                    <div className="text-sm font-semibold truncate">
                      {selectedBook
                        ? `${selectedBook.name} | Cap. ${selectedChapter}`
                        : "Leitor da Bíblia"}
                    </div>

                    {selectedBook && (
                      <div className="text-xs text-gray-500">
                        {selectedBook.abbrev?.toUpperCase()} •{" "}
                        {selectedBook.chapters.length} caps
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPinned((s) => !s)}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      {pinned ? "📌" : "📍"}
                    </button>

                    <button
                      onClick={() => setClosed(true)}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* navegação mobile */}
                <div className="flex items-center justify-between gap-2 mb-2">

                  <div className="flex gap-2">
                    <button
                      onClick={() => gotoChapter((selectedChapter || 1) - 1)}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      ←
                    </button>

                    <button
                      onClick={() => gotoChapter((selectedChapter || 1) + 1)}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      →
                    </button>

                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="px-2 py-1 border rounded text-xs bg-white"
                    >
                      ↑ topo
                    </button>
                  </div>

                  <select
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value)}
                    className="px-2 py-1 border rounded text-xs bg-white"
                  >
                    <option value="chapter">Cap.</option>
                    <option value="book">Livro</option>
                    <option value="bible">Bíblia</option>
                  </select>
                </div>

                {/* busca mobile */}
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Conteúdo */}
        <div className="max-w-4xl mx-auto p-6">
          {!selectedBook && (
            <div>
              <h1 className="text-3xl font-bold mb-4">Bíblia Sagrada</h1>
              <p className="text-gray-700">Selecione um livro no menu para começar.</p>
            </div>
          )}

          {selectedBook && selectedChapter && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedBook.name} — Capítulo {selectedChapter}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedBook.abbrev?.toUpperCase()} • {selectedBook.chapters.length} capítulos
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => gotoChapter(selectedChapter - 1)}
                    className="px-3 py-1 border rounded hover:bg-white"
                  >
                    ← Anterior
                  </button>

                  <button
                    onClick={() => gotoChapter(selectedChapter + 1)}
                    className="px-3 py-1 border rounded hover:bg-white"
                  >
                    Próximo →
                  </button>
                </div>
              </div>

              <div className="bg-white border rounded p-4 shadow-sm">
                {filteredVerses.length === 0 ? (
                  <ul className="space-y-3 text-gray-800">
                    {verses.map((v, i) => (
                      <li key={i} className="leading-relaxed">
                        <span className="font-semibold mr-2">{i + 1}.</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3 text-gray-800">
                    {filteredVerses.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="font-semibold mr-2">
                          {searchScope === "chapter"
                            ? `${item.i + 1}.`
                            : `${item.book} ${item.c}:${item.i + 1}`}
                        </span>
                        <span>{highlight(item.v, search)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
