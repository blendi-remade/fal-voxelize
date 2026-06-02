import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  const endpoint = req.nextUrl.searchParams.get("endpoint");

  if (!requestId || !endpoint) {
    return NextResponse.json({ error: "requestId and endpoint required" }, { status: 400 });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }

  fal.config({ credentials: falKey });

  try {
    const status = await fal.queue.status(endpoint, { requestId, logs: true });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(endpoint, { requestId });
      return NextResponse.json({ status: "COMPLETED", result: result.data });
    }

    return NextResponse.json({
      status: status.status,
      logs: "logs" in status ? status.logs : [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const body =
      error && typeof error === "object" && "body" in error
        ? (error as Record<string, unknown>).body
        : undefined;
    return NextResponse.json({ error: message, detail: body }, { status: 500 });
  }
}
