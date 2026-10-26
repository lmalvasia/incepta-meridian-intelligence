# Meridian data profile

Profiling of the client exports in `data/raw/`. The application does not parse these files yet, and this note does not decide what Meridian should call revenue or which customers are at risk.

The files are UTF-8, CRLF, with no byte-order mark. Quoted fields were read with a CSV parser. Source files were not modified.

Amounts in the sensitivity section are sums of parsed invoice cells under an explicit rule. They are a check on how much the extract moves when a broken row is kept or dropped. Dana Whitfield still has to say whether billed invoices, collected cash, or contract value is the number for the board.

The last section, "Working assumptions, in plain language," says which of those open choices the prototype will use, and which ones it will show without guessing.

## What the client said

`README_from_client.txt` is a note from R. Calloway, an IT contractor, written for D. Whitfield, the CFO. These are claims about how the files were pulled:

- `crm_customers.csv` is the HubSpot customer list, described as current-ish.
- `invoices_2024_quickbooks.csv` is the FY2024 invoice register from QuickBooks. Finance says the export is as-is and that system is no longer maintained.
- `invoices_2025_2026_netsuite.csv` is the NetSuite invoice register from January 2025 through June 2026. The billing migration was at the 2024/2025 year end.
- `contracts.csv` is service contracts from the CRM.
- `account_notes.csv` is the account-manager activity log from mid-2024 onward.
- Customer names may differ across systems. The CRM cleanup never finished.
- Nobody has reconciled the files since the migration, so the numbers can be wrong.

The note has no pull date.

## crm_customers.csv

14,963 bytes. 173 data rows. No duplicate `customer_id`. Every id matches `C-` plus four digits.

| Column | Empty | Notes |
| --- | ---: | --- |
| `customer_id` | 0 | 173 unique values, each 6 characters |
| `company_name` | 0 | 173 distinct raw strings. Nine have a leading space. |
| `industry` | 0 | 24 raw labels, including case differences and trailing spaces |
| `city` | 0 | 22 cities |
| `state` | 0 | 15 strings, spelling variants of NY, NJ, CT, PA, and MA |
| `account_manager` | 17 | Four names otherwise: S. Patel, R. O'Donnell, T. Alvarez, J. Kim |
| `created_date` | 0 | 65 dates are `YYYY-MM-DD`. 108 are `MM/DD/YYYY` if read as US dates. |
| `status` | 0 | `Active` 160, `Inactive` 7, `inactive` 3, `Churned` 3 |

Representative rows:

```text
C-0138,Longford Shopping Centers,Retail,New Rochelle,NY,S. Patel,2023-07-07,Active
C-0519,Dunmore Market Group,Retail,Philadelphia,Pa.,J. Kim,11/21/2019,Active
```

The blank account-manager rows are 16 `Active` and one `Churned` (`C-0701`, Bayview Hospitality Group).

`created_date` runs from 2019-01-18 through 2026-06-28 when the slash dates are read as month/day/year. Three of those dates fall in 2026, and none fall after 2026-06-30. Forty-eight slash dates have both parts at or below 12 and are not the same number, so a day/month reading is also a valid calendar date. The other files in this package use US order. That makes month/day the working reading, and it is still an assumption for those 48 rows. `created_date` is not used in the invoice sums below.

State values are `NY`, `New York`, `N.Y.`, `NJ`, `New Jersey`, `N.J.`, `CT`, `Connecticut`, `Ct.`, `PA`, `Pennsylvania`, `Pa.`, `MA`, `Massachusetts`, and `Mass.` Industry labels include case variants, trailing spaces (`Retail `, `Education `, `healthcare `), and shortened forms such as `Property Mgmt` beside `Property Management`. Collapsing those industry labels into a taxonomy would be a judgment. The invoice sums do not depend on it.

### Names that collide after light normalization

Normalization here means trim, case-fold, treat `&` as `and`, and drop punctuation. Three pairs then share one name. Each pair has the same city and the same industry text aside from case or a trailing space. Both ids in each pair have NetSuite invoices, so a customer total changes if the ids are combined.

