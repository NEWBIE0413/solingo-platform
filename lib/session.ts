import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth as betterAuth } from "@/lib/auth";

/*
 Server-side session helpers with the same call shapes the Clerk-based code used
 (`const { userId } = await auth()`, `await auth.protect()`, `await currentUser()`),
 so the rest of the app did not have to change.
*/
const getSession = async () => betterAuth.api.getSession({ headers: await headers() });

const authFn = async () => {
  const s = await getSession();
  return { userId: s?.user.id ?? null, sessionId: s?.session.id ?? null };
};

export const auth = Object.assign(authFn, {
  protect: async () => {
    const s = await getSession();
    if (!s) redirect("/sign-in");
    return s;
  },
});

export const currentUser = async () => {
  const s = await getSession();
  if (!s) return null;
  const u = s.user;
  return { id: u.id, name: u.name, email: u.email, image: u.image ?? null, firstName: u.name, imageUrl: u.image ?? null };
};
