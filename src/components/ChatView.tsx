import React, { useRef, useEffect } from 'react';
import {
  Menu,
  Sparkles,
  Zap,
  Code,
  Clapperboard,
  Image as ImageIcon,
  FolderKanban,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { ChatSession, Project, UserAccount, Message, Attachment } from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import { PromptInput } from './PromptInput';

interface ChatViewProps {
  chat: ChatSession;
  projects: Project[];
  user: UserAccount;
  isLoading: boolean;
  activeMode: 'general' | 'programming' | 'image_prompt' | 'video_director';
  onSetMode: (mode: 'general' | 'programming' | 'image_prompt' | 'video_director') => void;
  onSendMessage: (
    content: string,
    attachments: Attachment[],
    mode: 'general' | 'programming' | 'image_prompt' | 'video_director'
  ) => void;
  onOpenVideoStudio: (prompt?: string) => void;
  onOpenCreditsModal: () => void;
  onPreviewCode: (code: string, language: string) => void;
  onViewImage: (src?: string, svgContent?: string, prompt?: string) => void;
  onToggleMobileSidebar: () => void;
  onAssignProject: (projectId: string | undefined) => void;
}

const STARTER_PROMPTS = [
  {
    icon: <Code className="w-4 h-4 text-cyan-400" />,
    title: 'Desarrollo de Software',
    prompt:
      'Escribe un componente React completo en TypeScript para un reproductor de audio moderno con visualizador de ondas y animación fluida.',
    mode: 'programming' as const,
  },
  {
    icon: <Clapperboard className="w-4 h-4 text-blue-400" />,
    title: 'Video Cinematográfico',
    prompt:
      'Cámara volando entre rascacielos iluminados con neón cian y lluvia nocturna con iluminación anamórfica.',
    mode: 'video_director' as const,
  },
  {
    icon: <ImageIcon className="w-4 h-4 text-purple-400" />,
    title: 'Ilustración Vectorial SVG',
    prompt:
      'Crea una ilustración vectorial SVG de alta calidad de un núcleo de reactor cuántico con degradados violeta y cian.',
    mode: 'image_prompt' as const,
  },
  {
    icon: <Eye className="w-4 h-4 text-emerald-400" />,
    title: 'Análisis de Código / Mockup',
    prompt:
      '¿Cuáles son las mejores prácticas para optimizar el rendimiento y la seguridad en una API REST construida con Express y TypeScript?',
    mode: 'general' as const,
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  projects,
  user,
  isLoading,
  activeMode,
  onSetMode,
  onSendMessage,
  onOpenVideoStudio,
  onOpenCreditsModal,
  onPreviewCode,
  onViewImage,
  onToggleMobileSidebar,
  onAssignProject,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, isLoading]);

  const currentProject = projects.find((p) => p.id === chat.projectId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3 truncate">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 truncate">
            <h2 className="font-bold text-sm text-white truncate">{chat.title}</h2>

            {/* Project Pill Dropdown */}
            <div className="relative group">
              <select
                value={chat.projectId || ''}
                onChange={(e) => onAssignProject(e.target.value || undefined)}
                className="appearance-none bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-medium pl-2.5 pr-6 py-1 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">📁 Sin Proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right Tools & Credits Pill */}
        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline-flex text-[11px] font-mono items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            OPTIMUS IA Engine
          </span>

          <button
            onClick={onOpenCreditsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-500/50 text-xs font-bold text-cyan-400 shadow-sm transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{user.credits} Créditos</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {chat.messages.length === 0 ? (
          /* Empty Chat Welcome Screen */
          <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 mb-6 group cursor-pointer hover:scale-105 transition-transform">
              <Sparkles className="w-12 h-12 fill-slate-950 text-slate-950" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ¿En qué podemos innovar hoy?
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
              OPTIMUS IA combina programación experta, visión de imágenes y un estudio de videos cinematográficos listos para descargar.
            </p>

            {/* Quick Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full">
              {STARTER_PROMPTS.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onSetMode(item.mode);
                    onSendMessage(item.prompt, [], item.mode);
                  }}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-left cursor-pointer transition-all group shadow-sm"
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    {item.icon}
                    <span className="font-bold text-xs text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Message List */
          <div className="divide-y divide-slate-900">
            {chat.messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onPreviewCode={onPreviewCode}
                onViewImage={onViewImage}
                onOpenVideoStudio={onOpenVideoStudio}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="py-5 px-4 sm:px-6 bg-slate-900/30">
                <div className="max-w-4xl mx-auto flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 shadow-md animate-pulse">
                    <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">OPTIMUS IA</span>
                      <span className="text-xs text-cyan-400 font-mono animate-pulse">
                        Procesando...
                      </span>
                    </div>
                    <div className="mt-2 flex space-x-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                      <div
                        className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Prompt Box */}
      <PromptInput
        onSendMessage={onSendMessage}
        onOpenVideoStudio={onOpenVideoStudio}
        isLoading={isLoading}
        activeMode={activeMode}
        onSetMode={onSetMode}
      />
    </div>
  );
};
