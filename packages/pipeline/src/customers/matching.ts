import type { IssueDraft } from "../utils/issues.js";
import { IssueCode } from "../utils/issues.js";
import { groupAbbreviationPair, nameRelation, normalizeName } from "../utils/names.js";
import type { CrmParty, LinkDecision } from "./types.js";

type NamedCandidate = {
  party: CrmParty;
  kind: "prefix" | "group";
};

function bySourceId(left: { sourceId: string }, right: { sourceId: string }): number {
  return left.sourceId.localeCompare(right.sourceId);
}

function listed(parties: readonly CrmParty[]): string {
  return [...parties]
    .sort(bySourceId)
    .map((party) => `${party.sourceId} (${party.displayName})`)
    .join(", ");
}

function candidateSentence(normalized: string, candidate: NamedCandidate | { party: CrmParty; kind: "exact" }): string {
  if (candidate.kind === "exact") {
    return `Normalized name "${normalized}" equals CRM customer ${candidate.party.sourceId} (${candidate.party.displayName}).`;
  }
  if (candidate.kind === "prefix") {
    return `Normalized name "${normalized}" shares a token-boundary prefix with CRM customer ${candidate.party.sourceId} (${candidate.party.displayName}).`;
  }
  return `Normalized name "${normalized}" differs from CRM customer ${candidate.party.sourceId} (${candidate.party.displayName}) only by a trailing Group/Grp token.`;
}

function heldReason(normalized: string, exact: readonly CrmParty[], weaker: readonly NamedCandidate[]): string {
  const exactSorted = [...exact].sort(bySourceId);
  const weakerSorted = [...weaker].sort((left, right) => bySourceId(left.party, right.party));
  if (exactSorted.length > 1) {
    const equals = `Normalized name "${normalized}" equals more than one CRM customer: ${listed(exactSorted)}.`;
    if (weakerSorted.length === 0) {
      return `${equals} No customer link was stored.`;
    }
    return `${equals} It also matches ${listed(weakerSorted.map((candidate) => candidate.party))}. No customer link was stored.`;
  }
  const sole = exactSorted[0];
  if (sole !== undefined && weakerSorted.length > 0) {
    return `Normalized name "${normalized}" equals ${sole.sourceId} (${sole.displayName}) and also matches ${listed(weakerSorted.map((candidate) => candidate.party))}. No customer link was stored.`;
  }
  if (weakerSorted.length === 1) {
    const only = weakerSorted[0];
    if (only !== undefined) {
      return `${candidateSentence(normalized, only)} No customer link was stored.`;
    }
  }
  return `Normalized name "${normalized}" has review-only candidates: ${listed(weakerSorted.map((candidate) => candidate.party))}. No customer link was stored.`;
}

function collectCandidates(
  rawName: string,
  parties: readonly CrmParty[],
): { exact: CrmParty[]; weaker: NamedCandidate[] } {
  const exact: CrmParty[] = [];
  const weaker: NamedCandidate[] = [];
  for (const party of parties) {
    if (party.normalized.length === 0) {
      continue;
    }
    const relation = nameRelation(rawName, party.displayName);
    if (relation === "exact") {
      exact.push(party);
    } else if (relation === "prefix") {
      weaker.push({ party, kind: "prefix" });
    } else if (groupAbbreviationPair(rawName, party.displayName)) {
      weaker.push({ party, kind: "group" });
    }
  }
  exact.sort(bySourceId);
  weaker.sort((left, right) => bySourceId(left.party, right.party));
  return { exact, weaker };
}

function unmatched(reason: string): LinkDecision {
  return { status: "unmatched", customerSourceId: null, reason };
}

export function resolveSourceId(sourceId: string, known: boolean, acceptedReason: string): LinkDecision {
  if (!known) {
    return unmatched(`Customer ref ${sourceId} has no CRM customer. No customer link was stored.`);
  }
  return { status: "linked", customerSourceId: sourceId, reason: acceptedReason };
}

/**
 * One decision for a source name.
 * A sole normalized name links only when no prefix or Group/Grp neighbor exists.
 * Any other candidate is held, and no candidate stays unmatched.
 */
