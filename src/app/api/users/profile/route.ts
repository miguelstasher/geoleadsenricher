import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in profile GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, firstName, lastName, email, photo_url, bio } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Upsert user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        photo_url: photo_url,
        bio: bio,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in profile POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Photo and user ID are required' }, { status: 400 });
    }

    // Upload photo to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    // Get public URL for the uploaded photo
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    // Update user profile with new photo URL
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        photo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile with photo:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ photo_url: publicUrl, profile });
  } catch (error) {
    console.error('Error in photo upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 