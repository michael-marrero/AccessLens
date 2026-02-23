import { buildPostFindingActionHandler, createFindingActionDeps } from "@/lib/findings/action-route-handler";

export const POST = buildPostFindingActionHandler(createFindingActionDeps);
