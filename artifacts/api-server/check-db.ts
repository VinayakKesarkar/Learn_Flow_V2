import { db, subjectsTable } from "@workspace/db";
import fs from "fs";

async function main() {
  const allSubjects = await db.select().from(subjectsTable);
  fs.writeFileSync("output.json", JSON.stringify(allSubjects, null, 2));
  process.exit(0);
}

main().catch(console.error);
