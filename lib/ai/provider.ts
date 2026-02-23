import type { AiExplanation, AiPromptInput } from "@/lib/ai/schema";

export interface AiExplanationProvider {
  generateExplanation(input: AiPromptInput): Promise<AiExplanation>;
}