| Normalized name | Ids | NetSuite invoices after dropping exact duplicate rows | Account manager |
| --- | --- | --- | --- |
| longford shopping centers | `C-0138` Longford Shopping Centers, New Rochelle, NY | 16 invoices, $239,371.82 | S. Patel |
| longford shopping centers | `C-0800` LONGFORD SHOPPING CENTERS, New Rochelle, NY | 11 invoices, $65,148.75 | T. Alvarez |
| overlook shopping centers | `C-0235` Overlook Shopping Centers, Worcester, MA | 16 invoices, $159,771.16 | T. Alvarez |
| overlook shopping centers | `C-0807` OVERLOOK SHOPPING CENTERS, Worcester, MA | 11 invoices, $131,792.06 | J. Kim |
| kestrel retail group | `C-0156` Kestrel Retail Group, Paramus, New Jersey | 18 invoices, $100,401.67 | S. Patel |
| kestrel retail group | `C-0795` Kestrel Retail Group., Paramus, New Jersey | 8 invoices, $104,844.82 | T. Alvarez |

`C-0156` has 19 NetSuite rows before that duplicate drop, and `C-0235` has 17. One extra copy sits on each of those ids. The dollars above exclude those copies.

Each of the three pairs has a different account manager on the two ids. `C-0795` was created on 2026-06-28 under the US reading of `06/28/2026`. `C-0156` was created on 2024-02-22. Same city, same industry, and a trailing period on one name.

A fourth pair is similar and does not collapse under that normalization, because `Group` and `Grp` remain different tokens:

| Id | Name | City | Industry | Account manager | NetSuite invoices after duplicate drop |
| --- | --- | --- | --- | --- | --- |
| `C-0307` | Redstone Property Group | White Plains, NY | Property Management | J. Kim | 25 invoices, $152,201.97 |
| `C-0787` | Redstone Property Grp | White Plains, NY | Property Management | S. Patel | 6 invoices, $42,385.41 |

`C-0307` has 26 NetSuite rows before the duplicate drop. `C-0686`, Redstone Market Group, is a separate Albany retail record and is not part of this pair.

These pairs are confirmed as separate ids with overlapping names. Treating each pair as one customer is a hypothesis. This note does not merge them.

## invoices_2024_quickbooks.csv

215,750 bytes. 2,561 data rows. Columns: `Invoice No`, `Customer`, `Invoice Date`, `Amount`, `Status`, `Memo`.

Two rows are not invoices:

- One row repeats the header: every field is the column name. It sits on file line 1281.
- The last row has a blank invoice number, `Customer` = `TOTAL`, blank date, status, and memo, and `Amount` = `$40,722,837.42`.

The other 2,559 rows have unique invoice numbers, a customer name, a date, a status, and a memo. Their parsed amounts sum to `$40,722,837.42`, the same figure as the `TOTAL` row. The difference is `$0.00`. The `TOTAL` row matches the line items. It is a checksum sitting in the invoice register.

Representative invoice:

```text
INV-20004,Brixton Property Group,01/01/2024,"$324,074.48",Paid,PM visit - monthly
```

Dates on the 2,559 invoice rows are either `MM/DD/YYYY` (2,305 rows) or `Mon DD, YYYY` (254 rows). Every one of them parses, and they run from 2024-01-01 through 2024-12-28. There are no 2025 or 2026 dates in this file.

Amounts are dollar strings. Parentheses mark a negative. All 73 negative rows use the memo `Credit memo - billing adjustment` and sum to `-$939,872.86`. No positive row uses that memo. The smallest parsed amount is `-$247,536.89` and the largest is `$361,067.65`.

Status on the 2,559 invoice rows:

| Status | Invoices | Parsed amount |
| --- | ---: | ---: |
| Paid | 2,205 | $34,481,377.23 |
| Open | 221 | $3,656,906.26 |
| Overdue | 133 | $2,584,553.93 |

There is no void status in this file. Memos are a closed list of 17 phrases plus the credit-memo line, covering maintenance visits, repairs, emergency calls, and project work. Examples are `PM visit - monthly`, `Cooling tower service`, and `Chiller replacement project`.

