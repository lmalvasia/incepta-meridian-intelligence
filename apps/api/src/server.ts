import "./load-env.js";
import { buildApp } from "./app.js";
import { createAppContext } from "./composition.js";
import { defaultSourceDirectory } from "@meridian/pipeline";

const context = createAppContext();
const sourceFiles = await context.listSourceFiles(defaultSourceDirectory());
const noteAnalysis = await context.noteAnalyzer.analyzeNotes([]);
const app = await buildApp(context, { logger: true });

app.log.info(
  {
    domain: context.domain.name,
    sourceFiles: sourceFiles.length,
    noteAnalysis: noteAnalysis.status,
  },
  "starting api",
);

await app.listen({ port: readPort(process.env["API_PORT"]), host: "0.0.0.0" });

function readPort(raw: string | undefined): number {
  if (raw === undefined || raw.length === 0) {
    return 3001;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid API_PORT: ${raw}`);
  }

  return port;
}
