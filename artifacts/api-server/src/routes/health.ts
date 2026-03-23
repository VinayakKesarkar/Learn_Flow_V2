import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok" });
});

export default router;
