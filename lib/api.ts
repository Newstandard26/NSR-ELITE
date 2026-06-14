import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/auth";
import { AccuLynxError } from "@/lib/acculynx";

// Centralized error -> HTTP response mapping for route handlers.
export function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: err.flatten() },
      { status: 422 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: record not found (update/delete target missing).
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // P2002: unique constraint violation.
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Already exists" }, { status: 409 });
    }
    // P2003: foreign key constraint (e.g. referencing a missing related row).
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid reference" }, { status: 422 });
    }
  }
  if (err instanceof AccuLynxError) {
    return NextResponse.json(
      { error: err.message, acculynx: err.body },
      { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
    );
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
