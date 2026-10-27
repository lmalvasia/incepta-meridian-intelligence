# Customer matching

The importer links a source row to a CRM `Customer` only when a rule is explicit. A similar name does not become that customer. The comparison code is `packages/pipeline/src/customers/matching.ts`. The stored columns are `customerId`, `linkStatus`, and `linkReason` on the invoice, contract, or note. The shape is in [data-model.md](data-model.md).

## Rules

Candidates are sorted by CRM `sourceId`. The same files always produce the same decisions.

1. **Exact source id.** A NetSuite `customer_ref` or a contract `customer_id` that equals a CRM `sourceId` is `linked`. `C-0138` in NetSuite links to CRM `C-0138` even though `C-0800` has the same normalized name. The twin stays a separate customer. An id missing from the CRM is `unmatched`: `C-0251`, `C-0585`, `C-0599`, and `C-0751`.

2. **Normalized name.** `normalizeName` trims, case-folds, turns `&` into `and`, drops punctuation, and collapses spaces. The result is a comparison key, not a stored name. A name is `linked` only when that key equals one CRM customer and no other CRM customer is a token-boundary prefix or a trailing `Group`/`Grp` pair. `VERONA INDUSTRIES` and `brixton fabrication` link. `Longford Shopping Centers` does not: it equals both `C-0138` and `C-0800`.

3. **Near-duplicate.** An exact name that also has a prefix or Group/Grp neighbor is `held`. `linkReason` names both ids and `customerId` stays null. `Dunmore Shopping Centers` equals `C-0248` and is a prefix of `C-0784`. `Redstone Property Group` equals `C-0307` and differs from `C-0787` only by Group/Grp.

4. **Prefix and Group/Grp.** A token-boundary prefix or a trailing Group/Grp difference is `held`. It is never linked. `Yale Park` is held against `C-0744` Yale Park College. `Redstone Property` is a prefix of both `C-0307` and `C-0787`.

5. **Unmatched.** No candidate. QuickBooks: `Brixton Clinic Group`, `Emberly Property Group`, `Foxhall Clinic Group`, `Rockville Commercial Realty`. Notes: `Pinnacle Office REIT`, `Garden State Cold Storage`, `Metro North Facilities`. The four ids above are unmatched in both NetSuite and contracts.

CRM ids that share a normalized name, a token-boundary prefix, or a Group/Grp spelling stay two customers. Each gets a `possible_duplicate_customer` issue. The twelve pairs in this extract are the three normalized pairs (Longford, Overlook, Kestrel), the two Group/Grp pairs (Redstone Property, Quantock Hospitality), and the seven prefix pairs (`Inc.`, `Co.`, `Services`, `System`).

## What is stored

| `linkStatus` | When | `customerId` |
| --- | --- | --- |
| `linked` | Exact id, or one normalized name with no near-duplicate | Set |
| `held` | More than one candidate, a prefix, or Group/Grp | Null |
| `unmatched` | No candidate | Null |

`linkReason` is the sentence that names the CRM ids, or says that none matched. An ambiguous name raises `ambiguous_customer_name` on every invoice or note in that group. An unmatched name or id raises `unmatched_customer_name` or `unknown_customer_ref` on the earliest row only. A single prefix does not raise an issue. The status is still `held`.

`VERONA INDUSTRIES` and `  Verona   Industries ` are different exported strings. Both can link to `C-0277`. The original text stays on `customerRef` or `customerName`.

## Counts from `data/raw`

`pnpm --filter @meridian/pipeline test` classifies the five files and locks these counts. An identity is one exported customer ref or exact name in that file. Dollars are the sum of stored invoice amounts in that status, including voids and credits. They are not a revenue total. Contracts and notes add identities and no invoice dollars. The import prints the same figures.

| Source | Linked | Held | Unmatched |
| --- | ---: | ---: | ---: |
| Contracts | 161 identities, 161 contracts | 0 | 4 identities, 4 contracts |
| NetSuite | 169 identities, 3,961 invoices | 0 | 4 identities, 100 invoices |
| QuickBooks | 183 identities, 2,287 invoices | 26 identities, 201 invoices | 4 identities, 71 invoices |
| Account notes | 105 identities, 224 notes | 32 identities, 36 notes | 3 identities, 3 notes |
| Total | 618 identities, $101,220,377.11 | 58 identities, $2,079,229.29 | 15 identities, $1,652,940.04 |

NetSuite holds $63,256,506.41 linked and $973,202.61 unmatched. QuickBooks holds $37,963,870.70 linked, $2,079,229.29 held, and $679,737.43 unmatched.

Twenty-four CRM customers are near-duplicates of another CRM customer. They stay separate. The import prints the same identity totals, plus the invoice dollars in each status.

The QuickBooks unmatched identities are the four names above, and the 71 invoices are the rows behind them. The issue is stored on the earliest invoice of each name. Held QuickBooks rows are the Longford, Overlook, and Kestrel spellings plus both sides of the prefix and Group/Grp pairs. The 32 held note identities are nine ambiguous names and 23 unique prefixes such as `Yale Park`. `Kirkwood Preparatory` is one identity and two notes.

## How to inspect

After `pnpm run data:import`:

```sql
SELECT "linkStatus", count(*) AS invoices, sum(amount) AS dollars
FROM "Invoice"
GROUP BY 1
ORDER BY 1;
```

Held or unmatched rows, with the reason:

```sql
SELECT "billingSystem", "customerRef", "linkStatus", "linkReason", count(*) AS invoices, sum(amount) AS dollars
FROM "Invoice"
WHERE "linkStatus" <> 'linked'
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2;
```

CRM customers that were kept apart:

```sql
SELECT c."sourceId", c."displayName", i.description
FROM "DataQualityIssue" i
JOIN "Customer" c ON c.id = i."customerId"
WHERE i.code = 'possible_duplicate_customer'
ORDER BY c."sourceId";
```

## Limitations

- Legal and descriptive suffixes stay in the key. `Inc.`, `Co.`, `LLC`, `Group`, and `Services` are not removed. Dropping them would merge the Dunmore and Lowell pairs.
- `Group` and `Grp` are held. They are not merged, including Redstone Property Group and Redstone Property Grp.
- A shared first token is not a match. `Brixton Clinic Group` does not become a candidate for `Brixton Property Group` or `Foxhall Property Group`. There is no edit distance and no token-overlap score.
- Different CRM ids stay different customers. A shared name is an issue on each customer, not a merge.
- An explicit id still links to that CRM row. The name twin does not block `C-0138`.
- The four missing ids have no company name in any file, so a later name rule cannot reach them.
- QuickBooks `TOTAL` and a repeated header are not invoices. The command reports them as skipped rows.
