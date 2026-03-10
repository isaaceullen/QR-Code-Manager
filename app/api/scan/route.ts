import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { UAParser } from "ua-parser-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("qr_codes")
      .select("id, original_url, clicks")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Increment clicks
    await supabase
      .from("qr_codes")
      .update({ clicks: (data.clicks || 0) + 1 })
      .eq("id", data.id);

    return NextResponse.json({
      success: true,
      original_url: data.original_url,
      analytics: {
        browser: result.browser.name,
        os: result.os.name,
        device: result.device.type || "desktop",
      }
    });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
