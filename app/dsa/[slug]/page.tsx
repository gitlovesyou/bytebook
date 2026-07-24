import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { DSA_DATA } from '@/lib/dsa-data'
import { DSATopicClient } from '@/components/DSATopicClient'

interface Props {
  params: Promise<{ slug: string }>
}

function findTopicBySlug(slug: string) {
  for (const [phaseKey, phase] of Object.entries(DSA_DATA)) {
    const topic = phase.topics.find(t => t.slug === slug)
    if (topic) return { topic, phase, phaseKey }
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const found = findTopicBySlug(slug)
  if (!found) return { title: 'Not Found' }
  return {
    title: `${found.topic.name} Questions · ByteBook DSA`,
    description: `${found.topic.questions.length} curated ${found.topic.name} problems from beginner to advanced with full code solutions.`,
  }
}

export async function generateStaticParams() {
  const params: { slug: string }[] = []
  for (const phase of Object.values(DSA_DATA)) {
    phase.topics.forEach(t => params.push({ slug: t.slug }))
  }
  return params
}

export default async function DSATopicPage({ params }: Props) {
  const { slug } = await params
  const found = findTopicBySlug(slug)
  if (!found) notFound()
  const { topic, phase, phaseKey } = found

  const easyCount = topic.questions.filter(q => q.difficulty <= 2).length
  const mediumCount = topic.questions.filter(q => q.difficulty === 3).length
  const hardCount = topic.questions.filter(q => q.difficulty >= 4).length

  return (
    <div style={{ padding: '20px 24px', maxWidth: '100%' }}>
      {/* Breadcrumb (Compact) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12.5 }}>
        <Link href="/" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>Home</Link>
        <span style={{ color: 'var(--text-4)' }}>/</span>
        <Link href="/dsa" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>DSA Master Sheet</Link>
        <span style={{ color: 'var(--text-4)' }}>/</span>
        <span style={{ color: 'var(--text-3)' }}>{topic.name}</span>
      </div>

      {/* Header (Horizontal Flex Compact) */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 16, flexWrap: 'wrap', marginBottom: 20, paddingBottom: 12,
        borderBottom: '1px solid var(--border)'
      }}>
        {/* Left Side: Badge + Title + Subtitle + Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'var(--text)' }}>
              {topic.icon} {topic.name}
            </h1>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ background: phase.color + '18', border: `1px solid ${phase.color}33`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: phase.color, textTransform: 'uppercase' }}>
                {phaseKey}
              </div>
              <span style={{ color: 'var(--text-4)', fontSize: 11.5 }}>({phase.title})</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-3)' }}>
            <span>{topic.questions.length} problems</span>
            <span style={{ color: 'var(--text-4)' }}>•</span>
            
            {/* Inline Stats Badges */}
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                {easyCount} Easy
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                {mediumCount} Medium
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                {hardCount} Hard
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Revision Sheet Button */}
        <div>
          <Link href={`/dsa/${topic.slug}/revision`} className="revision-sheet-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800,
            padding: '6px 14px', borderRadius: 8, background: phase.color + '15', color: phase.color,
            border: `1px solid ${phase.color}30`, textDecoration: 'none', transition: 'all 0.15s'
          }}>
            📖 Revision Sheet
          </Link>
        </div>
      </div>

      {/* Interactive question list — client component */}
      <Suspense fallback={<div style={{ padding: 20, color: 'var(--text-4)' }}>Loading topic...</div>}>
        <DSATopicClient topic={topic} phaseColor={phase.color} />
      </Suspense>
    </div>
  )
}
