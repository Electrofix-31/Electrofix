import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Check if user is signed in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  // Use a relative URL for redirect, which works well with reverse proxies
  const url = new URL(request.url);
  const origin = url.origin;

  return NextResponse.redirect(`${origin}/`, {
    status: 303,
  });
}
