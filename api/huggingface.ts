import type { VercelRequest, VercelResponse } from '@vercel/node';

const HUGGINGFACE_API_BASE = 'https://router.huggingface.co';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'HuggingFace API key not configured' });
  }
  
  try {
    const { model, stream, ...requestData } = req.body;
    
    // Determine the endpoint based on model
    const endpoint = `${HUGGINGFACE_API_BASE}/models/${model}/v1/chat/completions`;
    
    if (stream) {
      return handleStreamingResponse(apiKey, endpoint, { ...requestData, stream: true }, res);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
  endpoint: string,
  requestData: Record<string, unknown>,
  res: VercelResponse
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestData),
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
