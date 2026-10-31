import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { hostSlugFromHost, PARTNER_REF_COOKIE, sanitizePartnerSlug } from "@/lib/partners";

const PUBLIC_PREFIXES = ["/login", "/cadastro", "/agendar", "/pop", "/api/webhooks", "/api/health", "/uploads"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function partnerSlugFromRequest(request: NextRequest) {
  const fromQuery = sanitizePartnerSlug(request.nextUrl.searchParams.get("ref"));
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const appHost = (process.env.APP_URL || "https://beauty.megaflood.cloud")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
  return fromQuery || hostSlugFromHost(host, appHost);
}

function stampPartnerRef(request: NextRequest, response: NextResponse) {
  const slug = partnerSlugFromRequest(request);
  if (!slug) return response;
  response.cookies.set(PARTNER_REF_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function nextWithPartner(request: NextRequest) {
  const slug = partnerSlugFromRequest(request);
  const headers = new Headers(request.headers);
  if (slug) headers.set("x-partner-ref", slug);
  return stampPartnerRef(request, NextResponse.next({ request: { headers } }));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();

  if (isPublic(pathname)) {
    return nextWithPartner(request);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return stampPartnerRef(request, NextResponse.redirect(url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "aura-dev-secret-change-in-production-32chars");
    await jwtVerify(token, secret);
    return nextWithPartner(request);
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return stampPartnerRef(request, NextResponse.redirect(url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
