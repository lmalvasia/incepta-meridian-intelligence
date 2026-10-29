import type { NoteCoverageResponse } from "@meridian/contracts";
import { useSearchParams } from "react-router";
import { AccountFilter, type AccountView } from "../components/accounts/AccountFilter";
import { NoteModel, ReviewSplit } from "../components/accounts/AccountSummary";
import { AccountTable } from "../components/accounts/AccountTable";
import { TagBar } from "../components/accounts/TagBar";
import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { useCustomers } from "../hooks/useCustomers";
import { useNoteCoverage } from "../hooks/useNoteCoverage";
import type { AccountResponse } from "../types/dashboard";
import { tagById, tagsForAccount, type AccountTagId } from "../utils/account-tags";

export function AccountsPage() {
  const customers = useCustomers();
  const coverage = useNoteCoverage();
  const [params, setParams] = useSearchParams();
  const view = accountView(params.get("view"));
  const tag = tagById(params.get("tag"))?.id ?? null;
  return (
    <>
      <PageHeader
        title="Accounts"
        description="Every customer. Tags mark who needs a look. Open a row to see its invoices."
      />
      <PageState query={customers}>
        {(data) => (
          <AccountBook
            accounts={data.accounts}
            coverage={coverage.data}
            coverageFailed={coverage.isError}
            view={view}
            tag={tag}
            onView={(next) => setParams(searchParams(next, tag))}
            onTag={(next) => setParams(searchParams(view, next))}
          />
        )}
      </PageState>
    </>
  );
}

type AccountBookProps = {
  accounts: AccountResponse[];
  coverage: NoteCoverageResponse | undefined;
  coverageFailed: boolean;
  view: AccountView;
  tag: AccountTagId | null;
  onView: (view: AccountView) => void;
  onTag: (tag: AccountTagId | null) => void;
};

function AccountBook({ accounts, coverage, coverageFailed, view, tag, onView, onTag }: AccountBookProps) {
  const review = accounts.filter((account) => account.onWatchList);
  const clear = accounts.filter((account) => !account.onWatchList);
  const inView = view === "review" ? review : view === "clear" ? clear : accounts;
  const visible = tag === null ? inView : inView.filter((account) => tagsForAccount(account).some((item) => item.id === tag));
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <ReviewSplit review={review.length} clear={clear.length} view={view} onView={onView} />
        <NoteModel coverage={coverage} failed={coverageFailed} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AccountFilter view={view} counts={{ all: accounts.length, review: review.length, clear: clear.length }} onChange={onView} />
        <TagBar accounts={inView} selected={tag} onSelect={onTag} />
      </div>
      <AccountTable accounts={visible} onTag={onTag} />
    </>
  );
}

function accountView(value: string | null): AccountView {
  if (value === "review" || value === "clear") {
    return value;
  }
  return "all";
}

function searchParams(view: AccountView, tag: AccountTagId | null): Record<string, string> {
  const next: Record<string, string> = {};
  if (view !== "all") {
    next.view = view;
  }
  if (tag !== null) {
    next.tag = tag;
  }
  return next;
}

