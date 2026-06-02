import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy for fal media (OBJ / texture). Browser-side voxelization
// reads texture pixels off a <canvas>, which taints (and blocks readback) on
// cross-origin images unless they are served same-origin. This route relays
// the bytes so the canvas stays clean.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // Only allow fal media hosts.
  if (!/(^|\.)fal\.(media|ai)$/.test(parsed.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: upstream.status || 502 }
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=3600");
  headers.set("access-control-allow-origin", "*");

  return new NextResponse(upstream.body, { status: 200, headers });
}
