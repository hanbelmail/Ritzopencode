import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/calendar(.*)",
  "/clients(.*)",
  "/settings(.*)",
  "/api-dashboard(.*)",
  "/new(.*)",
]);

const isProtectedApiRoute = createRouteMatcher([
  "/api/tickets(.*)",
]);

const isAuthRoute = createRouteMatcher([
  "/login",
  "/register",
]);

function hasApiKey(request) {
  const apiKey = process.env.N8N_API_KEY;

  if (!apiKey) {
    return false;
  }

  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const headerApiKey = request.headers.get("x-api-key") || "";

  return bearerToken === apiKey || headerApiKey === apiKey;
}

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedApiRoute(request) && !hasApiKey(request) && !(await convexAuth.isAuthenticated())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  if (isAuthRoute(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
