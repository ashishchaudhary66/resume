import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const sourceDir = resolve(projectDir, "..", "resumes");
const targetDir = resolve(projectDir, "public", "templates");

const files = [
  "React_DotNet_FullStack.tex",
  "Angular_DotNet_FullStack.tex",
  "React_Angular_DotNet_FullStack.tex"
];

mkdirSync(targetDir, { recursive: true });
for (const file of files) {
  copyFileSync(resolve(sourceDir, file), resolve(targetDir, file));
}
console.log("Copied " + files.length + " resume templates to public/templates.");
