import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

import { Groq } from 'groq-sdk';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const DEFAULT_SYSTEM_INSTRUCTION = `Eres OPTIMUS IA, un avanzado y potente modelo de Inteligencia Artificial exclusivo diseñado para desarrolladores, creadores de contenido, diseñadores y profesionales. Eres propiedad de tu empresa y no estás basado en tecnologías externas de otras compañías. Nunca menciones a Google, OpenAI, Anthropic ni a ChatGPT.
Tus capacidades principales son:
1. ASISTENTE DE PROGRAMACIÓN EXPERTO: Generas código limpio, moderno, tipado, modular y sin errores en cualquier lenguaje (TypeScript, Python, React, Next.js, Node, Rust, Go, SQL, HTML/CSS, etc.). Cuando generes código, incluye bloques markdown con el lenguaje especificado (\`\`\`typescript, etc.). Si el usuario pide HTML/CSS/JS, proporciónalo de forma lista para ejecutar.
2. ANÁLISIS DE IMÁGENES Y VISIÓN MULTIMODAL: Puedes inspeccionar y analizar capturas de pantalla, mockups de UI, diagramas arquitectónicos, fotos y errores de consola adjuntos por el usuario.
3. DIRECTOR DE IMÁGENES Y PROMPTS: Puedes sugerir y redactar prompts fotorrealistas e hiperdetallados para generadores visuales, o generar arte gráfico SVG vectorizado completo.
4. CINEASTA Y DIRECTOR DE VIDEOS: Capaz de idear guiones cinematográficos, describir movimientos de cámara (dolly, pan, tilt, orbit), iluminación anamórfica y efectos visuales para videos simples y cinematográficos.
5. PERSONALIDAD: Inteligente, conciso, creativo, técnico cuando se requiere, empático y estructurado con un tono moderno y profesional en español. Usa formato Markdown con encabezados limpios, listas y viñetas para que sea fácil de leer en móviles y escritorios.`;

// 1. Chat Completion Endpoint (with fallback)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, mode, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Lista de mensajes requerida.' });
    }

    let dynamicSystemInstruction = systemPrompt || DEFAULT_SYSTEM_INSTRUCTION;
    if (mode === 'programming') {
      dynamicSystemInstruction += `\nMODO ACTIVO: PROGRAMACIÓN Y DESARROLLO DE SOFTWARE. Concéntrate en la mejor arquitectura, código limpio y robusto, buenas prácticas, seguridad y explicaciones claras. Incluye siempre código completo y funcional.`;
    } else if (mode === 'image_prompt') {
      dynamicSystemInstruction += `\nMODO ACTIVO: ESTUDIO DE IMÁGENES. Si el usuario solicita una imagen o gráfico, genera una descripción visual cautivadora y también incluye código SVG completo y elegante si corresponde dentro de un bloque \`\`\`xml o \`\`\`svg.`;
    } else if (mode === 'video_director') {
      dynamicSystemInstruction += `\nMODO ACTIVO: DIRECTOR DE VIDEOS CINEMATOGRÁFICOS. Describe las escenas con detalle de ángulos de cámara (drone shot, macro, anamorphic lens, lighting, color grading).`;
    }

    const hasImages = messages.some((m: any) => m.attachments && m.attachments.length > 0);
    const aiModel = req.body.aiModel || 'auto';

    const contents = messages.map((m: any) => {
      const parts: any[] = [];
      if (m.attachments && Array.isArray(m.attachments)) {
        for (const att of m.attachments) {
          if (att.data && att.mimeType) {
            const cleanBase64 = att.data.includes('base64,') ? att.data.split('base64,')[1] : att.data;
            parts.push({ inlineData: { mimeType: att.mimeType, data: cleanBase64 } });
          }
        }
      }
      if (m.content) parts.push({ text: m.content });
      return { role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user', parts };
    });

    const runGemini = async (modelName: string) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: { systemInstruction: dynamicSystemInstruction, temperature: 0.7 },
      });
      return response.text || 'Sin respuesta generada.';
    };

    const runGroq = async () => {
      if (!groq) throw new Error("Groq API Key no configurada.");
      if (hasImages) throw new Error("Groq no soporta análisis de imágenes en este modo.");
      const groqMessages = [
        { role: 'system', content: dynamicSystemInstruction },
        ...messages.map((m: any) => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || ''
        }))
      ];
      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: groqMessages as any,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || 'Sin respuesta generada.';
    };

    // Manual selection
    if (aiModel === 'gemini-3.8-flash') {
      const text = await runGemini('gemini-3.8-flash');
      return res.json({ text, mode });
    } else if (aiModel === 'gemini-1.5-pro') {
      const text = await runGemini('gemini-1.5-pro');
      return res.json({ text, mode });
    } else if (aiModel === 'gpt-oss-120b') {
      const text = await runGroq();
      return res.json({ text, mode });
    }

    // Auto Fallback Mode
    try {
      const text = await runGemini('gemini-3.8-flash');
      return res.json({ text, mode });
    } catch (err: any) {
      console.warn('Gemini 3.8 Flash falló:', err.message);
      
      try {
        const text = await runGemini('gemini-1.5-pro');
        return res.json({ text, mode });
      } catch (err2: any) {
        console.warn('Gemini 1.5 Pro falló:', err2.message);
        
        if (groq && !hasImages) {
          try {
            const text = await runGroq();
            return res.json({ text, mode });
          } catch (err3: any) {
            console.warn('Groq falló:', err3.message);
            throw new Error(`Fallaron todos los modelos. Último error: ${err3.message}`);
          }
        } else {
          throw new Error(`Fallaron los modelos de Google. Último error: ${err2.message}`);
        }
      }
    }
  } catch (error: any) {
    console.error('Error final en /api/chat:', error);
    let errorMessage = error.message || 'Error interno en los servidores de OPTIMUS IA.';
    if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
      errorMessage = 'OPTIMUS IA está experimentando un pico de demanda extrema en todos los clústeres. Por favor, intenta de nuevo en un momento.';
    }
    return res.status(500).json({ error: errorMessage });
  }
});

