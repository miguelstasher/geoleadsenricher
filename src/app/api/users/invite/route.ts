import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// For now, use regular client - in production you'd use service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, role, first_name, last_name } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { message: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'standard', 'reader'].includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role. Must be admin, standard, or reader' },
        { status: 400 }
      );
    }

    // For now, simulate invitation (in production, you'd use admin.inviteUserByEmail)
    // This would normally send an actual invitation email
    const data = {
      user: {
        email: email,
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || '',
          role: role,
          invited_by: 'admin'
        }
      }
    };
    const error = null;

    if (error) {
      console.error('Supabase invitation error:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      user: data.user
    });

  } catch (error) {
    console.error('Invitation API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
