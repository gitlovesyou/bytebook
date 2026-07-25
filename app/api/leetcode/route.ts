import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const numberStr = searchParams.get('number')
  if (!numberStr) {
    return NextResponse.json({ error: 'Missing problem number' }, { status: 400 })
  }

  const number = parseInt(numberStr, 10)
  if (isNaN(number)) {
    return NextResponse.json({ error: 'Invalid problem number' }, { status: 400 })
  }

  try {
    const response = await fetch('https://leetcode.com/api/problems/all/', {
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      throw new Error(`LeetCode API returned status ${response.status}`)
    }

    const data = await response.json()
    const pairs = data.stat_status_pairs || []
    
    // Match either frontend ID or internal database ID
    const found = pairs.find((p: any) => 
      p.stat?.frontend_question_id === number || 
      p.stat?.question_id === number
    )

    if (!found) {
      return NextResponse.json({ error: `LeetCode problem #${number} not found` }, { status: 404 })
    }

    const title = found.stat.question__title
    const titleSlug = found.stat.question__title_slug
    const difficultyLevel = found.difficulty.level // 1: Easy, 2: Medium, 3: Hard

    // Map difficulty levels to 1-5 rating:
    // Level 1 (Easy) -> 2 stars
    // Level 2 (Medium) -> 3 stars
    // Level 3 (Hard) -> 4 stars
    const difficultyMap: Record<number, number> = {
      1: 2, 
      2: 3, 
      3: 4  
    }
    const difficulty = difficultyMap[difficultyLevel] || 3
    const url = `https://leetcode.com/problems/${titleSlug}/`

    return NextResponse.json({
      id: number,
      title,
      titleSlug,
      difficulty,
      url
    })
  } catch (error: any) {
    console.error('Error fetching LeetCode problem:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
