export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 data URL
  size?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  mode?: 'general' | 'programming' | 'image_prompt' | 'video_director';
  generatedVideo?: GeneratedVideo;
  generatedImage?: GeneratedImage;
  codeBlocks?: Array<{ language: string; code: string }>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  projectId?: string;
  pinned?: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'in_review' | 'completed';
  tags: string[];
  chatIds: string[];
  snippets: Array<{
    id: string;
    title: string;
    language: string;
    code: string;
    createdAt: number;
  }>;
  videos: GeneratedVideo[];
  images: GeneratedImage[];
  notes: string;
}

export interface VideoScene {
  sceneNumber: number;
  duration: number;
  title: string;
  subtitle?: string;
  cameraMove: string;
  lightingColor: string;
  secondaryColor: string;
  backgroundColor: string;
  particles: string;
  elementName: string;
  visualDescription?: string;
}

export interface VideoStoryboard {
  title: string;
  synopsis: string;
  style: string;
  aspectRatio: '16:9' | '9:16';
  totalDuration: number;
  soundtrack: {
    mood: string;
    bpm: number;
    baseFreq: number;
    hasSubBass: boolean;
  };
  scenes: VideoScene[];
}

export interface GeneratedVideo {
  id: string;
  title: string;
  prompt: string;
  type: 'simple' | 'cinematic';
  videoUrl: string; // Blob URL
  blobDataUrl?: string; // Storable or downloaded
  thumbnailUrl?: string;
  aspectRatio: '16:9' | '9:16';
  duration: number;
  creditsCost: number;
  createdAt: number;
  style: string;
  storyboard?: VideoStoryboard;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  svgContent?: string;
  dataUrl?: string;
  createdAt: number;
  aspectRatio: string;
}

export interface CreditTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  timestamp: number;
}

export interface UserAccount {
  name: string;
  credits: number;
  lastDailyClaim: number;
  transactions: CreditTransaction[];
}
