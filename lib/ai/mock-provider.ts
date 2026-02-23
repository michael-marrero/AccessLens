import type { AiExplanationProvider } from "@/lib/ai/provider";
import { aiExplanationSchema, type AiPromptInput } from "@/lib/ai/schema";
import { defaultRecommendationForFindingType } from "@/lib/risk/recommendations";

export class MockAiExplanationProvider implements AiExplanationProvider {
  async generateExplanation(input: AiPromptInput) {
    const recommendation = defaultRecommendationForFindingType(input.findingType);

    return aiExplanationSchema.parse({
      explanation: `Mock analysis: ${input.identityName} triggered ${input.findingType} with severity ${input.severity}. Evidence indicates a score of ${input.score}. Review the evidence and confirm policy intent before closing.`,
      recommendation,
      confidence: 0.61,
      rationale: [
        "Pattern matches a predefined AccessLens risk rule.",
        "Evidence fields include risk-relevant identity and event signals.",
        "Recommendation follows the default policy mapping for this finding type."
      ]
    });
  }
}
