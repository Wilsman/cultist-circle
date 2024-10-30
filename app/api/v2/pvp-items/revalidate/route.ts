import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST() {
  revalidateTag('pvp-items')
  return NextResponse.json({ revalidated: true, timestamp: Date.now() })
} 