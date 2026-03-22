import { Router } from "express";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import {
  db,
  certificatesTable,
  subjectsTable,
  usersTable,
  enrollmentsTable,
  sectionsTable,
  videosTable,
  videoProgressTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "certificates");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

async function generateCertificatePdf(
  userName: string,
  courseTitle: string,
  userId: number,
  subjectId: number,
): Promise<string> {
  const filename = `certificate_${userId}_${subjectId}.pdf`;
  const filepath = path.join(UPLOADS_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    const W = 841.89;
    const H = 595.28;

    // Gold border
    doc.save();
    doc.rect(24, 24, W - 48, H - 48).lineWidth(3).strokeColor("#c9a84c").stroke();
    doc.rect(30, 30, W - 60, H - 60).lineWidth(1).strokeColor("#c9a84c").stroke();
    doc.restore();

    // Top accent bar
    doc.rect(24, 24, W - 48, 8).fillColor("#1a3a6e").fill();
    doc.rect(24, H - 32, W - 48, 8).fillColor("#1a3a6e").fill();

    // Header
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#c9a84c")
      .text("LMS PRO", 0, 65, { align: "center", characterSpacing: 6 });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#999")
      .text("LEARNING MANAGEMENT SYSTEM", 0, 82, { align: "center", characterSpacing: 3 });

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(38)
      .fillColor("#1a3a6e")
      .text("Certificate of Completion", 0, 120, { align: "center" });

    // Divider
    doc.moveTo(W / 2 - 160, 175).lineTo(W / 2 + 160, 175).lineWidth(1).strokeColor("#c9a84c").stroke();

    // Body text
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("#444")
      .text("This certifies that", 0, 195, { align: "center" });

    doc
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor("#1a3a6e")
      .text(userName, 0, 215, { align: "center" });

    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("#444")
      .text("has successfully completed the course", 0, 260, { align: "center" });

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#c9a84c")
      .text(courseTitle, 0, 282, { align: "center" });

    // Divider
    doc.moveTo(W / 2 - 160, 320).lineTo(W / 2 + 160, 320).lineWidth(1).strokeColor("#c9a84c").stroke();

    // Date
    const issued = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#666")
      .text(`Issued on ${issued}`, 0, 335, { align: "center" });

    // Signature line
    doc.moveTo(W / 2 - 80, 445).lineTo(W / 2 + 80, 445).lineWidth(0.5).strokeColor("#999").stroke();
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#999")
      .text("Authorised Signature", 0, 452, { align: "center" });

    doc.end();
    stream.on("finish", () => resolve(`/api/certificates/download/${filename}`));
    stream.on("error", reject);
  });
}

// GET /api/certificates/:subjectId — get certificate for current user
router.get("/:subjectId", requireAuth, async (req, res) => {
  const subjectId = Number(req.params.subjectId as string);
  if (isNaN(subjectId)) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [cert] = await db
    .select()
    .from(certificatesTable)
    .where(and(eq(certificatesTable.userId, req.userId!), eq(certificatesTable.subjectId, subjectId)));

  res.json({ certificate: cert ?? null });
});

// POST /api/certificates/generate/:subjectId — generate certificate if completed
router.post("/generate/:subjectId", requireAuth, async (req, res) => {
  const subjectId = Number(req.params.subjectId as string);
  if (isNaN(subjectId)) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  // Check enrollment
  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.userId!), eq(enrollmentsTable.subjectId, subjectId)));

  if (!enrollment) {
    res.status(403).json({ error: "forbidden", message: "Not enrolled" });
    return;
  }

  // Check if already generated
  const [existing] = await db
    .select()
    .from(certificatesTable)
    .where(and(eq(certificatesTable.userId, req.userId!), eq(certificatesTable.subjectId, subjectId)));

  if (existing) {
    res.json({ certificate: existing, alreadyExists: true });
    return;
  }

  // Verify 100% completion
  const allVideos = await db
    .select({ id: videosTable.id })
    .from(videosTable)
    .innerJoin(sectionsTable, eq(videosTable.sectionId, sectionsTable.id))
    .where(eq(sectionsTable.subjectId, subjectId));

  const totalVideos = allVideos.length;
  if (totalVideos === 0) {
    res.status(400).json({ error: "bad_request", message: "Course has no videos" });
    return;
  }

  const videoIds = allVideos.map((v) => Number(v.id));
  const allProgress = await db
    .select()
    .from(videoProgressTable)
    .where(eq(videoProgressTable.userId, req.userId!));

  const completedCount = allProgress.filter(
    (p) => p.isCompleted && videoIds.includes(Number(p.videoId)),
  ).length;

  if (completedCount < totalVideos) {
    res.status(400).json({
      error: "not_completed",
      message: `Course not yet complete (${completedCount}/${totalVideos} videos done)`,
    });
    return;
  }

  // Get user and subject info
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));

  if (!user || !subject) {
    res.status(404).json({ error: "not_found", message: "User or subject not found" });
    return;
  }

  // Generate PDF
  const certificateUrl = await generateCertificatePdf(user.name, subject.title, req.userId!, subjectId);

  const [cert] = await db
    .insert(certificatesTable)
    .values({ userId: req.userId!, subjectId, certificateUrl })
    .returning();

  res.status(201).json({ certificate: cert });
});

// GET /api/certificates/download/:filename — serve the PDF file
router.get("/download/:filename", (req, res) => {
  const filename = path.basename(req.params.filename as string);
  const filepath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "not_found", message: "Certificate not found" });
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(filepath).pipe(res);
});

// GET /api/certificates/user/all — all certs for current user
router.get("/user/all", requireAuth, async (req, res) => {
  const certs = await db
    .select({
      id: certificatesTable.id,
      subjectId: certificatesTable.subjectId,
      certificateUrl: certificatesTable.certificateUrl,
      issuedAt: certificatesTable.issuedAt,
      subjectTitle: subjectsTable.title,
      subjectSlug: subjectsTable.slug,
    })
    .from(certificatesTable)
    .innerJoin(subjectsTable, eq(certificatesTable.subjectId, subjectsTable.id))
    .where(eq(certificatesTable.userId, req.userId!));

  res.json({ certificates: certs });
});

export default router;
