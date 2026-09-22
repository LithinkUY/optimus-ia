import React, { useState } from 'react';
import {
  Copy,
  Check,
  Play,
  Download,
  Eye,
  Bot,
  User,
  Sparkles,
  Code,
  FileCode,
  Clapperboard,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';
import { Message, GeneratedVideo, GeneratedImage } from '../types';

interface ChatMessageItemProps {
  message: Message;
  onPreviewCode: (code: string, language: string) => void;
  onViewImage: (src?: string, svgContent?: string, prompt?: string) => void;
  onOpenVideoStudio?: (prompt?: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onPreviewCode,
  onViewImage,
  onOpenVideoStudio,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedBlockIdx, setCopiedBlockIdx] = useState<number | null>(null);

  const isUser = message.role === 'user';

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlockIdx(idx);
    setTimeout(() => setCopiedBlockIdx(null), 2000);
  };

  const handleDownloadCode = (code: string, language: string) => {
    const extensions: Record<string, string> = {
      typescript: 'ts',
      javascript: 'js',
      tsx: 'tsx',
      jsx: 'jsx',
      python: 'py',
      html: 'html',
      css: 'css',
      sql: 'sql',
      json: 'json',
      rust: 'rs',
      go: 'go',
      cpp: 'cpp',
    };
    const ext = extensions[language.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimus-code-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse markdown code blocks and text segments
  const renderMessageContent = () => {
    const raw = message.content;
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let blockIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(raw)) !== null) {
      // Text before code block
      if (match.index > lastIndex) {
        const textSegment = raw.slice(lastIndex, match.index);
        parts.push(
          <div key={`text-${lastIndex}`} className="prose-custom whitespace-pre-wrap leading-relaxed">
            {formatMarkdownText(textSegment)}
          </div>
        );
      }

      const language = match[1] || 'plaintext';
      const code = match[2].trim();
      const currentBlockIdx = blockIndex++;
      const isSandboxable = ['html', 'css', 'javascript', 'js', 'typescript', 'ts', 'xml', 'svg'].includes(
        language.toLowerCase()
      );

      parts.push(
        <div
          key={`code-${match.index}`}
          className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-xl"
        >
          {/* Code block header bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
            <span className="font-mono text-cyan-400 font-semibold uppercase flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              {language}
            </span>

            <div className="flex items-center space-x-2">
              {isSandboxable && (
                <button
                  onClick={() => onPreviewCode(code, language)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg font-medium transition-all"
                  title="Ejecutar y previsualizar en vivo"
                >
                  <Play className="w-3 h-3 text-cyan-400" />
                  <span>Probar</span>
                </button>
              )}

              <button
                onClick={() => handleDownloadCode(code, language)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleCopyCode(code, currentBlockIdx)}
                className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Copiar código"
              >
                {copiedBlockIdx === currentBlockIdx ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-[11px]">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[11px]">Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code content */}
          <div className="p-4 overflow-x-auto font-mono text-xs sm:text-sm text-slate-200 leading-relaxed">
            <pre>
              <code>{code}</code>
            </pre>
          </div>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last code block
    if (lastIndex < raw.length) {
      const remainingText = raw.slice(lastIndex);
      parts.push(
        <div key={`text-${lastIndex}`} className="prose-custom whitespace-pre-wrap leading-relaxed">
          {formatMarkdownText(remainingText)}
        </div>
      );
    }

    return parts.length > 0 ? parts : <p className="whitespace-pre-wrap">{raw}</p>;
  };

  return (
    <div
      className={`group py-5 px-4 sm:px-6 transition-all duration-200 ${
        isUser ? 'bg-transparent' : 'bg-slate-900/40 border-y border-slate-800/40'
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-start space-x-3 sm:space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-sm">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
            </div>
          )}
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm text-slate-100">
                {isUser ? 'Tú' : 'OPTIMUS IA'}
              </span>
              {!isUser && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {message.mode === 'programming'
                    ? '💻 Programador'
                    : message.mode === 'video_director'
                    ? '🎬 Cineasta'
                    : message.mode === 'image_prompt'
                    ? '🎨 Ilustrador'
                    : '⚡ Asistente'}
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Quick message copy */}
            <button
              onClick={handleCopyMessage}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-white transition-opacity"
              title="Copiar texto completo"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Attached User Images if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() => onViewImage(att.data, undefined, att.name)}
                  className="group/img relative cursor-pointer rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md hover:border-cyan-500 transition-all max-w-[220px]"
                >
                  <img src={att.data} alt={att.name} className="h-32 w-auto object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Render text & code */}
          <div className="text-slate-200 text-sm leading-relaxed overflow-hidden">
            {renderMessageContent()}
          </div>

          {/* Embedded Generated Video if present */}
          {message.generatedVideo && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Clapperboard className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-white">
                    {message.generatedVideo.title}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
                    {message.generatedVideo.type === 'cinematic' ? 'Cine 1080p' : 'Simple'}
                  </span>
                </div>

                <a
                  href={message.generatedVideo.videoUrl}
                  download={`optimus-${message.generatedVideo.id}.webm`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:brightness-110 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Video
                </a>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                <video
                  src={message.generatedVideo.videoUrl}
                  controls
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Embedded Generated Image / SVG if present */}
          {message.generatedImage && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-white">Arte Generado</span>
                </div>

                <button
                  onClick={() =>
                    onViewImage(
                      message.generatedImage?.dataUrl,
                      message.generatedImage?.svgContent,
                      message.generatedImage?.prompt
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver en Grande & Descargar
                </button>
              </div>

              {message.generatedImage.svgContent ? (
                <div
                  onClick={() =>
                    onViewImage(
                      undefined,
                      message.generatedImage?.svgContent,
                      message.generatedImage?.prompt
                    )
                  }
                  className="cursor-pointer max-w-lg mx-auto rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all bg-slate-900 shadow-lg"
                  dangerouslySetInnerHTML={{ __html: message.generatedImage.svgContent }}
                />
              ) : message.generatedImage.dataUrl ? (
                <img
                  onClick={() =>
                    onViewImage(
                      message.generatedImage?.dataUrl,
                      undefined,
                      message.generatedImage?.prompt
                    )
                  }
                  src={message.generatedImage.dataUrl}
                  alt={message.generatedImage.prompt}
                  className="cursor-pointer w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all shadow-lg object-cover"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Formats basic markdown emphasis (headers, bold, inline code, lists)
function formatMarkdownText(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Header 3 or 2
    if (line.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-base font-bold text-cyan-300 mt-3 mb-1">
          {line.replace('### ', '')}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={idx} className="text-lg font-bold text-white mt-4 mb-1">
          {line.replace('## ', '')}
        </h3>
      );
    }
    if (line.startsWith('# ')) {
      return (
        <h2 key={idx} className="text-xl font-black text-white mt-4 mb-2">
          {line.replace('# ', '')}
        </h2>
      );
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().replace(/^[-*]\s+/, '');
      return (
        <div key={idx} className="flex items-start space-x-2 my-1 pl-2">
          <span className="text-cyan-400 font-bold">•</span>
          <span>{parseInlineFormatting(content)}</span>
        </div>
      );
    }

    // Numbered list
    const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      return (
        <div key={idx} className="flex items-start space-x-2 my-1 pl-2">
          <span className="font-mono font-bold text-cyan-400 text-xs mt-0.5">{numberedMatch[1]}.</span>
          <span>{parseInlineFormatting(numberedMatch[2])}</span>
        </div>
      );
    }

    return (
      <p key={idx} className="my-1">
        {parseInlineFormatting(line)}
      </p>
    );
  });
}

function parseInlineFormatting(str: string): React.ReactNode {
  // Parse bold **text** and inline `code`
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono text-cyan-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-xs border border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
