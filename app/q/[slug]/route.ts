import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from('qr_codes')
    .select('id, original_url, clicks')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Increment clicks
  await supabase
    .from('qr_codes')
    .update({ clicks: (data.clicks || 0) + 1 })
    .eq('id', data.id);

  let redirectUrl = data.original_url;
  if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
    redirectUrl = 'https://' + redirectUrl;
  }

  return NextResponse.redirect(redirectUrl);
}
