import { Router } from "express";
import { db, videosTable, sectionsTable, subjectsTable, enrollmentsTable, videoProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/:videoId", requireAuth, async (req, res) => {
  const videoId = parseInt(req.params.videoId as string);
  if (!videoId) {
    res.status(400).json({ error: "bad_request", message: "Invalid video ID" });
    return;
  }

  const [video] = await db
    .select({
      id: videosTable.id,
      title: videosTable.title,
      description: videosTable.description,
      youtubeUrl: videosTable.youtubeUrl,
      orderIndex: videosTable.orderIndex,
      durationSeconds: videosTable.durationSeconds,
      sectionId: videosTable.sectionId,
      sectionTitle: sectionsTable.title,
      subjectId: sectionsTable.subjectId,
    })
    .from(videosTable)
    .innerJoin(sectionsTable, eq(videosTable.sectionId, sectionsTable.id))
    .where(eq(videosTable.id, videoId));

  if (!video) {
    res.status(404).json({ error: "not_found", message: "Video not found" });
    return;
  }

  const subjectId = Number(video.subjectId);

  // Check enrollment
  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.userId!), eq(enrollmentsTable.subjectId, subjectId)));

  if (!enrollment) {
    res.status(403).json({ error: "forbidden", message: "Not enrolled in this subject" });
    return;
  }

  // Get all videos in this subject ordered globally
  const allVideos = await db
    .select({
      id: videosTable.id,
      sectionOrderIndex: sectionsTable.orderIndex,
      videoOrderIndex: videosTable.orderIndex,
    })
    .from(videosTable)
    .innerJoin(sectionsTable, eq(videosTable.sectionId, sectionsTable.id))
    .where(eq(sectionsTable.subjectId, subjectId))
    .orderBy(sectionsTable.orderIndex, videosTable.orderIndex);

  const globalIndex = allVideos.findIndex((v) => Number(v.id) === videoId);
  const previousVideoId = globalIndex > 0 ? Number(allVideos[globalIndex - 1].id) : null;
  const nextVideoId = globalIndex < allVideos.length - 1 ? Number(allVideos[globalIndex + 1].id) : null;

  // Determine if locked
  let locked = false;
  let unlockReason: string | null = null;
  if (globalIndex > 0 && previousVideoId) {
    const [prevProgress] = await db
      .select()
      .from(videoProgressTable)
      .where(and(eq(videoProgressTable.userId, req.userId!), eq(videoProgressTable.videoId, previousVideoId)));
    if (!prevProgress?.isCompleted) {
      locked = true;
      unlockReason = "Complete previous video first";
    }
  }

  res.json({
    id: Number(video.id),
    title: video.title,
    description: video.description,
    youtubeUrl: video.youtubeUrl,
    orderIndex: video.orderIndex,
    durationSeconds: video.durationSeconds,
    subjectId,
    sectionId: Number(video.sectionId),
    sectionTitle: video.sectionTitle,
    previousVideoId,
    nextVideoId,
    locked,
    unlockReason,
  });
});

export default router;
