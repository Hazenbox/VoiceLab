import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors';
import { handleRateLimit } from './_rateLimit';
import { validateTTSRequest, sendValidationError } from './_validation';

const DASHSCOPE_TTS_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2audio/generation';
const ELEVENLABS_TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
  // Apply rate limiting (30 requests/minute for TTS)
  if (!handleRateLimit(req, res, 'tts')) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Validate request body
    const validation = validateTTSRequest(req.body);
    if (!validation.valid) {
      return sendValidationError(res, validation.errors);
    }
    
    const { provider, ...body } = req.body;
    
    if (provider === 'elevenlabs') {
      return handleElevenLabsTTS(body, res);
    } else {
      return handleDashScopeTTS(body, res);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

async function handleElevenLabsTTS(body: Record<string, unknown>, res: VercelResponse) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }
  
  const { voiceId, text, modelId, voiceSettings } = body;
  const url = `${ELEVENLABS_TTS_ENDPOINT}/${voiceId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId || 'eleven_multilingual_v2',
      voice_settings: voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: errorText });
  }
  
  const audioBuffer = await response.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  return res.send(Buffer.from(audioBuffer));
}

async function handleDashScopeTTS(body: Record<string, unknown>, res: VercelResponse) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'DashScope API key not configured' });
  }
  
  const response = await fetch(DASHSCOPE_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: errorText });
  }
  
  const data = await response.json();
  return res.status(200).json(data);
}
