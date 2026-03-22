import { Router } from "express";
import {
  db,
  courseReviewsTable,
  enrollmentsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, avg, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/reviews — create or update a review
router.post("/", requireAuth, async (req, res) => {
  const { subject_id, rating, review_text } = req.body;

  if (!subject_id || !rating) {
    res.status(400).json({ error: "bad_request", message: "subject_id and rating are required" });
    return;
  }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: "bad_request", message: "rating must be an integer between 1 and 5" });
    return;
  }

  const subjectId = Number(subject_id);

  // Must be enrolled
  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.userId!), eq(enrollmentsTable.subjectId, subjectId)));

  if (!enrollment) {
    res.status(403).json({ error: "forbidden", message: "You must be enrolled to review this course" });
    return;
  }

  // Upsert review
  const [existing] = await db
    .select()
    .from(courseReviewsTable)
    .where(and(eq(courseReviewsTable.userId, req.userId!), eq(courseReviewsTable.subjectId, subjectId)));

  if (existing) {
    const [updated] = await db
      .update(courseReviewsTable)
      .set({ rating: ratingNum, reviewText: review_text ?? null, updatedAt: new Date() })
      .where(eq(courseReviewsTable.id, Number(existing.id)))
      .returning();
    res.json({ review: updated, updated: true });
  } else {
    const [created] = await db
      .insert(courseReviewsTable)
      .values({ userId: req.userId!, subjectId, rating: ratingNum, reviewText: review_text ?? null })
      .returning();
    res.status(201).json({ review: created, updated: false });
  }
});

// GET /api/reviews/subjects/:subjectId
router.get("/subjects/:subjectId", async (req, res) => {
  const subjectId = Number(req.params.subjectId as string);
  if (isNaN(subjectId)) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [stats] = await db
    .select({ averageRating: avg(courseReviewsTable.rating), totalReviews: count() })
    .from(courseReviewsTable)
    .where(eq(courseReviewsTable.subjectId, subjectId));

  const reviews = await db
    .select({
      id: courseReviewsTable.id,
      rating: courseReviewsTable.rating,
      reviewText: courseReviewsTable.reviewText,
      createdAt: courseReviewsTable.createdAt,
      userName: usersTable.name,
      userId: courseReviewsTable.userId,
    })
    .from(courseReviewsTable)
    .innerJoin(usersTable, eq(courseReviewsTable.userId, usersTable.id))
    .where(eq(courseReviewsTable.subjectId, subjectId))
    .orderBy(desc(courseReviewsTable.createdAt));

  res.json({
    averageRating: stats?.averageRating ? parseFloat(Number(stats.averageRating).toFixed(1)) : null,
    totalReviews: Number(stats?.totalReviews ?? 0),
    reviews: reviews.map((r) => ({
      id: Number(r.id),
      rating: r.rating,
      reviewText: r.reviewText,
      createdAt: r.createdAt,
      userName: r.userName,
      userId: Number(r.userId),
    })),
  });
});

// GET /api/reviews/mine/:subjectId — current user's review for a subject
router.get("/mine/:subjectId", requireAuth, async (req, res) => {
  const subjectId = Number(req.params.subjectId as string);
  if (isNaN(subjectId)) {
    res.status(400).json({ error: "bad_request", message: "Invalid subject ID" });
    return;
  }

  const [review] = await db
    .select()
    .from(courseReviewsTable)
    .where(and(eq(courseReviewsTable.userId, req.userId!), eq(courseReviewsTable.subjectId, subjectId)));

  res.json({ review: review ?? null });
});

export default router;
