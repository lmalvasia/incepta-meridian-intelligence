import type { AccountResponse } from "../types/dashboard";

type AccountIdentityProps = {
  account: AccountResponse;
};

export function AccountIdentity({ account }: AccountIdentityProps) {
  return (
    <div className="flex flex-col gap-1">
      <p>
        {account.noCrmName ? "No CRM name" : account.displayName}{" "}
        <span className="text-muted-foreground">({account.sourceId})</span>
      </p>
      {account.repeatedName === null ? null : <p className="text-xs text-muted-foreground">{account.repeatedName}</p>}
    </div>
  );
}