`Memo` is free text from the old billing system. It is not the label used to separate regular maintenance from large project work. That label exists only on the 2025–2026 file, in the column `service_line`. This note does not translate QuickBooks memos into those four labels. A memo such as `Cooling tower service` could be maintenance or a repair, and the file does not say which.

Half-year sums of the 2,559 parsed invoices, with credits included:

| Period | Invoices | Parsed amount |
| --- | ---: | ---: |
| 2024 H1 | 1,251 | $19,632,079.97 |
| 2024 H2 | 1,308 | $21,090,757.45 |

`Customer` is a name, not a `C-` id. There are 213 distinct names on the invoice rows. How those names join to the CRM is in the relationships section.

## invoices_2025_2026_netsuite.csv

282,216 bytes. 4,106 data rows. Columns: `invoice_id`, `customer_ref`, `txn_date`, `amount_usd`, `currency`, `status`, `service_line`.

Representative row:

```text
NS-INV-25926,C-0346,2025-01-01,1413.57,USD,open,Repair
```

Every `txn_date` is `YYYY-MM-DD`, from 2025-01-01 through 2026-06-28. Every `currency` is `USD`. Every `customer_ref` matches `C-` plus four digits. There are 173 distinct refs. `amount_usd` is a plain decimal, positive or negative, with no currency symbol.

Raw status counts, before removing duplicate rows: `paid` 3,601, `open` 438, `void` 67.

`service_line` is filled on every row with one of four labels. Preventive Maintenance is the regular recurring work. Repair is a fix. Emergency Service is an urgent call. Project/Install is a larger job, such as an installation. Counts on the raw file, including the duplicate rows described next: Preventive Maintenance 2,940, Repair 801, Emergency Service 224, Project/Install 141. The half-year split later in this note uses this column, and only for 2025 and 2026.

### Exact duplicate invoices

4,061 distinct `invoice_id` values, and 45 ids appear twice. Each pair is the next row in the file and is equal in every column. All 45 extra copies have `txn_date` in April 2026. Forty are `paid` and five are `open`. Their amounts sum to `$939,504.97`, of which three copies are negative.

After keeping one row per `invoice_id`:

| Status | Invoices | Parsed amount |
| --- | ---: | ---: |
| paid | 3,561 | $57,044,223.33 |
| open | 433 | $6,327,811.49 |
| void | 67 | $857,674.20 |

The 4,061 rows sum to `$64,229,709.02`. The 4,106 raw rows sum to `$65,169,213.99`. The difference is the `$939,504.97` of extra copies.

One hundred thirty-eight of the deduplicated rows are negative, summing to `-$925,842.14` (`paid` 121, `open` 16, `void` 1). All 141 negative rows in the raw file, including the three extra copies, are Preventive Maintenance. The raw negative sum is `-$939,704.86`. That is close to the QuickBooks credit-memo sum and it is a different system, a different period, and a different row count. Nothing in the files links the two sets of credits.

No void row is one of the 45 extra copies, so the void total is `$857,674.20` either way. One void amount is negative.

## contracts.csv

11,096 bytes. 167 data rows. Columns: `contract_id`, `customer_id`, `start_date`, `end_date`, `annual_value`, `billing_frequency`, `auto_renew`, `service_tier`.

```text
CTR-5190,C-0507,2023-05-01,2024-04-30,29900.0,Monthly,Yes,Gold
CTR-5273,C-0686,2024-06-01,2027-05-31,,Monthly,Yes,Bronze
```

`contract_id` has 165 distinct values. `CTR-5190` (`C-0507`) and `CTR-5232` (`C-0591`) each appear twice, and the two copies are equal in every column. Those two customers do not have two contracts in this file. They have one contract exported twice.

Dates are `YYYY-MM-DD` on every row. Populated `annual_value` cells are numbers with a `.0` decimal. Five are empty: `CTR-5273` (`C-0686`), `CTR-5155` (`C-0430`), `CTR-5125` (`C-0354`), `CTR-5246` (`C-0630`), `CTR-5102` (`C-0307`). Four `auto_renew` cells are empty: `CTR-5161`, `CTR-5139`, `CTR-5274`, `CTR-5233`.

