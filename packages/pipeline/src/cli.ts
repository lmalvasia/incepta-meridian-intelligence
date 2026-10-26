import { defaultSourceDirectory } from "./repo.js";
import { formatImportReport, listSourceFiles } from "./source-files.js";

const files = await listSourceFiles(defaultSourceDirectory());
console.log(formatImportReport(files));
