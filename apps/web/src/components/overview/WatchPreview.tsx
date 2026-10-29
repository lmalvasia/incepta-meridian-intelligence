import { Link } from "react-router";
import type { CustomersResponse } from "../../types/dashboard";
import { info } from "../../utils/info";
import { formatSignedChange } from "../../utils/money";
import { AccountIdentity } from "../AccountIdentity";
import { InfoTip } from "../InfoTip";
import { PageLink } from "../PageLink";
import { AccountTags } from "../AccountTags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WatchPreviewProps = {
  customers: CustomersResponse;
};

export function WatchPreview({ customers }: WatchPreviewProps) {
  const rows = customers.accounts.filter((account) => account.onWatchList).slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Accounts to review</CardTitle>
            <CardDescription>Tags mark a contract end, a broken contract, an inactive status, a missing CRM name, or a note category from the model.</CardDescription>
          </div>
          <InfoTip text={info.review} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No accounts to review.</p> : null}
        <ul className="flex flex-col gap-4">
          {rows.map((account) => (
            <li key={account.sourceId} className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0">
              <Link to={`/accounts/${account.sourceId}`} className="hover:underline">
                <AccountIdentity account={account} />
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <AccountTags account={account} />
                <span>{formatSignedChange(account.currentBilled, account.priorBilled)}</span>
              </div>
              {account.reading.length > 0 ? <p className="text-sm text-muted-foreground">{account.reading}</p> : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <PageLink to="/accounts?view=review">Full review list</PageLink>
          <PageLink to="/accounts">All accounts</PageLink>
        </div>
      </CardContent>
    </Card>
  );
}
