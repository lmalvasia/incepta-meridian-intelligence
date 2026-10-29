export const info = {
  billed:
    "Sum of invoices by invoice date. Voids are excluded. Credits reduce the total. H1 2026 stops on June 28 and is not annualized.",
  assigned: "Billed amount linked to one CRM customer for this half.",
  disputed:
    "Invoices that match more than one customer. Counted once in the company total, and not added to either customer's billed total.",
  noCustomer: "Billed invoices in this half with no CRM customer. They stay in the company total.",
  excluded: "Voids in this half, plus identical invoice copies the import already collapsed.",
  review:
    "An account is here when a contract ended on or before June 30, 2026, the contract end date is before the start date, the CRM status is Churned or Inactive, the id has no CRM name, or the model marked the notes as a risk. A repeated name is a tag and does not put the account here.",
  repeatedNames: "Invoices held because the same name matches more than one CRM customer. Each pair is counted once.",
  missingCustomer: "Billed names or customer ids that did not link to a CRM customer.",
  brokenContracts: "Contracts whose end date is before the start date. They are not counted as ending.",
  otherIssues: "Stored data issues that do not change the billed total.",
  collapsedCopies:
    "The NetSuite export printed some invoices twice, on the next row, with every field the same. One row is kept, so the bill stays in the total. The extra copy is in Excluded and is not added again.",
  months: "January through June of 2025 and 2026, side by side. June 2026 is not a full month.",
  serviceLines: "NetSuite service line only, for 2025 and 2026. QuickBooks memos are not classified.",
  invoices: "Every invoice for this customer, including voids and credits. A held invoice is listed on each matching customer. Filter by year.",
} as const;
