import React, { useState } from 'react';
import { X, Play, Copy, Check, Maximize2, Minimize2, Terminal, Code } from 'lucide-react';

interface CodePreviewModalProps {
  code: string;
  language: string;
  title?: string;
  onClose: () => void;
}

export const CodePreviewModal: React.FC<CodePreviewModalProps> = ({
  code,
  language,
  title = 'Vista Previa de Código',
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate runnable HTML
  const generateSandboxSrc = () => {
    const isHtml = language.toLowerCase() === 'html' || language.toLowerCase() === 'xml';
    const isJs = ['javascript', 'js', 'typescript', 'ts'].includes(language.toLowerCase());
    const isCss = language.toLowerCase() === 'css';

    let content = '';
    if (isHtml) {
      content = code.includes('<html') || code.includes('<!DOCTYPE')
        ? code
        : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    } else if (isCss) {
      content = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; background: #0f172a; color: #f8fafc; }
    ${code}
  </style>
</head>
<body>
  <div class="demo-container">
    <h1>Vista Previa de CSS</h1>
    <p>Elementos de muestra estilizados con tu código.</p>
    <button class="btn">Botón de Prueba</button>
  </div>
</body>
</html>`;
    } else if (isJs) {
      content = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: monospace; background: #090d16; color: #38bdf8; }
    #console { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
    .log-item { border-bottom: 1px solid #1e293b; padding: 4px 0; }
  </style>
</head>
<body>
  <div id="console"><div class="log-item">🚀 Ejecutando script JavaScript...</div></div>
  <script>
    const consoleDiv = document.getElementById('console');
    const originalLog = console.log;
    console.log = function(...args) {
      originalLog.apply(console, args);
      const row = document.createElement('div');
      row.className = 'log-item';
      row.textContent = '▶ ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ');
      consoleDiv.appendChild(row);
      window.parent.postMessage({ type: 'CONSOLE_LOG', data: args.join(' ') }, '*');
    };
    try {
      ${code}
    } catch(err) {
      const errRow = document.createElement('div');
      errRow.className = 'log-item';
      errRow.style.color = '#ef4444';
      errRow.textContent = '❌ ' + err.message;
      consoleDiv.appendChild(errRow);
    }
  </script>
</body>
</html>`;
    } else {
      // General code preview
      content = `<!DOCTYPE html>
<html>
<body style="background:#090d16; color:#94a3b8; font-family:monospace; padding:20px;">
  <p>Ejecución no disponible directamente en sandbox para lenguaje: <b>${language}</b>.</p>
  <p>Puedes copiar el código o descargarlo para ejecutarlo en tu entorno local.</p>
</body>
</html>`;
    }

    return content;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in">
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="font-semibold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              {title}
              <span className="text-xs font-mono uppercase bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">
                {language}
              </span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'preview'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vista Previa
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'code'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Código Fuente
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Copiar código"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden">
          {activeTab === 'preview' ? (
            <iframe
              title="Code Execution Sandbox"
              srcDoc={generateSandboxSrc()}
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-0 bg-slate-950"
            />
          ) : (
            <div className="w-full h-full overflow-auto p-4 font-mono text-sm text-slate-300 bg-slate-950">
              <pre className="leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Sandbox aislado seguro de OPTIMUS IA
          </span>
          <span>{code.split('\n').length} líneas de código</span>
        </div>
      </div>
    </div>
  );
};
