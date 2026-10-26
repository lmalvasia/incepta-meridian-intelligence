import { config } from "dotenv";
import path from "node:path";
import { findRepoRoot } from "@meridian/pipeline";

config({ path: path.join(findRepoRoot(process.cwd()), ".env") });
