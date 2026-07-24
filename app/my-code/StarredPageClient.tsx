'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { DSA_DATA, PHASE_COLORS } from '@/lib/dsa-data'
import dsaLinksRaw from '@/lib/dsa-links.json'
import Link from 'next/link'
import { EditableCodeBlock } from '@/components/EditableCodeBlock'

const dsaLinks = dsaLinksRaw as Record<string, string>

const DIFF_STARS  = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const DIFF_COLORS = ['', '#10b981', '#10b981', '#f59e0b', '#ef4444', '#ef4444']
const DIFF_LABELS = ['', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard']

const STORAGE_KEY         = 'bytebook_dsa_progress'
const STORAGE_CODE_KEY    = 'bytebook_dsa_codes'
const STORAGE_REVISIT_KEY = 'bytebook_dsa_revisit'

function getPlatformBadge(name: string) {
  const link = dsaLinks[name]
  if (!link) return { label: 'LC', color: '#f97316', link: '#' }
  if (link.includes('geeksforgeeks.org')) return { label: 'GFG', color: '#2f8d46', link }
  if (link.includes('spoj.com'))           return { label: 'SPOJ', color: '#1a8cff', link }
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
  const [revisit, setRevisit]   = useState<Set<number>>(new Set())
  const [solved, setSolved]     = useState<Set<number>>(new Set())
  const [userCodes, setUserCodes] = useState<Record<number, string>>({})
  const [loaded, setLoaded]     = useState(false)
  const [search, setSearch]     = useState('')

  // Read everything from localStorage directly — no DB needed for display
  useEffect(() => {
    try {
      const rev  = localStorage.getItem(STORAGE_REVISIT_KEY)
      const sol  = localStorage.getItem(STORAGE_KEY)
      const codes = localStorage.getItem(STORAGE_CODE_KEY)
      if (rev)   setRevisit(new Set(JSON.parse(rev)))
      if (sol)   setSolved(new Set(JSON.parse(sol)))
      if (codes) setUserCodes(JSON.parse(codes))
    } catch {}
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
      }).catch(() => {})
    } catch {}
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
  const totalSolved  = starredQuestions.filter(q => solved.has(q.id)).length
  const totalCoded   = starredQuestions.filter(q => userCodes[q.id]).length

  if (!loaded) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <div style={{ textAlign:'center', color:'var(--text-3)' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>⏳</div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:13 }}>Loading starred questions...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '100%' }}>

      <style dangerouslySetInnerHTML={{ __html: `
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

        /* ── Print: clean notepad / gedit editor light style ── */
        @media print {
          body {
            background: #ffffff !important;
            color: #1e293b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 12px !important;
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
          .q-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 24px !important;
          }
          .q-header h3 {
            color: #0f172a !important;
            font-size: 15px !important;
          }
          .q-header span {
            color: #64748b !important;
          }
          .topic-band {
            border-left: 4px solid #333333 !important;
            background: #f1f5f9 !important;
            padding: 6px 12px !important;
            margin-bottom: 16px !important;
          }
          .topic-band * {
            color: #0f172a !important;
            background: transparent !important;
          }

          /* Notepad/gedit style code editor box */
          .code-block-wrap {
            border: 1px solid #cbd5e1 !important;
            border-left: 3px solid #6366f1 !important; /* Notepad margin line indicator */
            background: #fafafa !important;
            box-shadow: none !important;
            border-radius: 6px !important;
            overflow: hidden !important;
          }
          .code-block-header {
            background: #f1f5f9 !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 4px 10px !important;
            display: flex !important;
            justify-content: space-between !important;
          }
          .code-block-header .code-block-lang {
            color: #475569 !important;
            font-weight: 800 !important;
            font-size: 10px !important;
          }
          .code-block-header div {
            display: none !important; /* Hide copy/edit buttons in print */
          }
          .code-block-body {
            background: #fafafa !important;
            padding: 0 !important;
          }
          .code-block-body pre {
            margin: 0 !important;
            padding: 8px 12px !important;
            background: transparent !important;
            white-space: pre-wrap !important;
            overflow: visible !important;
          }
          .code-block-body code,
          .code-block-body span {
            font-family: 'JetBrains Mono', 'Consolas', 'Courier New', monospace !important;
            font-size: 11px !important;
            line-height: 1.5 !important;
          }

          /* Custom light-mode syntax colors for printed paper compatibility */
          .code-block-body span[style*="color: #ff7b72"] { color: #d73a49 !important; font-weight: bold !important; } /* Keywords (salmon -> red) */
          .code-block-body span[style*="color: #a5d6ff"] { color: #032f62 !important; } /* Strings (light blue -> dark blue) */
          .code-block-body span[style*="color: #8b949e"] { color: #6a737d !important; font-style: italic !important; } /* Comments (grey -> dark grey) */
          .code-block-body span[style*="color: #79c0ff"] { color: #005cc5 !important; } /* Numbers */
          .code-block-body span[style*="color: #d2a6ff"] { color: #6f42c1 !important; } /* Custom classes/structs (purple) */
          .code-block-body span[style*="color: #ffa657"] { color: #e36209 !important; } /* Standard Types */
          .code-block-body span[style*="color: #dcdcaa"] { color: #005cc5 !important; } /* Functions */
        }
      `}} />

      <div className="print-container">

        {/* Breadcrumb */}
        <div className="no-print" style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, fontSize:12.5 }}>
          <Link href="/" style={{ color:'var(--text-4)', textDecoration:'none' }}>Home</Link>
          <span style={{ color:'var(--text-4)' }}>/</span>
          <Link href="/dsa" style={{ color:'var(--text-4)', textDecoration:'none' }}>DSA Master Sheet</Link>
          <span style={{ color:'var(--text-4)' }}>/</span>
          <span style={{ color:'var(--text-3)' }}>Starred Problems</span>
        </div>

        {/* Print button */}
        <div className="no-print" style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
          <button
            onClick={() => window.print()}
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'7px 16px', borderRadius:8, cursor:'pointer',
              background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)',
              color:'#f59e0b', fontWeight:700, fontSize:12, fontFamily:'JetBrains Mono'
            }}
          >🖨 Print / PDF</button>
        </div>

        {/* Hero */}
        <div className="hero-card" style={{
          background:'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #92400e88 100%)',
          color:'#fff', padding:'24px 30px', borderRadius:12,
          marginBottom:20, boxShadow:'0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.5px', marginBottom:4 }}>★ Starred Problems</div>
          <div style={{ fontSize:13, color:'#94a3b8', fontWeight:500, marginBottom:12 }}>
            Your pinned questions with saved code — grouped by topic
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[`Starred: ${totalStarred}`, `Solved: ${totalSolved} / ${totalStarred}`, `Code Saved: ${totalCoded}`, `Topics: ${orderedTopics.length}`].map(label => (
              <span key={label} style={{
                background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)',
                color:'#e2e8f0', padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600
              }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Tip box */}
        <div className="tip-box" style={{
          background:'var(--surface-2)', border:'1px solid var(--border)',
          borderRadius:8, padding:'12px 18px', marginBottom:24
        }}>
          <div style={{
            fontSize:12, fontWeight:800, color:'var(--text)',
            textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6,
            display:'flex', alignItems:'center', gap:6
          }}>
            <span style={{ display:'inline-block', width:4, height:11, background:'#f59e0b', borderRadius:2 }} />
            How to Use
          </div>
          <ul style={{ paddingLeft:16, margin:0, fontSize:12.5, color:'var(--text-3)', lineHeight:1.5 }}>
            <li>Click the <strong>★</strong> star on any question in the DSA sheet to pin it here.</li>
            <li>Questions grouped by topic. Syntax-colored code shown for each saved solution.</li>
            <li>Press <kbd style={{ fontFamily:'JetBrains Mono', background:'var(--surface)', padding:'1px 5px', borderRadius:4, border:'1px solid var(--border)' }}>⌘P</kbd> to print — code comes out as plain black text.</li>
          </ul>
        </div>

        {/* Search */}
        {totalStarred > 0 && (
          <div style={{ position:'relative', marginBottom:24, maxWidth:420 }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)', fontSize:14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search starred questions..."
              style={{
                width:'100%', padding:'9px 12px 9px 36px', boxSizing:'border-box',
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:8, color:'var(--text-1)', fontSize:13,
                outline:'none', fontFamily:'inherit'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', color:'var(--text-4)', cursor:'pointer', fontSize:18
              }}>×</button>
            )}
          </div>
        )}

        {/* Empty state */}
        {totalStarred === 0 ? (
          <div style={{
            textAlign:'center', padding:'48px 24px', background:'var(--surface)',
            border:'1px dashed var(--border)', borderRadius:12
          }}>
            <div style={{ fontSize:32, marginBottom:12 }}>☆</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>No Starred Questions Yet</div>
            <div style={{ fontSize:13, color:'var(--text-4)', marginBottom:20 }}>
              Click the <span style={{ color:'#f59e0b', fontWeight:900 }}>★</span> icon on any question in the DSA sheet to pin it here.
            </div>
            <Link href="/dsa" style={{
              display:'inline-flex', alignItems:'center', padding:'8px 18px',
              borderRadius:8, background:'#f59e0b', color:'white', fontWeight:800, fontSize:13, textDecoration:'none'
            }}>Go to DSA Sheet</Link>
          </div>
        ) : orderedTopics.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No matching questions.</div>
        ) : (
          <div className="revision-layout-with-toc">

            {/* LEFT: topic groups */}
            <div style={{ display:'flex', flexDirection:'column', gap:40, minWidth:0 }}>
              {orderedTopics.map(topicName => {
                const qs = grouped[topicName]
                const meta = qs[0]
                const solvedInTopic = qs.filter(q => solved.has(q.id)).length
                const codedInTopic  = qs.filter(q => userCodes[q.id]).length

                return (
                  <div key={topicName} id={`topic-${meta.topicSlug}`} style={{ scrollMarginTop:90 }}>
                    {/* Topic band */}
                    <div className="topic-band" style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 16px',
                      background:`linear-gradient(90deg, ${meta.phaseColor}20, transparent)`,
                      borderLeft:`4px solid ${meta.phaseColor}`,
                      borderRadius:'0 8px 8px 0',
                      marginBottom:20, flexWrap:'wrap', gap:8
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:18 }}>{meta.topicIcon}</span>
                        <div>
                          <div style={{ fontWeight:900, fontSize:16, color:'var(--text)' }}>{topicName}</div>
                          <div style={{ fontSize:11, color:'var(--text-4)', fontFamily:'JetBrains Mono', marginTop:1 }}>
                            {solvedInTopic}/{qs.length} solved · {codedInTopic} with code
                          </div>
                        </div>
                        <span style={{
                          fontSize:10, fontFamily:'JetBrains Mono', fontWeight:700,
                          color:meta.phaseColor, background:`${meta.phaseColor}18`,
                          border:`1px solid ${meta.phaseColor}30`, padding:'1px 7px', borderRadius:4
                        }}>{meta.phase}</span>
                      </div>
                      <div className="no-print" style={{ display:'flex', gap:8 }}>
                        <span style={{
                          padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background:'#f59e0b20', color:'#f59e0b', border:'1px solid #f59e0b40'
                        }}>★ {qs.length}</span>
                        <Link href={`/dsa/${meta.topicSlug}`} style={{
                          padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background:'rgba(99,102,241,0.1)', color:'#818cf8',
                          border:'1px solid rgba(99,102,241,0.25)', textDecoration:'none'
                        }}>Sheet →</Link>
                        <Link href={`/dsa/${meta.topicSlug}/revision`} style={{
                          padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background:'rgba(16,185,129,0.1)', color:'#10b981',
                          border:'1px solid rgba(16,185,129,0.25)', textDecoration:'none'
                        }}>Revision →</Link>
                      </div>
                    </div>

                    {/* Question cards */}
                    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                      {qs.map((q, idx) => {
                        const badge  = getPlatformBadge(q.name)
                        const code   = userCodes[q.id] || ''
                        const isSolved = solved.has(q.id)

                        return (
                          <div key={q.id} id={`starred-q-${q.id}`} className="q-card" style={{ scrollMarginTop:100 }}>
                            {/* Question header */}
                            <div className="q-header" style={{
                              display:'flex', justifyContent:'space-between', alignItems:'center',
                              borderBottom:'1px solid var(--border)', paddingBottom:8, marginBottom:12,
                              flexWrap:'wrap', gap:10
                            }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontFamily:'JetBrains Mono', fontSize:12.5, fontWeight:800, color:'var(--text-4)' }}>
                                  #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--text)' }}>{q.name}</h3>
                                <span style={{ fontSize:11, color:'var(--text-4)' }}>({q.subtopic})</span>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                {isSolved && (
                                  <span style={{
                                    fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:4,
                                    background:'#10b98115', color:'#10b981', border:'1px solid #10b98130'
                                  }}>✓ Solved</span>
                                )}
                                <span style={{
                                  fontSize:11, fontWeight:800, color:DIFF_COLORS[q.difficulty],
                                  background:`${DIFF_COLORS[q.difficulty]}15`, padding:'2px 8px', borderRadius:4
                                }}>
                                  {DIFF_LABELS[q.difficulty]} {DIFF_STARS[q.difficulty]}
                                </span>
                                <a href={badge.link} target="_blank" rel="noopener noreferrer"
                                  className="no-print"
                                  style={{
                                    fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:4,
                                    background:`${badge.color}15`, color:badge.color,
                                    border:`1px solid ${badge.color}40`, textDecoration:'none',
                                    fontFamily:'JetBrains Mono'
                                  }}>
                                  {badge.label} ↗
                                </a>
                              </div>
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
              position:'sticky', top:'calc(var(--header-h) + 24px)',
              maxHeight:'calc(100vh - var(--header-h) - 40px)',
              overflowY:'auto', display:'flex', flexDirection:'column', gap:16,
              padding:'4px 0 4px 20px', borderLeft:'1px solid var(--border)'
            }}>
              <div style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text-2)' }}>
                Topics
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {orderedTopics.map(topicName => {
                  const qs = grouped[topicName]
                  const meta = qs[0]
                  return (
                    <div key={topicName}>
                      <a href={`#topic-${meta.topicSlug}`} style={{
                        fontSize:12.5, color:'var(--text-2)', textDecoration:'none',
                        fontWeight:700, display:'block', marginBottom:4, lineHeight:1.3
                      }} className="toc-anchor">
                        {meta.topicIcon} {topicName}
                      </a>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, paddingLeft:8 }}>
                        {qs.map((q, idx) => (
                          <a key={q.id} href={`#starred-q-${q.id}`} style={{
                            fontSize:11, color:'var(--text-4)', textDecoration:'none', lineHeight:1.4
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
