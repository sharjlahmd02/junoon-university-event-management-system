import { Router } from "express";
import { enroll, verifyEnrollment, verify } from "../controllers/twoFactorController.js";

const router = Router();

// Neither route below uses requireAuth -- there is no full session at
// this point, only the short-lived enrollment/pending token issued by
// login(), which each route verifies itself (see
// twoFactorController.resolveEnrollingOrganizer and .verify).
router.post("/enroll", enroll);
router.post("/verify-enrollment", verifyEnrollment);
router.post("/verify", verify);

export default router;