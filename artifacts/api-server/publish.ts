import { db, subjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Publishing all subjects...");
  const res = await db.update(subjectsTable).set({ isPublished: true }).returning();
  console.log(`Published ${res.length} subjects.`);
  process.exit(0);
}

run().catch(console.error);
