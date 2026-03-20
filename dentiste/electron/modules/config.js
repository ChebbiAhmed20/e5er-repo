// Centralized production-safe configuration for the Electron desktop app.
//
// Important:
// - JWT_SECRET must match backend's `JWT_ACCESS_SECRET`
// - JWT_REFRESH_SECRET must match backend's `JWT_REFRESH_SECRET`
//
// Do NOT load these values from process.env in production (no .env packaging).

const NODE_ENV = process.env.NODE_ENV || "production";

// Values copied from: site/practice-care-hub/backend/.env
// JWT_ACCESS_SECRET=virela_access_secret_key_32_chars_long_minimum
// JWT_REFRESH_SECRET=virela_refresh_secret_key_32_chars_long_minimum
const JWT_SECRET = "virela_access_secret_key_32_chars_long_minimum";
const JWT_REFRESH_SECRET = "virela_refresh_secret_key_32_chars_long_minimum";

module.exports = {
  NODE_ENV,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};

