import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

const ENDPOINT = "fal-ai/hunyuan-3d/v3.1/pro/image-to-3d";

export async function POST(req: NextRequest) {
  const { image_url, enable_pbr, face_count } = await req.json();

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }
  if (!image_url || typeof image_url !== "string") {
    return NextResponse.json({ error: "image_url required" }, { status: 400 });
  }

  fal.config({ credentials: falKey });

  try {
    const { request_id } = await fal.queue.submit(ENDPOINT, {
      input: {
        input_image_url: image_url,
        generate_type: "Normal",
        enable_pbr: enable_pbr ?? false,
        face_count: face_count ?? 300000,
      },
    });

    return NextResponse.json({ request_id, endpoint: ENDPOINT });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
