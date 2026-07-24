'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { DSA_DATA, PHASE_COLORS } from '@/lib/dsa-data'
import dsaLinksRaw from '@/lib/dsa-links.json'
import Link from 'next/link'

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

// ── Syntax-colored code block (client-side token colouring) ──
const KEYWORDS = /\b(int|char|bool|float|double|long|short|unsigned|void|return|if|else|for|while|do|switch|case|break|continue|class|struct|public|private|protected|new|delete|this|nullptr|true|false|const|static|auto|typename|template|namespace|using|include|define|typedef|enum|virtual|override|inline|extern|register|volatile|mutable|explicit|friend)\b/g
const STRINGS  = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g
const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g
const NUMBERS  = /\b(\d+\.?\d*)\b/g
const PREPROC  = /(#\w+)/g
const FUNCS    = /\b([a-zA-Z_]\w*)\s*(?=\()/g

function syntaxColor(code: string): { html: string } {
  // Escape HTML first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // We'll do a simple token-by-token approach
  // Mark regions with placeholders then replace
  type Tok = { start: number; end: number; color: string; content: string }
  const tokens: Tok[] = []

  const addTokens = (re: RegExp, color: string) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(escaped)) !== null) {
      tokens.push({ start: m.index, end: m.index + m[0].length, color, content: m[0] })
    }
  }

  // Order matters — comments first (highest priority)
  addTokens(new RegExp(COMMENTS.source, 'g'), '#6a9955')
  addTokens(new RegExp(STRINGS.source,  'g'), '#ce9178')
  addTokens(new RegExp(PREPROC.source,  'g'), '#c586c0')
  addTokens(new RegExp(KEYWORDS.source, 'g'), '#569cd6')
  addTokens(new RegExp(NUMBERS.source,  'g'), '#b5cea8')
  addTokens(new RegExp(FUNCS.source,    'g'), '#dcdcaa')

  // Sort by start, remove overlaps
  tokens.sort((a, b) => a.start - b.start)
  const noOverlap: Tok[] = []
  let cursor = 0
  for (const tok of tokens) {
    if (tok.start >= cursor) {
      noOverlap.push(tok)
      cursor = tok.end
    }
  }

  // Build output
  let result = ''
  let pos = 0
  for (const tok of noOverlap) {
    result += escaped.slice(pos, tok.start)
    result += `<span style="color:${tok.color}">${tok.content}</span>`
    pos = tok.end
  }
  result += escaped.slice(pos)

  return { html: result }
}

function CodeBlock({ code, questionId }: { code: string; questionId: number }) {
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n')
  const { html: coloredHtml } = useMemo(() => syntaxColor(code), [code])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lang = useMemo(() => {
    if (code.includes('import java') || code.includes('public class')) return 'JAVA'
    if (code.includes('def ') && !code.includes('#include')) return 'PYTHON'
    if (code.includes('console.log')) return 'JS'
    if (code.includes('stdio.h')) return 'C'
    return 'CPP'
  }, [code])

  if (!code.trim()) {
    return (
      <div className="code-block-wrap" style={{ margin: 0 }}>
        <div className="code-block-body" style={{
          padding: '20px', textAlign: 'center',
          color: 'var(--text-4)', fontSize: 12.5, fontStyle: 'italic'
        }}>
          No custom code saved yet. Open the DSA sheet and write your solution!
        </div>
      </div>
    )
  }

  return (
    <div className="code-block-wrap" style={{ margin: 0 }}>
      {/* Toolbar */}
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`code-block-copy${copied ? ' copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? (
              <>✓ Copied!</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Colored code body */}
      <div className="code-block-body" style={{ padding: 0 }}>
        <pre style={{
          margin: 0,
          padding: '16px 20px',
          fontFamily: 'JetBrains Mono, Fira Code, monospace',
          fontSize: 13,
          lineHeight: 1.65,
          color: '#e6edf3',
          overflowX: 'auto',
          background: 'transparent',
        }}>
          <code dangerouslySetInnerHTML={{ __html: coloredHtml }} />
        </pre>
      </div>
    </div>
  )
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

        /* ── Print: plain notepad style ── */
        @media print {
          body { background:#fff !important; color:#000 !important;
            -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
          .no-print, .revision-toc-sidebar, .hero-card, .tip-box { display:none !important; }
          .print-container { padding:0 !important; max-width:100% !important; }
          .revision-layout-with-toc { display:block !important; }

          /* Strip all syntax colours → plain black on white */
          .code-block-wrap { border:1px solid #ccc !important; background:#fff !important; box-shadow:none !important; break-inside:avoid; }
          .code-block-header { display:none !important; }
          .code-block-body, .code-block-body pre, .code-block-body code,
          .code-block-body span { color:#000 !important; background:#fff !important;
            font-family:'Courier New',Courier,monospace !important; font-size:11px !important; }
          .q-header h3, .q-header span { color:#000 !important; }
          .topic-band { border-left:3px solid #333 !important; background:#f5f5f5 !important; }
          .topic-band * { color:#000 !important; background:transparent !important; }
          .q-card { page-break-inside:avoid !important; margin-bottom:24px !important; }
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
                            <CodeBlock code={code} questionId={q.id} />
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
