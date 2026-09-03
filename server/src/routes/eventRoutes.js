import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { createEvent, listEvents } from "../controllers/eventController.js";

const router = Router();

router.get("/", listEvents);
router.post("/", requireAuth, requireRole("organizer"), createEvent);

export default router;