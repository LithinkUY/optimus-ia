import { VideoStoryboard, GeneratedVideo } from '../types';

export interface RenderProgressCallback {
  (progress: number, status: string): void;
}

export async function renderVideoOnCanvas(
  storyboard: VideoStoryboard,
  videoType: 'simple' | 'cinematic',
  onProgress?: RenderProgressCallback
): Promise<GeneratedVideo> {
  const isCinematic = videoType === 'cinematic';
  const width = storyboard.aspectRatio === '9:16' ? 720 : 1280;
  const height = storyboard.aspectRatio === '9:16' ? 1280 : 720;
  const fps = 30;
  const totalDuration = storyboard.totalDuration || (isCinematic ? 6 : 4);
  const totalFrames = Math.floor(totalDuration * fps);

  // Hidden rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D de canvas.');

  // Set up Web Audio API stream for cinematic soundtrack
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  try {
    audioCtx = new AudioContextClass();
    audioDest = audioCtx.createMediaStreamDestination();
    playCinematicSynthesizer(audioCtx, audioDest, storyboard, totalDuration);
  } catch (err) {
    console.warn('Audio synthesis not supported or blocked:', err);
  }

  // Capture video stream from canvas
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
  if (audioDest) {
    audioDest.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
  }

  // Determine supported mimeType
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: isCinematic ? 5000000 : 2500000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  // Particle systems initialization
  const particleCount = isCinematic ? 120 : 60;
  const particles: Array<{
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    size: number;
    color: string;
    alpha: number;
  }> = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 1000 + 100,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      vz: (Math.random() + 0.8) * 8,
      size: Math.random() * 3 + 1,
      color: i % 2 === 0 ? '#00f0ff' : '#ff007f',
      alpha: Math.random() * 0.7 + 0.3,
    });
  }

  let thumbnailDataUrl = '';

  // Render loop frame by frame
  const scenes = storyboard.scenes && storyboard.scenes.length > 0
    ? storyboard.scenes
    : [
        {
          sceneNumber: 1,
          duration: totalDuration,
          title: storyboard.title,
          subtitle: storyboard.synopsis,
          cameraMove: 'dolly_zoom',
          lightingColor: '#00f0ff',
          secondaryColor: '#7928ca',
          backgroundColor: '#050714',
          particles: 'neon_sparks',
          elementName: 'OPTIMUS Core',
        },
      ];

  const frameDurationMs = 1000 / fps;
  let currentSceneIdx = 0;
  let sceneStartTime = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTimeSec = frame / fps;
    const progressPercent = Math.round((frame / totalFrames) * 100);

    // Calculate current scene
    let accumulatedTime = 0;
    for (let s = 0; s < scenes.length; s++) {
      accumulatedTime += scenes[s].duration || (totalDuration / scenes.length);
      if (currentTimeSec <= accumulatedTime || s === scenes.length - 1) {
        if (currentSceneIdx !== s) {
          currentSceneIdx = s;
          sceneStartTime = currentTimeSec;
        }
        break;
      }
    }

    const scene = scenes[currentSceneIdx];
    const sceneProgress = Math.min(1, Math.max(0, (currentTimeSec - sceneStartTime) / (scene.duration || 3)));

    if (onProgress && frame % 10 === 0) {
      const statusMsg = isCinematic
        ? `Renderizando Escena ${currentSceneIdx + 1}/${scenes.length}: ${scene.title} (${progressPercent}%)`
        : `Generando secuencia dinámica (${progressPercent}%)`;
      onProgress(progressPercent, statusMsg);
    }

    // DRAW FRAME
    drawVideoScene(ctx, width, height, scene, currentTimeSec, sceneProgress, isCinematic, particles);

    // Capture thumbnail at 30% mark
    if (frame === Math.floor(totalFrames * 0.3)) {
      thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    }

    // Allow frame dispatch to recorder
    await new Promise((r) => setTimeout(r, Math.max(1, frameDurationMs * 0.3)));
  }

  if (onProgress) {
    onProgress(98, 'Finalizando codificación y mezcla de audio...');
  }

  recorder.stop();
  const videoBlob = await recordingPromise;
  const videoUrl = URL.createObjectURL(videoBlob);

  if (audioCtx) {
    try {
      audioCtx.close();
    } catch {
      // ignore
    }
  }

  if (onProgress) {
    onProgress(100, '¡Video cinematográfico listo!');
  }

  return {
    id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: storyboard.title || 'Video OPTIMUS IA',
    prompt: storyboard.synopsis || storyboard.title,
    type: videoType,
    videoUrl,
    thumbnailUrl: thumbnailDataUrl || canvas.toDataURL('image/jpeg', 0.8),
    aspectRatio: storyboard.aspectRatio,
    duration: totalDuration,
    creditsCost: isCinematic ? 10 : 0,
    createdAt: Date.now(),
    style: storyboard.style || 'Cinematic',
    storyboard,
  };
}

function drawVideoScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: any,
  globalTime: number,
  sceneProgress: number,
  isCinematic: boolean,
  particles: any[]
) {
  ctx.save();

  // 1. Background Gradient with animated sweep
  const bgGrad = ctx.createLinearGradient(
    0,
    0,
    w * Math.cos(globalTime * 0.5),
    h * Math.sin(globalTime * 0.5)
  );
  bgGrad.addColorStop(0, scene.backgroundColor || '#050714');
  bgGrad.addColorStop(0.5, '#0a0f29');
  bgGrad.addColorStop(1, '#02030a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Camera Simulation
  const cx = w / 2;
  const cy = h / 2;
  ctx.translate(cx, cy);

  let scale = 1.0;
  let rotate = 0;
  let tx = 0;
  let ty = 0;

  if (scene.cameraMove === 'dolly_zoom') {
    scale = 1.0 + Math.sin(sceneProgress * Math.PI) * 0.25;
  } else if (scene.cameraMove === 'drone_flythrough') {
    scale = 0.85 + sceneProgress * 0.4;
    ty = (sceneProgress - 0.5) * 60;
  } else if (scene.cameraMove === 'orbit_360') {
    rotate = (sceneProgress - 0.5) * 0.2;
    scale = 1.05 + Math.sin(globalTime * 2) * 0.05;
  } else if (scene.cameraMove === 'pan_left_to_right') {
    tx = (sceneProgress - 0.5) * 120;
  } else {
    scale = 1.0 + sceneProgress * 0.15;
  }

  ctx.scale(scale, scale);
  ctx.rotate(rotate);
  ctx.translate(tx, ty);

  // 3. Draw 3D Perspective Grid
  ctx.save();
  ctx.strokeStyle = scene.lightingColor || '#00f0ff';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25 + Math.sin(globalTime * 3) * 0.05;

  const horizonY = 120;
  const gridSpacing = 40;
  const gridSpeed = (globalTime * 150) % gridSpacing;

  for (let x = -w; x <= w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(0, horizonY - 40);
    ctx.lineTo(x * 2, h);
    ctx.stroke();
  }

  for (let y = horizonY; y <= h; y += 20) {
    const yAnimated = y + gridSpeed;
    if (yAnimated <= h) {
      ctx.beginPath();
      ctx.moveTo(-w, yAnimated);
      ctx.lineTo(w, yAnimated);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 4. Volumetric Glow & Central Hologram Element
  const glowRadius = isCinematic ? 240 : 160;
  const radialGlow = ctx.createRadialGradient(0, -30, 10, 0, -30, glowRadius);
  radialGlow.addColorStop(0, scene.lightingColor || '#00f0ff');
  radialGlow.addColorStop(0.4, scene.secondaryColor || '#ff007f');
  radialGlow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radialGlow;
  ctx.beginPath();
  ctx.arc(0, -30, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Central 3D Geometric Emblem / Sci-Fi Ring
  ctx.save();
  ctx.strokeStyle = scene.lightingColor || '#00f0ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = scene.lightingColor || '#00f0ff';
  ctx.shadowBlur = 20;

  const ringRadius = isCinematic ? 110 : 80;
  const rot1 = globalTime * 1.5;
  const rot2 = -globalTime * 1.2;

  // Outer segmented ring
  ctx.beginPath();
  ctx.ellipse(0, -30, ringRadius, ringRadius * 0.5, rot1, 0, Math.PI * 1.6);
  ctx.stroke();

  // Inner counter ring
  ctx.strokeStyle = scene.secondaryColor || '#ff007f';
  ctx.shadowColor = scene.secondaryColor || '#ff007f';
  ctx.beginPath();
  ctx.ellipse(0, -30, ringRadius * 0.75, ringRadius * 0.35, rot2, 0, Math.PI * 1.8);
  ctx.stroke();

  // Central Glowing Diamond
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  const dSize = 18 + Math.sin(globalTime * 4) * 4;
  ctx.moveTo(0, -30 - dSize);
  ctx.lineTo(dSize * 0.7, -30);
  ctx.lineTo(0, -30 + dSize);
  ctx.lineTo(-dSize * 0.7, -30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 6. 3D Flying Particles
  ctx.save();
  for (const p of particles) {
    p.z -= p.vz;
    if (p.z <= 10) {
      p.z = 1000;
      p.x = (Math.random() - 0.5) * w * 1.5;
      p.y = (Math.random() - 0.5) * h * 1.5;
    }
    const fov = 400;
    const px = (p.x * fov) / p.z;
    const py = (p.y * fov) / p.z - 30;
    const pSize = Math.max(0.5, (p.size * fov) / p.z);

    if (px > -w / 2 && px < w / 2 && py > -h / 2 && py < h / 2) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.alpha * (1 - p.z / 1000));
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Reset transform to draw titles & cinematic UI
  ctx.restore();

  // 7. Anamorphic Lens Flare (horizontal streak across center)
  if (isCinematic) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flareGrad = ctx.createLinearGradient(0, cy - 30, w, cy - 30);
    flareGrad.addColorStop(0, 'rgba(0,0,0,0)');
    flareGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.1)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
    flareGrad.addColorStop(0.7, 'rgba(255, 0, 127, 0.1)');
    flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, cy - 32, w, 4);

    // Subtle anamorphic flare spot
    const spotX = cx + Math.sin(globalTime * 0.8) * (w * 0.25);
    const spotGrad = ctx.createRadialGradient(spotX, cy - 30, 2, spotX, cy - 30, 90);
    spotGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
    spotGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.3)');
    spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotX, cy - 30, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 8. Typography & Subtitles
  ctx.save();
  ctx.textAlign = 'center';

  // Title with fade-in and scale
  const titleAlpha = Math.min(1, sceneProgress * 3);
  ctx.globalAlpha = titleAlpha;

  ctx.font = '800 32px "Syne", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = scene.lightingColor || '#00f0ff';
  ctx.shadowBlur = 25;
  ctx.fillText((scene.title || 'OPTIMUS IA').toUpperCase(), cx, cy + 110);

  // Subtitle / Narrative Dialogue
  if (scene.subtitle) {
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 10;
    ctx.fillText(scene.subtitle, cx, cy + 145);
  }

  // OPTIMUS Watermark / HUD Badge in top corner
  ctx.globalAlpha = 0.8;
  ctx.font = '700 12px "Fira Code", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.fillText('⚡ OPTIMUS IA STUDIO', 30, isCinematic ? 55 : 35);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.shadowBlur = 0;
  ctx.fillText(`REC ${globalTime.toFixed(1)}s • ${scene.cameraMove.replace(/_/g, ' ').toUpperCase()}`, w - 30, isCinematic ? 55 : 35);
  ctx.restore();

  // 9. Film Grain & Cinematic Letterbox (2.39:1 aspect bars)
  if (isCinematic) {
    const letterboxHeight = Math.floor(h * 0.08);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, letterboxHeight);
    ctx.fillRect(0, h - letterboxHeight, w, letterboxHeight);

    // Thin cyan line indicator at letterbox edge
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, letterboxHeight);
    ctx.lineTo(w, letterboxHeight);
    ctx.moveTo(0, h - letterboxHeight);
    ctx.lineTo(w, h - letterboxHeight);
    ctx.stroke();
  }
}

