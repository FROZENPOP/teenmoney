// Syntax-checks every JS file the project ships or tests. Exits non-zero on the first failure.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const files = ["public/js", "worker", "tests", "scripts"]
  .filter(existsSync)
  .flatMap((dir) => readdirSync(dir, { recursive: true }).map((f) => join(dir, f)))
  .filter((f) => /\.m?js$/.test(f));

for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
console.log(`${files.length} files OK`);
