import bcrypt from "bcryptjs";

// 12 rounds: standard current-practice tradeoff between brute-force cost
// and login latency. Configurable via env in case we need to tune later
// without touching this file.
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== "string" || plainPassword.length < 8) {
    throw new Error("Password must be a string of at least 8 characters");
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, passwordHash) {
  if (typeof plainPassword !== "string" || typeof passwordHash !== "string") {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}