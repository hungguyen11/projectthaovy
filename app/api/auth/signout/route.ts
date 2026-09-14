import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { route } from "@/lib/session";

/** POST /api/auth/signout — đăng xuất server-side, xóa cookie session. */
async function __POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const res = NextResponse.redirect(new URL("/", request.nextUrl), { status: 302 });
  return res;
}


export const POST = route(__POST);
