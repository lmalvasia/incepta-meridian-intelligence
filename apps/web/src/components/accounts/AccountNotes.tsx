import type { AccountInvoicesResponse } from "../../types/dashboard";
import { tagById, type AccountTag } from "../../utils/account-tags";
import { Badge } from "@/components/ui/badge";

type AccountNote = AccountInvoicesResponse["notes"][number];

type AccountNotesProps = {
  notes: AccountInvoicesResponse["notes"];
};

export function AccountNotes({ notes }: AccountNotesProps) {
  return (
    <section className="flex flex-col gap-3">
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">No linked notes.</p> : null}
      {notes.map((note) => (
        <article key={note.sourceNoteId} className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge note={note} />
            {note.chosen ? <Badge variant="outline">On the list</Badge> : null}
            <p className="text-sm text-muted-foreground">
              {note.noteDate} · {note.sourceNoteId}
            </p>
          </div>
          <p className="text-sm">“{note.noteText}”</p>
        </article>
      ))}
    </section>
  );
}

function CategoryBadge({ note }: { note: AccountNote }) {
  const tag = tagById(note.category);
  if (tag === null) {
    return <Badge variant="secondary">Unlabeled</Badge>;
  }
  return (
    <Badge variant={badgeVariant(tag)} className={reviewClass(tag)}>
      {tag.label}
    </Badge>
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
