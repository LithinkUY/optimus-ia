import { ChatSession, Project, UserAccount, CreditTransaction, GeneratedVideo, GeneratedImage } from '../types';

const STORAGE_KEYS = {
  CHATS: 'optimus_chats_v1',
  ACTIVE_CHAT: 'optimus_active_chat_id',
  PROJECTS: 'optimus_projects_v1',
  USER: 'optimus_user_account_v1',
  SAVED_VIDEOS: 'optimus_videos_v1',
  SAVED_IMAGES: 'optimus_images_v1',
};

const INITIAL_USER: UserAccount = {
  name: 'Usuario OPTIMUS',
  credits: 50, // 50 starting credits
  lastDailyClaim: 0,
  transactions: [
    {
      id: 'tx-welcome',
      type: 'credit',
      amount: 50,
      reason: 'Bono de bienvenida OPTIMUS IA',
      timestamp: Date.now(),
    },
  ],
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-demo-1',
    title: 'Desarrollo de App Fullstack',
    description: 'Proyecto de software y arquitectura con componentes React, backend y pipelines.',
    color: '#3b82f6',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now(),
    status: 'active',
    tags: ['React', 'TypeScript', 'Node.js', 'API'],
    chatIds: ['chat-welcome'],
    snippets: [
      {
        id: 'snip-1',
        title: 'Componente Card con efecto Neumórfico',
        language: 'tsx',
        code: `export const GlassCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-cyan-500/50 transition-all">
      <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
};`,
        createdAt: Date.now() - 3600000 * 12,
      },
    ],
    videos: [],
    images: [],
    notes: 'Arquitectura validada con OPTIMUS IA. Pendiente integración de motor de renderizado y autenticación.',
  },
];

const INITIAL_CHATS: ChatSession[] = [
  {
    id: 'chat-welcome',
    title: 'Bienvenido a OPTIMUS IA',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
    projectId: 'proj-demo-1',
    pinned: true,
    messages: [
      {
        id: 'msg-w1',
        role: 'assistant',
        content: `¡Hola! Te doy la bienvenida a **OPTIMUS IA** ⚡, tu suite de inteligencia artificial avanzada exclusiva.

### ¿Qué puedo hacer por ti?
- 💻 **Asistente de Programación Experto**: Escribo, depuro, optimizo y explico código en cualquier lenguaje (React, Python, TypeScript, SQL, Rust, Go, C++, etc.) con sandbox de ejecución en vivo.
- 👁️ **Visión Multimodal**: Adjunta capturas de pantalla, diagramas arquitectónicos o fotos y las analizaré en detalle.
- 🎨 **Estudio de Imágenes**: Genero ilustraciones vectoriales SVG profesionales listas para descargar y prompts visuales de alta precisión.
- 🎬 **Estudio de Videos Cinematográficos y Simples**: Creo videos con movimientos de cámara 3D, iluminación anamórfica, partículas y sintetizador de audio épico directo en tu navegador listos para descargar en WebM/MP4.
- 📁 **Gestión de Proyectos e Historial**: Organiza tus chats, código, imágenes y videos por proyectos categorizados.

✨ **Sistema de Créditos**:
- *Chat, programación, análisis de imágenes y videos simples*: **100% GRATIS e ILIMITADOS**.
- *Videos Cinematográficos de Alta Gama*: **10 créditos** (¡Ya tienes **50 créditos de regalo** listos para usar!).

¿En qué proyecto o código empezamos a trabajar hoy?`,
        timestamp: Date.now() - 3600000 * 2,
      },
    ],
  },
];

export function getSavedChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHATS);
    return raw ? JSON.parse(raw) : INITIAL_CHATS;
  } catch {
    return INITIAL_CHATS;
  }
}

export function saveChats(chats: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  } catch (err) {
    console.error('Error guardando chats:', err);
  }
}

export function getActiveChatId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT) || 'chat-welcome';
}

