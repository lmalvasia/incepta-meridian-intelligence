export type AnalysisFocus = "revenue" | "notes";

export function readFocus(text: string): { focus: AnalysisFocus; text: string } {
  const match = /^FOCUS:\s*(revenue|notes)\b\s*/i.exec(text);
  if (match === null) {
    return { focus: "revenue", text: text.trim() };
  }
  const token = match[1]?.toLowerCase();
  return {
    focus: token === "notes" ? "notes" : "revenue",
    text: text.slice(match[0].length).trim(),
  };
}
