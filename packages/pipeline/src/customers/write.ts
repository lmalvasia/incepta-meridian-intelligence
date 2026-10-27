import { utcDate } from "../utils/dates.js";
import { CHUNK, chunks } from "../utils/batch.js";
import { createIssues } from "../import/issues.js";
import type { Tx } from "../import/types.js";
import type { CustomerDraft, LinkDecision } from "./types.js";

export function customerIdFor(link: LinkDecision, customerIds: ReadonlyMap<string, string>): string | null {
  if (link.status !== "linked" || link.customerSourceId === null) {
    return null;
  }
  const customerId = customerIds.get(link.customerSourceId);
  if (customerId === undefined) {
    throw new Error(`No customer row for ${link.customerSourceId}.`);
  }
  return customerId;
}

export async function writeCustomers(tx: Tx, drafts: readonly CustomerDraft[]): Promise<Map<string, string>> {
  if (drafts.length === 0) {
    return new Map();
  }

  const sourceIds = drafts.map((draft) => draft.sourceId);
  const existing = await tx.customer.findMany({ where: { sourceId: { in: sourceIds } } });
  const bySource = new Map(existing.map((row) => [row.sourceId, row]));
  const toCreate = [];

  for (const draft of drafts) {
    const data = customerData(draft);
    const found = bySource.get(draft.sourceId);
    if (found === undefined) {
      toCreate.push(data);
      continue;
    }
    await tx.customer.update({ where: { id: found.id }, data });
  }

  for (const chunk of chunks(toCreate, CHUNK)) {
    await tx.customer.createMany({ data: chunk });
  }

  const stored = await tx.customer.findMany({
    where: { sourceId: { in: sourceIds } },
    select: { id: true, sourceId: true },
  });
  const ids = new Map(stored.map((row) => [row.sourceId, row.id]));
  await tx.dataQualityIssue.deleteMany({ where: { customerId: { in: [...ids.values()] } } });
  await createIssues(
    tx,
    drafts.flatMap((draft) => {
      const customerId = ids.get(draft.sourceId);
      if (customerId === undefined) {
        throw new Error(`Customer ${draft.sourceId} was not stored.`);
      }
      return draft.issues.map((issue) => ({ customerId, issue }));
    }),
  );
  return ids;
}

function customerData(draft: CustomerDraft) {
  return {
    sourceId: draft.sourceId,
    displayName: draft.displayName,
    industry: draft.industry,
    city: draft.city,
    state: draft.state,
    accountManager: draft.accountManager,
    accountStatus: draft.accountStatus,
    createdOn: draft.createdOn === null ? null : utcDate(draft.createdOn),
  };
}
