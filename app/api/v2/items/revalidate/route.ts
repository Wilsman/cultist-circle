import { revalidateTag } from 'next/cache'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('mode')

  if (!mode || (mode !== 'pve' && mode !== 'pvp')) {
    return NextResponse.json(
      { error: "Invalid mode parameter. Use 'pve' or 'pvp'" },
      { status: 400 }
    )
  }

  const tag = mode === 'pve' ? 'pve-items' : 'pvp-items'
  revalidateTag(tag)
  
  return NextResponse.json({ 
    revalidated: true, 
    mode,
    timestamp: Date.now() 
  })
} 