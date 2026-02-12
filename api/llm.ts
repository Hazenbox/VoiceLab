import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors.js';
import { handleRateLimit } from './_rateLimit.js';
import { handleApiAuth } from './_auth.js';
import { validateLLMRequest, sendValidationError } from './_validation.js';
import { fetchWithTimeout } from './_timeout.js';

const DASHSCOPE_LLM_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

/**
 * Handle streaming response from DashScope using SSE (Server-Sent Events)
 * DashScope uses incremental_output mode for streaming
 */
async function handleStreamingResponse(
  requestData: Record<string, unknown>,
  apiKey: string,
  res: VercelResponse
): Promise<void> {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
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
      incremental_output: true, // Enable streaming mode for DashScope
    },
  };
  
  try {
    const response = await fetch(DASHSCOPE_LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'enable', // Enable SSE for DashScope
      },
      body: JSON.stringify(dashscopeRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      res.write(`data: ${JSON.stringify({ error: errorText })}\n\n`);
      res.end();
      return;
    }
    
    if (!response.body) {
      res.write(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
      res.end();
      return;
    }
    
    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Send done event
          res.write('data: [DONE]\n\n');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          // DashScope SSE format: "data: {...json...}"
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }
            
            try {
              const chunk = JSON.parse(jsonStr);
              // Convert DashScope format to OpenAI-compatible format for client
              const content = chunk?.output?.choices?.[0]?.message?.content || '';
              const finishReason = chunk?.output?.choices?.[0]?.finish_reason;
              
              const sseData = {
                choices: [{
                  delta: { content },
                  finish_reason: finishReason || null,
                }],
              };
              res.write(`data: ${JSON.stringify(sseData)}\n\n`);
            } catch {
              // If not valid JSON, forward as-is
              res.write(`data: ${jsonStr}\n\n`);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Streaming error';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  }
  
  res.end();
}

/**
 * Handle non-streaming response (original behavior)
 */
async function handleNonStreamingResponse(
  requestData: Record<string, unknown>,
  apiKey: string,
  res: VercelResponse
): Promise<void> {
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
  
  const response = await fetchWithTimeout(DASHSCOPE_LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(dashscopeRequest),
    timeoutMs: 30000, // 30 second timeout for LLM requests
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    res.status(response.status).json({ error: errorText });
    return;
  }
  
  const data = await response.json();
  res.status(200).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
  // Verify API key authentication
  if (!handleApiAuth(req, res)) return;
  
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
    
    // Check if streaming is requested
    const wantsStream = requestData.stream === true;
    
    if (wantsStream) {
      await handleStreamingResponse(requestData, apiKey, res);
    } else {
      await handleNonStreamingResponse(requestData, apiKey, res);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
