import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { computeTicket } from "@/lib/calc";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { sendPriceSentEmail } from "@/lib/price-sent-email-server";

const pricingInputFields = new Set(["retailPrice", "adjustment", "checkIn", "checkOut"]);

function normalizeTicketPatch(data) {
  const normalized = { ...data };

  for (const field of ["retailPrice", "adjustment"]) {
    if (field in normalized) {
      normalized[field] = normalized[field] === "" || normalized[field] === null ? null : Number(normalized[field]);

      if (Number.isNaN(normalized[field])) {
        throw new Error(`${field} must be a number`);
      }
    }
  }

  return normalized;
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const ticket = await getConvexClient().query(api.tickets.get, { id });

    if (!ticket) {
      return jsonError("Ticket not found", 404);
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    return jsonError(error.message || "Failed to fetch ticket");
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const data = await readJsonBody(request);

    if (!data || Array.isArray(data) || typeof data !== "object") {
      return jsonError("Request body must be a JSON object", 400);
    }

    const client = getConvexClient();
    const existing = await client.query(api.tickets.get, { id });

    if (!existing) {
      return jsonError("Ticket not found", 404);
    }

    const normalizedData = normalizeTicketPatch(data);
    const shouldRecalculate = Object.keys(normalizedData).some((field) => pricingInputFields.has(field));
    const mergedTicket = { ...existing, ...normalizedData, id };
    const updateData = { ...normalizedData };

    if (shouldRecalculate) {
      const settings = await client.query(api.settings.get);
      Object.assign(updateData, computeTicket(mergedTicket, { ...DEFAULT_SETTINGS, ...(settings || {}) }));
    }

    let ticket = await client.mutation(api.tickets.update, { id, data: updateData });
    let priceSentEmail = null;

    if (ticket.status === "PRICE SENT") {
      try {
        priceSentEmail = await sendPriceSentEmail({
          client,
          ticket,
          origin: request.nextUrl.origin,
        });
        if (priceSentEmail.ticket) ticket = priceSentEmail.ticket;
      } catch (error) {
        priceSentEmail = {
          sent: false,
          error: error.message || "Failed to send price sent email",
        };
      }
    }

    return NextResponse.json({ ticket, priceSentEmail });
  } catch (error) {
    const message = error.message || "Failed to update ticket";
    if (message === "Invalid JSON body" || message.includes("must be a number")) {
      return jsonError(message, 400);
    }
    return jsonError(message, message.includes("not found") ? 404 : 500);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const client = getConvexClient();
    const ticket = await client.query(api.tickets.get, { id });

    if (!ticket) {
      return jsonError("Ticket not found", 404);
    }

    await client.mutation(api.tickets.remove, { id });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return jsonError(error.message || "Failed to delete ticket");
  }
}
