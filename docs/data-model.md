# Data model

PostgreSQL schema for the Meridian prototype, defined in `packages/db/prisma/schema.prisma`. Internal primary keys are UUIDs. Ids that came from a source file stay in separate columns. Amounts are `DECIMAL(18, 2)`. The schema does not decide which invoices count as revenue, and it does not merge customers because their names look alike.

The importer is `pnpm run data:import` (`packages/pipeline`). It reads `data/raw/` and writes the tables below. The original CSV files stay the raw export. The database keeps the rows that later questions read.

## Entities

`Customer` is one CRM customer, keyed by `sourceId` (`C-0138`). `displayName` is the exported company name. It is not unique and it is not a match key. Two CRM ids that share a normalized name, such as the Longford pair, are two customers. `industry`, `city`, `state`, `accountManager`, `accountStatus`, and `createdOn` are the exported CRM values. `createdOn` is the parsed date. Some `created_date` tokens are ambiguous between month/day and day/month. Those rows are stored with the month/day reading and a data-quality issue.

`Invoice` is one QuickBooks or NetSuite invoice. `billingSystem` plus `sourceInvoiceId` is the key. `customerRef` keeps the original customer cell: a name in QuickBooks, a `C-` id in NetSuite. `amount` is the signed parsed amount. Credits are negative. `currency` is set only for NetSuite. `status`, `memo`, and `serviceLine` keep the exported tokens. Void invoices are stored. Leaving them out of a billed total is a report rule, not a delete.

`Contract` is one service contract, keyed by `sourceContractId`. `customerRef` is the exported `customer_id`, including the four ids that are not in the CRM file. `annualValue` is null when the cell is blank. `autoRenew` is null when the cell is blank. `endDate` may be before `startDate`. The schema accepts those rows.

`AccountNote` is one note, keyed by `sourceNoteId`. `customerName`, `noteDate`, `author`, and `noteText` are the exported values.

`linkStatus` on an invoice, contract, or note is the ETL result:

- `linked`: `customerId` points at one CRM customer.
- `held`: at least one CRM candidate exists, and the row was not linked. `customerId` is null. `linkReason` names the candidates.
- `unmatched`: no candidate. `customerId` is null.

`linkReason` is one sentence. The same QuickBooks name is repeated on each of its invoices, because the invoice is the row a later query sums.

`DataQualityIssue` is one problem on one customer, invoice, contract, or note: `code`, severity (`info`, `warning`, `error`), description, and optional `amountImpact`. `amountImpact` is the signed dollar amount by which a total would be wrong if the bad row were treated as another good row. It is null when no amount can be calculated.

Rows that are not stored — the QuickBooks header, the QuickBooks `TOTAL` row, a malformed row, and an identical extra copy — are counted by the import command. They are not tables. The 45 identical NetSuite copies and the two identical contract copies collapse to one stored row each. The command prints how many copies were collapsed and the dollar total of those copies.

## Relationships

- A customer has many invoices, contracts, notes, and issues.
- An invoice, contract, or note optionally points at one customer.
- An issue points at one customer, one invoice, one contract, or one note.

Deleting a customer is restricted while an invoice, contract, note, or issue still references it.

## What a second import does

Running the command again updates the CRM customers that are already stored and replaces the invoices, contracts, and notes whose source ids are in the files. It does not keep a history of runs. It does not keep a copy of each raw cell. The CSV in `data/raw/` is that copy.

## Matching

Similar names do not share a canonical id. There is no unique constraint on `displayName`. The decision order, the real examples, and the counts from these files are in [customer-matching.md](customer-matching.md).

An exact source id, or one normalized name with no near-duplicate, is `linked`. A prefix, a Group/Grp spelling, or more than one candidate is `held`. No candidate is `unmatched`. Two CRM ids that share a name stay two customers, each with a `possible_duplicate_customer` issue.

## Money

`Invoice.amount`, `Contract.annualValue`, and `DataQualityIssue.amountImpact` are `DECIMAL(18, 2)`. JavaScript numbers are not the stored type. The raw amount text, including `$`, thousands separators, parentheses, and a trailing `.0` on contract values, stays in the CSV.

Blank contract values stay null. They are not zero. Negative invoice amounts stay negative. They are credits, not rejected rows.

## What the schema does not decide

- Whether billed revenue includes open, overdue, void, or credit amounts.
- Whether `auto_renew` of `Yes` extends a contract past `endDate`.
- Whether a memo maps to a NetSuite `service_line`.
- A cleaned industry or state taxonomy.
- Which of the 48 ambiguous CRM `created_date` values would also be valid as day/month/year. `createdOn` stores the month/day reading, and an issue records that the token was ambiguous.

## Left for later

A run history, a stored copy of every raw cell, one identity per source system, one match row per candidate, and a human review that a later import will not overwrite are not in this schema. The root README lists them as pipeline improvements.
