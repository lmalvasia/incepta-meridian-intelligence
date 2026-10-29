import { cn } from "@/lib/utils";

type YearFilterProps = {
  years: string[];
  year: string;
  onChange: (year: string) => void;
};

export function YearFilter({ years, year, onChange }: YearFilterProps) {
  const options = ["all", ...years];
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm",
            option === year ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option)}
        >
          {option === "all" ? "All years" : option}
        </button>
      ))}
    </div>
  );
}
