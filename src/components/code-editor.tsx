"use client";
import { useEffect, useRef, useState } from "react";
import type { Extension } from "@codemirror/state";

/**
 * Code editor for the project Code tab.
 *
 * Progressive enhancement: the page first renders a plain <textarea> that
 * carries name="content", so saving works even before (or without) the
 * editor bundle loading. Once CodeMirror has loaded, it takes over the
 * visible editing and keeps the hidden textarea in sync, so the form posts
 * exactly what the person sees. CodeMirror is imported on demand so other
 * pages don't pay for it.
 */
export function CodeEditor({
  id,
  name,
  value,
  language,
  readOnly = false,
  label,
}: {
  id: string;
  name?: string;
  value: string;
  language: string;
  readOnly?: boolean;
  label: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    let destroyed = false;
    let destroy: (() => void) | undefined;
    (async () => {
      const [{ EditorView, basicSetup }, { EditorState }, { indentWithTab }, { keymap }, lang] = await Promise.all([
        import("codemirror"),
        import("@codemirror/state"),
        import("@codemirror/commands"),
        import("@codemirror/view"),
        loadLanguage(language),
      ]);
      if (destroyed || !hostRef.current || !textareaRef.current) return;
      const textarea = textareaRef.current;
      const view = new EditorView({
        parent: hostRef.current,
        state: EditorState.create({
          doc: textarea.value,
          extensions: [
            basicSetup,
            keymap.of([indentWithTab]),
            EditorState.readOnly.of(readOnly),
            EditorView.editable.of(!readOnly),
            EditorView.contentAttributes.of({ "aria-label": label, ...(readOnly ? { "aria-readonly": "true" } : {}) }),
            EditorView.updateListener.of((u) => { if (u.docChanged) textarea.value = u.state.doc.toString(); }),
            theme(EditorView),
            ...(lang ? [lang] : []),
          ],
        }),
      });
      destroy = () => view.destroy();
      setEnhanced(true);
    })().catch(() => { /* keep the plain textarea if the editor can't load */ });
    return () => { destroyed = true; destroy?.(); };
  }, [language, readOnly, label]);

  return (
    <>
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        defaultValue={value}
        readOnly={readOnly}
        spellCheck={false}
        wrap="off"
        aria-label={label}
        hidden={enhanced}
        className="h-[62vh] w-full resize-y rounded-xl border border-border bg-surface-2 p-3 font-mono text-[13px] leading-5"
      />
      <div ref={hostRef} hidden={!enhanced} className="h-[62vh] overflow-hidden rounded-xl border border-border bg-surface-2" />
    </>
  );
}

async function loadLanguage(language: string): Promise<Extension | null> {
  switch (language) {
    case "typescript": return (await import("@codemirror/lang-javascript")).javascript({ typescript: true });
    case "tsx": return (await import("@codemirror/lang-javascript")).javascript({ typescript: true, jsx: true });
    case "javascript": return (await import("@codemirror/lang-javascript")).javascript();
    case "jsx": return (await import("@codemirror/lang-javascript")).javascript({ jsx: true });
    case "json": return (await import("@codemirror/lang-json")).json();
    case "css": return (await import("@codemirror/lang-css")).css();
    case "html": return (await import("@codemirror/lang-html")).html();
    case "sql": return (await import("@codemirror/lang-sql")).sql({ dialect: (await import("@codemirror/lang-sql")).PostgreSQL });
    case "markdown": return (await import("@codemirror/lang-markdown")).markdown();
    case "yaml": return (await import("@codemirror/lang-yaml")).yaml();
    default: return null;
  }
}

/** Matches the app's design tokens (see globals.css) in light and dark. */
function theme(EditorView: typeof import("@codemirror/view").EditorView): Extension {
  return EditorView.theme({
    "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--surface-2)", color: "var(--text)" },
    ".cm-scroller": { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)", lineHeight: "1.25rem" },
    ".cm-gutters": { backgroundColor: "var(--surface-2)", color: "var(--text-muted)", borderRight: "1px solid var(--border)" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)" },
    "&.cm-focused": { outline: "2px solid var(--focus)", outlineOffset: "-2px" },
    ".cm-cursor": { borderLeftColor: "var(--text)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)" },
  });
}