// Synthesize an epic cinematic soundtrack using Web Audio API
function playCinematicSynthesizer(
  audioCtx: AudioContext,
  dest: MediaStreamAudioDestinationNode,
  storyboard: VideoStoryboard,
  totalDuration: number
) {
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.6, audioCtx.currentTime + 1.0);
  masterGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + totalDuration);
  masterGain.connect(dest);

  const baseFreq = storyboard.soundtrack?.baseFreq || 65; // Deep sub-bass

  // 1. Sub Bass Drone
  const osc1 = audioCtx.createOscillator();
  const osc1Gain = audioCtx.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  osc1.frequency.linearRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + totalDuration);

  // Lowpass filter for cinematic warmth
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(180, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + totalDuration * 0.8);

  osc1Gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  osc1.connect(filter);
  filter.connect(osc1Gain);
  osc1Gain.connect(masterGain);
  osc1.start();
  osc1.stop(audioCtx.currentTime + totalDuration);

  // 2. Cinematic Atmospheric Pad (harmonic chord)
  const padFrequencies = [baseFreq * 2, baseFreq * 2.5, baseFreq * 3];
  padFrequencies.forEach((freq) => {
    const padOsc = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    padGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    padOsc.connect(padGain);
    padGain.connect(masterGain);
    padOsc.start();
    padOsc.stop(audioCtx.currentTime + totalDuration);
  });

  // 3. Sci-Fi Riser Arpeggio pulses
  const interval = 0.5;
  const numBeats = Math.floor(totalDuration / interval);
  for (let i = 0; i < numBeats; i++) {
    const beatTime = audioCtx.currentTime + i * interval;
    const pulseOsc = audioCtx.createOscillator();
    const pulseGain = audioCtx.createGain();
    pulseOsc.type = 'triangle';
    pulseOsc.frequency.setValueAtTime(baseFreq * 4 + i * 20, beatTime);

    pulseGain.gain.setValueAtTime(0.2, beatTime);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.3);

    pulseOsc.connect(pulseGain);
    pulseGain.connect(masterGain);

    pulseOsc.start(beatTime);
    pulseOsc.stop(beatTime + 0.3);
  }
}
