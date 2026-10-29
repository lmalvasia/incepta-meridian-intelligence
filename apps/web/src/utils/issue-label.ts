const labels: Record<string, string> = {
  ambiguous_created_date: "Ambiguous created date",
  blank_account_manager: "Blank account manager",
  invalid_customer_id: "Invalid customer id",
  invalid_date: "Invalid date",
  invalid_amount: "Invalid amount",
  missing_required_field: "Missing required field",
  unexpected_status: "Unexpected status",
  unexpected_currency: "Unexpected currency",
  unexpected_service_line: "Unexpected service line",
  unexpected_billing_frequency: "Unexpected billing frequency",
  unexpected_auto_renew: "Unexpected auto renew",
  unexpected_service_tier: "Unexpected service tier",
  reconciliation_total: "Reconciliation total",
  repeated_header: "Repeated header",
  conflicting_source_row: "Conflicting source row",
  blank_annual_value: "Blank annual value",
  blank_auto_renew: "Blank auto renew",
  invalid_row: "Invalid row",
  blank_currency: "Blank currency",
  blank_service_line: "Blank service line",
};

export function issueLabel(code: string): string {
  return labels[code] ?? code.replaceAll("_", " ");
}
