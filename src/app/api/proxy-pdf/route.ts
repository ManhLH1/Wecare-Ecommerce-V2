import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");
    if (!target) {
      return new Response("Missing url", { status: 400 });
    }

    console.log("Proxying PDF from:", target);

    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,application/octet-stream,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      console.error("Upstream error:", upstream.status, upstream.statusText);
      return new Response(`Upstream error ${upstream.status}: ${upstream.statusText}`, {
        status: 502,
      });
    }

    const contentType = upstream.headers.get("content-type");
    console.log("Content-Type:", contentType);

    // Stream the PDF back to the client
    const headers = new Headers();
    headers.set("Content-Type", contentType || "application/pdf");
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Proxy error:", err);
    return new Response(`Proxy error: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 500 });
  }
}


