// The e2e admin account. auth.setup.ts creates it (or resets it) with the admin
// scripts, signs in, sets up 2FA and saves the session for the admin projects.
export const ADMIN = {
  email: "e2e-admin@example.test",
  password: "e2e admin password, not a real one",
  storageState: "e2e/.auth/admin.json",
  totpFile: "e2e/.auth/totp.json",
};
