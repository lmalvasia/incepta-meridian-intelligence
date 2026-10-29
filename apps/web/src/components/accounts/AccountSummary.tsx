import type { NoteCoverageResponse } from "@meridian/contracts";
import type { ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { info } from "../../utils/info";
import { ShareDonut } from "../charts/ShareDonut";
import { InfoTip } from "../InfoTip";
import type { AccountView } from "./AccountFilter";

type ReviewSplitProps = {
  review: number;
  clear: number;
  view: AccountView;
  onView: (view: AccountView) => void;
};

const reviewConfig = {
  review: { label: "To review", color: "var(--chart-2)" },
  clear: { label: "No issue", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ReviewSplit({ review, clear, view, onView }: ReviewSplitProps) {
  const total = review + clear;
  const activeId = view === "all" ? null : view;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>To review</CardTitle>
          <InfoTip text={info.reviewSplit} />
        </div>
        <CardDescription>
          {review.toString()} of {total.toString()} · {percent(review, total)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <ShareDonut
          slices={[
            { id: "review", label: "To review", value: review },
            { id: "clear", label: "No issue", value: clear },
          ]}
          config={reviewConfig}
          center={review.toString()}
          caption="to review"
          activeId={activeId}
          onSlice={(id) => {
            if (id === "review" || id === "clear") {
              onView(id);
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <SliceLabel id="review" label="To review" count={review} color="bg-[var(--chart-2)]" view={view} onView={onView} />
          <SliceLabel id="clear" label="No issue" count={clear} color="bg-[var(--chart-3)]" view={view} onView={onView} />
        </div>
      </CardContent>
    </Card>
  );
}

type NoteModelProps = {
  coverage: NoteCoverageResponse | undefined;
  failed: boolean;
};

const agreementConfig = {
  agrees: { label: "Agrees", color: "var(--chart-1)" },
  differs: { label: "Does not agree", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function NoteModel({ coverage, failed }: NoteModelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Note model</CardTitle>
          <InfoTip text={info.noteModel} />
        </div>
        {coverage === undefined || coverage.agreement === null ? null : (
          <CardDescription>
            Classified {coverage.classified.toString()} of {coverage.total.toString()} notes
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>{noteBody(coverage, failed)}</CardContent>
    </Card>
  );
}

function noteBody(coverage: NoteCoverageResponse | undefined, failed: boolean) {
  if (failed) {
    return <p className="text-sm text-muted-foreground">Coverage unavailable.</p>;
  }
  if (coverage === undefined) {
    return <p className="text-sm text-muted-foreground">Loading note coverage.</p>;
  }
  const agreement = coverage.agreement;
  if (agreement === null || agreement.known === 0) {
    return <p className="text-sm text-muted-foreground">{coverage.message}</p>;
  }
  const agrees = percentNumber(agreement.matched, agreement.known);
  const differs = agreement.known - agreement.matched;
  return (
    <div className="flex items-center gap-4">
      <ShareDonut
        slices={[
          { id: "agrees", label: "Agrees", value: agreement.matched },
          { id: "differs", label: "Does not agree", value: differs },
        ]}
        config={agreementConfig}
        center={`${agrees.toString()}%`}
        caption="agrees"
      />
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm bg-[var(--chart-1)]" />
          Agrees · {agreement.matched.toString()} of {agreement.known.toString()} · {agrees.toString()}%
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm bg-[var(--chart-2)]" />
          Does not agree · {differs.toString()} of {agreement.known.toString()} · {(100 - agrees).toString()}%
        </li>
      </ul>
    </div>
  );
}

type SliceLabelProps = {
  id: "review" | "clear";
  label: string;
  count: number;
  color: string;
  view: AccountView;
  onView: (view: AccountView) => void;
};

function SliceLabel({ id, label, count, color, view, onView }: SliceLabelProps) {
  const active = view === id;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 text-left text-sm",
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={() => onView(id)}
    >
      <span className={cn("size-2.5 rounded-sm", color)} />
      {label} · {count.toString()}
    </button>
  );
}

function percent(part: number, whole: number): string {
  return `${percentNumber(part, whole).toString()}%`;
}

function percentNumber(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }
  return Math.round((part / whole) * 100);
}
