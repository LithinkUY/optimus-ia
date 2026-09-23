import React, { useState, useRef } from 'react';
import {
  X,
  Clapperboard,
  Sparkles,
  Zap,
  Play,
  Pause,
  Download,
  Share2,
  Sliders,
  Film,
  Music,
  Maximize2,
  Layers,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, GeneratedVideo, Project } from '../types';
import { renderVideoOnCanvas } from '../utils/videoEngine';
import { deductCredits, saveVideoToLibrary } from '../utils/storage';

interface VideoStudioModalProps {
  user: UserAccount;
  projects: Project[];
  activeProjectId?: string;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onVideoCreated: (video: GeneratedVideo, targetProjectId?: string) => void;
  onOpenCreditsModal: () => void;
  onClose: () => void;
  initialPrompt?: string;
  initialType?: 'simple' | 'cinematic';
}

const CINEMA_PRESETS = [
  {
    name: 'Cyberpunk 2077',
    style: 'Cyberpunk',
    prompt: 'Vuelo nocturno entre rascacielos de neón, lluvia de luz digital y reflejos holográficos en la metrópolis.',
    icon: '🌆',
  },
  {
    name: 'Odisea Cuántica IMAX',
    style: 'Sci-Fi Odyssey',
    prompt: 'Navegación dentro de un portal de agujero de gusano con destellos de partículas y energía gravitacional.',
    icon: '🌌',
  },
  {
    name: 'Film Noir 35mm',
    style: 'Film Noir',
    prompt: 'Toma cinematográfica dramática con sombras de alto contraste, humo volumétrico y destellos de farolas.',
    icon: '🎬',
  },
  {
    name: 'Vuelo Épico Drone',
    style: 'Epic Drone',
    prompt: 'Toma aérea a gran velocidad barriendo cañones rocosos y un templo tecnológico al atardecer dorado.',
    icon: '🦅',
  },
  {
    name: 'Matrix Core Digital',
    style: 'Matrix Cyber',
    prompt: 'Inmersión en el núcleo de procesamiento de una supercomputadora con cascada de datos y anillos lumínicos.',
    icon: '⚡',
  },
];

