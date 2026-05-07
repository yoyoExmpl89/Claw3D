import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("studio_access")?.value;
  const pathname = request.nextUrl.pathname;
  
  const isPublic = pathname === "/login" || pathname.startsWith("/_next/");
  
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};