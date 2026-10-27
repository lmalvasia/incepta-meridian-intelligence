import type { Tx } from "../import/types.js";
import { createIssues } from "../import/issues.js";
import { customerIdFor } from "../customers/write.js";
import { utcDate } from "../utils/dates.js";
import { CHUNK, chunks } from "../utils/batch.js";
import type { ContractDraft } from "./types.js";

export async function writeContracts(
  tx: Tx,
  drafts: readonly ContractDraft[],
  customerIds: ReadonlyMap<string, string>,
): Promise<void> {
  if (drafts.length === 0) {
    return;
  }

  const sourceIds = drafts.map((draft) => draft.sourceContractId);
  const existing = await tx.contract.findMany({
    where: { sourceContractId: { in: sourceIds } },
    select: { id: true },
  });
  const existingIds = existing.map((row) => row.id);
  if (existingIds.length > 0) {
    await tx.dataQualityIssue.deleteMany({ where: { contractId: { in: existingIds } } });
    await tx.contract.deleteMany({ where: { id: { in: existingIds } } });
  }

  for (const chunk of chunks(drafts, CHUNK)) {
    await tx.contract.createMany({
      data: chunk.map((draft) => ({
        sourceContractId: draft.sourceContractId,
        customerRef: draft.customerRef,
        startDate: utcDate(draft.startDate),
        endDate: utcDate(draft.endDate),
        annualValue: draft.annualValue,
        billingFrequency: draft.billingFrequency,
        autoRenew: draft.autoRenew,
        serviceTier: draft.serviceTier,
        customerId: customerIdFor(draft.link, customerIds),
        linkStatus: draft.link.status,
        linkReason: draft.link.reason,
      })),
    });
  }

  const stored = await tx.contract.findMany({
    where: { sourceContractId: { in: sourceIds } },
    select: { id: true, sourceContractId: true },
  });
  const ids = new Map(stored.map((row) => [row.sourceContractId, row.id]));
  await createIssues(
    tx,
    drafts.flatMap((draft) => {
      const contractId = ids.get(draft.sourceContractId);
      if (contractId === undefined) {
        throw new Error(`Contract ${draft.sourceContractId} was not stored.`);
      }
      return draft.issues.map((issue) => ({ contractId, issue }));
    }),
  );
}
