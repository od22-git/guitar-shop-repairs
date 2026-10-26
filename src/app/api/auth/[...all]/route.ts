import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth's endpoints: sign-in, 2FA, sign-out. Sign-up is disabled in its config.
export const { GET, POST } = toNextJsHandler(auth);
