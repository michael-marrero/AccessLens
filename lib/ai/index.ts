import type { AiExplanationProvider } from "@/lib/ai/provider";
import { getServerEnv } from "@/lib/env";
import { MockAiExplanationProvider } from "@/lib/ai/mock-provider";
import { OpenAiExplanationProvider } from "@/lib/ai/openai-provider";

export function getAiExplanationProvider(): AiExplanationProvider {
  const env = getServerEnv();

  if (env.AI_PROVIDER === "openai") {
    return new OpenAiExplanationProvider();
  }

  return new MockAiExplanationProvider();
}
