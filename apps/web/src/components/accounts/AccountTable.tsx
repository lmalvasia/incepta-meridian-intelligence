import { Link } from "react-router";
import { AccountIdentity } from "../AccountIdentity";
import { AccountTags } from "../AccountTags";
import type { AccountResponse } from "../../types/dashboard";
import type { AccountTagId } from "../../utils/account-tags";
import { formatMoney, formatSignedChange } from "../../utils/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AccountTableProps = {
  accounts: AccountResponse[];
  onTag?: (id: AccountTagId) => void;
};

export function AccountTable({ accounts, onTag }: AccountTableProps) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No accounts in this filter.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>H1 2025</TableHead>
            <TableHead>H1 2026</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.sourceId}>
              <TableCell className="min-w-56 align-top">
                <Link to={`/accounts/${account.sourceId}`} className="hover:underline">
                  <AccountIdentity account={account} />
                </Link>
              </TableCell>
              <TableCell className="align-top">
                <AccountTags account={account} onSelect={onTag} />
              </TableCell>
              <TableCell className="align-top">{formatMoney(account.priorBilled)}</TableCell>
              <TableCell className="align-top">{formatMoney(account.currentBilled)}</TableCell>
              <TableCell className="align-top">{formatSignedChange(account.currentBilled, account.priorBilled)}</TableCell>
              <TableCell className="min-w-64 align-top text-sm">
                {account.quote.length > 0 ? <span>“{account.quote}”</span> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
