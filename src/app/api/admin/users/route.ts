import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET all users for admin
export async function GET(request: Request) {
  const supabase = await createClient();

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(profiles);
}

// PATCH to update a user (role, block status, anonymize)
export async function PATCH(request: Request) {
  const supabase = await createClient();

  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { targetUserId, updates } = await request.json();

  if (!targetUserId) return NextResponse.json({ error: 'Target User ID required' }, { status: 400 });

  // If anonymizing, set name/email to dummy values and record date
  if (updates.anonymize) {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: 'Utilisateur',
        last_name: 'Anonymisé',
        email: `anonymized-${targetUserId}@electrofix.invalid`,
        address: null,
        phone: null,
        anonymized_at: new Date().toISOString(),
        is_blocked: true, // Typically anonymized accounts shouldn't be accessible
      })
      .eq('id', targetUserId);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'User anonymized successfully' });
  }

  // General updates (role, is_blocked)
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'User updated successfully' });
}
