import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_cors';
import { validateInworldRequest, sendValidationError } from '../_validation';

const INWORLD_API_BASE = 'https://api.inworld.ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
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
    // Validate request body
    const validation = validateInworldRequest(req.body);
    if (!validation.valid) {
      return sendValidationError(res, validation.errors);
    }
    
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
