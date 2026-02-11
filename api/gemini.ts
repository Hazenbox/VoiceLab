import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors';
import { handleRateLimit } from './_rateLimit';
import { validateArray, sendValidationError } from './_validation';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
  // Apply rate limiting (20 requests/minute for LLM)
  if (!handleRateLimit(req, res, 'llm')) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }
  
  try {
    // Basic validation for Gemini requests
    const contentsError = validateArray(req.body.contents, 'contents', { minLength: 1, maxLength: 100 });
    if (contentsError) {
      return sendValidationError(res, [contentsError]);
    }
    
    const { model, stream, action, ...requestData } = req.body;
    const modelName = model || 'gemini-2.0-flash';
    
    // Handle different actions
    if (action === 'generateContent') {
      return handleGenerateContent(apiKey, modelName, requestData, stream, res);
    } else if (action === 'streamGenerateContent') {
      return handleStreamGenerateContent(apiKey, modelName, requestData, res);
    }
    
    // Default to generateContent
    return handleGenerateContent(apiKey, modelName, requestData, stream, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

async function handleGenerateContent(
  apiKey: string,
  model: string,
  requestData: Record<string, unknown>,
  stream: boolean,
  res: VercelResponse
) {
  const endpoint = stream 
    ? `${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: errorText });
  }
  
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'Failed to get response reader' });
    }
    
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } else {
    const data = await response.json();
    return res.status(200).json(data);
  }
}

async function handleStreamGenerateContent(
  apiKey: string,
  model: string,
  requestData: Record<string, unknown>,
  res: VercelResponse
) {
  return handleGenerateContent(apiKey, model, requestData, true, res);
}
