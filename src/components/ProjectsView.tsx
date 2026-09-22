import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  MessageSquare,
  FileCode,
  Clapperboard,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Play,
  Copy,
  Download,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Project, ChatSession, GeneratedVideo, GeneratedImage } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  chats: ChatSession[];
  onSelectChat: (chatId: string) => void;
  onCreateProject: (project: Partial<Project>) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onPreviewCode: (code: string, language: string) => void;
  onOpenVideoStudio: (prompt?: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  chats,
  onSelectChat,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onPreviewCode,
  onOpenVideoStudio,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
  const [isCreatingModal, setIsCreatingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'snippets' | 'videos' | 'notes'>('overview');

  // New project form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#00f0ff');
  const [newTags, setNewTags] = useState('');

  // Snippet add state
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetLang, setNewSnippetLang] = useState('typescript');
  const [newSnippetCode, setNewSnippetCode] = useState('');
  const [showAddSnippet, setShowAddSnippet] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onCreateProject({
      title: newTitle.trim(),
      description: newDesc.trim(),
      color: newColor,
      tags: tagsArray.length ? tagsArray : ['General'],
      status: 'active',
      chatIds: [],
      snippets: [],
      videos: [],
      images: [],
      notes: 'Notas de inicio del proyecto...',
    });

    setNewTitle('');
    setNewDesc('');
    setNewTags('');
    setIsCreatingModal(false);
  };

  const handleAddSnippet = () => {
    if (!selectedProject || !newSnippetTitle.trim() || !newSnippetCode.trim()) return;

    const updated: Project = {
      ...selectedProject,
      updatedAt: Date.now(),
      snippets: [
        {
          id: `snip-${Date.now()}`,
          title: newSnippetTitle.trim(),
          language: newSnippetLang,
          code: newSnippetCode.trim(),
          createdAt: Date.now(),
        },
        ...selectedProject.snippets,
      ],
    };

    onUpdateProject(updated);
    setNewSnippetTitle('');
    setNewSnippetCode('');
    setShowAddSnippet(false);
  };

  const handleNotesChange = (text: string) => {
    if (!selectedProject) return;
    onUpdateProject({
      ...selectedProject,
      notes: text,
      updatedAt: Date.now(),
    });
  };

  // Associated chats
  const projectChats = chats.filter((c) => selectedProject?.chatIds?.includes(c.id) || c.projectId === selectedProject?.id);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-950">
      {/* Left Column: Projects List */}
      <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/60">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-slate-100 text-sm">Gestión de Proyectos</h2>
          </div>

          <button
            onClick={() => setIsCreatingModal(true)}
            className="p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20"
            title="Nuevo Proyecto"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyectos..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Projects Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects
            .filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((proj) => {
              const isSelected = proj.id === selectedProject?.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: proj.color || '#00f0ff' }}
                      />
                      <span className="font-semibold text-xs text-white truncate max-w-[150px]">
                        {proj.title}
                      </span>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {proj.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description || 'Sin descripción.'}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {chats.filter((c) => c.projectId === proj.id).length} chats
                    </span>
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      {proj.snippets?.length || 0} snippets
                    </span>
                    <span className="flex items-center gap-1">
                      <Clapperboard className="w-3 h-3" />
                      {proj.videos?.length || 0} videos
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Right Column: Selected Project Detail */}
      {selectedProject ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/30">
          {/* Top Bar info */}
          <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5 mb-1">
                <div
                  className="w-3 h-3 rounded-full shadow-md"
                  style={{ backgroundColor: selectedProject.color || '#00f0ff' }}
                />
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  {selectedProject.title}
                </h1>
                <span className="text-xs font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  {selectedProject.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">{selectedProject.description}</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenVideoStudio()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all"
              >
                <Clapperboard className="w-3.5 h-3.5" />
                Crear Video para Proyecto
              </button>

              <button
                onClick={() => {
                  if (confirm(`¿Eliminar proyecto "${selectedProject.title}"?`)) {
                    onDeleteProject(selectedProject.id);
                  }
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Eliminar proyecto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chats Asociados ({projectChats.length})
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'snippets'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Código y Snippets ({selectedProject.snippets?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'videos'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              Videos y Media ({selectedProject.videos?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'notes'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Notas de Arquitectura
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* OVERVIEW / CHATS */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Sesiones de Chat en este Proyecto</h3>
                </div>

                {projectChats.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                    No hay chats vinculados directamente a este proyecto todavía. Puedes vincular uno desde la barra lateral.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projectChats.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelectChat(c.id)}
                        className="group p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/60 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-xs text-white group-hover:text-cyan-400 transition-colors">
                            {c.title}
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            {c.messages.length} mensajes • Actualizado{' '}
                            {new Date(c.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SNIPPETS & CODE */}
            {activeTab === 'snippets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Biblioteca de Código del Proyecto</h3>
                  <button
                    onClick={() => setShowAddSnippet(!showAddSnippet)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold transition-all border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Guardar Snippet
                  </button>
                </div>

                {showAddSnippet && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Título del componente o script..."
                        value={newSnippetTitle}
                        onChange={(e) => setNewSnippetTitle(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        value={newSnippetLang}
                        onChange={(e) => setNewSnippetLang(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="tsx">React (TSX)</option>
                        <option value="python">Python</option>
                        <option value="html">HTML / Web</option>
                        <option value="css">CSS</option>
                        <option value="sql">SQL</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                    <textarea
                      placeholder="Pega el código aquí..."
                      value={newSnippetCode}
                      onChange={(e) => setNewSnippetCode(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddSnippet(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddSnippet}
                        className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}

                {(!selectedProject.snippets || selectedProject.snippets.length === 0) ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                    No hay snippets de código guardados en este proyecto todavía.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedProject.snippets.map((snip) => (
                      <div
                        key={snip.id}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileCode className="w-4 h-4 text-cyan-400" />
                            <span className="font-bold text-xs text-white">{snip.title}</span>
                            <span className="font-mono text-[10px] uppercase bg-slate-800 text-cyan-400 px-2 py-0.5 rounded">
                              {snip.language}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onPreviewCode(snip.code, snip.language)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold"
                            >
                              <Play className="w-3 h-3" />
                              Ejecutar Sandbox
                            </button>
                            <button
                              onClick={() => navigator.clipboard.writeText(snip.code)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Copiar código"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto font-mono text-xs text-slate-300 max-h-48">
                          <code>{snip.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIDEOS */}
            {activeTab === 'videos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Videos Generados en este Proyecto</h3>
                  <button
                    onClick={() => onOpenVideoStudio()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Video
                  </button>
                </div>

                {(!selectedProject.videos || selectedProject.videos.length === 0) ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
                    No has generado videos asignados a este proyecto aún.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedProject.videos.map((vid) => (
                      <div
                        key={vid.id}
                        className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2"
                      >
                        <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
                          <video
                            src={vid.videoUrl}
                            controls
                            loop
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-xs text-white truncate max-w-[180px]">
                              {vid.title}
                            </h4>
                            <span className="text-[10px] text-cyan-400 font-mono">
                              {vid.type === 'cinematic' ? 'Cinemático' : 'Simple'} • {vid.duration}s
                            </span>
                          </div>
                          <a
                            href={vid.videoUrl}
                            download={`optimus-${vid.id}.webm`}
                            className="p-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 rounded-lg text-xs"
                            title="Descargar video"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-3 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Notas del Proyecto & Checklist</h3>
                  <span className="text-xs text-slate-500">Guardado automáticamente</span>
                </div>
                <textarea
                  value={selectedProject.notes || ''}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Escribe notas, especificaciones técnicas, ideas de video o requerimientos de código..."
                  className="flex-1 min-h-[300px] w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
          Selecciona o crea un proyecto para ver sus detalles.
        </div>
      )}

      {/* Modal: Create Project */}
      {isCreatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <form
            onSubmit={handleCreate}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-cyan-400" />
              Nuevo Proyecto OPTIMUS
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Proyecto</label>
              <input
                type="text"
                required
                placeholder="Ej: Startup Fintech, Campaña TikTok 3D..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción</label>
              <textarea
                rows={2}
                placeholder="Objetivo del proyecto y tecnologías..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Color Identificador</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-400">{newColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Etiquetas (separar por coma)</label>
                <input
                  type="text"
                  placeholder="React, AI, Video"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-xs hover:brightness-110 shadow-md shadow-cyan-500/20"
              >
                Crear Proyecto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
