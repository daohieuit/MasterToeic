import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side supabase client for secure execution
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabaseServer
      .from('practice_history')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { attempt, userId } = await req.json();

    if (!userId || !attempt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabaseServer
      .from('practice_history')
      .insert({
        user_id: userId,
        test_id: attempt.testId,
        test_title: attempt.testTitle,
        mode: attempt.mode,
        part_name: attempt.partName || null,
        speaking_score: attempt.speakingScore,
        writing_score: attempt.writingScore,
        reviews: attempt.reviews
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
