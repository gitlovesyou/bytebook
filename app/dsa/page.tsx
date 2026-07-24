import type { Metadata } from 'next'
import Link from 'next/link'
import { DSA_DATA } from '@/lib/dsa-data'
import type { Phase, Topic, Question } from '@/lib/dsa-data'
import { DSAGraphClient } from '@/components/DSAGraphClient'

export const metadata: Metadata = {
  title: 'DSA Master Sheet · ByteBook',
  description: '500+ topic-wise DSA questions with codes, difficulty ratings, and progress tracking — from arrays to dynamic programming.',
}

export default function DSAPage() {
  const phases = Object.entries(DSA_DATA)
  return (
    <div style={{ padding: '48px 56px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Link href="/" style={{ color: 'var(--text-4)', fontSize: 13, textDecoration: 'none' }}>Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>DSA Master Sheet</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>📐 DSA Master Sheet</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 15, lineHeight: 1.7, maxWidth: 680, marginBottom: 0 }}>
          500+ curated problems organized by topic and difficulty — from beginner arrays to advanced dynamic programming. 
          Click any topic to explore problems with full explanations and code.
        </p>
      </div>

      {/* Interactive Roadmap Graph */}
      <div style={{ marginBottom: 48 }}>
        <DSAGraphClient />
      </div>

      {/* Phases */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🗂️ All Learning Phases</span>
      </h2>
      
      {phases.map(([phaseKey, phase]: [string, Phase]) => (
        <div key={phaseKey} style={{ marginBottom: 48 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
            paddingBottom: 14, borderBottom: '1px solid var(--border)'
          }}>
            <div style={{
              background: phase.color + '22', border: `1px solid ${phase.color}44`,
              borderRadius: 8, padding: '5px 14px',
              fontSize: 12, fontWeight: 800, color: phase.color,
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              {phaseKey}
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{phase.title}</h2>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-4)', fontWeight: 600 }}>
              {phase.topics.reduce((a: number, t: Topic) => a + t.questions.length, 0)} problems
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {phase.topics.map((topic: Topic) => (
              <Link key={topic.slug} href={`/dsa/${topic.slug}`} style={{ textDecoration: 'none' }}>
                <div className="dsa-topic-card" style={{ borderLeft: `3px solid ${phase.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{topic.icon} {topic.name}</div>
                    <div style={{ background: phase.color + '22', color: phase.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>
                      {topic.questions.length} Q
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 10 }}>{topic.subtopics?.join(' · ')}</div>
                  {/* Difficulty distribution */}
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[
                      { label: 'Easy', color: '#10b981', count: topic.questions.filter((q: Question) => q.difficulty <= 1).length },
                      { label: 'Med', color: '#f59e0b', count: topic.questions.filter((q: Question) => q.difficulty === 2 || q.difficulty === 3).length },
                      { label: 'Hard', color: '#ef4444', count: topic.questions.filter((q: Question) => q.difficulty >= 4).length },
                    ].map(d => d.count > 0 && (
                      <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: d.color, background: d.color + '15', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
                        <span>{d.count}</span><span style={{ opacity: 0.7 }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
