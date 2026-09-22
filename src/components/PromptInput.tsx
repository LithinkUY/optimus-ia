import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Code,
  Sparkles,
  Clapperboard,
  Image as ImageIcon,
  Mic,
  MicOff,
  X,
  Plus,
} from 'lucide-react';
import { Attachment } from '../types';

interface PromptInputProps {
  onSendMessage: (
    content: string,
    attachments: Attachment[],
    mode: 'general' | 'programming' | 'image_prompt' | 'video_director',
    aiModel: string
  ) => void;
  onOpenVideoStudio: (prompt?: string) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  activeMode: 'general' | 'programming' | 'image_prompt' | 'video_director';
  onSetMode: (mode: 'general' | 'programming' | 'image_prompt' | 'video_director') => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSendMessage,
  onOpenVideoStudio,
  isLoading,
  onStopGeneration,
  activeMode,
  onSetMode,
}) => {
  const [text, setText] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Voice speech-to-text setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleMic = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  // Handle file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments = Array.from(e.target.files).map((file) => ({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        mimeType: file.type || 'image/png',
        data: '',
        size: file.size,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);

      // Read files for inline generation if image
      newAttachments.forEach((att) => {
        if (att.file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === att.id ? { ...a, data: e.target?.result as string, mimeType: att.file.type } : a
              )
            );
          };
          reader.readAsDataURL(att.file);
        }
      });
    }
  };

  // Handle clipboard image paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const id = `att-${Date.now()}`;
          setAttachments((prev) => [
            ...prev,
            {
              id,
              file,
              name: 'Pasted Image.png',
              mimeType: file.type,
              data: '',
              size: file.size,
            },
          ]);
          const reader = new FileReader();
          reader.onload = (ev) => {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id ? { ...a, data: ev.target?.result as string, mimeType: file.type } : a
              )
            );
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    // If user is in video mode, offer to launch video studio directly
    if (activeMode === 'video_director') {
      onOpenVideoStudio(text);
      setText('');
      return;
    }

    onSendMessage(text, attachments, activeMode, selectedModel);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Mode Chips */}
      <div className="flex items-center space-x-2 mb-2 overflow-x-auto py-1 scrollbar-none text-xs">
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="px-3 py-1.5 rounded-full border bg-slate-900/80 text-cyan-400 border-cyan-500/30 hover:border-cyan-400 outline-none text-xs font-bold cursor-pointer"
        >
          <option value="auto">⚡ Automático (Recomendado)</option>
          <option value="gemini-3.8-flash">⚡ Gemini 3.8 Flash</option>
          <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro</option>
          <option value="gpt-oss-120b">🌪️ GPT OSS 120B (Groq)</option>
        </select>
        
        <div className="w-px h-4 bg-slate-800 mx-1"></div>
        <button
          onClick={() => onSetMode(activeMode === 'programming' ? 'general' : 'programming')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
            activeMode === 'programming'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/20 font-bold'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Modo Código / Programación</span>
        </button>

        <button
          onClick={() => onSetMode(activeMode === 'image_prompt' ? 'general' : 'image_prompt')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
            activeMode === 'image_prompt'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-sm shadow-purple-500/20 font-bold'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Crear Arte / Ilustración</span>
        </button>

        <button
          onClick={() => onOpenVideoStudio(text)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/20 transition-all font-semibold whitespace-nowrap shadow-sm"
        >
          <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
          <span>Estudio de Video (Cine & Simple)</span>
        </button>
      </div>

      {/* Main Input Box */}
      <div className="relative rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/40 transition-all duration-200">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 border-b border-slate-800 bg-slate-950/40 rounded-t-3xl">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group flex items-center gap-2 p-1.5 pr-3 bg-slate-800/90 border border-slate-700 rounded-xl"
              >
                <img src={att.data} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-xs text-slate-300 max-w-[120px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 rounded-full bg-slate-700 hover:bg-red-500/30 text-slate-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            activeMode === 'programming'
              ? 'Pide código, pide depurar un error, o refactorizar un componente...'
              : activeMode === 'image_prompt'
              ? 'Describe la ilustración gráfica o arte vectorial que deseas crear...'
              : 'Pregúntale a OPTIMUS IA, adjunta una imagen o pide código...'
          }
          rows={1}
          className="w-full bg-transparent px-4 sm:px-5 pt-4 pb-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
        />

        {/* Action Controls Bar */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Left tools: File attach + mic */}
          <div className="flex items-center space-x-1.5 pointer-events-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.js,.ts,.py"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-all"
              title="Adjuntar imagen o archivo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-2 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80'
              }`}
              title={isRecording ? 'Detener dictado' : 'Dictar por voz'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Right tools: Send button / Loading indicator */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            {isLoading ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center justify-center transition-all border border-slate-700"
                title="Detener respuesta"
              >
                <div className="w-3 h-3 bg-cyan-400 rounded-sm animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Enviar mensaje (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-slate-500">
        OPTIMUS IA utiliza modelos de IA de alta precisión. Revisa siempre el código antes de desplegarlo a producción.
      </div>
    </div>
  );
};