`billing_frequency` is `Monthly` 104, `monthly` 35, `Quarterly` 26, counted after dropping the two duplicate rows. `auto_renew` is `Yes` 107, `No` 37, `yes` 17, and blank 4. `service_tier` is Silver, Bronze, or Gold only.

Six contracts have `end_date` before `start_date`:

| Contract | Customer | Start | End | Annual value | Auto-renew |
| --- | --- | --- | --- | ---: | --- |
| `CTR-5208` | `C-0553` | 2024-06-01 | 2022-06-01 | 145,000 | Yes |
| `CTR-5212` | `C-0556` | 2023-02-01 | 2021-02-01 | 448,400 | Yes |
| `CTR-5278` | `C-0701` | 2025-11-01 | 2024-07-28 | 120,200 | No |
| `CTR-5299` | `C-0733` | 2025-05-01 | 2024-12-28 | 109,700 | No |
| `CTR-5305` | `C-0751` | 2025-10-01 | 2023-10-01 | 43,800 | Yes |
| `CTR-5310` | `C-0761` | 2024-09-01 | 2024-08-28 | 173,800 | No |

Of the other 159 contracts, 93 have `end_date` on or before 2026-06-30, 18 end later in 2026, and 48 end in 2027 or after. A past `end_date` does not say whether the contract was renewed. `auto_renew` is the only field that speaks to renewal, and this file does not define what `Yes` means after the end date.

`annual_value` is not a revenue total. Contracts overlap in time, five values are blank, and the file does not say whether the figure is billed, recognized, or a list price.

## account_notes.csv

37,368 bytes. 263 data rows. Columns: `note_id`, `customer_name`, `note_date`, `author`, `note_text`. No empty text. No duplicate `note_id`.

```text
N-3061,Talbot Precision Products,2024-06-10,R. O'Donnell,"Site visit at Allentown location. Walked mechanical rooms with facilities lead, all units within spec."
```

Every `note_date` is `YYYY-MM-DD`, from 2024-06-10 through 2026-06-27. That matches the client's "mid-2024 onward." Authors are only S. Patel (73), R. O'Donnell (79), T. Alvarez (52), and J. Kim (59), the same four names as the CRM.

There are 140 distinct `customer_name` values and 152 distinct note texts. Sixty-eight of those texts appear more than once and cover 179 rows. The text is short, 68 to 119 characters, and reads as a template with the person and the place swapped. The customer link is the name, not a `C-` id. Ten names are entirely lowercase, and each of those ten matches one CRM name after case-folding: `brixton fabrication`, `danforth inns`, `ellery fabrication`, `larkspur fabrication`, `lowell warehousing`, `selwyn industries`, `stanhope fabrication`, `vernon resorts`, `verona warehousing`, `westbrook industries`.

Phrases present in the text, counted as case-insensitive substrings:

| Phrase | Notes | Distinct names |
| --- | ---: | ---: |
| scope flat | 33 | 30 |
| price increase | 15 | 13 |
| Therma-Serv | 7 | 7 |
| 6+ hr | 6 | 6 |
| non-renewal | 5 | 5 |
| repeat failures | 5 | 5 |
| duplicate charges | 3 | 3 |
| wrong PO | 3 | 3 |
| Prospect meeting | 3 | 3 |
| CoolFlow | 2 | 2 |
| at-risk | 2 | 2 |
| legal | 1 | 1 |
| early termination | 1 | 1 |
| competitive-bid | 1 | 1 |
| no-showed | 1 | 1 |

These are counts of words in the export. They are not a risk ranking. The notes also contain positive language: uptime targets met, a 9/10 comment, budget approved for upgrades, and site visits described as within spec.

## Relationships

QuickBooks ends on 2024-12-28 and NetSuite starts on 2025-01-01. Invoice ids use `INV-` in one file and `NS-INV-` in the other. No invoice period is in both files. That is consistent with a year-end migration. It does not show that every 2024 customer was carried into NetSuite.

NetSuite `customer_ref` joins to CRM `customer_id` on an exact id. 169 CRM customers have at least one NetSuite invoice. Four NetSuite refs are missing from the CRM, and each of them has a contract:

