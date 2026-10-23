import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";

// The cron route checks its own secret instead of a session.
const PUBLIC_PATHS = ["/login", "/auth", "/api/cron"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // getClaims checks the session token locally when the project uses asymmetric
  // signing keys, so most requests skip a round trip to Supabase Auth.
  // It also refreshes an expired session, like getUser.
  const { data } = await supabase.auth.getClaims();

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));
  // Supabase lets anyone with the public anon key create an account, so a
  // session alone isn't enough: it must also belong to an invited email.
  const invited = isAllowedEmail(data?.claims?.email as string | undefined);
  if (!invited && !isPublic) {
    if (data?.claims) await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    // Carry over the cookies signOut cleared, so the stranger's session is gone.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
