import { currentUser } from "@/lib/session";

// Admins are listed by email in ADMIN_EMAILS (comma-separated).
export const getIsAdmin = async () => {
  const user = await currentUser();
  if (!user?.email) return false;
  const admins = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) ?? [];
  return admins.includes(user.email.toLowerCase());
};
