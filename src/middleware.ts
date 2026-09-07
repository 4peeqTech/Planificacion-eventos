import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "pymeton_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dejar pasar siempre la propia página de login y sus assets.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const appPassword = process.env.APP_PASSWORD;
  // Si no se configuró contraseña, no bloqueamos (evita quedar afuera por error de config).
  if (!appPassword) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === appPassword) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api/login).*)"],
};
