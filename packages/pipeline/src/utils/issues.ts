export type SeverityName = "info" | "warning" | "error";

export type IssueDraft = {
  code: string;
  severity: SeverityName;
  description: string;
  amountImpact: string | null;
};

export const IssueCode = {
  ambiguousCreatedDate: "ambiguous_created_date",
  blankAccountManager: "blank_account_manager",
  invalidCustomerId: "invalid_customer_id",
  invalidDate: "invalid_date",
  invalidAmount: "invalid_amount",
  missingRequiredField: "missing_required_field",
  unexpectedStatus: "unexpected_status",
  unexpectedCurrency: "unexpected_currency",
  unexpectedServiceLine: "unexpected_service_line",
  unexpectedBillingFrequency: "unexpected_billing_frequency",
  unexpectedAutoRenew: "unexpected_auto_renew",
  unexpectedServiceTier: "unexpected_service_tier",
  reconciliationTotal: "reconciliation_total",
  repeatedHeader: "repeated_header",
  conflictingSourceRow: "conflicting_source_row",
  blankAnnualValue: "blank_annual_value",
  blankAutoRenew: "blank_auto_renew",
  endDateBeforeStart: "end_date_before_start",
  unknownCustomerRef: "unknown_customer_ref",
  ambiguousCustomerName: "ambiguous_customer_name",
  unmatchedCustomerName: "unmatched_customer_name",
  possibleDuplicateCustomer: "possible_duplicate_customer",
  invalidRow: "invalid_row",
  blankCurrency: "blank_currency",
  blankServiceLine: "blank_service_line",
} as const;

export type IssueCodeName = (typeof IssueCode)[keyof typeof IssueCode];

export function missingFields(fields: readonly string[]): IssueDraft {
  return {
    code: IssueCode.missingRequiredField,
    severity: "error",
    description: `Required fields are blank: ${fields.join(", ")}.`,
    amountImpact: null,
  };
}

export function unexpectedValue(field: string, value: string, code: string): IssueDraft {
  return {
    code,
    severity: "warning",
    description: `${field} "${value}" is outside the known set for this file. The exported value was stored.`,
    amountImpact: null,
  };
}

export function invalidRow(actual: number, expected: number): IssueDraft {
  return {
    code: IssueCode.invalidRow,
    severity: "error",
    description: `Row has ${actual.toString()} columns and the header has ${expected.toString()}. It was not imported as a business record.`,
    amountImpact: null,
  };
}

export function repeatedHeaderIssue(noun: string): IssueDraft {
  return {
    code: IssueCode.repeatedHeader,
    severity: "info",
    description: `This row repeats the column headers and was not stored as ${noun}.`,
    amountImpact: null,
  };
}
