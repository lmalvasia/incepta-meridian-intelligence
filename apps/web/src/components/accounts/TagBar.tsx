import type { AccountResponse } from "../../types/dashboard";
import { tagById, tagCatalog, tagsForAccount, type AccountTagId } from "../../utils/account-tags";

type TagBarProps = {
  accounts: AccountResponse[];
  selected: AccountTagId | null;
  onSelect: (id: AccountTagId | null) => void;
};

export function TagBar({ accounts, selected, onSelect }: TagBarProps) {
  const counts = tagCounts(accounts);
  const visible = tagCatalog.filter((tag) => (counts.get(tag.id) ?? 0) > 0 || tag.id === selected);
  if (visible.length === 0) {
    return null;
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Tag</span>
      <select
        className="max-w-full rounded-lg bg-muted px-3 py-1.5 text-sm text-foreground"
        value={selected ?? ""}
        onChange={(event) => onSelect(tagById(event.target.value)?.id ?? null)}
      >
        <option value="">All tags</option>
        {visible.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.label} · {(counts.get(tag.id) ?? 0).toString()}
          </option>
        ))}
      </select>
    </label>
  );
}

function tagCounts(accounts: AccountResponse[]): Map<AccountTagId, number> {
  const counts = new Map<AccountTagId, number>();
  for (const account of accounts) {
    for (const tag of tagsForAccount(account)) {
      counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
    }
  }
  return counts;
}
