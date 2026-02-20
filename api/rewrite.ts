import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors.js';
import { handleRateLimit } from './_rateLimit.js';
import { handleApiAuth } from './_auth.js';
import { validateString, sendValidationError } from './_validation.js';
import { fetchWithTimeout } from './_timeout.js';

const DASHSCOPE_LLM_ENDPOINT =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

const SYSTEM_PROMPT = `You are a professional text editor. Rephrase the given text to be clearer, more concise, and natural-sounding while preserving the original meaning and tone. Return ONLY the rephrased text. No explanations, no quotes, no prefixes like "Here's the rephrased version:".`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (!handleApiAuth(req, res)) return;
  if (!handleRateLimit(req, res, 'rewrite')) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const textError = validateString(req.body?.text, 'text', {
    minLength: 1,
    maxLength: 50000,
  });
  if (textError) return sendValidationError(res, [textError]);

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'LLM API key not configured' });
  }

  try {
    const response = await fetchWithTimeout(DASHSCOPE_LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: req.body.text },
          ],
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 2000,
          result_format: 'message',
        },
      }),
      timeoutMs: 15000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res
        .status(502)
        .json({ error: 'LLM request failed', details: errorText });
    }

    const data = await response.json();
    const rewritten =
      data?.output?.choices?.[0]?.message?.content ||
      data?.output?.text ||
      '';

    if (!rewritten) {
      return res.status(502).json({ error: 'Empty response from LLM' });
    }

    return res.status(200).json({ rewritten });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
