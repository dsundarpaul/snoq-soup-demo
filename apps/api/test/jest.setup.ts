import * as dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set default test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key";
process.env.JWT_ACCESS_EXPIRATION = "15m";
process.env.JWT_REFRESH_EXPIRATION = "7d";
