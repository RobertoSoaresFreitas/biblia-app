"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { useBible } from "../context/BibleContext";
import books from "../data/bible.json";

export default function Home() {
  const { selectedBook, selectedChapter, selectChapter } = useBible();

  const [search, setSearch] = useState(""); // valor do input
  const [appliedSearch, setAppliedSearch] = useState(""); // busca aplicada (quando clicar Pesquisar)
  const [searchScope, setSearchScope] = useState("chapter");

  // RESPONSIVIDADE ------------------------
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // novo: versículo selecionado no capítulo (1-based)
  const [selectedVerse, setSelectedVerse] = useState(1);

  // ref para suprimir reset do selectedVerse quando navegamos programaticamente para um verso específico
  const suppressResetRef = useRef(false);

  // fecha automaticamente o drawer depois que o usuário seleciona capítulo
  useEffect(() => {
    // RESPEITA navegações programáticas: não tocar selectedVerse se suprimido
    if (suppressResetRef.current) {
      // ainda fechamos o drawer, mas não alteramos selectedVerse aqui
      setMobileSidebarOpen(false);
      return;
    }

    if (selectedBook && selectedChapter) {
      setMobileSidebarOpen(false);
      // ajusta selectedVerse apenas se necessário (veja useEffect abaixo para reset/controle)
      const max = selectedBook?.chapters?.[selectedChapter - 1]?.length || 0;
      if (selectedVerse > max) {
        setSelectedVerse(max > 0 ? max : 1);
      } else if (selectedVerse < 1) {
        setSelectedVerse(1);
      }
    }
  }, [selectedBook, selectedChapter]); // mantive apenas para controle de bounds

  // efeito que reseta selectedVerse a 1 quando capítulo muda, exceto se suprimido
  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    if (suppressResetRef.current) {
      // navegação programática com verso já definido: não resetar
      suppressResetRef.current = false;
      return;
    }
    // comportamento padrão: resetar para 1 ao trocar capítulo (ex.: seleção via Sidebar)
    setSelectedVerse(1);
  }, [selectedBook, selectedChapter]);

  // === NOVO: scroll automático para o verso ativo ===
  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;

    const id = `verse-${selectedChapter}-${selectedVerse}`;

    // tenta encontrar o elemento imediatamente; se não existir, aguarda o próximo frame
    const scrollToElement = () => {
      const el = document.getElementById(id);
      if (el) {
        // usar block: 'center' para centralizar o verso na viewport
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // primeiro passo: tentar agora
    scrollToElement();

    // caso o DOM ainda não tenha sido atualizado (ex.: mudança de capítulo), tentar no next frame
    requestAnimationFrame(() => {
      scrollToElement();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook, selectedChapter, selectedVerse]);

  // bloqueia scroll do body quando drawer mobile aberto (opcional)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : previous || "";
    return () => {
      document.body.style.overflow = previous || "";
    };
  }, [mobileSidebarOpen]);

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

  // use appliedSearch (definida ao clicar Pesquisar) para filtrar
  const nSearch = normalize(appliedSearch);
  const filteredVerses = nSearch
    ? versesToSearch.filter((item) => normalize(item.v).includes(nSearch))
    : versesToSearch;

  // ações de busca
  function handleSearchApply() {
    setAppliedSearch(search.trim());
    // rolar para mostrar resultados se quiser:
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 140, behavior: "smooth" });
    }
  }

  function handleClear() {
    setSearch("");
    setAppliedSearch("");
    setSearchScope("chapter"); // <<< correção: resetar para capítulo
  }

  // permite Enter para buscar
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchApply();
    }
  }

  // helper: seleciona outro livro + capítulo
  function gotoBookChapter(bookObj, cap, verse = 1) {
    if (!bookObj) return;
    const max = bookObj.chapters.length;
    if (cap < 1 || cap > max) return;

    if (typeof verse === "number" && verse >= 1) {
      suppressResetRef.current = true;
    }

    selectChapter(bookObj, cap);
    setSelectedVerse(verse);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 140, behavior: "smooth" });
    }
  }

  // gotoChapter agora usa o livro atual (compatibilidade)
  function gotoChapter(cap, verse = 1) {
    if (!selectedBook) return;
    gotoBookChapter(selectedBook, cap, verse);
  }

  // Nova função: ir para um verso específico (mantém compatibilidade)
  function gotoVerse(cap, verse) {
    gotoChapter(cap, verse);
  }

  // Funções de navegação com travessia entre capítulos e livros quando necessário
  function gotoNext() {
    if (!selectedBook || !selectedChapter) return;
    const currentChapterIndex = selectedChapter - 1;
    const chapterVerses = selectedBook.chapters?.[currentChapterIndex] || [];
    const lastVerseIndex = chapterVerses.length; // versículos são 1-based

    if (selectedVerse < lastVerseIndex) {
      // simplesmente avança o versículo
      setSelectedVerse((v) => v + 1);
      return;
    }

    // estamos no último verso do capítulo
    const nextChapter = selectedChapter + 1;
    if (nextChapter <= (selectedBook.chapters?.length || 0)) {
      // próximo capítulo no mesmo livro
      gotoChapter(nextChapter, 1);
      return;
    }

    // fim do livro atual: tenta ir para o próximo livro (capítulo 1, verso 1)
    const currentBookIndex = books.findIndex(
      (b) => (b.abbrev ?? b.name) === (selectedBook?.abbrev ?? selectedBook?.name)
    );
    const nextBookIndex = currentBookIndex + 1;
    if (nextBookIndex < books.length) {
      const nextBook = books[nextBookIndex];
      gotoBookChapter(nextBook, 1, 1);
    } else {
      // já no último livro da Bíblia: não faz nada
    }
  }

  function gotoPrev() {
    if (!selectedBook || !selectedChapter) return;
    const currentChapterIndex = selectedChapter - 1;
    const chapterVerses = selectedBook.chapters?.[currentChapterIndex] || [];

    // se há versos no capítulo e não estamos no verso 1, apenas retrocede
    if (chapterVerses.length > 0 && selectedVerse > 1) {
      setSelectedVerse((v) => v - 1);
      return;
    }

    // se não há versos, tentamos capítulo anterior normalmente
    const prevChapter = selectedChapter - 1;
    if (prevChapter >= 1) {
      const prevChapterVerses = selectedBook.chapters?.[prevChapter - 1] || [];
      const lastVerseOfPrev = Math.max(prevChapterVerses.length, 1);
      gotoChapter(prevChapter, lastVerseOfPrev);
      return;
    }

    // se chegamos aqui, estamos no primeiro capítulo do livro atual -> tentar livro anterior
    const currentBookIndex = books.findIndex(
      (b) => (b.abbrev ?? b.name) === (selectedBook?.abbrev ?? selectedBook?.name)
    );
    const prevBookIndex = currentBookIndex - 1;
    if (prevBookIndex >= 0) {
      const prevBook = books[prevBookIndex];
      const lastChapterIndex = prevBook.chapters.length - 1;
      const lastChapterNumber = lastChapterIndex + 1;
      const lastChapterVerses = prevBook.chapters?.[lastChapterIndex] || [];
      const lastVerseOfLastChapter = Math.max(lastChapterVerses.length, 1);
      gotoBookChapter(prevBook, lastChapterNumber, lastVerseOfLastChapter);
    } else {
      // já no primeiro livro: não faz nada
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

        </div>

      </div>

      {/* ========== BOTÃO HAMBURGER (MOBILE) ========== */}
      {!showBox && (
        <div className="md:hidden ml-2 p-0 absolute top-2 left-2 z-50">
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
          <div className="fixed left-0 top-0 bottom-0 w-72 max-w-full bg-white shadow-xl overflow-y-auto h-full">

            {/* Botão fechar */}
            <div className="p-3 border-b">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="ml-20 px-3 py-1 border rounded bg-white"
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
                        ? `${selectedBook.name} ${selectedChapter}:${selectedVerse}`
                        : "Leitor da Bíblia"}
                    </div>

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
                      onClick={gotoPrev}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                    >
                      ← Anterior
                    </button>

                    <button
                      onClick={gotoNext}
                      className="px-2 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                    >
                      Próximo →
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


                </div>

                {/* Busca (desktop fixed box) */}

                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full md-4 px-3 py-2 border rounded focus:outline-none focus:ring"
                />
                <div className="flex flex-row align-items gap-4 md-4 mt-2">
                  <select
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value)}
                    className="px-3 py-2 border rounded text-sm bg-white"
                  >
                    <option value="chapter">Capítulo</option>
                    <option value="book">Livro</option>
                    <option value="bible">Bíblia</option>
                  </select>

                  <button
                    onClick={handleSearchApply}
                    className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50"
                  >
                    Pesquisar
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            {/* MOBILE */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-md p-3">
              <div className="max-w-3xl mx-auto">

                {/* Título resumido "box flutuante" */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-row gap-4">
                    <div className="text-sm font-semibold truncate">
                      {selectedBook
                        ? `${selectedBook.name} ${selectedChapter}:${selectedVerse}`
                        : "Leitor da Bíblia"}
                    </div>

                    {selectedBook && (
                      <div className="p-1 text-xs text-gray-600">
                        {selectedBook.abbrev?.toUpperCase()} - {" "}
                        {selectedBook.chapters.length} Capítulos
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
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



                <div className="flex flex-row gap-4 m-2 items-center justify-center">


                  <p className="text-sm text-center">Versículo {'👉'}</p>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={gotoPrev}
                      className="text-sm px-3 py-2 border rounded hover:bg-white"
                    >
                      ← Anterior
                    </button>

                    <button
                      onClick={gotoNext}
                      className="text-sm px-3 py-2 border rounded hover:bg-white"
                    >
                      Próximo →
                    </button>

                  </div>

                </div>

              </div>

              {/* busca mobile (versão compacta) */}
              <div className="max-w-3xl mx-auto items-center">

                <div className="flex gap-2">

                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-90 px-3 py-2 mt-2 border rounded text-sm"
                  />
                </div>

                <div className="flex flex-row itens-center gap-3 mt-2 ">

                  <select
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value)}
                    className="text-sm px-3 py-2 border rounded bg-white"
                  >
                    <option value="chapter">Capítulo</option>
                    <option value="book">Livro</option>
                    <option value="bible">Bíblia</option>
                  </select>

                  <button
                    onClick={handleSearchApply}
                    className="text-sm px-3 py-2 border rounded bg-white"
                  >
                    Pesquisar
                  </button>

                  <button
                    onClick={handleClear}
                    className="text-sm px-3 py-2 border rounded bg-white"
                  >
                    Limpar
                  </button>

                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-sm px-3 py-2 border rounded bg-white"
                  >
                    ↑ topo
                  </button>

                </div>

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
                    {selectedBook.name} {selectedChapter}:{selectedVerse}
                  </h2>

                </div>


                <div className="flex flex-col items-center">
                  <p className="text-center">Versículo</p>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={gotoPrev}
                      className="px-3 py-1 border rounded hover:bg-white"
                    >
                      ← Anterior
                    </button>

                    <button
                      onClick={gotoNext}
                      className="px-3 py-1 border rounded hover:bg-white"
                    >
                      Próximo →
                    </button>
                  </div>
                </div>

              </div>

              {/* aqui também coloquei uma barra de busca dentro do fluxo do conteúdo
                  para que a busca fique disponível no desktop mesmo quando showBox === false */}
              <div className="mb-4 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Pesquisar (ignora acentos)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
                />

                {/* <-- SELETOR DE ESCOPO ADICIONADO AQUI PARA DESKTOP */}
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value)}
                  className="px-2 py-2 border rounded text-sm bg-white"
                >
                  <option value="chapter">Capítulo</option>
                  <option value="book">Livro</option>
                  <option value="bible">Bíblia</option>
                </select>

                <button onClick={handleSearchApply} className="px-3 py-2 border rounded bg-white">
                  Pesquisar
                </button>
                <button onClick={handleClear} className="px-3 py-2 border rounded bg-white">
                  Limpar
                </button>
              </div>

              <div className="bg-white border rounded p-4 shadow-sm">
                {filteredVerses.length === 0 ? (
                  <ul className="space-y-3 text-gray-800">
                    {verses.map((v, i) => {
                      const verseNumber = i + 1;
                      const isActive = verseNumber === selectedVerse;
                      return (
                        <li
                          id={`verse-${selectedChapter}-${verseNumber}`}
                          key={i}
                          className={`leading-relaxed cursor-pointer ${isActive ? "bg-gray-100 rounded p-2" : ""}`}
                          onClick={() => setSelectedVerse(verseNumber)}
                        >
                          <span className="font-semibold mr-2">{verseNumber}.</span>
                          {/* aplica font-size 1.4em quando ativo */}
                          <span style={isActive ? { fontSize: "1.4em" } : undefined}>{v}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="space-y-3 text-gray-800">
                    {filteredVerses.map((item, idx) => {
                      const verseNumber = item.i + 1;
                      const isActive = item.c === selectedChapter && verseNumber === selectedVerse;
                      return (
                        <li
                          id={`verse-${item.c}-${verseNumber}`}
                          key={idx}
                          className={`leading-relaxed cursor-pointer ${isActive ? "bg-gray-100 rounded p-2" : ""}`}
                          onClick={() => {
                            // se o resultado for de outro capítulo do mesmo livro, navegamos para ele
                            if (item.c !== selectedChapter) {
                              gotoVerse(item.c, verseNumber);
                            } else {
                              setSelectedVerse(verseNumber);
                            }
                          }}
                        >
                          <span className="font-semibold mr-2">
                            {searchScope === "chapter"
                              ? `${verseNumber}.`
                              : `${item.book} ${item.c}:${verseNumber}`}
                          </span>
                          <span style={isActive ? { fontSize: "1.4em" } : undefined}>
                            {highlight(item.v, appliedSearch)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div >
  );
}