| Customer ref | Deduplicated NetSuite invoices | Amount | Contract |
| --- | ---: | ---: | --- |
| `C-0251` | 24 | $161,933.74 | `CTR-5072`, ends 2026-02-28 |
| `C-0585` | 27 | $198,237.24 | `CTR-5228`, ends 2026-12-31 |
| `C-0599` | 26 | $467,829.84 | `CTR-5235`, ends 2028-03-31 |
| `C-0751` | 23 | $145,201.79 | `CTR-5305`, end date before start date |

None of those four refs has a duplicate invoice copy. The file does not contain their company names.

Four CRM customers have a contract and no NetSuite invoice. Their CRM status is already inactive or churned:

| Id | Name | Status | Contract |
| --- | --- | --- | --- |
| `C-0400` | Jubilee Academy | inactive | has a contract |
| `C-0701` | Bayview Hospitality Group | Churned | `CTR-5278`, end date before start date, blank account manager |
| `C-0733` | Thistle Medical Center | Inactive | `CTR-5299`, end date before start date |
| `C-0761` | Blakely Medical Center | Inactive | `CTR-5310`, end date before start date |

Twelve CRM customers have no contract row. Twelve NetSuite customer refs have no contract row. Those two sets of twelve are not listed here, and they are not the same fact: the four orphan refs above do have contracts, and the three "second" ids in the Longford, Overlook, and Kestrel pairs do not.

QuickBooks joins only through the customer name. Using the same trim, case, and punctuation normalization as the CRM pairs:

| Match | Invoice rows | Parsed amount |
| --- | ---: | ---: |
| Exactly one CRM id | 2,434 | included in the 2024 file total |
| Two CRM ids | 54 | $449,838.25 |
| No CRM id | 71 | $679,737.43 |

The 54 double matches are the Longford, Overlook, and Kestrel name variants, including `Kestrel Retail Group.` The 71 unmatched rows are four names:

| QuickBooks name | Invoices | Parsed amount | Status mix |
| --- | ---: | ---: | --- |
| Brixton Clinic Group | 20 | $369,765.16 | Paid 15, Open 3, Overdue 2 |
| Foxhall Clinic Group | 18 | $168,943.86 | Paid 16, Open 2 |
| Emberly Property Group | 17 | $96,616.76 | Paid 13, Open 2, Overdue 2 |
| Rockville Commercial Realty | 16 | $44,411.65 | Paid 11, Open 4, Overdue 1 |

Each of those four has CRM records with a similar shape, such as Emberly Market Group or Brixton Property Group. None normalizes to a CRM name. They stay unmatched.

Fifteen CRM names never appear on a 2024 invoice under that normalization: Yale Park College, Vista Stores Inc, Kestrel Realty Partners, Vantage Shopping Centers, Larkspur Property Group, Emberly Market Group, Sutton Precision Products, Selwyn Industries, Winslow Academy, Tremont Inns, Gorham Commercial Realty, Mercer Warehousing, Bramford Clinic Group, Middleton Manufacturing, and Pelham Commercial Realty. Some of those names do appear, shortened, in the notes.

Note names, under the same normalization:

| Result | Distinct note names |
| --- | ---: |
| Exact CRM name | 113, including the 10 lowercase names |
| Name is a unique prefix or the CRM name is a unique prefix | 23 |
| Prefix of two CRM names | 1, `Redstone Property` |
| No CRM name | 3 |

The two `Redstone Property` notes are an annual review on 2025-02-04 and a White Plains site visit on 2025-06-16. Both Redstone property records are in White Plains, so the city in the note does not pick a winner. Redstone Market Group is in Albany and is not a prefix match.

The three names with no CRM match each have one note, and the text of each note is `Prospect meeting - toured sites, waiting on procurement to open RFP.`

| Note name | Date | Author |
| --- | --- | --- |
| Pinnacle Office REIT | 2026-02-21 | S. Patel |
| Garden State Cold Storage | 2026-06-06 | R. O'Donnell |
| Metro North Facilities | 2026-06-21 | J. Kim |

The 23 prefix names are listed under hypotheses. They are not applied as matches in the counts above.

