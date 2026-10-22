import { useEffect, useRef, useState } from "react";
import { save } from "../lib/storage";

export const NOTES_STORAGE_KEY = "piano-notes";

// Libreta de texto: se guarda sola en este navegador y puede insertar el
// acorde que se está tocando. La tonalidad del texto se muestra junto al piano.
export default function NotesPanel({ text, setText, currentChord }) {
  const [saved, setSaved] = useState(true);
  const areaRef = useRef(null);

  // Guardado automático medio segundo después de dejar de escribir.
  useEffect(() => {
    setSaved(false);
    const id = setTimeout(() => {
      save(NOTES_STORAGE_KEY, text);
      setSaved(true);
    }, 500);
    return () => clearTimeout(id);
  }, [text]);

  const insert = (snippet) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const needsSpace = start > 0 && !/\s/.test(text[start - 1]);
    const piece = (needsSpace ? " " : "") + snippet + " ";
    setText(text.slice(0, start) + piece + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + piece.length, start + piece.length);
    });
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "notas-piano.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      <section className="side-section notes">
        <div className="side-head">
          <h3>Notas</h3>
          <span className="muted small">
            {saved ? "Guardado" : "Guardando…"}
          </span>
        </div>

        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Escribe tus notas o pega la letra con acordes de una canción…\n\nC           G\nWhen I find myself in times of trouble\nAm              F\nMother Mary comes to me"
          }
          spellCheck
        />

        <div className="notes-tools">
          <button
            className="chord-insert"
            onMouseDown={(e) => e.preventDefault()} // no quitar el foco ni la posición del cursor
            onClick={() => currentChord && insert(currentChord)}
            disabled={!currentChord}
            title="Escribe en la libreta el acorde que estás tocando"
          >
            + Acorde {currentChord && <strong>{currentChord}</strong>}
          </button>
          <button
            onClick={download}
            disabled={!text}
            title="Descargar como archivo de texto"
          >
            Descargar
          </button>
          <button
            className="link"
            onClick={() => {
              if (text && window.confirm("¿Borrar todas las notas?"))
                setText("");
            }}
            disabled={!text}
          >
            Borrar
          </button>
          <span className="muted small notes-count">
            {words} palabra{words === 1 ? "" : "s"}
          </span>
        </div>
      </section>
    </>
  );
}
