import { NextResponse } from "next/server";
import { supabase, trackClickAndLogAnalytics } from "@/lib/supabase";
import { UAParser } from "ua-parser-js";

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Fetch the QR code or Link
    const { data: item, error: fetchError } = await supabase
      .from("qr_codes")
      .select("id, original_url, clicks, type")
      .eq("slug", slug)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get headers
    const city = request.headers.get("x-vercel-ip-city") || "Desconhecida";
    const country = request.headers.get("x-vercel-ip-country") || "Desconhecido";
    const region = request.headers.get("x-vercel-ip-country-region") || "Desconhecida";
    const userAgent = request.headers.get("user-agent") || "";

    // Parse User Agent
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    let deviceType = "PC";
    if (result.device.type === "mobile") {
      deviceType = result.os.name === "iOS" ? "iOS" : "Android";
    } else if (result.device.type === "tablet") {
      deviceType = "Tablet";
    } else if (result.os.name === "Mac OS") {
      deviceType = "Mac";
    } else if (result.os.name === "Windows") {
      deviceType = "Windows";
    }

    const browser = result.browser.name || "Desconhecido";

    // Track click and log analytics using the centralized function
    await trackClickAndLogAnalytics(item.id, item.clicks || 0, {
      city,
      country,
      region,
      device: deviceType,
      browser,
    });

    let redirectUrl = item.original_url;
    if (
      !redirectUrl.startsWith("http://") &&
      !redirectUrl.startsWith("https://")
    ) {
      redirectUrl = "https://" + redirectUrl;
    }

    return NextResponse.json({ redirectUrl, type: item.type || 'qr' });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
