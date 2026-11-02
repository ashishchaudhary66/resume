import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

const RESUME_FILES = [
  { id: "react", fileName: "React_DotNet_FullStack.tex", title: "React + .NET", description: "React-focused full stack resume", marker: "R" },
  { id: "angular", fileName: "Angular_DotNet_FullStack.tex", title: "Angular + .NET", description: "Angular-focused full stack resume", marker: "A" },
  { id: "combined", fileName: "React_Angular_DotNet_FullStack.tex", title: "React + Angular + .NET", description: "Combined full stack resume", marker: "RA" }
];

const STORAGE_PREFIX = "ashish-resume-lab:draft:";

function readDraft(id) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function App() {
  const [activeId, setActiveId] = useState("react");
  const [sources, setSources] = useState({});
  const [originals, setOriginals] = useState({});
  const [savedVersions, setSavedVersions] = useState({});
  const [loadedFiles, setLoadedFiles] = useState({});
  const [loadingFile, setLoadingFile] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [compiler, setCompiler] = useState("pdflatex");
  const [compilerProxyUrl, setCompilerProxyUrl] = useState(() => {
    try {
      return window.localStorage.getItem("resume-lab:compiler-proxy-url") ||
        import.meta.env.VITE_COMPILER_PROXY_URL || "";
    } catch {
      return import.meta.env.VITE_COMPILER_PROXY_URL || "";
    }
  });
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [compileOutput, setCompileOutput] = useState("");
  const [compileState, setCompileState] = useState({ type: "idle", message: "Ready to compile" });
  const [showLog, setShowLog] = useState(false);

  const activeFile = RESUME_FILES.find((file) => file.id === activeId) || RESUME_FILES[0];
  const source = sources[activeId] ?? "";
  const isDirty = Object.prototype.hasOwnProperty.call(savedVersions, activeId)
    ? savedVersions[activeId] !== source
    : false;
  const extensions = useMemo(() => [StreamLanguage.define(stex)], []);

  useEffect(() => {
    if (loadedFiles[activeId]) return undefined;

    let cancelled = false;
    setLoadingFile(true);
    setLoadError("");

    fetch(import.meta.env.BASE_URL + "templates/" + activeFile.fileName)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load " + activeFile.fileName + " (" + response.status + ").");
        }
        return response.text();
      })
      .then((original) => {
        if (cancelled) return;
        const draft = readDraft(activeId);
        const initialValue = draft === null ? original : draft;
        setOriginals((current) => ({ ...current, [activeId]: original }));
        setSources((current) => ({ ...current, [activeId]: initialValue }));
        setSavedVersions((current) => ({ ...current, [activeId]: initialValue }));
        setLoadedFiles((current) => ({ ...current, [activeId]: true }));
        setLoadingFile(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error.message || "Unable to load the selected resume source.");
        setLoadingFile(false);
      });

    return () => { cancelled = true; };
  }, [activeId, activeFile.fileName, loadedFiles]);

  useEffect(() => {
    if (!loadedFiles[activeId] || !Object.prototype.hasOwnProperty.call(sources, activeId)) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + activeId, source);
        setSavedVersions((current) => ({ ...current, [activeId]: source }));
      } catch {
        setCompileState({ type: "warning", message: "Draft could not be saved. Browser storage may be unavailable." });
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [activeId, source, loadedFiles, sources]);

  useEffect(() => {
    setPdfUrl("");
    setCompileOutput("");
    setShowLog(false);
    setCompileState({ type: "idle", message: "Ready to compile" });
  }, [activeId]);

  function configureCompilerProxy() {
    const entered = window.prompt(
      "Paste your Cloudflare Worker URL. Example: https://resume-lab-compiler.YOUR-SUBDOMAIN.workers.dev",
      compilerProxyUrl
    );
    if (entered === null) return;

    const value = entered.trim().replace(/\\/+$/, "");
    if (!value) {
      try { window.localStorage.removeItem("resume-lab:compiler-proxy-url"); } catch { /* storage unavailable */ }
      setCompilerProxyUrl("");
      setCompileState({ type: "warning", message: "Compiler proxy URL cleared." });
      return;
    }

    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      setCompileState({ type: "error", message: "Enter a valid HTTPS Worker URL." });
      return;
    }

    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      setCompileState({ type: "error", message: "The compiler proxy must be a public HTTPS URL." });
      return;
    }

    const normalized = parsed.origin + parsed.pathname.replace(/\\/+$/, "");
    try {
      window.localStorage.setItem("resume-lab:compiler-proxy-url", normalized);
    } catch {
      setCompileState({ type: "warning", message: "Could not save the proxy URL in this browser." });
      return;
    }
    setCompilerProxyUrl(normalized);
    setCompileState({ type: "success", message: "Compiler proxy configured for this browser." });
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + activeId, source);
      setSavedVersions((current) => ({ ...current, [activeId]: source }));
      setCompileState({ type: "success", message: "Draft saved in this browser" });
    } catch {
      setCompileState({ type: "warning", message: "Could not save draft. Check browser storage settings." });
    }
  }

  function resetSource() {
    const original = originals[activeId];
    if (typeof original !== "string") return;

    setSources((current) => ({ ...current, [activeId]: original }));
    setSavedVersions((current) => ({ ...current, [activeId]: original }));
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + activeId);
    } catch {
      // Source is still reset in the current editor session.
    }
    setPdfUrl("");
    setCompileOutput("");
    setCompileState({ type: "idle", message: "Restored the repository version" });
  }

  function downloadSource() {
    const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFile.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function compileSource() {
    if (!source.trim()) {
      setCompileState({ type: "error", message: "The LaTeX source is empty." });
      return;
    }

    if (!compilerProxyUrl) {
      setCompileOutput("The compiler proxy is not configured yet. Deploy the Cloudflare Worker from worker/ and then use Set proxy URL in the top bar.");
      setShowLog(true);
      setCompileState({ type: "warning", message: "Set the compiler proxy URL first." });
      return;
    }

    setIsCompiling(true);
    setPdfUrl("");
    setCompileOutput("");
    setShowLog(false);
    setCompileState({ type: "compiling", message: "Sending source to compiler proxy…" });

    try {
      const baseUrl = compilerProxyUrl.replace(/\\/+$/, "");
      const compileUrl = baseUrl.endsWith("/compile") ? baseUrl : baseUrl + "/compile";
      const response = await fetch(compileUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: source, compiler: compiler })
      });

      const responseText = await response.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { message: responseText };
      }

      if (!response.ok) {
        const details = result.log || result.message || result.error || "The compiler returned HTTP " + response.status + ".";
        setCompileOutput(String(details));
        setShowLog(true);
        setCompileState({ type: "error", message: "Compilation failed (" + response.status + ")" });
        return;
      }

      if (!result.pdf_url) {
        throw new Error(result.message || "Pressa did not return a PDF URL.");
      }

      setPdfUrl(result.pdf_url);
      const duration = result.compilation_time_ms
        ? " · " + (result.compilation_time_ms / 1000).toFixed(2) + "s"
        : "";
      setCompileState({
        type: "success",
        message: "Compiled successfully" + (result.pages ? " · " + result.pages + " page(s)" : "") + duration
      });
      setCompileOutput(
        "Job ID: " + (result.job_id || "not supplied") +
        "\nCompiler: " + compiler +
        (result.pages ? "\nPages: " + result.pages : "") +
        (result.expires_at ? "\nPDF link expires: " + result.expires_at : "")
      );
    } catch (error) {
      const isNetworkError = error instanceof TypeError;
      const message = isNetworkError
        ? "The browser could not reach your Worker proxy. Check the Worker URL, deployment status, and CORS allowlist."
        : (error.message || "Unexpected compilation error.");
      setCompileOutput(message);
      setShowLog(true);
      setCompileState({ type: "error", message: "Could not complete compilation" });
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <a className="brand-mark" href="https://github.com/ashishchaudhary66/resume" aria-label="Resume Lab repository">T</a>
          <div className="brand-copy">
            <strong>Resume Lab</strong>
            <span>LaTeX workspace <i>/</i> personal-resumes</span>
          </div>
          <span className="cloud-pill"><span className="cloud-dot" /> {compilerProxyUrl ? "PROXY CONNECTED" : "PROXY NOT SET"}</span>
        </div>
        <div className="top-actions">
          <span className={"save-indicator " + (isDirty ? "is-dirty" : "")}>
            <span /> {isDirty ? "Unsaved changes" : "Saved in browser"}
          </span>
          <button className="tool-button subtle" onClick={saveDraft} disabled={!source || loadingFile}>Save</button>
          <button className="tool-button subtle" onClick={configureCompilerProxy}>{compilerProxyUrl ? "Change proxy" : "Set proxy URL"}</button>
          <button className="tool-button subtle" onClick={downloadSource} disabled={!source || loadingFile}>Download .tex</button>
          <button className="compile-button" onClick={compileSource} disabled={!source || loadingFile || isCompiling}>
            {isCompiling ? <span className="spinner" /> : <span className="play-icon">▶</span>}
            {isCompiling ? "Compiling…" : "Compile"}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="side-section-title">PROJECT</div>
          <div className="project-card">
            <div className="project-icon">A</div>
            <div><strong>personal-resumes</strong><span>3 LaTeX files</span></div>
            <span className="project-menu">···</span>
          </div>
          <div className="file-section-head"><span>FILES</span><span className="file-count">3</span></div>
          <div className="file-list">
            {RESUME_FILES.map((file) => (
              <button
                key={file.id}
                className={"file-item " + (activeId === file.id ? "active" : "")}
                onClick={() => {
                  setActiveId(file.id);
                  setLoadError("");
                  setLoadingFile(!loadedFiles[file.id]);
                }}
                title={file.description}
              >
                <span className="tex-icon">TEX</span>
                <span className="file-title">{file.title}</span>
                {activeId === file.id && <span className="active-mark" />}
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="side-section-title">WORKSPACE</div>
            <a href="https://github.com/ashishchaudhary66/resume" target="_blank" rel="noreferrer">
              <span className="side-link-icon">↗</span> View GitHub repository
            </a>
            <div className="storage-note"><span className="storage-led" />Drafts stay in this browser</div>
          </div>
        </aside>

        <main className="editor-panel">
          <div className="panel-header editor-header">
            <div className="panel-title-group">
              <div className="breadcrumb"><span>personal-resumes</span><b>/</b><strong>{activeFile.fileName}</strong></div>
              <span className="editor-language">LaTeX source</span>
            </div>
            <div className="editor-actions">
              <label className="compiler-select">
                <span>ENGINE</span>
                <select value={compiler} onChange={(event) => setCompiler(event.target.value)}>
                  <option value="pdflatex">pdfLaTeX</option>
                  <option value="xelatex">XeLaTeX</option>
                </select>
              </label>
              <button className="icon-button" onClick={resetSource} disabled={!originals[activeId] || loadingFile} title="Reset to repository version">Reset</button>
            </div>
          </div>

          <div className="editor-content">
            {loadingFile && <div className="editor-message">Loading LaTeX source…</div>}
            {!loadingFile && loadError && (
              <div className="editor-message error-message">
                <strong>Could not load this file</strong>
                <span>{loadError}</span>
                <button onClick={() => {
                  setLoadedFiles((current) => {
                    const next = { ...current };
                    delete next[activeId];
                    return next;
                  });
                  setLoadError("");
                }}>Retry</button>
              </div>
            )}
            {!loadingFile && !loadError && (
              <CodeMirror
                value={source}
                onChange={(value) => setSources((current) => ({ ...current, [activeId]: value }))}
                extensions={extensions}
                theme="dark"
                height="100%"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  autocompletion: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  indentOnInput: true
                }}
              />
            )}
          </div>

          <div className="editor-statusbar">
            <span><i className="status-led" /> LaTeX</span>
            <span>{source ? source.split("\n").length : 0} lines</span>
            <span>{new Blob([source]).size.toLocaleString()} bytes</span>
            <span className="status-spacer" />
            <span>{isDirty ? "Modified" : "No pending changes"}</span>
          </div>

          <div className="compile-console">
            <button className="console-toggle" onClick={() => setShowLog((value) => !value)}>
              <span className="console-chevron">{showLog ? "⌄" : "›"}</span>
              <span>COMPILER OUTPUT</span>
              <span className={"console-state " + compileState.type}>{compileState.message}</span>
            </button>
            {showLog && <pre className="console-body">{compileOutput || "No compiler output yet. Compile the document to see the result."}</pre>}
          </div>
        </main>

        <section className="preview-panel">
          <div className="panel-header preview-header">
            <div className="preview-title"><span className="pdf-icon">PDF</span><strong>PDF Preview</strong></div>
            <div className="preview-actions">
              {pdfUrl && <a className="open-pdf-link" href={pdfUrl} target="_blank" rel="noreferrer">Open in new tab ↗</a>}
            </div>
          </div>
          <div className="preview-stage">
            {pdfUrl ? (
              <iframe className="pdf-frame" src={pdfUrl} title="Compiled resume PDF" />
            ) : (
              <div className="empty-preview">
                <div className="paper-stack">
                  <div className="paper paper-back" />
                  <div className="paper paper-front"><span /><span /><span /><i /><span /><span /><span /></div>
                </div>
                <strong>Your PDF will appear here</strong>
                <p>Make changes in the editor, then compile to generate a fresh preview.</p>
                <button className="empty-compile" onClick={compileSource} disabled={!source || loadingFile || isCompiling}>
                  {isCompiling ? "Compiling…" : "Compile document"}
                </button>
              </div>
            )}
          </div>
          <div className="preview-footer">
            <span className={"compile-status-dot " + compileState.type} />
            <span>{compileState.message}</span>
            <span className="preview-footer-spacer" />
            <span>{pdfUrl ? "PDF link is temporary" : "No preview yet"}</span>
          </div>
        </section>
      </div>

      <footer className="app-footer">
        <span>Resume Lab <b>·</b> Built for Ashish Kumar Chaudhary</span>
        <span>LaTeX compilation by <a href="https://pressa.dev/docs/api" target="_blank" rel="noreferrer">Pressa API</a></span>
      </footer>
    </div>
  );
}

export default App;
