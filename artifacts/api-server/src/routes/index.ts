import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import subjectsRouter from "./subjects.js";
import videosRouter from "./videos.js";
import progressRouter from "./progress.js";
import reviewsRouter from "./reviews.js";
import certificatesRouter from "./certificates.js";
import discussionRouter from "./discussion.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/subjects", subjectsRouter);
router.use("/videos", videosRouter);
router.use("/progress", progressRouter);
router.use("/reviews", reviewsRouter);
router.use("/certificates", certificatesRouter);
router.use("/questions", discussionRouter);

export default router;
