type Labeled = { id: string; label: string };

export function issueSubject(
  issue: { customerId: string | null; invoiceId: string | null; contractId: string | null; noteId: string | null },
  labels: { customers: ReadonlyMap<string, string>; invoices: ReadonlyMap<string, string>; contracts: ReadonlyMap<string, string>; notes: ReadonlyMap<string, string> },
): string | null {
  const note = issue.noteId === null ? undefined : labels.notes.get(issue.noteId);
  if (note !== undefined) {
    return note;
  }
  const invoice = issue.invoiceId === null ? undefined : labels.invoices.get(issue.invoiceId);
  if (invoice !== undefined) {
    return invoice;
  }
  const contract = issue.contractId === null ? undefined : labels.contracts.get(issue.contractId);
  if (contract !== undefined) {
    return contract;
  }
  return issue.customerId === null ? null : (labels.customers.get(issue.customerId) ?? null);
}

export function labelMap(rows: readonly Labeled[]): Map<string, string> {
  return new Map(rows.map((row) => [row.id, row.label]));
}
