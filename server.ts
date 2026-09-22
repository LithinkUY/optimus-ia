import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

startServer();