export const VideoStudioModal: React.FC<VideoStudioModalProps> = ({
  user,
  projects,
  activeProjectId,
  onUpdateUser,
  onVideoCreated,
  onOpenCreditsModal,
  onClose,
  initialPrompt = '',
  initialType = 'cinematic',
}) => {
  const [videoType, setVideoType] = useState<'simple' | 'cinematic'>(initialType);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState('Cyberpunk');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<number>(6);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || (projects[0]?.id || ''));

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const creditsCost = videoType === 'cinematic' ? 10 : 0;

  const handleStartGeneration = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Por favor escribe una descripción para el video.');
      return;
    }

    // Check credits for cinematic
    if (creditsCost > 0 && user.credits < creditsCost) {
      setErrorMsg(`Créditos insuficientes: necesitas ${creditsCost} créditos y tienes ${user.credits}.`);
      onOpenCreditsModal();
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setProgress(5);
    setStatusMessage('OPTIMUS Director IA ideando el guion y tomas cinematográficas...');

    try {
      // 1. Fetch storyboard from backend Gemini 3.8 Flash
      const response = await fetch('/api/video-storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          videoType,
          style,
          duration,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el storyboard del video.');
      }

      const storyboard = await response.json();
      setProgress(20);
      setStatusMessage('Planificando trayectorias de cámara 3D e iluminación anamórfica...');

      // 2. Render on canvas & audio synthesizer or Veo
      const videoResult = await renderVideoOnCanvas(storyboard, videoType, (p, msg) => {
        setProgress(20 + Math.floor(p * 0.75));
        setStatusMessage(msg);
      });

      if (videoType === 'cinematic') {
        setStatusMessage('Conectando con Hugging Face Inference API...');
        try {
          let hfVideoUrl = '';
          
          // Poll until model loads (503 means model is loading)
          for (let i = 0; i < 20; i++) {
            setStatusMessage(`Consultando a Hugging Face (Intento ${i+1}/20)...`);
            const hfRes = await fetch('/api/generate-hf-video', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: `${style}: ${prompt}` })
            });
            
            if (hfRes.status === 503) {
              setStatusMessage('El modelo de video gratuito se está despertando en el servidor. Esperando 10 segundos...');
              await new Promise(r => setTimeout(r, 10000));
              setProgress(prev => Math.min(prev + 5, 95));
              continue;
            }
            
            if (hfRes.ok) {
              const data = await hfRes.json();
              if (data.videoUrl) {
                hfVideoUrl = data.videoUrl;
              }
              break;
            } else {
              const err = await hfRes.json();
              console.error('Hugging Face Error:', err);
              break;
            }
          }
          
          if (hfVideoUrl) {
            videoResult.videoUrl = hfVideoUrl;
          }
        } catch (e) {
          console.error('Fallo la conexion a Hugging Face:', e);
        }
      }

      // 3. Deduct credits if cinematic
      if (creditsCost > 0) {
        const deductResult = deductCredits(creditsCost, `Video Cinematográfico: "${prompt.slice(0, 30)}..."`);
        if (deductResult.success) {
          onUpdateUser(deductResult.updatedUser);
        }
      }

      // 4. Save to library & notify parent
      saveVideoToLibrary(videoResult);
      onVideoCreated(videoResult, selectedProjectId);
      setGeneratedVideo(videoResult);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff007f', '#f59e0b', '#3b82f6'],
      });
    } catch (err: any) {
      console.error('Error generando video:', err);
      setErrorMsg(err.message || 'Ocurrió un problema durante el renderizado del video.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!generatedVideo) return;
    const a = document.createElement('a');
    a.href = generatedVideo.videoUrl;
    a.download = `optimus-ia-${generatedVideo.type}-${Date.now()}.webm`;
    a.click();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Clapperboard className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Estudio de Video OPTIMUS
                <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                  Canvas 60FPS + Audio Synth
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Crea videos descargables en alta definición con movimientos de cámara y sonido cinematográfico.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenCreditsModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-400 hover:bg-slate-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{user.credits} Créditos</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {generatedVideo ? (
            /* Result Video View */
            <div className="space-y-6">
              <div className="relative aspect-video max-h-[460px] bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={generatedVideo.videoUrl}
                  loop
                  playsInline
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                />

                {/* Overlaid Play button when paused */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <Play className="w-8 h-8 fill-slate-950 ml-1" />
                  </button>
                )}

                {/* Video controls bar overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span className="text-xs text-slate-300 font-mono">
                      {generatedVideo.duration}s • {generatedVideo.aspectRatio}
                    </span>
                  </div>

                  <button
                    onClick={handleDownloadVideo}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Video (.webm/.mp4)
                  </button>
                </div>
              </div>

              {/* Video metadata card */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {generatedVideo.type === 'cinematic' ? 'Cinematográfico 1080p' : 'Simple Rápido'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Estilo: {generatedVideo.style}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">{generatedVideo.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{generatedVideo.prompt}</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setGeneratedVideo(null);
                      setProgress(0);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Crear Otro Video
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Creation Configuration Form */
            <div className="space-y-6">
              {/* Type Selection: Simple vs Cinematic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Simple (0 credits) */}
                <div
                  onClick={() => setVideoType('simple')}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start space-x-3 ${
                    videoType === 'simple'
                      ? 'bg-slate-950/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center ${
                      videoType === 'simple'
                        ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                        : 'border-slate-600'
                    }`}
                  >
                    {videoType === 'simple' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Video Simple</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        GRATIS (0 Créditos)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Ideal para redes sociales, animaciones gráficas rápidas, tipografía y transiciones de escena.
                    </p>
                  </div>
                </div>

                {/* Option 2: Cinematic (10 credits) */}
                <div
                  onClick={() => setVideoType('cinematic')}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start space-x-3 relative overflow-hidden ${
                    videoType === 'cinematic'
                      ? 'bg-slate-950/90 border-cyan-500 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500 to-blue-600 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-bl-lg">
                    Cine IMAX
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center ${
                      videoType === 'cinematic'
                        ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                        : 'border-slate-600'
                    }`}
                  >
                    {videoType === 'cinematic' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between pr-14">
                      <span className="font-bold text-white text-sm">Video Cinematográfico</span>
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        10 Créditos
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Movimientos 3D (dolly zoom, drone, orbit), iluminación anamórfica, partículas y sintetizador de audio épico.
                    </p>
                  </div>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Descripción / Guion del Video
                  </label>
                  <span className="text-xs text-slate-500">
                    {prompt.length} caracteres
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Cámara volando sobre una ciudad futurista con rascacielos flotantes, luces de neón cian y violeta, con atmósfera de lluvia..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                />
              </div>

              {/* Quick Cinema Presets */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Plantillas Rápidas de Cine:
                </span>
                <div className="flex flex-wrap gap-2">
                  {CINEMA_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setPrompt(p.prompt);
                        setStyle(p.style);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 text-xs text-slate-300 hover:text-cyan-300 transition-all"
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Production Settings: Aspect Ratio, Duration, Project */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Formato
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                        aspectRatio === '16:9'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      16:9 Horizontal
                    </button>
                    <button
                      onClick={() => setAspectRatio('9:16')}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                        aspectRatio === '9:16'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      9:16 Vertical
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Duración
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[4, 6, 8].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setDuration(sec)}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                          duration === sec
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project Assignment */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Asignar a Proyecto
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Sin proyecto (General)</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Progress Overlay if Generating */}
              {isGenerating && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-cyan-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                      {statusMessage}
                    </span>
                    <span className="font-mono font-bold text-white">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              {/* Submit Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  {creditsCost > 0 ? (
                    <span>
                      Costo:{' '}
                      <b className="text-cyan-400 font-bold">10 Créditos</b> (Tienes{' '}
                      {user.credits})
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Costo: 0 Créditos (Gratis)</span>
                  )}
                </div>

                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-slate-950 font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Clapperboard className="w-4 h-4" />
                  {isGenerating ? 'Renderizando Video...' : 'Generar Video Ahora'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
