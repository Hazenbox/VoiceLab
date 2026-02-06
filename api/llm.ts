import type { VercelRequest, VercelResponse } from '@vercel/node';

const DASHSCOPE_LLM_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

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
  
  const apiKey = process.env.DASHSCOPE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'DashScope API key not configured' });
  }
  
  try {
    const requestData = req.body;
    
    // Convert to DashScope format
    const dashscopeRequest = {
      model: requestData.model || 'qwen-turbo',
      input: {
        messages: requestData.messages,
      },
      parameters: {
        temperature: requestData.temperature ?? 0.7,
        max_tokens: requestData.max_tokens || 1000,
        top_p: requestData.top_p ?? 0.9,
        result_format: 'message',
      },
    };
    
    const response = await fetch(DASHSCOPE_LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(dashscopeRequest),
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