## Invoice-amount sensitivities

Rule used for the table: drop the QuickBooks header and `TOTAL` row, parse both QuickBooks date formats and the parentheses amounts, drop the 45 identical NetSuite copies, and exclude NetSuite `void`. Credits stay in the sum. QuickBooks Open and Overdue stay in the sum. H1 is January 1 through June 30.

| Period | Invoices | Parsed amount |
| --- | ---: | ---: |
| 2024 H1 | 1,251 | $19,632,079.97 |
| 2024 H2 | 1,308 | $21,090,757.45 |
| 2025 H1 | 1,315 | $21,104,939.64 |
| 2025 H2 | 1,363 | $22,457,583.60 |
| 2026 H1 | 1,316 | $19,809,511.58 |

Monthly NetSuite amounts under that same rule:

| Month | Amount | Month | Amount |
| --- | ---: | --- | ---: |
| 2025-01 | $3,502,435.02 | 2026-01 | $3,652,098.17 |
| 2025-02 | $3,853,547.28 | 2026-02 | $3,541,606.67 |
| 2025-03 | $2,980,585.17 | 2026-03 | $3,060,453.55 |
| 2025-04 | $3,064,883.10 | 2026-04 | $3,000,277.57 |
| 2025-05 | $3,467,658.31 | 2026-05 | $2,761,769.04 |
| 2025-06 | $4,235,830.76 | 2026-06 | $3,793,306.58 |

The latest NetSuite date is 2026-06-28 and the latest note is 2026-06-27. The export note does not say whether June 2026 was closed.

Two other parses of the deduplicated NetSuite file, same half years:

| Parse | 2025 H1 | 2026 H1 |
| --- | ---: | ---: |
| Keep voids, keep negatives | $21,317,443.74 (1,338 invoices) | $19,956,757.56 (1,334 invoices) |
| Drop voids, drop negatives | $21,323,166.15 (1,278 invoices) | $20,190,811.78 (1,272 invoices) |
| Drop voids, keep the 45 April 2026 copies | same $21,104,939.64, because the copies are in 2026 | $20,749,016.55 (1,361 invoices) |

Service line, duplicates removed, voids excluded, negatives kept:

| Service line | 2025 H1 invoices | 2025 H1 amount | 2026 H1 invoices | 2026 H1 amount |
| --- | ---: | ---: | ---: | ---: |
| Preventive Maintenance | 918 | $16,319,562.82 | 957 | $16,437,150.90 |
| Project/Install | 55 | $2,812,566.47 | 32 | $1,660,902.21 |
| Repair | 268 | $1,696,245.96 | 263 | $1,480,726.98 |
| Emergency Service | 74 | $276,564.39 | 64 | $230,731.49 |

Under this one parse, Preventive Maintenance is close across the two half years, and Project/Install is lower in 2026 H1. That split comes only from the NetSuite column `service_line`. It does not come from the invoice amount, and it does not come from the QuickBooks `Memo` text. 2024 is not in the table. The same inclusion rule as the half-year totals applies: duplicates removed, voids excluded, negative amounts kept. It becomes a statement about revenue only after that rule is accepted. If the board looks only at Preventive Maintenance, the two half years are close. If the board looks at every service line, 2026 H1 is lower, and Project/Install is the line that moves.

2024 Open plus Overdue is `$6,241,460.19` of the parsed QuickBooks file. Leaving those statuses out would change 2024 and would not have a matching status in NetSuite, which uses `paid`, `open`, and `void`.

## Confirmed issues

Dispositions below are recommendations. Nothing in this list has been applied in code.

### Apply with a mechanical rule

