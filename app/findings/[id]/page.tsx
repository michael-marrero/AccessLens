import { notFound } from "next/navigation";
import { requirePageAuth } from "@/lib/auth/page-session";
import { getFindingWorkspaceDetail, listTenantAssignableProfiles } from "@/lib/findings/queries";
import { findingIdParamSchema } from "@/lib/findings/validation";
import { log } from "@/lib/logging";
import { FindingDetailWorkspace } from "@/components/findings/finding-detail-workspace";

export const dynamic = "force-dynamic";

export default async function FindingDetailPage({ params }: { params: { id: string } }) {
  const requestId = crypto.randomUUID();
  const route = "/findings/[id]";

  const idParsed = findingIdParamSchema.safeParse({ id: params.id });
  if (!idParsed.success) {
    notFound();
  }

  const findingId = idParsed.data.id;
  const auth = await requirePageAuth(["admin", "analyst"]);

  try {
    const [detail, assignees] = await Promise.all([
      getFindingWorkspaceDetail(auth.tenantId, findingId),
      listTenantAssignableProfiles(auth.tenantId)
    ]);

    if (!detail) {
      notFound();
    }

    return (
      <FindingDetailWorkspace
        initialDetail={detail}
        assignees={assignees}
        currentUser={{
          id: auth.userId,
          fullName: auth.fullName,
          role: auth.role
        }}
      />
    );
  } catch (error) {
    log("error", {
      route,
      request_id: requestId,
      user_id: auth.userId,
      tenant_id: auth.tenantId,
      finding_id: findingId,
      message: error instanceof Error ? error.message : "unknown finding detail error"
    });

    throw error;
  }
}