// 2. Video Storyboard & Director Generation (using free gemini-3.8-flash)
app.post('/api/video-storyboard', async (req: Request, res: Response) => {
  try {
    const { prompt, videoType = 'cinematic', style = 'Cyberpunk', duration = 6, aspectRatio = '16:9' } = req.body;

    const isCinematic = videoType === 'cinematic';
    const numScenes = isCinematic ? 3 : 2;

    const promptInstruction = `Actúa como Director Cinematográfico de OPTIMUS IA.
Genera un plan de producción y animación en formato JSON estricto para un video ${isCinematic ? 'CINEMATOGRÁFICO DE ALTA GAMA' : 'SIMPLE Y DINÁMICO'} basado en: "${prompt}".
Estilo visual: ${style}. Duración total: ${duration} segundos. Relación de aspecto: ${aspectRatio}.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown exterior) con la siguiente estructura:
{
  "title": "Título épico del video",
  "synopsis": "Breve sinopsis cinematográfica",
  "style": "${style}",
  "aspectRatio": "${aspectRatio}",
  "totalDuration": ${duration},
  "soundtrack": {
    "mood": "epic | synthwave | atmospheric | dramatic | ambient",
    "bpm": 90,
    "baseFreq": 110,
    "hasSubBass": true
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 3,
      "title": "Nombre de la escena",
      "subtitle": "Texto o diálogo cinematográfico",
      "cameraMove": "drone_flythrough | dolly_zoom | pan_left_to_right | orbit_360 | static_epic",
      "lightingColor": "#00f0ff",
      "secondaryColor": "#ff007f",
      "backgroundColor": "#070913",
      "particles": "dust | neon_sparks | stars | grid | digital_rain",
      "elementName": "Sujeto central de la toma",
      "visualDescription": "Descripción de la toma"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptInstruction,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    let data;
    try {
      data = JSON.parse(response.text || '{}');
    } catch {
      // Fallback in case formatting had backticks
      const cleaned = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Error en /api/video-storyboard:', error);
    // Return a rich default fallback storyboard so the video generator never breaks
    return res.json({
      title: 'OPTIMUS Visual Experience',
      synopsis: 'Una producción audiovisual generada por OPTIMUS IA.',
      style: req.body.style || 'Cinemático',
      aspectRatio: req.body.aspectRatio || '16:9',
      totalDuration: 6,
      soundtrack: {
        mood: 'epic',
        bpm: 100,
        baseFreq: 120,
        hasSubBass: true,
      },
      scenes: [
        {
          sceneNumber: 1,
          duration: 3,
          title: 'Génesis Digital',
          subtitle: req.body.prompt || 'El futuro de la inteligencia artificial',
          cameraMove: 'dolly_zoom',
          lightingColor: '#3b82f6',
          secondaryColor: '#8b5cf6',
          backgroundColor: '#050814',
          particles: 'neon_sparks',
          elementName: 'Núcleo Neural',
          visualDescription: 'Partículas flotantes convergiendo en un horizonte infinito',
        },
        {
          sceneNumber: 2,
          duration: 3,
          title: 'Expansión Cuántica',
          subtitle: 'OPTIMUS IA: Creatividad sin límites',
          cameraMove: 'drone_flythrough',
          lightingColor: '#06b6d4',
          secondaryColor: '#ec4899',
          backgroundColor: '#090d1f',
          particles: 'dust',
          elementName: 'Horizonte Digital',
          visualDescription: 'Cámara barriendo a través de una red lumínica',
        },
      ],
    });
  }
});

// 3. Image Generation / Vector Graphic Generator endpoint
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, style = 'digital_art' } = req.body;
    const promptLower = prompt.toLowerCase();
    
    const isSvgRequested = promptLower.includes('svg') || promptLower.includes('vector') || promptLower.includes('logo') || promptLower.includes('icono');

    if (!isSvgRequested) {
      // Optimize prompt for Pollinations
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Translate and optimize this image prompt for a text-to-image generator. Output ONLY the English prompt, no extra text: "${prompt}"`,
      });
      const optimizedPrompt = response.text?.trim() || prompt;
      
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(optimizedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

      return res.json({
        type: 'raster',
        url: imageUrl,
        prompt: optimizedPrompt,
        style,
      });
    }

    // Generate SVG
    const systemPrompt = `Eres el ilustrador y director gráfico vectorial de OPTIMUS IA.
Crea una ilustración SVG moderna, de altísima calidad visual, profesional y limpia basada en el prompt: "${prompt}".
Estilo: ${style}.
IMPORTANTE:
- Responde ÚNICAMENTE con código SVG válido dentro de un tag <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">...</svg>.
- Usa degradados lineales y radiales (<linearGradient>, <radialGradient>), sombras (<filter>), capas bien estructuradas, colores vivos y modernos estilo Dark Cyber / Sci-Fi / Modern Tech.
- No incluyas explicaciones previas ni posteriores, solo el código SVG directo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    let svgText = response.text || '';
    if (svgText.includes('<svg')) {
      const match = svgText.match(/<svg[\s\S]*<\/svg>/i);
      if (match) {
        svgText = match[0];
      }
    }

    return res.json({
      type: 'vector',
      svg: svgText,
      prompt,
      style,
    });
  } catch (error: any) {
    console.error('Error en /api/generate-image:', error);
    return res.status(500).json({ error: error.message || 'Error al generar la imagen.' });
  }
});

// Comfy Cloud API (Generación Real de Video con LTX-Video)
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });
    
    const comfyToken = "comfyui-6633b0db00fd7aca386f45ce62fabb7212f9f81e66fc3e58f7e99495cd0c2407";

    const workflow = {
      "326": { "inputs": { "filename_prefix": "video/ComfyUI", "format": "mp4", "format.codec": "auto", "codec": "auto", "video": [ "325:312", 0 ] }, "class_type": "SaveVideo" },
      "325:278": { "inputs": { "noise_seed": Math.floor(Math.random() * 1000000) }, "class_type": "RandomNoise" },
      "325:279": { "inputs": { "noise_seed": Math.floor(Math.random() * 1000000) }, "class_type": "RandomNoise" },
      "325:280": { "inputs": { "video_latent": [ "325:290", 0 ], "audio_latent": [ "325:309", 1 ] }, "class_type": "LTXVConcatAVLatent" },
      "325:281": { "inputs": { "ckpt_name": "ltx-2.3-22b-dev-fp8.safetensors" }, "class_type": "LTXVAudioVAELoader" },
      "325:282": { "inputs": { "sampler_name": "euler_cfg_pp" }, "class_type": "KSamplerSelect" },
      "325:283": { "inputs": { "sigmas": "0.85, 0.7250, 0.4219, 0.0" }, "class_type": "ManualSigmas" },
      "325:284": { "inputs": { "cfg": 1, "model": [ "325:287", 0 ], "positive": [ "325:286", 0 ], "negative": [ "325:286", 1 ] }, "class_type": "CFGGuider" },
      "325:285": { "inputs": { "noise": [ "325:279", 0 ], "guider": [ "325:316", 0 ], "sampler": [ "325:293", 0 ], "sigmas": [ "325:308", 0 ], "latent_image": [ "325:321", 0 ] }, "class_type": "SamplerCustomAdvanced" },
      "325:286": { "inputs": { "positive": [ "325:306", 0 ], "negative": [ "325:306", 1 ], "latent": [ "325:309", 0 ] }, "class_type": "LTXVCropGuides" },
      "325:287": { "inputs": { "lora_name": "ltx-2.3-22b-distilled-lora-384.safetensors", "strength_model": 0.5, "model": [ "325:318", 0 ] }, "class_type": "LoraLoaderModelOnly" },
      "325:288": { "inputs": { "longer_edge": 1536, "images": [ "325:292", 0 ] }, "class_type": "ResizeImagesByLongerEdge" },
      "325:289": { "inputs": { "samples": [ "325:309", 0 ], "upscale_model": [ "325:313", 0 ], "vae": [ "325:318", 2 ] }, "class_type": "LTXVLatentUpsampler" },
      "325:290": { "inputs": { "strength": 1, "bypass": [ "325:304", 0 ], "vae": [ "325:318", 2 ], "image": [ "325:291", 0 ], "latent": [ "325:289", 0 ] }, "class_type": "LTXVImgToVideoInplace" },
      "325:291": { "inputs": { "img_compression": 18, "image": [ "325:288", 0 ] }, "class_type": "LTXVPreprocess" },
      "325:292": { "inputs": { "resize_type": "scale dimensions", "resize_type.width": [ "325:314", 0 ], "resize_type.height": [ "325:301", 0 ], "resize_type.crop": "center", "scale_method": "lanczos", "input": [ "325:322", 0 ] }, "class_type": "ResizeImageMaskNode" },
      "325:293": { "inputs": { "sampler_name": "euler_ancestral_cfg_pp" }, "class_type": "KSamplerSelect" },
      "325:294": { "inputs": { "expression": "a/2", "values.a": [ "325:314", 0 ] }, "class_type": "ComfyMathExpression" },
      "325:296": { "inputs": { "expression": "a/2", "values.a": [ "325:301", 0 ] }, "class_type": "ComfyMathExpression" },
      "325:297": { "inputs": { "width": [ "325:294", 1 ], "height": [ "325:296", 1 ], "length": [ "325:323", 1 ], "batch_size": 1 }, "class_type": "EmptyLTXVLatentVideo" },
      "325:298": { "inputs": { "strength": 0.7, "bypass": [ "325:304", 0 ], "vae": [ "325:318", 2 ], "image": [ "325:291", 0 ], "latent": [ "325:297", 0 ] }, "class_type": "LTXVImgToVideoInplace" },
      "325:299": { "inputs": { "samples": [ "325:311", 1 ], "audio_vae": [ "325:281", 0 ] }, "class_type": "LTXVAudioVAEDecode" },
      "325:300": { "inputs": { "expression": "a", "values.a": [ "325:302", 0 ] }, "class_type": "ComfyMathExpression" },
      "325:301": { "inputs": { "value": 720 }, "class_type": "PrimitiveInt" },
      "325:302": { "inputs": { "value": 25 }, "class_type": "PrimitiveInt" },
      "325:303": { "inputs": { "value": 5 }, "class_type": "PrimitiveInt" },
      "325:304": { "inputs": { "value": true }, "class_type": "PrimitiveBoolean" },
      "325:305": { "inputs": { "text": [ "325:320", 0 ], "clip": [ "325:319", 0 ] }, "class_type": "CLIPTextEncode" },
      "325:306": { "inputs": { "frame_rate": [ "325:300", 0 ], "positive": [ "325:305", 0 ], "negative": [ "325:315", 0 ] }, "class_type": "LTXVConditioning" },
      "325:307": { "inputs": { "frames_number": [ "325:323", 1 ], "frame_rate": [ "325:300", 1 ], "batch_size": 1, "audio_vae": [ "325:281", 0 ] }, "class_type": "LTXVEmptyLatentAudio" },
      "325:308": { "inputs": { "sigmas": "1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0" }, "class_type": "ManualSigmas" },
      "325:309": { "inputs": { "av_latent": [ "325:285", 0 ] }, "class_type": "LTXVSeparateAVLatent" },
      "325:310": { "inputs": { "noise": [ "325:278", 0 ], "guider": [ "325:284", 0 ], "sampler": [ "325:282", 0 ], "sigmas": [ "325:283", 0 ], "latent_image": [ "325:280", 0 ] }, "class_type": "SamplerCustomAdvanced" },
      "325:311": { "inputs": { "av_latent": [ "325:310", 0 ] }, "class_type": "LTXVSeparateAVLatent" },
      "325:312": { "inputs": { "fps": [ "325:300", 0 ], "bit_depth": "auto", "color_space": "sRGB", "codec": "none", "images": [ "325:317", 0 ], "audio": [ "325:299", 0 ] }, "class_type": "CreateVideo" },
      "325:313": { "inputs": { "model_name": "ltx-2.3-spatial-upscaler-x2-1.1.safetensors" }, "class_type": "LatentUpscaleModelLoader" },
      "325:314": { "inputs": { "value": 1280 }, "class_type": "PrimitiveInt" },
      "325:315": { "inputs": { "text": "bad quality, blurry, artifacts", "clip": [ "325:319", 0 ] }, "class_type": "CLIPTextEncode" },
      "325:316": { "inputs": { "cfg": 1, "model": [ "325:287", 0 ], "positive": [ "325:306", 0 ], "negative": [ "325:306", 1 ] }, "class_type": "CFGGuider" },
      "325:317": { "inputs": { "tile_size": 768, "overlap": 64, "temporal_size": 4096, "temporal_overlap": 4, "samples": [ "325:311", 0 ], "vae": [ "325:318", 2 ] }, "class_type": "VAEDecodeTiled" },
      "325:318": { "inputs": { "ckpt_name": "ltx-2.3-22b-dev-fp8.safetensors" }, "class_type": "CheckpointLoaderSimple" },
      "325:319": { "inputs": { "text_encoder": "gemma_3_12B_it_fp4_mixed.safetensors", "ckpt_name": "ltx-2.3-22b-dev-fp8.safetensors", "device": "default" }, "class_type": "LTXAVTextEncoderLoader" },
      "325:320": { "inputs": { "value": prompt }, "class_type": "PrimitiveStringMultiline" },
      "325:321": { "inputs": { "video_latent": [ "325:298", 0 ], "audio_latent": [ "325:307", 0 ] }, "class_type": "LTXVConcatAVLatent" },
      "325:322": { "inputs": { "image": "example.png" }, "class_type": "LoadImage" },
      "325:323": { "inputs": { "expression": "a * b + 1", "values.a": [ "325:303", 0 ], "values.b": [ "325:302", 0 ] }, "class_type": "ComfyMathExpression" }
    };

    const response = await fetch("https://cloud.comfy.org/api/v2/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${comfyToken}`
      },
      body: JSON.stringify({ workflow })
    });

    if (!response.ok) {
      const err = await response.json().catch(()=>({}));
      return res.status(response.status).json({ error: err.message || 'Error conectando a Comfy Cloud' });
    }

    const data = await response.json();
    return res.json({ project: data.id });
  } catch (error: any) {
    console.error('Error iniciando Comfy:', error);
    return res.status(500).json({ error: error.message || 'Error en Comfy' });
  }
});

