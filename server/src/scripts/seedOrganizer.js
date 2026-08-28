// Manual Organizer provisioning (spec.md §2.3) — there is no self-service
// Organizer signup, so this script is the only way an Organizer account
// gets created. Run by whoever administers the deployment, not from the app.
//
// Usage:
//   node src/scripts/seedOrganizer.js --name "Dr. Ali Raza" --email ali.raza@bbsul.edu.pk --department "Computer Science" [--password "someTempPass123"]
//
// If --password is omitted, a random temporary password is generated and
// printed once — share it with the organizer through a secure channel and
// have them change it after first login (spec.md §2.3; there is no
// forced-password-change flow built yet — see note in the task summary).

import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import { hashPassword } from "../utils/passwordUtils.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i++;
    }
  }
  return args;
}

export function generateTempPassword() {
  // 16 random bytes -> base64url, trimmed to a comfortable length. Comes
  // out well above the 8-char minimum and avoids characters that cause
  // copy/paste issues in terminals.
  return crypto.randomBytes(16).toString("base64url").slice(0, 20);
}

export function validateOrganizerArgs({ name, email, department, password }) {
  const errors = [];
  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("--name is required");
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    errors.push("--email is required and must be a valid email address");
  }
  if (!department || typeof department !== "string" || !department.trim()) {
    errors.push("--department is required");
  }
  if (password && (typeof password !== "string" || password.length < 8)) {
    errors.push("--password, if provided, must be at least 8 characters");
  }
  return errors;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = validateOrganizerArgs(args);

  if (errors.length > 0) {
    console.error("Cannot seed organizer:");
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error(
      '\nUsage: node src/scripts/seedOrganizer.js --name "Dr. Ali Raza" --email ali.raza@bbsul.edu.pk --department "Computer Science" [--password "..."]'
    );
    process.exit(1);
  }

  const name = args.name.trim();
  const email = args.email.trim().toLowerCase();
  const department = args.department.trim();
  const plainPassword = typeof args.password === "string" ? args.password : generateTempPassword();
  const wasGenerated = typeof args.password !== "string";

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.error(`An account with email "${email}" already exists (role: ${existing.role}). Aborting.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await hashPassword(plainPassword);

  const organizer = await User.create({
    role: "organizer",
    name,
    email,
    department,
    passwordHash,
  });

  console.log("Organizer account created:");
  console.log(`  Name:       ${organizer.name}`);
  console.log(`  Email:      ${organizer.email}`);
  console.log(`  Department: ${organizer.department}`);
  console.log(`  Password:   ${plainPassword}${wasGenerated ? "  (generated — shown once, share securely)" : ""}`);
  console.log("\nHand these credentials to the organizer through a secure channel. They should change the password after first login.");

  await mongoose.disconnect();
  process.exit(0);
}

// Only run when executed directly (`node seedOrganizer.js`), not when
// imported for testing parseArgs/validateOrganizerArgs/generateTempPassword.
// Compared as resolved filesystem paths, not raw strings — on Windows,
// process.argv[1] uses backslashes while import.meta.url is a forward-slash
// file:// URL, so a naive string comparison never matches there.
const isMainModule = path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "");
if (isMainModule) {
  main().catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
}