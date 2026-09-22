import React, { useState, useEffect } from 'react';
import {
  ChatSession,
  Project,
  UserAccount,
  Message,
  Attachment,
  GeneratedVideo,
  GeneratedImage,
} from './types';
import {
  getSavedChats,
  saveChats,
  getActiveChatId,
  setActiveChatId,
  getSavedProjects,
  saveProjects,
  getUserAccount,
  saveUserAccount,
  deductCredits,
  saveVideoToLibrary,
  saveImageToLibrary,
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ProjectsView } from './components/ProjectsView';
import { VideoStudioModal } from './components/VideoStudioModal';
import { CreditsModal } from './components/CreditsModal';
import { CodePreviewModal } from './components/CodePreviewModal';
import { ImageViewerModal } from './components/ImageViewerModal';

export default function App() {
  // Application Data States
  const [chats, setChats] = useState<ChatSession[]>(getSavedChats);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(getActiveChatId);
  const [projects, setProjects] = useState<Project[]>(getSavedProjects);
  const [user, setUser] = useState<UserAccount>(getUserAccount);

  // View & Mode States
  const [activeView, setActiveView] = useState<'chat' | 'projects'>('chat');
  const [activeMode, setActiveMode] = useState<'general' | 'programming' | 'image_prompt' | 'video_director'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal States
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [videoStudioConfig, setVideoStudioConfig] = useState<{
    isOpen: boolean;
    prompt?: string;
    type?: 'simple' | 'cinematic';
  }>({ isOpen: false });
  const [previewCodeData, setPreviewCodeData] = useState<{ code: string; language: string } | null>(null);
  const [imageViewerData, setImageViewerData] = useState<{
    src?: string;
    svgContent?: string;
    prompt?: string;
  } | null>(null);

  // Sync to localStorage
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveUserAccount(user);
  }, [user]);

  // Current active chat object
  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  const handleSelectChat = (chatId: string) => {
    setActiveChatIdState(chatId);
    setActiveChatId(chatId);
  };

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'Nueva Conversación',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      pinned: false,
    };
    const updated = [newChat, ...chats];
    setChats(updated);
    setActiveChatIdState(newChat.id);
    setActiveChatId(newChat.id);
  };

  const handleDeleteChat = (chatId: string) => {
    const updated = chats.filter((c) => c.id !== chatId);
    setChats(updated);
    if (activeChatId === chatId) {
      const nextId = updated[0]?.id || null;
      setActiveChatIdState(nextId);
      if (nextId) setActiveChatId(nextId);
    }
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleTogglePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const handleAssignChatToProject = (chatId: string, projectId: string | undefined) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, projectId, updatedAt: Date.now() } : c))
    );
  };

  // Send Message Flow
  const handleSendMessage = async (
    content: string,
    attachments: Attachment[],
    mode: 'general' | 'programming' | 'image_prompt' | 'video_director',
    aiModel: string = 'auto'
  ) => {
    if (!activeChat) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      attachments: attachments.length ? attachments : undefined,
      timestamp: Date.now(),
      mode,
    };

    const updatedMessages = [...activeChat.messages, userMessage];

    // Automatically generate title for first message if no title exists
    let newChatTitle = activeChat.title;
    if (updatedMessages.length === 1 || newChatTitle === 'Nuevo Chat') {
      newChatTitle =
        content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }

    // Optimistically update chat
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              title: newChatTitle,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsLoading(true);

    try {
      // 1. If in image_prompt mode, call generate-image endpoint
      if (mode === 'image_prompt' || content.toLowerCase().includes('crea una imagen') || content.toLowerCase().includes('crear imagen')) {
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: content, style: 'modern' }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const generatedImg: GeneratedImage = {
            id: `img-${Date.now()}`,
            prompt: content,
            style: imgData.type === 'raster' ? 'photorealistic' : 'vector_svg',
            svgContent: imgData.svg,
            dataUrl: imgData.url,
            createdAt: Date.now(),
            aspectRatio: '4:3',
          };
          saveImageToLibrary(generatedImg);

          const assistantMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: `He generado la ilustración basada en tu descripción:\n\n**${content}**`,
            timestamp: Date.now(),
            generatedImage: generatedImg,
          };

          setChats((prev) =>
            prev.map((c) =>
              c.id === activeChat.id
                ? {
                    ...c,
                    messages: [...updatedMessages, assistantMessage],
                    updatedAt: Date.now(),
                  }
                : c
            )
          );
          setIsLoading(false);
          return;
        }
      }

      // 2. Standard chat / code generation with Gemini 3.8 Flash
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          mode,
          aiModel,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error en la respuesta de OPTIMUS IA.');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: Date.now(),
        mode,
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? {
                ...c,
                messages: [...updatedMessages, assistantMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error de conexión**: ${err.message || 'No se pudo contactar a OPTIMUS IA. Verifica tu conexión.'}`,
        timestamp: Date.now(),
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? {
                ...c,
                messages: [...updatedMessages, errorMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Video Created in Studio Handler
  const handleVideoCreated = (video: GeneratedVideo, targetProjectId?: string) => {
    // 1. Add video to target project if assigned
    if (targetProjectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === targetProjectId
            ? {
                ...p,
                videos: [video, ...(p.videos || [])],
                updatedAt: Date.now(),
              }
            : p
        )
      );
    }

    // 2. Add video card into active chat
    if (activeChat) {
      const videoMsg: Message = {
        id: `msg-vid-${Date.now()}`,
        role: 'assistant',
        content: `🎬 **Producción Audiovisual Completada**: Se ha generado exitosamente el video **${video.title}** (${
          video.type === 'cinematic' ? 'Cinematográfico 1080p' : 'Simple'
        }). Puedes reproducirlo y descargarlo en formato de video directamente desde la tarjeta.`,
        timestamp: Date.now(),
        mode: 'video_director',
        generatedVideo: video,
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? {
                ...c,
                messages: [...c.messages, videoMsg],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    }
  };

  // Project Handlers
  const handleCreateProject = (projectData: Partial<Project>) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: projectData.title || 'Nuevo Proyecto',
      description: projectData.description || '',
      color: projectData.color || '#00f0ff',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      tags: projectData.tags || [],
      chatIds: [],
      snippets: [],
      videos: [],
      images: [],
      notes: '',
      ...projectData,
    };
    setProjects((prev) => [newProj, ...prev]);
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setChats((prev) =>
      prev.map((c) => (c.projectId === projectId ? { ...c, projectId: undefined } : c))
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        projects={projects}
        user={user}
        activeView={activeView}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onTogglePinChat={handleTogglePinChat}
        onAssignChatToProject={handleAssignChatToProject}
        onOpenVideoStudio={() => setVideoStudioConfig({ isOpen: true })}
        onOpenCreditsModal={() => setShowCreditsModal(true)}
        onSelectView={setActiveView}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeView === 'chat' ? (
          activeChat ? (
            <ChatView
              chat={activeChat}
              projects={projects}
              user={user}
              isLoading={isLoading}
              activeMode={activeMode}
              onSetMode={setActiveMode}
              onSendMessage={handleSendMessage}
              onOpenVideoStudio={(prompt) =>
                setVideoStudioConfig({ isOpen: true, prompt, type: 'cinematic' })
              }
              onOpenCreditsModal={() => setShowCreditsModal(true)}
              onPreviewCode={(code, language) =>
                setPreviewCodeData({ code, language })
              }
              onViewImage={(src, svgContent, prompt) =>
                setImageViewerData({ src, svgContent, prompt })
              }
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onAssignProject={(projectId) =>
                handleAssignChatToProject(activeChat.id, projectId)
              }
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Selecciona o crea un nuevo chat para comenzar.
            </div>
          )
        ) : (
          <ProjectsView
            projects={projects}
            chats={chats}
            onSelectChat={(chatId) => {
              handleSelectChat(chatId);
              setActiveView('chat');
            }}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onPreviewCode={(code, language) =>
              setPreviewCodeData({ code, language })
            }
            onOpenVideoStudio={(prompt) =>
              setVideoStudioConfig({ isOpen: true, prompt, type: 'cinematic' })
            }
          />
        )}
      </main>

      {/* Video Studio Modal */}
      {videoStudioConfig.isOpen && (
        <VideoStudioModal
          user={user}
          projects={projects}
          activeProjectId={activeChat?.projectId}
          initialPrompt={videoStudioConfig.prompt}
          initialType={videoStudioConfig.type || 'cinematic'}
          onUpdateUser={setUser}
          onVideoCreated={handleVideoCreated}
          onOpenCreditsModal={() => setShowCreditsModal(true)}
          onClose={() => setVideoStudioConfig({ isOpen: false })}
        />
      )}

      {/* Credits Vault Modal */}
      {showCreditsModal && (
        <CreditsModal
          user={user}
          onUpdateUser={setUser}
          onClose={() => setShowCreditsModal(false)}
        />
      )}

      {/* Code Sandbox Preview Modal */}
      {previewCodeData && (
        <CodePreviewModal
          code={previewCodeData.code}
          language={previewCodeData.language}
          onClose={() => setPreviewCodeData(null)}
        />
      )}

      {/* Image & SVG Viewer Modal */}
      {imageViewerData && (
        <ImageViewerModal
          src={imageViewerData.src}
          svgContent={imageViewerData.svgContent}
          prompt={imageViewerData.prompt}
          onClose={() => setImageViewerData(null)}
        />
      )}
    </div>
  );
}
