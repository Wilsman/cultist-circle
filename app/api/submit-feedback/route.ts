import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'edge'

export async function POST(request: Request) {
  const { type, description } = await request.json();

  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ feedback_type: type, description }]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit feedback' }, { status: 500 });
  }
}