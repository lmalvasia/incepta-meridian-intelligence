import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useRevenueAnalysis } from "../../hooks/useRevenueAnalysis";
import { AnalysisDialog } from "./AnalysisDialog";

export function QuickAnalysis() {
  const [open, setOpen] = useState(false);
  const analysis = useRevenueAnalysis();

  return (
    <>
      <button
        type="button"
        className="fixed right-6 bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-amber-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/40 hover:from-violet-500 hover:to-amber-300"
        onClick={() => {
          setOpen(true);
          if (!analysis.isPending) {
            analysis.mutate();
          }
        }}
      >
        <Sparkles className="size-4" />
        Get a quick analysis
      </button>
      <AnalysisDialog open={open} onOpenChange={setOpen} analysis={analysis} />
    </>
  );
}
