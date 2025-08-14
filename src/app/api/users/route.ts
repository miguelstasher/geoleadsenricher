import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, photo_url')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error in users GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email } = await request.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // Create new user profile
    const { data: user, error } = await supabase
      .from('user_profiles')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in user creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 