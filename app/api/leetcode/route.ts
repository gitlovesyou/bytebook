import { NextResponse } from 'next/server'

interface LeetCodeMetaResponse {
  title: string
  titleSlug: string
  difficulty: string
  acRate: number
  topicTags: { name: string }[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing required query parameter: slug' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`https://alfa-leetcode-api.onrender.com/select?titleSlug=${encodeURIComponent(slug)}`, {
      headers: {
        'User-Agent': 'ByteBook/1.0'
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!res.ok) {
      return NextResponse.json({
        slug,
        source: 'fallback',
        message: 'LeetCode API wrapper unavailable, returning static fallback dataset.'
      }, { status: 200 })
    }

    const data: LeetCodeMetaResponse = await res.json()

    return NextResponse.json({
      slug: data.titleSlug || slug,
      title: data.title,
      difficulty: data.difficulty,
      acRate: typeof data.acRate === 'number' ? parseFloat(data.acRate.toFixed(1)) : 50.0,
      tags: data.topicTags ? data.topicTags.map(t => t.name) : [],
      provenance: 'Live LeetCode GraphQL Sync',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      slug,
      source: 'fallback',
      message: 'Failed to communicate with LeetCode API'
    }, { status: 500 })
  }
}
