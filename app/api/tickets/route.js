import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient, jsonError } from "@/lib/convex-server";

export async function GET(request) {
  try {
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const tickets = await getConvexClient().query(api.tickets.list);

    if (status) {
      return NextResponse.json({
        tickets: tickets.filter((ticket) => ticket.status === status),
        filter: { status },
      });
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    return jsonError(error.message || "Failed to fetch tickets");
  }
}
