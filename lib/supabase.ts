import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function trackClickAndLogAnalytics(
  qrCodeId: string,
  currentClicks: number,
  analyticsData: {
    city: string;
    country: string;
    region: string;
    device: string;
    browser: string;
  }
) {
  // Increment clicks
  const { error: updateError } = await supabase
    .from("qr_codes")
    .update({ clicks: currentClicks + 1 })
    .eq("id", qrCodeId);

  if (updateError) {
    console.error("Error updating clicks:", updateError);
    return { success: false, error: updateError };
  }

  // Insert scan/click analytics
  const { error: insertError } = await supabase.from("qr_scans").insert([
    {
      qr_code_id: qrCodeId,
      ...analyticsData,
    },
  ]);

  if (insertError) {
    console.error("Error inserting analytics:", insertError);
    return { success: false, error: insertError };
  }

  return { success: true };
}