// Polling status para Comfy Cloud
app.get('/api/generate-video/status', async (req: Request, res: Response) => {
  try {
    const { project } = req.query;
    if (!project || typeof project !== 'string') return res.status(400).json({ error: 'Falta el project ID' });
    
    const comfyToken = "comfyui-6633b0db00fd7aca386f45ce62fabb7212f9f81e66fc3e58f7e99495cd0c2407";

    const response = await fetch(`https://cloud.comfy.org/api/v2/jobs/${project}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${comfyToken}` }
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Error consultando estado del video' });
    }

    const job = await response.json();

    if (job.status === 'success' || job.status === 'completed') {
      let finalVideoUrl = "";
      if (job.outputs) {
        for (const nodeId in job.outputs) {
          const out = job.outputs[nodeId];
          if (out.videos && out.videos.length > 0) {
            finalVideoUrl = out.videos[0].url;
            break;
          }
        }
      }

      if (finalVideoUrl) {
        return res.json({ status: 'succeeded', videoUrl: finalVideoUrl });
      } else {
         return res.json({ status: 'failed', error: 'No se encontró URL de video en Comfy Cloud.' });
      }
    } else if (job.status === 'failed' || job.status === 'error') {
      return res.json({ status: 'failed', error: job.error || 'Error en renderizado' });
    }

    return res.json({ status: 'processing' });
  } catch (error: any) {
    console.error('Error en status Comfy:', error);
    return res.status(500).json({ error: error.message || 'Error en Status' });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'OPTIMUS IA',
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Vite middleware in dev / static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OPTIMUS IA] Servidor escuchando en http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
