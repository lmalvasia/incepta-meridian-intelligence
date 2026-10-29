import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type InfoTipProps = {
  text: string;
};

export function InfoTip({ text }: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={text}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-left leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}
