/**
 * Text Rewriting Action for Mac ToneStudio
 * 
 * Uses HuggingFace Router (OpenAI-compatible API) to rephrase text.
 * Supports both predefined styles and custom prompts.
 * 
 * @module convex/rewrite
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

export const rephrase = action({
  args: {
    text: v.string(),
    style: v.optional(v.string()),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, { text, style, prompt }) => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY not configured");
    }

    let systemPrompt: string;
    
    if (prompt && prompt.trim().length > 0) {
      systemPrompt = `You are a text transformation assistant. Transform the user's text according to these instructions: "${prompt}". Return ONLY the transformed text with no explanations, no quotes, no prefixes.`;
    } else {
      const toneStyle = style || "professional";
      systemPrompt = `You are a text rephrasing assistant. Rephrase the user's text in a ${toneStyle} tone. Return ONLY the rephrased text with no explanations, no quotes, no prefixes.`;
    }

    // Using HuggingFace Router with OpenAI-compatible API
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-7B-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[rewrite] HuggingFace Router error:", response.status, errorText);
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    
    if (!result) {
      return text;
    }

    return result;
  },
});
