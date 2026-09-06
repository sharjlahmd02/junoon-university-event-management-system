import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { createEvent, listEvents, getEventById, updateEvent } from "../controllers/eventController.js";
import { registerForEvent } from "../controllers/registrationController.js";

const router = Router();

router.get("/", listEvents);
router.get("/:id", getEventById);
router.post("/", requireAuth, requireRole("organizer"), createEvent);
router.patch("/:id", requireAuth, requireRole("organizer"), updateEvent);
router.post("/:id/register", requireAuth, requireRole("student"), registerForEvent);

export default router;