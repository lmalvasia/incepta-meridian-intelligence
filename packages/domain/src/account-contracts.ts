import { billedInvoices, inRange } from "./billed.js";
import { h1Current } from "./periods.js";
import type { ContractInput, InvoiceInput } from "./types.js";

export type ContractState = "broken" | "ended" | "open";

export type AccountContract = {
  sourceContractId: string;
  startDate: string;
  endDate: string;
  autoRenew: string | null;
  state: ContractState;
  stillBilling: boolean;
};

const reviewThrough = "2026-06-30";

export function contractsForAccount(
  contracts: readonly ContractInput[],
  invoices: readonly InvoiceInput[],
  sourceId: string,
): AccountContract[] {
  const stillBilling = hasCurrentInvoice(invoices, sourceId);
  return contracts
    .filter((contract) => belongsToAccount(contract, sourceId))
    .map((contract) => ({
      sourceContractId: contract.sourceContractId,
      startDate: contract.startDate,
      endDate: contract.endDate,
      autoRenew: contract.autoRenew,
      state: contractState(contract),
      stillBilling,
    }))
    .sort(byEndDate);
}

function belongsToAccount(contract: ContractInput, sourceId: string): boolean {
  if (contract.customerSourceId === sourceId) {
    return true;
  }
  return contract.customerSourceId === null && contract.customerRef === sourceId;
}

function contractState(contract: ContractInput): ContractState {
  if (contract.endDate < contract.startDate) {
    return "broken";
  }
  if (contract.endDate <= reviewThrough) {
    return "ended";
  }
  return "open";
}

function hasCurrentInvoice(invoices: readonly InvoiceInput[], sourceId: string): boolean {
  return billedInvoices(invoices).some(
    (invoice) =>
      inRange(invoice.invoiceDate, h1Current.from, h1Current.to) &&
      (invoice.customerSourceId === sourceId ||
        (invoice.linkStatus === "unmatched" && invoice.customerSourceId === null && invoice.customerRef === sourceId)),
  );
}

function byEndDate(left: AccountContract, right: AccountContract): number {
  return right.endDate.localeCompare(left.endDate) || left.sourceContractId.localeCompare(right.sourceContractId);
}
