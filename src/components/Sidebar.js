"use client";

import { useState, useMemo } from "react";
import booksRaw from "../data/bible.json";
import { useBible } from "../context/BibleContext";
import { useRouter } from "next/navigation";

/**
 * Sidebar organizado em ordem canônica + botão Livros que volta à Home.
 */

export default function Sidebar() {
    const { selectChapter } = useBible();
    const [openBook, setOpenBook] = useState(null);

    const router = useRouter();

    function goHome() {
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.push("/");
    }

    // Ordem canônica por abreviação
    const canonicalOrder = [
        "gn", "ex", "lv", "nm", "dt", "js", "jg", "rt",
        "1sm", "2sm", "1ks", "2ks",
        "1cr", "2cr", "ed", "ne", "et", "jo",
        "ps", "pv", "ec", "ct",
        "is", "jr", "lm", "ez", "dn",
        "os", "jl", "am", "ob", "jno", "mq", "na", "hc", "sf", "ag", "zc", "ml",
        "mt", "mc", "lc", "jo",
        "atos", "rm",
        "1co", "2co", "gl", "ef", "fp", "cl",
        "1ts", "2ts",
        "1tm", "2tm", "tt", "fm", "hb",
        "tg", "1pe", "2pe",
        "1jo", "2jo", "3jo",
        "jd",
        "ap"
    ];

    // aliases comuns
    const aliasMap = {
        "sl": "ps",
        "pss": "ps",
        "psm": "ps",
        "1rs": "1ks",
        "2rs": "2ks",
        "1s": "1sm",
        "2s": "2sm",
        "1sam": "1sm",
        "2sam": "2sm",
        "apc": "ap",
        "rev": "ap",
        "at": "atos"
    };

    function norm(s = "") {
        return String(s)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
    }

    const abbrevIndex = useMemo(() => {
        const m = {};
        canonicalOrder.forEach((k, i) => (m[k] = i));
        Object.keys(aliasMap).forEach((a) => {
            const target = aliasMap[a];
            if (m[target] !== undefined) m[a] = m[target];
        });
        return m;
    }, []);

    const nameIndex = useMemo(() => {
        const m = {};
        const names = [
            "geneses", "exodo", "levitico", "numeros", "deuteronomio", "josue", "juizes", "rute",
            "1samuel", "2samuel", "1reis", "2reis", "1cronicas", "2cronicas", "esdras", "neemias",
            "ester", "jo", "salmos", "proverbios", "eclesiastes", "cantares", "isaias",
            "jeremias", "lamentacoes", "ezequiel", "daniel", "oseias", "joel", "amos",
            "obadias", "jonas", "miqueias", "naum", "habacuque", "sofonias", "ageu",
            "zacarias", "malaquias", "mateus", "marcos", "lucas", "joao", "atos",
            "romanos", "1corintios", "2corintios", "galatas", "efesios", "filipenses",
            "colossenses", "1tessaloniceses", "2tessaloniceses", "1timoteo", "2timoteo",
            "tito", "filemom", "hebreus", "tiago", "1pedro", "2pedro",
            "1joao", "2joao", "3joao", "judas", "apocalipse"
        ];
        names.forEach((n, i) => (m[n] = i));
        return m;
    }, []);

    function getOrderIndex(book) {
        const ab = norm(book.abbrev || "");
        if (abbrevIndex[ab] !== undefined) return abbrevIndex[ab];

        const nm = norm(book.name || "");
        if (nameIndex[nm] !== undefined) return nameIndex[nm];

        const m = nm.match(/^(\d)(.+)$/);
        if (m) {
            const candidate = m[1] + m[2];
            if (nameIndex[candidate] !== undefined) return nameIndex[candidate];
        }

        return 9999;
    }

    const orderedBooks = useMemo(() => {
        const arr = [...booksRaw];
        arr.sort((a, b) => {
            const ia = getOrderIndex(a);
            const ib = getOrderIndex(b);
            if (ia !== ib) return ia - ib;
            return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
        });
        return arr;
    }, []);

    function toggleBook(abbrev) {
        setOpenBook((prev) => (prev === abbrev ? null : abbrev));
    }

    function select(book, chapter) {
        selectChapter(book, chapter);
    }

    return (
        <aside className="w-64 bg-gray-100 border-r h-screen overflow-y-auto p-4">

            {/* Link para voltar à Home */}
            {/* <a className="text-xl font-bold mb-4 flex items-center gap-2"
                title="Voltar à página inicial"
            > */}

            <a href="/" className="text-xl font-bold mb-4 flex gap-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                >
                    <path d="M6 2a2 2 0 00-2 2v16c0 .55.45 1 1 1s1-.45 1-1V4h12v16c0 .55.45 1 1 1s1-.45 1-1V4a2 2 0 00-2-2H6zm3 4v2h6V6H9zm0 4v2h6v-2H9z" />
                </svg>
                Bíblia Sagrada
                
            </a>

            <nav>
                <ul className="space-y-2">
                    {orderedBooks.map((book) => (
                        <li key={book.abbrev || book.name} className="border rounded bg-white">
                            <button
                                onClick={() => toggleBook(book.abbrev)}
                                className="w-full text-left p-2 flex justify-between items-center hover:bg-gray-50"
                            >
                                <span className="truncate">{book.name}</span>
                                <span className="text-xs text-gray-500">
                                    {book.abbrev.toUpperCase()} • {book.chapters.length} caps
                                </span>
                            </button>

                            {openBook === book.abbrev && (
                                <ul className="px-3 pb-2 space-y-1 mt-1">
                                    {book.chapters.map((_, chapIndex) => (
                                        <li key={chapIndex}>
                                            <button
                                                onClick={() => select(book, chapIndex + 1)}
                                                className="w-full text-left px-2 py-1 rounded hover:bg-gray-200"
                                            >
                                                Cap. {chapIndex + 1}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}


