import type { AiExplanationProvider } from "@/lib/ai/provider";
import { getServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/errors";
import { aiExplanationSchema, type AiPromptInput } from "@/lib/ai/schema";

export class OpenAiExplanationProvider implements AiExplanationProvider {
  async generateExplanation(input: AiPromptInput) {
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) {
      throw new ApiError(500, "AI provider is not configured", "missing OPENAI_API_KEY");
    }

    const prompt = [
      "You are a senior identity security analyst.",
      "Return JSON only with keys: explanation, recommendation, confidence, rationale.",
      "Recommendation must be one of approve|revoke|investigate.",
      `Finding Type: ${input.findingType}`,
      `Severity: ${input.severity}`,
      `Score: ${input.score}`,
      `Identity: ${input.identityName}`,
      `Application: ${input.applicationName ?? "N/A"}`,
      `Evidence: ${JSON.stringify(input.evidence)}`
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "accesslens_explanation",
            schema: {
              type: "object",
              properties: {
                explanation: { type: "string" },
                recommendation: { type: "string", enum: ["approve", "revoke", "investigate"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                rationale: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 5
                }
              },
              required: ["explanation", "recommendation", "confidence", "rationale"],
              additionalProperties: false
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new ApiError(502, "AI provider request failed", `openai status ${response.status}`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
    };

    if (!payload.output_text) {
      throw new ApiError(502, "AI provider returned an empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.output_text);
    } catch (error) {
      throw new ApiError(502, "AI provider returned invalid JSON", error instanceof Error ? error.message : "unknown");
    }

    return aiExplanationSchema.parse(parsed);
  }
}
