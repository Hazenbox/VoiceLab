import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors';
import { validateLLMRequest, sendValidationError } from './_validation';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const apiKey = process.env.CLAUDE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Claude API key not configured' });
  }
  
  try {
    // Validate request body
    const validation = validateLLMRequest(req.body);
    if (!validation.valid) {
      return sendValidationError(res, validation.errors);
    }
    
    const { stream, ...requestData } = req.body;
    
    // Handle streaming responses
    if (stream) {
      return handleStreamingResponse(apiKey, requestData, res);
    }
    
    const response = await fetch(CLAUDE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

async function handleStreamingResponse(
  apiKey: string,
  requestData: Record<string, unknown>,
  res: VercelResponse
) {
  const response = await fetch(CLAUDE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...requestData, stream: true }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: errorText });
  }
  
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
}
