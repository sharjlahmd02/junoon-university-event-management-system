import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { confirmPayment } from "../controllers/registrationController.js";

const router = Router();

router.patch("/:id/confirm-payment", requireAuth, requireRole("organizer"), confirmPayment);

export default router;