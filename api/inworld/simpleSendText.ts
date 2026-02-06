import type { VercelRequest, VercelResponse } from '@vercel/node';

const INWORLD_API_BASE = 'https://api.inworld.ai';

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
  
  const apiKey = process.env.INWORLD_API_KEY;
  const character = process.env.INWORLD_CHARACTER;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Inworld API key not configured' });
  }
  
  if (!character) {
    return res.status(500).json({ error: 'Inworld character not configured' });
  }
  
  try {
    const { text, endUserFullname, endUserId } = req.body;
    
    const endpoint = `${INWORLD_API_BASE}/v1/${character}:simpleSendText`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        endUserFullname: endUserFullname || 'User',
        endUserId: endUserId || 'default-user',
      }),
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
