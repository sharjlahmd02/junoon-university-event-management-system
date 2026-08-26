import mongoose from "mongoose";

/**
 * Connects to MongoDB via Mongoose.
 *
 * Exits the process on failure — the app has no meaningful way to serve
 * requests without a DB connection, so failing loudly at boot is preferable
 * to limping along and throwing confusing errors on the first query.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("MONGO_URI is not set. Check your .env file (see .env.example).");
    process.exit(1);
  }

  try {
    // Default Mongoose timeout is 30s, which is a long silent hang on boot
    // if the DB is unreachable. Fail faster so the error surfaces quickly.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}