import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

const ENDPOINT = "fal-ai/nano-banana-2";

export async function POST(req: NextRequest) {
  const { prompt, aspect_ratio, resolution } = await req.json();

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  fal.config({ credentials: falKey });

  try {
    const { request_id } = await fal.queue.submit(ENDPOINT, {
      input: {
        prompt,
        num_images: 1,
        aspect_ratio: aspect_ratio || "1:1",
        resolution: resolution || "1K",
        output_format: "png",
      },
    });

    return NextResponse.json({ request_id, endpoint: ENDPOINT });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
