import React, { useState } from 'react';
import {
  MessageSquare,
  FolderKanban,
  Clapperboard,
  Plus,
  Search,
  Zap,
  MoreVertical,
  Pin,
  Trash2,
  Edit2,
  Download,
  Gift,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { ChatSession, Project, UserAccount } from '../types';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  projects: Project[];
  user: UserAccount;
  activeView: 'chat' | 'projects';
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onTogglePinChat: (chatId: string) => void;
  onAssignChatToProject: (chatId: string, projectId: string | undefined) => void;
  onOpenVideoStudio: () => void;
  onOpenCreditsModal: () => void;
  onSelectView: (view: 'chat' | 'projects') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  projects,
  user,
  activeView,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePinChat,
  onAssignChatToProject,
  onOpenVideoStudio,
  onOpenCreditsModal,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [search, setSearch] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  // Group chats by date
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const unpinned = filteredChats.filter((c) => !c.pinned);

  const todayChats = unpinned.filter((c) => now - c.updatedAt < ONE_DAY);
  const yesterdayChats = unpinned.filter(
    (c) => now - c.updatedAt >= ONE_DAY && now - c.updatedAt < ONE_DAY * 2
  );
  const weekChats = unpinned.filter(
    (c) => now - c.updatedAt >= ONE_DAY * 2 && now - c.updatedAt < ONE_DAY * 7
  );
  const olderChats = unpinned.filter((c) => now - c.updatedAt >= ONE_DAY * 7);

  const handleStartRename = (c: ChatSession) => {
    setEditingChatId(c.id);
    setEditTitle(c.title);
    setMenuOpenChatId(null);
  };

  const handleSaveRename = (chatId: string) => {
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleExportMarkdown = (c: ChatSession) => {
    const md = `# ${c.title}\n\n` +
      c.messages
        .map(
          (m) =>
            `### ${m.role === 'user' ? 'Usuario' : 'OPTIMUS IA'} (${new Date(
              m.timestamp
            ).toLocaleString()})\n\n${m.content}\n`
        )
        .join('\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpenChatId(null);
  };

  const renderChatGroup = (groupTitle: string, list: ChatSession[]) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          {groupTitle}
        </h3>
        <div className="space-y-0.5">
          {list.map((c) => {
            const isActive = c.id === activeChatId && activeView === 'chat';
            const proj = projects.find((p) => p.id === c.projectId);

            return (
              <div
                key={c.id}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
                onClick={() => {
                  onSelectChat(c.id);
                  onSelectView('chat');
                  onCloseMobile();
                }}
              >
                {editingChatId === c.id ? (
                  <div className="flex items-center space-x-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(c.id)}
                      autoFocus
                      className="flex-1 bg-slate-950 border border-cyan-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveRename(c.id)}
                      className="p-1 text-cyan-400 hover:text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2.5 truncate flex-1 pr-2">
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate">{c.title}</span>
                      {proj && (
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: proj.color || '#00f0ff' }}
                          title={`Proyecto: ${proj.title}`}
                        />
                      )}
                    </div>

                    {/* Chat Actions dropdown trigger */}
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpenChatId(menuOpenChatId === c.id ? null : c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpenChatId === c.id && (
                        <div className="absolute right-2 top-8 z-30 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1 text-xs text-slate-200">
                          <button
                            onClick={() => onTogglePinChat(c.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left"
                          >
                            <Pin className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{c.pinned ? 'Desfijar chat' : 'Fijar arriba'}</span>
                          </button>
                          <button
                            onClick={() => handleStartRename(c)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Renombrar</span>
                          </button>
                          <button
                            onClick={() => handleExportMarkdown(c)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            <span>Exportar (.md)</span>
                          </button>
                          <div className="my-1 border-t border-slate-800" />
                          <button
                            onClick={() => {
                              onDeleteChat(c.id);
                              setMenuOpenChatId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 flex flex-col bg-slate-950 border-r border-slate-800/80 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Branding Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 flex items-center justify-center font-black text-slate-950 shadow-md shadow-cyan-500/20 text-2xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl text-white tracking-wider">
                  OPTIMUS IA
                </span>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                  v3.8
                </span>
              </div>
              <span className="text-xs text-slate-400 block mt-0.5">
                Chat • Código • Cinema
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onSelectView('chat');
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold transition-all group shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              Nuevo Chat
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 group-hover:bg-slate-700 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </button>
        </div>

        {/* Primary View Switcher Tabs */}
        <div className="px-3 pb-2 grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => {
              onSelectView('chat');
              onCloseMobile();
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all ${
              activeView === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>

          <button
            onClick={() => {
              onSelectView('projects');
              onCloseMobile();
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all ${
              activeView === 'projects'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Proyectos</span>
          </button>
        </div>

        {/* Video Cinema Studio Shortcut Button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              onOpenVideoStudio();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/40 border border-cyan-500/30 hover:border-cyan-400/80 text-cyan-300 text-xs font-bold transition-all shadow-md group"
          >
            <div className="flex items-center space-x-2">
              <Clapperboard className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>Estudio de Video</span>
            </div>
            <span className="text-[9px] font-mono uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
              HD 60FPS
            </span>
          </button>
        </div>

        {/* Search Chats Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el historial..."
              className="w-full bg-slate-900/70 border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Chats History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-thumb-slate-800">
          {renderChatGroup('Fijados', pinnedChats)}
          {renderChatGroup('Hoy', todayChats)}
          {renderChatGroup('Ayer', yesterdayChats)}
          {renderChatGroup('Últimos 7 días', weekChats)}
          {renderChatGroup('Anteriores', olderChats)}

          {filteredChats.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No se encontraron conversaciones.
            </div>
          )}
        </div>

        {/* User Account & Credits Footer Widget */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/90">
          <div
            onClick={onOpenCreditsModal}
            className="cursor-pointer p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between group shadow-lg"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xs">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <span className="font-semibold text-xs text-white block group-hover:text-cyan-300 transition-colors">
                  {user.name}
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  {user.credits} Créditos
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreditsModal();
              }}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 text-[10px] font-bold transition-all border border-cyan-500/30"
            >
              Bóveda
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const { supabase } = await import('../lib/supabase');
                await supabase.auth.signOut();
              }}
              className="px-2.5 py-1 ml-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-slate-950 text-[10px] font-bold transition-all border border-red-500/30"
              title="Cerrar Sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
