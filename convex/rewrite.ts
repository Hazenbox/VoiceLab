/**
 * Text Rewriting Action for Mac ToneStudio
 *
 * Transforms user content into Jio's signature voice using the comprehensive
 * Jio Voice Prompt system. Applies all brand guardrails, vocabulary rules,
 * style guidelines, and hard limits.
 *
 * Uses HuggingFace Router (OpenAI-compatible API) for LLM inference.
 *
 * @module convex/rewrite
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { buildJioVoicePrompt } from "./jioVoicePrompt";

export const rephrase = action({
  args: {
    text: v.string(),
    style: v.optional(v.string()),
    prompt: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, { text, style, prompt, channel }) => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY not configured");
    }

    // Build comprehensive Jio voice system prompt
    const systemPrompt = buildJioVoicePrompt({
      userText: text,
      customPrompt: prompt,
      channel: channel || "general",
    });

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
      console.error(
        "[rewrite] HuggingFace Router error:",
        response.status,
        errorText
      );
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
