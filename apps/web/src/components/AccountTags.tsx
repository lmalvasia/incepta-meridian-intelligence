import type { AccountResponse } from "../types/dashboard";
import { tagsForAccount, type AccountTag, type AccountTagId, type TagKind } from "../utils/account-tags";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AccountTagsProps = {
  account: AccountResponse;
  kind?: TagKind;
  onSelect?: (id: AccountTagId) => void;
};

export function AccountTags({ account, kind, onSelect }: AccountTagsProps) {
  const tags = tagsForAccount(account).filter((tag) => kind === undefined || tag.kind === kind);
  if (tags.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex max-w-72 flex-wrap gap-1">
      {tags.map((tag) => (
        <Tooltip key={tag.id}>
          <TooltipTrigger
            type="button"
            className="rounded-4xl"
            onClick={
              onSelect === undefined
                ? undefined
                : (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(tag.id);
                  }
            }
          >
            <Badge variant={badgeVariant(tag)} className={reviewClass(tag)}>
              {tag.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 text-left leading-snug">{tag.meaning}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function badgeVariant(tag: AccountTag): "destructive" | "secondary" | "outline" {
  if (tag.level === "high") {
    return "destructive";
  }
  if (tag.level === "context") {
    return "secondary";
  }
  return "outline";
}

function reviewClass(tag: AccountTag): string {
  if (tag.level === "review") {
    return "border-transparent bg-amber-500/15 text-amber-950 dark:text-amber-100";
  }
  return "";
}
