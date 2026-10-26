import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import {
  AdminUserError,
  createAdmin,
  resetPassword,
  resetTwoFactor,
} from "../src/lib/auth/admin-users";
import { createAuth } from "../src/lib/auth/config";

import { scriptEnv, withDatabase } from "./db.mjs";

// The admin account, from the command line (there's no email to reset by):
//   pnpm admin:create <email> [--name "Name"]
//   pnpm admin:reset-password <email>
//   pnpm admin:reset-2fa <email>
// The password is asked for without echoing, or read from ADMIN_PASSWORD (for CI).

const usage =
  "Usage: tsx scripts/admin.mts <create|reset-password|reset-2fa> <email> [--name Name]";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { name: { type: "string" } },
});
const [command, email] = positionals;
if (!command || !email || !["create", "reset-password", "reset-2fa"].includes(command)) {
  console.error(usage);
  process.exit(1);
}

async function askPassword(prompt: string): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!stdin.isTTY) throw new AdminUserError("Set ADMIN_PASSWORD, or run this in a terminal.");
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  // Hide what's typed: print the prompt once, then nothing for each key.
  const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
  let prompted = false;
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
    if (!prompted) {
      write.call(rl, s);
      prompted = true;
    }
  };
  const first = await rl.question(prompt);
  stdout.write("\n");
  prompted = false;
  const second = await rl.question("Again: ");
  stdout.write("\n");
  rl.close();
  if (first !== second) throw new AdminUserError("The passwords don't match.");
  return first;
}

const env = scriptEnv();
try {
  await withDatabase(async (db) => {
    const auth = createAuth({ db, secret: env.BETTER_AUTH_SECRET, baseURL: env.SITE_URL });
    if (command === "create") {
      const password = await askPassword("Password (12+ characters): ");
      await createAdmin(auth, { email, name: values.name ?? "Admin", password });
      console.log(`Created ${email}. Sign in at ${env.SITE_URL}/admin and set up 2FA right away.`);
    } else if (command === "reset-password") {
      const password = await askPassword("New password (12+ characters): ");
      await resetPassword(auth, email, password);
      console.log(`New password set for ${email}; every session is signed out.`);
    } else {
      await resetTwoFactor(auth, db, email);
      console.log(`2FA is off for ${email}. Sign in at ${env.SITE_URL}/admin to set it up again.`);
    }
  });
} catch (error) {
  if (!(error instanceof AdminUserError)) throw error;
  console.error(error.message);
  process.exit(1);
}
