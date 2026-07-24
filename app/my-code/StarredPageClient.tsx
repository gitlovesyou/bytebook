'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { DSA_DATA, PHASE_COLORS } from '@/lib/dsa-data'
import dsaLinksRaw from '@/lib/dsa-links.json'
import Link from 'next/link'
import { EditableCodeBlock } from '@/components/EditableCodeBlock'

const dsaLinks = dsaLinksRaw as Record<string, string>

const DIFF_STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const DIFF_COLORS = ['', '#10b981', '#10b981', '#f59e0b', '#ef4444', '#ef4444']
const DIFF_LABELS = ['', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard']

const STORAGE_KEY = 'bytebook_dsa_progress'
const STORAGE_CODE_KEY = 'bytebook_dsa_codes'
const STORAGE_REVISIT_KEY = 'bytebook_dsa_revisit'

function getPlatformBadge(name: string) {
  const link = dsaLinks[name]
  if (!link) return { label: 'LC', color: '#f97316', link: '#' }
  if (link.includes('geeksforgeeks.org')) return { label: 'GFG', color: '#2f8d46', link }
  if (link.includes('spoj.com')) return { label: 'SPOJ', color: '#1a8cff', link }
  if (link.includes('naukri.com') || link.includes('codingninjas')) return { label: 'Ninja', color: '#f97316', link }
  return { label: 'LC', color: '#f97316', link }
}

type QMeta = {
  id: number; name: string; subtopic: string; difficulty: number
  topic: string; topicSlug: string; topicIcon: string
  phase: string; phaseColor: string
}

function getAllQuestions(): QMeta[] {
  const all: QMeta[] = []
  for (const [phaseKey, phaseData] of Object.entries(DSA_DATA)) {
    for (const topic of phaseData.topics) {
      for (const q of topic.questions) {
        all.push({
          id: q.id, name: q.name, subtopic: q.subtopic, difficulty: q.difficulty,
          topic: topic.name, topicSlug: topic.slug, topicIcon: topic.icon,
          phase: phaseKey, phaseColor: PHASE_COLORS[phaseKey] || '#6366f1',
        })
      }
    }
  }
  return all
}
const ALL_QUESTIONS = getAllQuestions()

const TOPIC_ORDER: string[] = []
for (const phaseData of Object.values(DSA_DATA)) {
  for (const topic of phaseData.topics) {
    if (!TOPIC_ORDER.includes(topic.name)) TOPIC_ORDER.push(topic.name)
  }
}


export function StarredPageClient() {
  const [revisit, setRevisit] = useState<Set<number>>(new Set())
  const [solved, setSolved] = useState<Set<number>>(new Set())
  const [userCodes, setUserCodes] = useState<Record<number, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')

  // Read everything from localStorage directly — no DB needed for display
  useEffect(() => {
    try {
      const rev = localStorage.getItem(STORAGE_REVISIT_KEY)
      const sol = localStorage.getItem(STORAGE_KEY)
      const codes = localStorage.getItem(STORAGE_CODE_KEY)
      if (rev) setRevisit(new Set(JSON.parse(rev)))
      if (sol) setSolved(new Set(JSON.parse(sol)))
      if (codes) setUserCodes(JSON.parse(codes))
    } catch { }
    setLoaded(true)
  }, [])

  // Seed localStorage stars → DB in background (fire-and-forget, one-time migration)
  useEffect(() => {
    if (!loaded) return
    try {
      const raw = localStorage.getItem(STORAGE_REVISIT_KEY)
      if (!raw) return
      const ids: number[] = JSON.parse(raw)
      if (ids.length === 0) return
      fetch('/api/seed-revisit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).catch(() => { })
    } catch { }
  }, [loaded])

  const starredQuestions = useMemo(
    () => ALL_QUESTIONS.filter(q => revisit.has(q.id)),
    [revisit]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return starredQuestions
    const s = search.toLowerCase()
    return starredQuestions.filter(q =>
      q.name.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s)
    )
  }, [starredQuestions, search])

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    for (const q of filtered) {
      if (!map[q.topic]) map[q.topic] = []
      map[q.topic].push(q)
    }
    return map
  }, [filtered])

  const orderedTopics = TOPIC_ORDER.filter(t => grouped[t])
  const totalStarred = starredQuestions.length
  const totalSolved = starredQuestions.filter(q => solved.has(q.id)).length
  const totalCoded = starredQuestions.filter(q => userCodes[q.id]).length

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>Loading starred questions...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '100%' }}>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* ── Screen layout ── */
        .revision-layout-with-toc {
          display: grid; grid-template-columns: 1fr 210px; gap: 32px; align-items: start;
        }
        @media (max-width: 900px) {
          .revision-layout-with-toc { grid-template-columns: 1fr; }
          .revision-toc-sidebar { display: none !important; }
        }
        .toc-anchor { transition: color 0.15s; }
        .toc-anchor:hover { color: var(--brand) !important; }

        /* Screen-mode styling for the new HTML structures */
        .question-container {
          margin-bottom: 40px;
        }
        .question-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .question-number {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13.5px;
          font-weight: 800;
          color: var(--text-4);
        }
        .question-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
        }
        .metadata-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          align-items: center;
        }
        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          background: var(--surface-2);
          color: var(--text-2);
          border: 1px solid var(--border);
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        /* ── Print: clean notepad / gedit editor light style ── */
        @media print {
          /* Reset backgrounds and enforce high fidelity printing */
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 11pt !important;
          }
          .no-print, .revision-toc-sidebar, .hero-card, .tip-box {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .revision-layout-with-toc {
            display: block !important;
          }
          
          /* Premium Question Container Layout */
          .question-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 55px !important;
          }

          /* Structure mappings from the template */
          .question-header {
            display: flex !important;
            align-items: flex-start !important;
            gap: 16px !important;
            margin-bottom: 14px !important;
          }
          .question-number { 
            color: #94a3b8 !important; 
            font-weight: 700 !important; 
            font-size: 15pt !important; 
            font-family: 'JetBrains Mono', monospace !important;
            font-variant-numeric: tabular-nums !important;
            margin-top: 2px !important;
          }
          .question-title { 
            font-size: 19pt !important; 
            font-weight: 700 !important; 
            color: #0f172a !important; 
            margin: 0 !important; 
            line-height: 1.25 !important; 
            letter-spacing: -0.015em !important;
          }
          .metadata-row {
            display: flex !important;
            gap: 8px !important;
            margin-bottom: 24px !important;
            margin-left: 58px !important; 
          }
          .badge {
            border: 1px solid #e2e8f0 !important;
            color: #475569 !important;
            padding: 4px 12px !important;
            font-size: 9.5pt !important;
            font-weight: 600 !important;
            border-radius: 6px !important;
            background: #f8fafc !important;
            letter-spacing: 0.01em !important;
          }

          /* Premium code box container */
          .code-block-wrap {
            border: 1px solid #cbd5e1 !important;
            background: #fafbfc !important;
            box-shadow: none !important;
            border-radius: 8px !important;
            margin-left: 58px !important; 
            overflow: hidden !important;
          }
          .code-block-header {
            font-family: 'JetBrains Mono', monospace !important;
            font-size: 9.5pt !important;
            font-weight: 500 !important;
            color: #64748b !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px 18px !important;
            background-color: #f8fafc !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            display: flex !important;
            justify-content: space-between !important;
          }
          .code-block-header div {
            display: none !important; /* Hide editor toolbar buttons in print */
          }
          .code-block-body {
            background: #fafbfc !important;
            padding: 0 !important;
          }
          .code-block-body pre,
          .code-block-pre {
            margin: 0 !important;
            padding: 22px 24px !important;
            background: transparent !important;
            white-space: pre-wrap !important;
            overflow: visible !important;
            color: #000000 !important; /* Force standard text/operators to be solid black */
          }
          .code-block-body code,
          .code-block-body span {
            font-family: 'Ubuntu Mono', 'Liberation Mono', 'DejaVu Sans Mono', Consolas, monospace !important; /* Linux gedit editor monospace stack */
            font-size: 16.5pt !important; /* Make font size even bigger */
            line-height: 1.65 !important;
            color: #000000 !important;
            font-weight: 500 !important; /* Medium normal weight for clean sharp printout */
            font-style: normal !important;
          }

          /* Clear all syntax colors on print to ensure everything is pure black */
          .code-block-body span[style*="color:"] {
            color: #000000 !important;
            font-weight: 500 !important;
            font-style: normal !important;
          }
        }
      `}} />

      <div className="print-container">

        {/* Breadcrumb */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 12.5 }}>
          <Link href="/" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>Home</Link>
          <span style={{ color: 'var(--text-4)' }}>/</span>
          <Link href="/dsa" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>DSA Master Sheet</Link>
          <span style={{ color: 'var(--text-4)' }}>/</span>
          <span style={{ color: 'var(--text-3)' }}>Starred Problems</span>
        </div>

        {/* Print button */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
              color: '#f59e0b', fontWeight: 700, fontSize: 12, fontFamily: 'JetBrains Mono'
            }}
          >🖨 Print / PDF</button>
        </div>

        {/* Hero */}
        <div className="hero-card" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #92400e88 100%)',
          color: '#fff', padding: '24px 30px', borderRadius: 12,
          marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>★ Starred Problems</div>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 12 }}>
            Your pinned questions with saved code — grouped by topic
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[`Starred: ${totalStarred}`, `Solved: ${totalSolved} / ${totalStarred}`, `Code Saved: ${totalCoded}`, `Topics: ${orderedTopics.length}`].map(label => (
              <span key={label} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600
              }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Tip box */}
        <div className="tip-box" style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '12px 18px', marginBottom: 24
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: 'var(--text)',
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ display: 'inline-block', width: 4, height: 11, background: '#f59e0b', borderRadius: 2 }} />
            How to Use
          </div>
          <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            <li>Click the <strong>★</strong> star on any question in the DSA sheet to pin it here.</li>
            <li>Questions grouped by topic. Syntax-colored code shown for each saved solution.</li>
            <li>Press <kbd style={{ fontFamily: 'JetBrains Mono', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)' }}>⌘P</kbd> to print — code comes out as plain black text.</li>
          </ul>
        </div>

        {/* Search */}
        {totalStarred > 0 && (
          <div style={{ position: 'relative', marginBottom: 24, maxWidth: 420 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search starred questions..."
              style={{
                width: '100%', padding: '9px 12px 9px 36px', boxSizing: 'border-box',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-1)', fontSize: 13,
                outline: 'none', fontFamily: 'inherit'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 18
              }}>×</button>
            )}
          </div>
        )}

        {/* Empty state */}
        {totalStarred === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px', background: 'var(--surface)',
            border: '1px dashed var(--border)', borderRadius: 12
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>☆</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No Starred Questions Yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 20 }}>
              Click the <span style={{ color: '#f59e0b', fontWeight: 900 }}>★</span> icon on any question in the DSA sheet to pin it here.
            </div>
            <Link href="/dsa" style={{
              display: 'inline-flex', alignItems: 'center', padding: '8px 18px',
              borderRadius: 8, background: '#f59e0b', color: 'white', fontWeight: 800, fontSize: 13, textDecoration: 'none'
            }}>Go to DSA Sheet</Link>
          </div>
        ) : orderedTopics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No matching questions.</div>
        ) : (
          <div className="revision-layout-with-toc">

            {/* LEFT: topic groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40, minWidth: 0 }}>
              {orderedTopics.map(topicName => {
                const qs = grouped[topicName]
                const meta = qs[0]
                const solvedInTopic = qs.filter(q => solved.has(q.id)).length
                const codedInTopic = qs.filter(q => userCodes[q.id]).length

                return (
                  <div key={topicName} id={`topic-${meta.topicSlug}`} style={{ scrollMarginTop: 90 }}>
                    {/* Topic band */}
                    <div className="topic-band" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px',
                      background: `linear-gradient(90deg, ${meta.phaseColor}20, transparent)`,
                      borderLeft: `4px solid ${meta.phaseColor}`,
                      borderRadius: '0 8px 8px 0',
                      marginBottom: 20, flexWrap: 'wrap', gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{meta.topicIcon}</span>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>{topicName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono', marginTop: 1 }}>
                            {solvedInTopic}/{qs.length} solved · {codedInTopic} with code
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700,
                          color: meta.phaseColor, background: `${meta.phaseColor}18`,
                          border: `1px solid ${meta.phaseColor}30`, padding: '1px 7px', borderRadius: 4
                        }}>{meta.phase}</span>
                      </div>
                      <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40'
                        }}>★ {qs.length}</span>
                        <Link href={`/dsa/${meta.topicSlug}`} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.25)', textDecoration: 'none'
                        }}>Sheet →</Link>
                        <Link href={`/dsa/${meta.topicSlug}/revision`} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: 'rgba(16,185,129,0.1)', color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.25)', textDecoration: 'none'
                        }}>Revision →</Link>
                      </div>
                    </div>

                    {/* Question cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                      {qs.map((q, idx) => {
                        const badge = getPlatformBadge(q.name)
                        const code = userCodes[q.id] || ''
                        const isSolved = solved.has(q.id)

                        return (
                          <div key={q.id} id={`starred-q-${q.id}`} className="question-container" style={{ scrollMarginTop: 100 }}>
                            {/* Question Header matching template */}
                            <div className="question-header">
                              <span className="question-number">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <h2 className="question-title">{q.name}</h2>
                            </div>

                            {/* Metadata Row matching template */}
                            <div className="metadata-row">
                              <span className="badge">{q.subtopic}</span>
                              {isSolved && <span className="badge">✓ Solved</span>}
                              <span className="badge" style={{ color: DIFF_COLORS[q.difficulty] }}>
                                {DIFF_LABELS[q.difficulty]}
                              </span>
                              <a href={badge.link} target="_blank" rel="noopener noreferrer"
                                className="no-print badge"
                                style={{
                                  color: badge.color,
                                  textDecoration: 'none',
                                  fontFamily: 'JetBrains Mono'
                                }}>
                                {badge.label} ↗
                              </a>
                            </div>

                            {/* Syntax-colored code block */}
                            <EditableCodeBlock
                              questionId={q.id}
                              initialCode={code}
                              language={(() => {
                                if (code.includes('import java') || code.includes('public class')) return 'java'
                                if (code.includes('def ') && !code.includes('#include')) return 'python'
                                if (code.includes('console.log')) return 'javascript'
                                if (code.includes('stdio.h')) return 'c'
                                return 'cpp'
                              })()}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RIGHT: sticky TOC */}
            <div className="no-print revision-toc-sidebar" style={{
              position: 'sticky', top: 'calc(var(--header-h) + 24px)',
              maxHeight: 'calc(100vh - var(--header-h) - 40px)',
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
              padding: '4px 0 4px 20px', borderLeft: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-2)' }}>
                Topics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orderedTopics.map(topicName => {
                  const qs = grouped[topicName]
                  const meta = qs[0]
                  return (
                    <div key={topicName}>
                      <a href={`#topic-${meta.topicSlug}`} style={{
                        fontSize: 12.5, color: 'var(--text-2)', textDecoration: 'none',
                        fontWeight: 700, display: 'block', marginBottom: 4, lineHeight: 1.3
                      }} className="toc-anchor">
                        {meta.topicIcon} {topicName}
                      </a>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                        {qs.map((q, idx) => (
                          <a key={q.id} href={`#starred-q-${q.id}`} style={{
                            fontSize: 11, color: 'var(--text-4)', textDecoration: 'none', lineHeight: 1.4
                          }} className="toc-anchor">
                            {String(idx + 1).padStart(2, '0')}. {q.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
