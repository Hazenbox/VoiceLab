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

/**
 * Post-process LLM output to ensure brand compliance
 * Applies deterministic fixes that the LLM might miss
 */
function postProcess(content: string): string {
  let result = content;

  // Fix currency format: Rs., Rs, INR -> ₹
  result = result.replace(/Rs\.?\s?(\d)/gi, "₹$1");
  result = result.replace(/INR\s?(\d)/gi, "₹$1");
  result = result.replace(/Rupees?\s?(\d)/gi, "₹$1");

  // Remove exclamation marks (Jio brand guideline)
  result = result.replace(/!/g, ".");

  // Fix double periods that might result from exclamation replacement
  result = result.replace(/\.{2,}/g, ".");

  // Fix brand names to correct format (one word, proper case)
  result = result.replace(/Jio\s+Fiber/gi, "JioFiber");
  result = result.replace(/Jio\s+Mart/gi, "JioMart");
  result = result.replace(/Jio\s+Cinema/gi, "JioCinema");
  result = result.replace(/Jio\s+TV/gi, "JioTV");
  result = result.replace(/My\s+Jio/gi, "MyJio");
  result = result.replace(/Jio\s+Air\s+Fiber/gi, "JioAirFiber");
  result = result.replace(/Jio\s+Saavn/gi, "JioSaavn");
  result = result.replace(/Jio\s+Pay/gi, "JioPay");
  result = result.replace(/Jio\s+Meet/gi, "JioMeet");
  result = result.replace(/Jio\s+Cloud/gi, "JioCloud");

  // Fix "pack" to "plan" (Jio terminology)
  result = result.replace(/\bpack\b/gi, "plan");
  result = result.replace(/\bpacks\b/gi, "plans");

  // Fix American spellings to British (Jio uses British English)
  result = result.replace(/\bcolor\b/gi, "colour");
  result = result.replace(/\bcolors\b/gi, "colours");
  result = result.replace(/\bfavor\b/gi, "favour");
  result = result.replace(/\bfavorite\b/gi, "favourite");
  result = result.replace(/\bfavorites\b/gi, "favourites");
  result = result.replace(/\borganize\b/gi, "organise");
  result = result.replace(/\borganized\b/gi, "organised");
  result = result.replace(/\borganization\b/gi, "organisation");
  result = result.replace(/\bcenter\b/gi, "centre");
  result = result.replace(/\bcenters\b/gi, "centres");
  result = result.replace(/\bprogram\b(?!ming)/gi, "programme");
  result = result.replace(/\bprograms\b/gi, "programmes");

  // Remove common corporate filler that LLM might still include
  const fillerPhrases = [
    /\bwe value your patience\b/gi,
    /\bplease be advised\b/gi,
    /\bas per our policy\b/gi,
    /\bin due course\b/gi,
    /\bkindly note that\b/gi,
    /\bkindly note\b/gi,
    /\bfor your reference\b/gi,
    /\byour call is important to us\b/gi,
    /\bwe are experiencing high volumes\b/gi,
    /\bthanking you\b/gi,
    /\bhoping for your cooperation\b/gi,
  ];

  for (const phrase of fillerPhrases) {
    result = result.replace(phrase, "");
  }

  // Clean up any double spaces created by removals
  result = result.replace(/\s{2,}/g, " ");

  // Clean up any space before period
  result = result.replace(/\s+\./g, ".");

  // Trim whitespace
  result = result.trim();

  return result;
}

export const rephrase = action({
  args: {
    text: v.string(),
    style: v.optional(v.string()),
    prompt: v.optional(v.string()),
    channel: v.optional(v.string()),
    ecosystem: v.optional(v.string()),
  },
  handler: async (ctx, { text, style, prompt, channel, ecosystem }) => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY not configured");
    }

    // Build comprehensive Jio voice system prompt with all detections
    const systemPrompt = buildJioVoicePrompt({
      userText: text,
      customPrompt: prompt,
      channel: channel || "general",
      ecosystem: ecosystem,
    });

    // Detect if this is an email request for max_tokens adjustment
    const isEmailRequest =
      text.toLowerCase().includes("email") ||
      text.toLowerCase().includes("mail") ||
      (prompt && prompt.toLowerCase().includes("email"));

    // Use larger model (72B) for ALL requests for better brand compliance
    // Previously we only used 72B for emails, but consistent voice requires it everywhere
    const modelName = "Qwen/Qwen2.5-72B-Instruct";

    // Lower temperature (0.5) for more consistent brand compliance
    // Higher temperatures lead to creative deviations from guidelines
    const temperature = 0.5;

    // Adjust max_tokens based on content type
    const maxTokens = isEmailRequest ? 2000 : 1500;

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
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          max_tokens: maxTokens,
          temperature: temperature,
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
    const rawResult = data.choices?.[0]?.message?.content?.trim();

    if (!rawResult) {
      return text;
    }

    // Apply post-processing for brand compliance fixes
    const result = postProcess(rawResult);

    return result;
  },
});
