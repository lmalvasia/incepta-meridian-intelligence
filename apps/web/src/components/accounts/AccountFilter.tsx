import { cn } from "@/lib/utils";

export type AccountView = "all" | "review" | "clear";

type AccountFilterProps = {
  view: AccountView;
  counts: Record<AccountView, number>;
  onChange: (view: AccountView) => void;
};

const options: Array<{ id: AccountView; label: string }> = [
  { id: "all", label: "All accounts" },
  { id: "review", label: "To review" },
  { id: "clear", label: "No issue" },
];

export function AccountFilter({ view, counts, onChange }: AccountFilterProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm",
            option.id === view ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label} · {counts[option.id].toString()}
        </button>
      ))}
    </div>
  );
}