export function resolveCustomerName(rawName: string, parties: readonly CrmParty[]): LinkDecision {
  const normalized = normalizeName(rawName);
  const { exact, weaker } = collectCandidates(rawName, parties);

  if (exact.length === 1 && weaker.length === 0) {
    const party = exact[0];
    if (party === undefined) {
      return unmatched(`Customer "${rawName}" matches no CRM customer. No customer link was stored.`);
    }
    return {
      status: "linked",
      customerSourceId: party.sourceId,
      reason: candidateSentence(normalized, { party, kind: "exact" }),
    };
  }

  if (exact.length === 0 && weaker.length === 0) {
    return unmatched(`Customer "${rawName}" matches no CRM customer. No customer link was stored.`);
  }

  return {
    status: "held",
    customerSourceId: null,
    reason: heldReason(normalized, exact, weaker),
  };
}

function isAmbiguous(exact: readonly CrmParty[], weaker: readonly NamedCandidate[]): boolean {
  return exact.length > 1 || weaker.length > 1 || (exact.length === 1 && weaker.length > 0);
}

export function linkCustomerName(
  label: string,
  rows: Array<{ issues: IssueDraft[]; sortKey: string }>,
  parties: readonly CrmParty[],
): LinkDecision {
  const collected = collectCandidates(label, parties);
  const decision = resolveCustomerName(label, parties);
  if (isAmbiguous(collected.exact, collected.weaker)) {
    const description = decision.reason.length > 0 ? decision.reason : `Customer "${label}" matches more than one CRM customer. No customer link was stored.`;
    for (const row of rows) {
      row.issues.push({
        code: IssueCode.ambiguousCustomerName,
        severity: "warning",
        description,
        amountImpact: null,
      });
    }
  } else if (decision.status === "unmatched") {
    const earliest = [...rows].sort((left, right) => left.sortKey.localeCompare(right.sortKey))[0];
    earliest?.issues.push({
      code: IssueCode.unmatchedCustomerName,
      severity: "warning",
      description: decision.reason,
      amountImpact: null,
    });
  }
  return decision;
}

function pushReason(reasons: Map<string, string[]>, sourceId: string, reason: string): void {
  const list = reasons.get(sourceId) ?? [];
  list.push(reason);
  reasons.set(sourceId, list);
}

/**
 * Near-duplicate CRM ids stay separate customers. The returned text is the issue on each side.
 */
export function crmTwinIssues(parties: readonly CrmParty[]): Map<string, string> {
  const reasons = new Map<string, string[]>();
  const sorted = [...parties].filter((party) => party.normalized.length > 0).sort(bySourceId);

  const byName = new Map<string, CrmParty[]>();
  for (const party of sorted) {
    const list = byName.get(party.normalized) ?? [];
    list.push(party);
    byName.set(party.normalized, list);
  }

  for (const name of [...byName.keys()].sort((left, right) => left.localeCompare(right))) {
    const group = byName.get(name) ?? [];
    if (group.length < 2) {
      continue;
    }
    for (const party of group) {
      const others = group.filter((other) => other.sourceId !== party.sourceId);
      pushReason(
        reasons,
        party.sourceId,
        `Normalized name "${party.normalized}" is also used by ${listed(others)}. These rows stay separate customers.`,
      );
    }
  }

  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
      const left = sorted[leftIndex];
      const right = sorted[rightIndex];
      if (left === undefined || right === undefined || left.normalized === right.normalized) {
        continue;
      }
      if (nameRelation(left.displayName, right.displayName) === "prefix") {
        const shorter = left.normalized.length <= right.normalized.length ? left : right;
        const longer = shorter === left ? right : left;
        const sentence = `Normalized name "${shorter.normalized}" is a token-boundary prefix of ${longer.sourceId} (${longer.displayName}). These rows stay separate customers.`;
        pushReason(reasons, left.sourceId, sentence);
        pushReason(reasons, right.sourceId, sentence);
        continue;
      }
      if (!groupAbbreviationPair(left.displayName, right.displayName)) {
        continue;
      }
      pushReason(
        reasons,
        left.sourceId,
        `Normalized name "${left.normalized}" differs from ${right.sourceId} (${right.displayName}) only by a trailing Group/Grp token. These rows stay separate customers.`,
      );
      pushReason(
        reasons,
        right.sourceId,
        `Normalized name "${right.normalized}" differs from ${left.sourceId} (${left.displayName}) only by a trailing Group/Grp token. These rows stay separate customers.`,
      );
    }
  }

  const issues = new Map<string, string>();
  for (const [sourceId, texts] of reasons) {
    issues.set(sourceId, texts.join(" "));
  }
  return issues;
}