export function setActiveChatId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, id);
}

export function getSavedProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return raw ? JSON.parse(raw) : INITIAL_PROJECTS;
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.error('Error guardando proyectos:', err);
  }
}

export function getUserAccount(): UserAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return INITIAL_USER;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_USER, ...parsed };
  } catch {
    return INITIAL_USER;
  }
}

export function saveUserAccount(user: UserAccount): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.error('Error guardando usuario:', err);
  }
}

export function addCredits(amount: number, reason: string): UserAccount {
  const current = getUserAccount();
  const updatedCredits = current.credits + amount;
  const newTx: CreditTransaction = {
    id: `tx-${Date.now()}`,
    type: 'credit',
    amount,
    reason,
    timestamp: Date.now(),
  };
  const updatedUser: UserAccount = {
    ...current,
    credits: updatedCredits,
    transactions: [newTx, ...current.transactions.slice(0, 49)],
  };
  saveUserAccount(updatedUser);
  return updatedUser;
}

export function deductCredits(amount: number, reason: string): { success: boolean; updatedUser: UserAccount; error?: string } {
  const current = getUserAccount();
  if (current.credits < amount) {
    return {
      success: false,
      updatedUser: current,
      error: `No tienes suficientes créditos (${current.credits} disponibles, se requieren ${amount}).`,
    };
  }
  const updatedCredits = current.credits - amount;
  const newTx: CreditTransaction = {
    id: `tx-${Date.now()}`,
    type: 'debit',
    amount,
    reason,
    timestamp: Date.now(),
  };
  const updatedUser: UserAccount = {
    ...current,
    credits: updatedCredits,
    transactions: [newTx, ...current.transactions.slice(0, 49)],
  };
  saveUserAccount(updatedUser);
  return { success: true, updatedUser };
}

export function claimDailyCredits(): { claimed: boolean; user: UserAccount; message: string } {
  const current = getUserAccount();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - current.lastDailyClaim < ONE_DAY_MS) {
    const remainingHours = Math.ceil((ONE_DAY_MS - (now - current.lastDailyClaim)) / (1000 * 60 * 60));
    return {
      claimed: false,
      user: current,
      message: `Ya reclamaste tu bono de hoy. Vuelve en aprox. ${remainingHours} horas.`,
    };
  }

  const bonusAmount = 25;
  const newTx: CreditTransaction = {
    id: `tx-daily-${now}`,
    type: 'credit',
    amount: bonusAmount,
    reason: 'Recompensa diaria de actividad',
    timestamp: now,
  };

  const updatedUser: UserAccount = {
    ...current,
    credits: current.credits + bonusAmount,
    lastDailyClaim: now,
    transactions: [newTx, ...current.transactions.slice(0, 49)],
  };

  saveUserAccount(updatedUser);
  return {
    claimed: true,
    user: updatedUser,
    message: `¡Has reclamado +${bonusAmount} créditos gratuitos para videos cinematográficos!`,
  };
}

export function getSavedVideos(): GeneratedVideo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_VIDEOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVideoToLibrary(video: GeneratedVideo): void {
  try {
    const existing = getSavedVideos();
    const updated = [video, ...existing.filter(v => v.id !== video.id)];
    localStorage.setItem(STORAGE_KEYS.SAVED_VIDEOS, JSON.stringify(updated.slice(0, 30)));
  } catch (err) {
    console.error('Error guardando video:', err);
  }
}

export function getSavedImages(): GeneratedImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_IMAGES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveImageToLibrary(image: GeneratedImage): void {
  try {
    const existing = getSavedImages();
    const updated = [image, ...existing.filter(i => i.id !== image.id)];
    localStorage.setItem(STORAGE_KEYS.SAVED_IMAGES, JSON.stringify(updated.slice(0, 30)));
  } catch (err) {
    console.error('Error guardando imagen:', err);
  }
}
