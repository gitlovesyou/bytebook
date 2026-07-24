import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/seed-revisit  body: { ids: number[] }
// Seeds revisit=true for the given question IDs into SQLite
export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json() as { ids: number[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ seeded: 0 })
    }
    // Upsert each one
    await Promise.all(ids.map(id =>
      prisma.progress.upsert({
        where: { questionId: id },
        update: { revisit: true },
        create: { questionId: id, solved: false, revisit: true },
      })
    ))
    return NextResponse.json({ seeded: ids.length })
  } catch (e) {
    console.error('seed-revisit error', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
