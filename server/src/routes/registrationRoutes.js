import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { confirmPayment, getMyRegistrations, getMyPassQr } from "../controllers/registrationController.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("student"), getMyRegistrations);
router.get("/:id/pass", requireAuth, requireRole("student"), getMyPassQr);
router.patch("/:id/confirm-payment", requireAuth, requireRole("organizer"), confirmPayment);

export default router;