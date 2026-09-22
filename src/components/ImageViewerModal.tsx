import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, Maximize2, Share2, Sparkles } from 'lucide-react';

interface ImageViewerModalProps {
  src?: string;
  svgContent?: string;
  title?: string;
  prompt?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  src,
  svgContent,
  title = 'Visualizador de Imagen',
  prompt,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    if (svgContent) {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimus-ia-graphic-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (src) {
      const a = document.createElement('a');
      a.href = src;
      a.download = `optimus-ia-image-${Date.now()}.png`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">{title}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 font-mono w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Restablecer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-semibold transition-all shadow-md shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar {svgContent ? 'SVG' : 'PNG'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-950/60 min-h-[400px]">
          <div
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}
            className="flex items-center justify-center max-w-full max-h-full"
          >
            {svgContent ? (
              <div
                className="w-full max-w-2xl shadow-2xl rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <img
                src={src}
                alt={title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            )}
          </div>
        </div>

        {/* Footer info */}
        {prompt && (
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Prompt: </span>
            <span className="italic">{prompt}</span>
          </div>
        )}
      </div>
    </div>
  );
};
