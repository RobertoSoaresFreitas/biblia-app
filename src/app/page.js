"use client";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useBible } from "../context/BibleContext";
import books from "../data/bible.json";

export default function Home() {
  const { selectedBook, selectedChapter, selectChapter } = useBible();

  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState("chapter"); // "chapter" | "book" | "bible"

  // controle de visibilidade do box fixo
  const [scrolled, setScrolled] = useState(false); // true quando o usuário rolou além do limiar
  const [pinned, setPinned] = useState(false); // se true, o box fica sempre visível
  const [closed, setClosed] = useState(false); // se true, o usuário fechou o box (até reload/navegação)

  // Listener de scroll — define 'scrolled' quando scrollY > limiar
  useEffect(() => {
    function onScroll() {
      const limiar = 140; // ajustar se quiser que apareça antes/depois
      const y = window.scrollY || window.pageYOffset;
      setScrolled(y > limiar);
      // se o usuário rolou para o topo e box não está pinado, reabrimos (se não tiver sido fechado)
      // não alteramos 'closed' aqui para respeitar o fechamento manual
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Normalizador: remove acentos e minúsculas para comparação
  function normalize(text = "") {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // Destacar a primeira ocorrência encontrada (mantém texto original)
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

  // Versículos do capítulo atual (array)
  const verses =
    selectedBook && selectedChapter && Array.isArray(selectedBook.chapters)
      ? selectedBook.chapters[selectedChapter - 1] || []
      : [];

  // Prepara lista a pesquisar conforme escopo
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

  // Aplicar filtro normalizado
  const nSearch = normalize(search);
  const filteredVerses = nSearch
    ? versesToSearch.filter((item) => normalize(item.v).includes(nSearch))
    : versesToSearch;

  // Navegação de capítulo (1-based)
  function gotoChapter(cap) {
    if (!selectedBook) return;
    const max = selectedBook.chapters.length;
    if (cap < 1 || cap > max) return;
    selectChapter(selectedBook, cap);
    // rola um pouco para mostrar o começo do conteúdo (ajustável)
    if (typeof window !== "undefined") window.scrollTo({ top: 140, behavior: "smooth" });
  }

  // Determina se o box deve ser mostrado: se estiver pinado OR (se rolou além do limiar e não foi fechado)
  const showBox = pinned || (scrolled && !closed);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 bg-gray-50">
        {/* BOX FIXO NO TOPO DIREITO */}
        {/* visível em md+; escondido em telas pequenas */}
        {showBox && (
          <div className="hidden md:block fixed top-6 right-6 z-50">
            <div className="bg-white border rounded-lg shadow-md w-80">
              <div className="p-3">
                {/* linha superior: título compacto + ações */}
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {selectedBook ? `${selectedBook.name} | Capítulo ${selectedChapter}` : "Leitor da Bíblia"}
                    </div>
                    {selectedBook && (
                      <div className="text-xs text-gray-500">{selectedBook.abbrev?.toUpperCase()} • {selectedBook.chapters.length} capítulos</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* botao pin */}
                    <button
                      title={pinned ? "Desfixar" : "Fixar"}
                      onClick={() => setPinned((s) => !s)}
                      className={`px-2 py-1 border rounded text-sm ${pinned ? "bg-gray-100" : "bg-white"}`}
                    >
                      {pinned ? "📌" : "📍"}
                    </button>

                    {/* botao fechar */}
                    <button
                      title="Fechar"
                      onClick={() => setClosed(true)}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* navegação e controles */}
                <div className="flex items-center justify-between mb-2 gap-2">

  {/* Botões Anterior / Próximo / Ir ao Topo */}
  <div className="flex items-center gap-2">
    <button
      onClick={() => gotoChapter((selectedChapter || 1) - 1)}
      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
      aria-label="Anterior"
    >
      ←
    </button>

    <button
      onClick={() => gotoChapter((selectedChapter || 1) + 1)}
      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
      aria-label="Próximo"
    >
      →
    </button>

    {/* Botão Ir ao Topo com SVG */}
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="p-2 border rounded bg-white hover:bg-gray-50 flex items-center justify-center"
      aria-label="Ir ao topo"
      title="Voltar ao topo"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path d="M12 4l-7 7h4v7h6v-7h4l-7-7z" />
      </svg>
    </button>
  </div>

  {/* Seletor de escopo */}
  <div className="flex items-center gap-2">
    <select
      value={searchScope}
      onChange={(e) => setSearchScope(e.target.value)}
      className="px-2 py-1 border rounded text-sm bg-white"
      aria-label="Escopo de busca"
    >
      <option value="chapter">Capítulo</option>
      <option value="book">Livro</option>
      <option value="bible">Bíblia</option>
    </select>
  </div>

</div>


                {/* campo de busca */}
                <div>
                  <input
                    type="text"
                    placeholder="Pesquisar (ignora acentos)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="max-w-4xl mx-auto p-6">
          {/* Cabeçalho grande no fluxo (sempre visível no topo do conteúdo) */}
          {!selectedBook && (
            <div>
              <h1 className="text-3xl font-bold mb-4">Leitor da Bíblia</h1>
              <p className="text-gray-700">Selecione um livro no menu à esquerda para começar.</p>
            </div>
          )}

          {selectedBook && selectedChapter && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedBook.name} — Capítulo {selectedChapter}</h2>
                  <p className="text-sm text-gray-500">{selectedBook.abbrev?.toUpperCase()} • {selectedBook.chapters.length} capítulos</p>
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

              {/* Caixa do capítulo */}
              <div className="bg-white border rounded p-4 shadow-sm">
                {/* Se houver busca ativa mostramos resultados; senão o capítulo inteiro */}
                {filteredVerses.length === 0 ? (
                  <ul className="space-y-3 text-gray-800">
                    {verses.map((v, i) => (
                      <li key={i} className="leading-relaxed">
                        <span className="font-semibold text-gray-700 mr-2">{i + 1}.</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3 text-gray-800">
                    {filteredVerses.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="font-semibold text-gray-700 mr-2">
                          {searchScope === "chapter" ? `${item.i + 1}.` : `${item.book} ${item.c}:${item.i + 1}`}
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