| Issue | What is confirmed | Impact if left alone | Disposition |
| --- | --- | --- | --- |
| Repeated QuickBooks header | One row whose fields are the column names | Amount parsing fails on that row | Drop it |
| QuickBooks `TOTAL` row | Equals the sum of the other 2,559 parsed amounts | Adds `$40,722,837.42` on top of the invoices | Keep it as a reconciliation check. Leave it out of invoice totals. |
| QuickBooks amount format | `$`, thousands separators, and parentheses | 73 credits totaling `-$939,872.86` are lost or rejected | Parse parentheses as negative |
| QuickBooks date format | 254 invoice dates use `Mon DD, YYYY` | Those invoices drop out if only slash dates are accepted | Parse both formats |
| NetSuite duplicate rows | 45 consecutive, field-identical extra copies, all in April 2026, totaling `$939,504.97` | H1 2026 is higher by that amount | Keep one row per `invoice_id` and report the dropped dollars |
| Contract duplicate rows | `CTR-5190` and `CTR-5232` exported twice, field-identical | Two contracts are double-counted | Keep one row per `contract_id` |
| Status and flag case | `inactive`, `monthly`, and `yes` | Filters split one value into two | Compare these fields case-insensitively |
| Leading spaces on nine CRM names | The character is in the export | An exact name join misses those nine customers | Trim before comparing names. Trimming does not merge the Longford, Overlook, or Kestrel pairs. |

### Show, and do not auto-correct

| Issue | What is confirmed | Impact | Disposition |
| --- | --- | --- | --- |
| CRM ids that share a normalized name | Three pairs, both ids billed in NetSuite | Customer totals are split. 54 QuickBooks rows totaling `$449,838.25` match both ids. | Show both ids. Ask whether each pair is one customer. |
| Redstone Property Group and Redstone Property Grp | Same city and industry, different ids and account managers | `$152,201.97` and `$42,385.41` after the duplicate drop. Two notes say only `Redstone Property`. | Show both. Do not assign those notes to one id. |
| Four QuickBooks names with no CRM id | 71 invoices, `$679,737.43` | That 2024 amount has no customer id | List the four names. Do not attach them to a near match. |
| Four NetSuite ids with no CRM row | `$973,202.61` across the four refs in the table above | Billed activity with no company name | Show the ids as unnamed billed customers |
| Contract end before start | Six contracts, listed above | They cannot be called active or expired | Show the six. Leave them out of an active-contract count. |
| Blank `annual_value` | Five contracts | Any contract-value total is short those five | Show the blanks |
| Blank `auto_renew` | Four contracts | Renewal cannot be classified | Show the blanks |
| Blank account manager | 17 CRM rows | Ownership is missing on those accounts | Show the blanks |

### Leave for later

Industry spelling, state spelling, and the 48 ambiguous CRM `created_date` values do not change the invoice sums or the customer id joins. A later pass can standardize them if a geographic or cohort view needs it.

## Hypotheses

These are plausible and unconfirmed.

- Each of the three normalized CRM pairs is one customer entered twice. The Redstone property pair may be the same kind of duplicate, with `Grp` left unexpanded. Redstone Market Group is a different record on the fields we have.
- The 23 shortened note names refer to the one CRM company they prefix. The list is Addison Stores, Alden Hospitality, Birchwood Clinic, Brixton Property, Dover Market, Fallbrook Commercial, Juniper Property, Kestrel Realty, Kirkwood Preparatory, Linden Stores, Marlow Property, Mercer Property, Oakes Retail, Osborne Clinic, Overlook Stores, Pelham Realty, Piermont Property, Rockville Realty, Thistle Freight, Verona Clinic, Vista Commercial, Yale Park, and Yardley Commercial. Each of those strings is a unique prefix of one normalized CRM name, or the CRM name is a unique prefix of the note name. That is a string fact. It is not an approved identity match. `Pelham Realty` also sits near Pelham Commercial Realty, which is a separate CRM row and is not a prefix match.
- Garden State Cold Storage, Metro North Facilities, and Pinnacle Office REIT are prospects rather than billing customers. The support is the prospect-meeting sentence and the absence of a CRM name. A differently spelled billed customer would break that reading.
- Month/day/year is the right reading of every CRM `created_date`. The other files support that, and 48 values would also be valid as day/month/year.
- QuickBooks memos could be grouped into the four NetSuite service lines. That crosswalk is not defined by either file.
- `auto_renew` of `Yes` might mean a contract continued past `end_date`. The export does not say so. Ninety-three otherwise valid contracts have an end date on or before 2026-06-30, so this assumption would change who looks current.

## Questions still open

