import type { AccountResponse } from "../../types/dashboard";
import { tagById, tagCatalog, tagsForAccount, type AccountTag, type AccountTagId, type TagKind, type TagLevel } from "../../utils/account-tags";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TagBarProps = {
  accounts: AccountResponse[];
  selected: AccountTagId | null;
  onSelect: (id: AccountTagId | null) => void;
};

export function TagBar({ accounts, selected, onSelect }: TagBarProps) {
  const counts = tagCounts(accounts);
  const visible = tagCatalog.filter((tag) => (counts.get(tag.id) ?? 0) > 0 || tag.id === selected);
  const current = tagById(selected);
  return (
    <div className="flex flex-col gap-3">
      <TagGroup title="Flags" kind="flag" tags={visible} counts={counts} selected={selected} onSelect={onSelect} />
      <TagGroup title="Note" kind="note" tags={visible} counts={counts} selected={selected} onSelect={onSelect} />
      <p className="text-sm text-muted-foreground">
        Red is the strongest review mark. Amber is also on the review list. Gray stays on the account as context.
      </p>
      {current === null ? (
        <p className="text-sm text-muted-foreground">Choose a tag to see which accounts have it, and what the tag means.</p>
      ) : (
        <p className="text-sm text-muted-foreground">{current.meaning}</p>
      )}
    </div>
  );
}

type TagGroupProps = {
  title: string;
  kind: TagKind;
  tags: AccountTag[];
  counts: Map<AccountTagId, number>;
  selected: AccountTagId | null;
  onSelect: (id: AccountTagId | null) => void;
};

function TagGroup({ title, kind, tags, counts, selected, onSelect }: TagGroupProps) {
  const group = tags.filter((tag) => tag.kind === kind);
  if (group.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="flex flex-wrap gap-1">
        {group.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            count={counts.get(tag.id) ?? 0}
            selected={tag.id === selected}
            onSelect={() => onSelect(tag.id === selected ? null : tag.id)}
          />
        ))}
      </div>
    </div>
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

type TagChipProps = {
  tag: AccountTag;
  count: number;
  selected: boolean;
  onSelect: () => void;
};

function TagChip({ tag, count, selected, onSelect }: TagChipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
        )}
        onClick={onSelect}
      >
        <span className={cn("size-2 rounded-full", levelDot(tag.level, selected))} />
        {tag.label} · {count.toString()}
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-left leading-snug">{tag.meaning}</TooltipContent>
    </Tooltip>
  );
}

function levelDot(level: TagLevel, selected: boolean): string {
  if (selected) {
    return "bg-primary-foreground";
  }
  if (level === "high") {
    return "bg-destructive";
  }
  if (level === "review") {
    return "bg-amber-500";
  }
  return "bg-muted-foreground/50";
}
