# @meridian/pipeline

Reads the five client CSV files in `data/raw/` and writes customers, invoices, contracts, notes, and data-quality issues into PostgreSQL. The command does not modify those files and does not start the API.

From the repository root, after Postgres is up and migrations are applied:

```sh
pnpm run data:import
```

`npm run data:import` runs the same script. `pnpm import` is pnpm's lockfile converter, so the project command includes `run`. Setup is in the root [README](../../README.md). The tables are specified in [docs/data-model.md](../../docs/data-model.md). What the files contain is in [docs/data-profiling.md](../../docs/data-profiling.md). The link rules are in [docs/customer-matching.md](../../docs/customer-matching.md).

## Two passes

The import plans every row in memory, then writes that plan. A missing file or a header that does not match fails before any database write. A data-quality issue on a stored row does not fail the command.

```text
cli.ts
  sources/discover.ts          the five required files must be present
  import/plan.ts               read each CSV and classify its rows
    customers, contracts,
    invoices, notes
  import/write.ts              one transaction: customers, then the other rows
  import/summary.ts            the text printed by the CLI
```

`src/index.ts` re-exports `listSourceFiles` for the API startup listing. That helper only reads the directory.

## Where to read the code

1. `src/cli.ts` loads `.env`, opens the database, and calls `importDirectory`.
2. `src/sources/discover.ts` requires the five names below, in write order. An extra `.csv` is reported and skipped. `README_from_client.txt` is not a data file.
3. `src/utils/csv.ts`, `headers.ts`, `money.ts`, and `dates.ts` turn cell text into values. A blank amount stays blank, more than two decimal places is invalid, and an ambiguous `M/D` date is flagged rather than swapped.
4. `src/import/plan.ts` classifies customers first. The other four files receive the CRM ids and names from that pass.
5. Each entity's `classify` file builds one `FilePlan`: the rows to store, their link decision, and their issues. Rows that are not stored stay on `skipped` and are only counted.
6. `src/customers/matching.ts` returns one decision: `linked`, `held`, or `unmatched`, plus the customer id or null, plus one sentence.
7. `src/import/write.ts` writes that plan in one transaction.
8. `src/import/summary.ts` prints rows read, rows skipped, collapsed copies, and the three link totals.

## Layout

```text
src/
  cli.ts                  process entry
  index.ts                exports used by the API
  sources/                find data/raw and the five CSV files
  utils/                  CSV, dates, money, names, duplicate rows, issue codes
  customers/              CRM customers: types, classify, name matching, write
  contracts/              CRM contracts: types, classify, write
  invoices/               QuickBooks and NetSuite, in separate classify files
  notes/                  account notes: types, classify, write
  import/                 plan, transaction, issues, summary
  __tests__/              tests grouped the same way
```

A `types.ts` file contains only types. `classify.ts` reads the CSV. `write.ts` persists the plan.

## What gets stored

| File | Rows written |
| --- | --- |
| `crm_customers.csv` | one customer per CRM id |
| `contracts.csv` | one contract per contract id |
| NetSuite and QuickBooks | one invoice per invoice id |
| `account_notes.csv` | one note per note id |

A kept row can also get a data-quality issue. A QuickBooks or note name that normalizes to one CRM customer, with no near-duplicate, sets `customerId` and `linkStatus = linked`. A sole token-boundary prefix does too, and `linkReason` says the link is a name prefix, not an id match. A Group/Grp spelling, or more than one candidate, is `held` and leaves `customerId` null. A name or id with no candidate is `unmatched`.

## Counts

The command prints these. They are not stored as a run.

- **Read:** every data row. The header line is not a data row.
- **Skipped:** a row that did not become a customer, invoice, contract, or note. That includes the QuickBooks header, the `TOTAL` row, a malformed row, an identical extra copy, and a later copy whose cells differ.
- **Flagged:** a stored row with at least one issue.
- **Written:** stored customers, invoices, contracts, and notes in that file.

Identical extra copies collapse onto the first row. The copy is skipped. The kept row is not flagged only because it was copied. A repeated id whose cells differ does not overwrite the first row. The kept row gets a `conflicting_source_row` issue.

After the file counts, the import prints how many source parties were linked, held, or left unmatched, and the invoice dollars in each status. CRM customers that share a near-duplicate name are counted on their own line and stay separate customers.

A second run of the same files updates those customers and replaces the invoices, contracts, and notes with the same source ids. It does not insert a second copy of an invoice.

## Tests

```sh
pnpm --filter @meridian/pipeline test
```

Unit tests do not need a database. The write test loads a small fixture twice and skips, with an explicit reason, when Postgres is unreachable. It deletes only the fixture keys afterward.
