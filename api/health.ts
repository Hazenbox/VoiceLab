import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_cors.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Health endpoint returns configured provider status
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    providers: {
      dashscope: Boolean(process.env.DASHSCOPE_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      claude: Boolean(process.env.CLAUDE_API_KEY),
      huggingface: Boolean(process.env.HUGGINGFACE_API_KEY),
      inworld: Boolean(process.env.INWORLD_API_KEY),
    },
  });
}
