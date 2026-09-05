import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Cheap cookie check for the signed-in area; pages still verify the session server-side.
const PROTECTED = ["/learn", "/lesson", "/courses", "/shop", "/quests", "/leaderboard", "/admin", "/kana", "/streak", "/level", "/practice", "/profile"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
