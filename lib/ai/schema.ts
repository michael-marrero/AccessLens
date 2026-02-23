import { z } from "zod";

export const aiExplanationSchema = z.object({
  explanation: z.string().min(20).max(4000),
  recommendation: z.enum(["approve", "revoke", "investigate"]),
  confidence: z.number().min(0).max(1),
  rationale: z.array(z.string().min(3)).min(1).max(5)
});

export type AiExplanation = z.infer<typeof aiExplanationSchema>;

export const aiPromptInputSchema = z.object({
  findingType: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  score: z.number(),
  identityName: z.string(),
  applicationName: z.string().nullable(),
  evidence: z.record(z.unknown())
});

export type AiPromptInput = z.infer<typeof aiPromptInputSchema>;