- Which figure Dana wants for revenue: invoice amounts, cash collected, or contract value. Whether `open`, `overdue`, `void`, and credit amounts belong in it.
- Whether June 2026 is a closed month.
- Whether each CRM name pair is one customer or two, and who `C-0251`, `C-0585`, `C-0599`, and `C-0751` are.
- Whether the shortened note names are the same customers as the CRM prefix.
- Whether an end date before the start date is a bad export or an encoding we do not know.
- Whether `auto_renew` of `Yes` keeps a contract in force after `end_date`.
- Which note phrases should put a customer on a review list. Non-renewal, Therma-Serv, CoolFlow, price increase, service failure, and billing dispute are all in the file. Choosing them is a product decision, and the positive notes are in the same file.

## Working assumptions, in plain language

These are the choices for the prototype. They are written here so a reader can see what was decided and what was left open. They are not facts discovered in the files. The screens should say the same things.

**The main number is the sum of invoices, by the date on the invoice.** Call it billed. The files do not contain a finished accounting number, and they do not contain the day money arrived in the bank. `Paid` means the invoice is marked paid. It does not say when. The yearly price on a contract is a different number: some prices are blank, and contracts overlap, so adding that column does not answer "how is the year going."

**A few broken rows are left out, and the rest of the bill stays in.** Leave out the repeated QuickBooks header and the QuickBooks `TOTAL` row, because that row is the sum of the other 2024 invoices. Leave out the second copy of the 45 identical NetSuite invoices and the second copy of the two identical contracts. Leave out NetSuite invoices marked `void`, because those bills were cancelled. Keep negative invoices, because they are credits and they reduce the total. Keep QuickBooks invoices marked `Open` or `Overdue`, because the bill was still sent.

**Under that rule, first-half 2026 bills add up to less than first-half 2025.** Nearby choices move the 2026 number by hundreds of thousands of dollars, and it stays below 2025. The regular maintenance line is about the same in both half years. The large-project line is lower in 2026. That comparison uses the NetSuite label `service_line` for 2025 and 2026 only. The 2024 file has no such label. Its `Memo` column is a note typed on the invoice, and this prototype will not sort those notes into maintenance and projects.

**June 2026 is included through June 28.** The export does not say whether the month was closed. June has about as many invoices as the other months. Use it, say "through June 28," and do not stretch it into a full-year guess.

**Customers who might be duplicates stay as two records.** Longford, Overlook, and Kestrel each have two CRM ids. Redstone Property Group and Redstone Property Grp stay separate too. Both ids have their own NetSuite invoices. The company total still counts each invoice once. A customer total would change if the two ids were glued together, so the prototype shows both and asks. The four 2024 customer names with no CRM id stay on a data-quality list. They are not attached to a similar name.

**Four billed ids have no customer name.** `C-0251`, `C-0585`, `C-0599`, and `C-0751` stay inside the company total. On a review list they show as billed customers with no CRM name.

**Short note names are linked when the name points at only one CRM customer.** There are 23 of these. The link is by the name prefix, and the screen should say that. It is not an id match. `Redstone Property` points at two CRM records, so those notes stay unassigned. Garden State Cold Storage, Metro North Facilities, and Pinnacle Office REIT are not in the CRM. Each note says it was a prospect meeting, so they are not treated as customers who might leave.

**A contract with the end date before the start date is shown as broken.** There are six. The dates are not swapped. Those six are left out of any "this contract is ending" count.

**`auto_renew` is shown as written.** `Yes` is not treated as "this customer is still active after the end date." The file does not define that. Many contracts have an end date on or before 2026-06-30, so that guess would change who looks current. The review list uses CRM status, the change in billed invoices, and the quoted note. The contract end date is evidence on the row.

**Notes are grouped with a fixed set of labels taken from words already in the text.** The review labels are non-renewal, a competitor name (Therma-Serv or CoolFlow), a price increase, a service problem, and a billing dispute. A label is kept only when the quote is copied from that note. Positive notes stay in their own group. This is a choice about what to show Dana. It is not a probability that the customer will leave. If price pushback alone should not count, that label comes off and the quote remains.
