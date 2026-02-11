import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors.js';
import { handleRateLimit } from './_rateLimit.js';
import { validateLLMRequest, sendValidationError } from './_validation.js';

const DASHSCOPE_LLM_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
  // Apply rate limiting (20 requests/minute for LLM)
  if (!handleRateLimit(req, res, 'llm')) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const apiKey = process.env.DASHSCOPE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'DashScope API key not configured' });
  }
  
  try {
    const requestData = req.body;
    
    // Validate request body
    const validation = validateLLMRequest(requestData);
    if (!validation.valid) {
      return sendValidationError(res, validation.errors);
    }
    
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
