'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getSuper150Questions } from '@/lib/super150'
import { useProgress } from '@/hooks/useProgress'
import { EditableCodeBlock } from '@/components/EditableCodeBlock'

const COMPANIES = ['Google', 'Amazon', 'Meta', 'Microsoft', 'Netflix', 'Apple', 'Uber', 'Adobe']
const DIFF_STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const DIFF_COLORS = ['', '#10b981', '#10b981', '#f59e0b', '#ef4444', '#ef4444']

export function Super150Client() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const qParam = searchParams.get('q')
  const activeQ = qParam ? parseInt(qParam, 10) : null

  const { solved, revisit, userCodes, toggle, toggleRevisit, saveCode } = useProgress()
  const superQuestions = useMemo(() => getSuper150Questions(), [])

  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('frequency')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null
    if (currentTheme) setTheme(currentTheme)
  }, [])

  const topicsList = useMemo(() => {
    return [...new Set(superQuestions.map(q => q.topicName))]
  }, [superQuestions])

  const solvedCount = useMemo(() => {
    return superQuestions.filter(q => solved.has(q.id)).length
  }, [superQuestions, solved])

  const progressPercentage = Math.round((solvedCount / 150) * 100)

  // Gamification Ranks
  let rankBadge = '🥉 Bronze Specialist'
  let rankColor = '#cd7f32'
  if (solvedCount >= 120) {
    rankBadge = '🏆 FAANG Legend'
    rankColor = '#a855f7'
  } else if (solvedCount >= 70) {
    rankBadge = '🥇 Gold Master'
    rankColor = '#eab308'
  } else if (solvedCount >= 30) {
    rankBadge = '🥈 Silver Contender'
    rankColor = '#94a3b8'
  }

  const filtered = useMemo(() => {
    let list = superQuestions

    if (selectedTopic !== 'all') {
      list = list.filter(q => q.topicName === selectedTopic)
    }

    if (selectedCompany !== 'all') {
      list = list.filter(q => q.companies.includes(selectedCompany))
    }

    if (selectedDifficulty !== 'all') {
      const targetDiff = parseInt(selectedDifficulty, 10)
      list = list.filter(q => q.difficulty === targetDiff)
    }

    if (selectedStatus === 'solved') {
      list = list.filter(q => solved.has(q.id))
    } else if (selectedStatus === 'unsolved') {
      list = list.filter(q => !solved.has(q.id))
    } else if (selectedStatus === 'revisit') {
      list = list.filter(q => revisit.has(q.id))
    }

    if (sortBy === 'frequency') {
      list = [...list].sort((a, b) => b.frequency - a.frequency)
    } else if (sortBy === 'difficulty') {
      list = [...list].sort((a, b) => b.difficulty - a.difficulty)
    } else if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    }

    return list
  }, [superQuestions, selectedTopic, selectedCompany, selectedDifficulty, selectedStatus, sortBy, solved, revisit])

  function handleSelectQuestion(id: number | null) {
    if (id === null) {
      router.push(pathname, { scroll: false })
    } else {
      router.push(`${pathname}?q=${id}`, { scroll: false })
    }
  }

  const activeQuestion = activeQ !== null ? superQuestions.find(q => q.id === activeQ) : null

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      
      {/* Gamified Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 50%, rgba(56,189,248,0.12) 100%)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(168,85,247,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                color: 'white',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.5px'
              }}>
                •• SUPER 150
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: rankColor, background: `${rankColor}20`, border: `1px solid ${rankColor}40`, padding: '2px 10px', borderRadius: 12 }}>
                {rankBadge}
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Super 150 Elite Interview Sheet
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 14.5, maxWidth: 680, lineHeight: 1.5 }}>
              The 150 highest-frequency, most critical questions asked across Google, Amazon, Meta, Microsoft, Apple & Netflix. Tagged with the double-dot <strong style={{ color: '#c084fc' }}>•• Super 150</strong> badge across ByteBook.
            </p>
          </div>

          {/* Gamified Mastery Progress Ring / Bar */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '18px 24px',
            minWidth: 260,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>Sheet Mastery</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#a855f7' }}>{progressPercentage}%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                borderRadius: 4,
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textAlign: 'right' }}>
              {solvedCount} / 150 Solved
            </div>
          </div>
        </div>

        {/* Company Breakdown Badges */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {COMPANIES.map(c => {
            const count = superQuestions.filter(q => q.companies.includes(c)).length
            return (
              <div key={c} style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span>🏢 {c}</span>
                <span style={{ color: '#a855f7', fontWeight: 900 }}>{count} Qs</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Split Code Editor View or Full Table */}
      {activeQuestion ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => handleSelectQuestion(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                ← Back to Super 150 Table
              </button>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#a855f7', background: 'rgba(168,85,247,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                •• Super 150 Question
              </span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{activeQuestion.name}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a
                href={activeQuestion.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--brand)',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 0 10px var(--brand-dim)'
                }}
              >
                Solve on LeetCode ↗
              </a>
              <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{activeQuestion.topicName} · {activeQuestion.subtopic}</span>
            </div>
          </div>

          <EditableCodeBlock
            questionId={activeQuestion.id}
            initialCode={userCodes[activeQuestion.id] || ''}
            language="cpp"
            onSaveSuccess={(newCode) => saveCode(activeQuestion.id, newCode)}
          />
        </div>
      ) : (
        /* Filter Controls & Main Table */
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
          
          {/* Filters Row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            {/* Topic Select */}
            <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
              <option value="all">📚 All Topics ({superQuestions.length})</option>
              {topicsList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Company Select */}
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
              <option value="all">🏢 All Companies</option>
              {COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Select */}
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
              <option value="all">📝 Status (All)</option>
              <option value="solved">✅ Solved ({solvedCount})</option>
              <option value="unsolved">❌ Unsolved</option>
              <option value="revisit">⭐ Revisit</option>
            </select>

            {/* Sort Selector */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
              <option value="frequency">🔥 Ask Frequency</option>
              <option value="difficulty">⭐ Difficulty</option>
              <option value="title">🔤 Title</option>
            </select>

            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--text-4)' }}>
              Showing {filtered.length} of 150 Questions
            </span>
          </div>

          {/* Super 150 Table */}
          <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', fontSize: 12, fontWeight: 800, color: 'var(--text-4)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 85 }}>Status</div>
              <div style={{ width: 120 }}>Badge</div>
              <div style={{ flex: 2 }}>Title & Topic</div>
              <div style={{ width: 100 }}>Difficulty</div>
              <div style={{ width: 110 }}>Interview Freq</div>
              <div style={{ width: 220 }}>Target Companies</div>
            </div>

            {/* Rows */}
            {filtered.map((q, idx) => {
              const isSolved = solved.has(q.id)
              const isRevisit = revisit.has(q.id)

              return (
                <div
                  key={q.id}
                  onClick={() => handleSelectQuestion(q.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSolved ? 'rgba(16, 185, 129, 0.04)' : 'var(--surface)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = isSolved ? 'rgba(16, 185, 129, 0.04)' : 'var(--surface)'}
                >
                  {/* Status */}
                  <div style={{ width: 85, display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <div
                      onClick={() => toggle(q.id)}
                      style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: `1.5px solid ${isSolved ? '#10b981' : 'var(--border)'}`,
                        background: isSolved ? '#10b981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {isSolved && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div onClick={() => toggleRevisit(q.id)} style={{ cursor: 'pointer', opacity: isRevisit ? 1 : 0.35 }}>
                      <span style={{ fontSize: 13, color: isRevisit ? '#f59e0b' : 'var(--text-4)' }}>★</span>
                    </div>
                  </div>

                  {/* Super 150 Double Dot Badge */}
                  <div style={{ width: 120 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: '#c084fc',
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 0 8px rgba(168, 85, 247, 0.2)'
                    }}>
                      <span style={{ fontSize: 11, lineHeight: 1 }}>••</span> Super 150
                    </span>
                  </div>

                  {/* Title & Topic */}
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{q.name}</div>
                      <a
                        href={q.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: 10,
                          fontWeight: 800,
                          color: '#38bdf8',
                          background: 'rgba(56,189,248,0.1)',
                          border: '1px solid rgba(56,189,248,0.25)',
                          borderRadius: 4,
                          padding: '1px 6px',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(56,189,248,0.2)'
                          e.currentTarget.style.transform = 'scale(1.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(56,189,248,0.1)'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title="Open external problem link"
                      >
                        Solve ↗
                      </a>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{q.topicName} · {q.subtopic}</div>
                  </div>

                  {/* Difficulty */}
                  <div style={{ width: 100 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: DIFF_COLORS[q.difficulty] }}>
                      {DIFF_STARS[q.difficulty]}
                    </span>
                  </div>

                  {/* Frequency */}
                  <div style={{ width: 110 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-2)' }}>{q.frequency}% Ask Rate</div>
                    <div style={{ width: 70, height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${q.frequency}%`, height: '100%', background: '#a855f7' }} />
                    </div>
                  </div>

                  {/* Target Companies */}
                  <div style={{ width: 220, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {q.companies.map((c: string) => (
                      <span key={c} style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
