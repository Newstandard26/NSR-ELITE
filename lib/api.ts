import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
