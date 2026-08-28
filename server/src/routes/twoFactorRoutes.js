import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { enroll, verifyEnrollment, verify } from "../controllers/twoFactorController.js";

const router = Router();

router.post("/enroll", requireAuth, requireRole("organizer"), enroll);
router.post("/verify-enrollment", requireAuth, requireRole("organizer"), verifyEnrollment);
// No requireAuth -- there is no full session at this point, only the
// short-lived pending token issued by login(), which this route verifies itself.
router.post("/verify", verify);

export default router;