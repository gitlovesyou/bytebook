import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DSA_DATA } from '@/lib/dsa-data'
import { prisma } from '@/lib/db'
import type { Progress } from '@prisma/client'
import { PrintButton } from '@/components/PrintButton'
import { highlight } from '@/lib/highlight'
import { EditableCodeBlock } from '@/components/EditableCodeBlock'

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
    title: `${found.topic.name} Revision Sheet · ByteBook DSA`,
    description: `Revision notes and saved C++ code solutions for ${found.topic.name}.`,
  }
}

export default async function DSARevisionPage({ params }: Props) {
  const { slug } = await params
  const found = findTopicBySlug(slug)
  if (!found) notFound()

  const { topic, phase, phaseKey } = found

  // Fetch saved progress from SQLite
  const progressRecords = await prisma.progress.findMany({
    where: {
      questionId: { in: topic.questions.map(q => q.id) }
    }
  })

  const progressMap = new Map<number, Progress>(progressRecords.map(r => [r.questionId, r]))

  // Filter only solved (ticked) questions that have code or are marked solved
  const solvedQuestions = topic.questions.filter(q => {
    const record = progressMap.get(q.id)
    return record?.solved || !!record?.userCode
  })

  // Fetch solved questions and highlight code on server using Shiki
  const solvedQuestionsWithHtml = await Promise.all(
    solvedQuestions.map(async (q) => {
      const record = progressMap.get(q.id)
      const savedCode = record?.userCode || ''

      let lang = 'cpp'
      if (savedCode.includes('import java') || savedCode.includes('public class')) lang = 'java'
      else if (savedCode.includes('def ') || (savedCode.includes('import ') && !savedCode.includes('#include'))) lang = 'python'
      else if (savedCode.includes('console.log') || (savedCode.includes('const ') && !savedCode.includes('const int'))) lang = 'javascript'
      else if (savedCode.includes('stdio.h')) lang = 'c'

      const highlightedHtml = savedCode ? await highlight(savedCode, lang) : ''
      return {
        ...q,
        savedCode,
        lang,
        highlightedHtml
      }
    })
  )

  // Sizing config
  const totalQuestions = topic.questions.length
  const solvedCount = solvedQuestions.length
  const codeCount = progressRecords.filter(r => !!r.userCode).length

  // Difficulty mappings
  const DIFF_STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
  const DIFF_COLORS = ['', '#10b981', '#10b981', '#f59e0b', '#ef4444', '#ef4444']
  const DIFF_LABELS = ['', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard']

  return (
    <div style={{ padding: '32px 40px', maxWidth: '100%' }}>

      {/* Stylesheet for print/pdf mapping */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
          .no-print {
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
          div[id^="revision-q-"] {
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
            font-size: 15.5pt !important; /* Make font size even bigger */
            line-height: 1.6 !important;
            color: #000000 !important;
            font-weight: 700 !important; /* Bold weight for extremely thick stroke readability */
            font-style: normal !important;
          }

          /* Clear all syntax colors on print to ensure everything is pure black */
          .code-block-body span[style*="color:"] {
            color: #000000 !important;
            font-weight: 700 !important;
            font-style: normal !important;
          }
        }
      `}} />

      {/* Copy button script */}
      <script dangerouslySetInnerHTML={{
        __html: `
        function copyCode(btn) {
          const code = decodeURIComponent(btn.getAttribute('data-code'));
          navigator.clipboard.writeText(code).then(() => {
            btn.classList.add('copied');
            btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 12 4 18"/></svg> Copied!';
            setTimeout(() => {
              btn.classList.remove('copied');
              btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
            }, 2000);
          });
        }
      `}} />

      <div className="print-container">
        {/* Breadcrumb - Hidden on print */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 12.5 }}>
          <Link href="/" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>Home</Link>
          <span style={{ color: 'var(--text-4)' }}>/</span>
          <Link href="/dsa" style={{ color: 'var(--text-4)', textDecoration: 'none' }}>DSA Master Sheet</Link>
          <span style={{ color: 'var(--text-4)' }}>/</span>
          <Link href={`/dsa/${topic.slug}`} style={{ color: 'var(--text-4)', textDecoration: 'none' }}>{topic.name}</Link>
          <span style={{ color: 'var(--text-4)' }}>/</span>
          <span style={{ color: 'var(--text-3)' }}>Revision Sheet</span>
        </div>

        {/* Action controls - Hidden on print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <PrintButton color={phase.color} />
        </div>

        {/* Title Header Card */}
        <div style={{
          background: `linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, ${phase.color}88 100%)`,
          color: '#ffffff',
          padding: '24px 30px',
          borderRadius: 12,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>
            {topic.icon} {topic.name} Revision Sheet
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 12 }}>
            Curated Study Guide & Custom Saved Code Solutions
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              {phaseKey}: {phase.title}
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              Ticked: {solvedCount} / {totalQuestions} solved
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
              Saved Codes: {codeCount}
            </span>
          </div>
        </div>

        {/* Quick Reference Summary block */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '12px 18px',
          marginBottom: 24
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: 'var(--text)',
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ display: 'inline-block', width: 4, height: 11, background: phase.color, borderRadius: 2 }} />
            Revision Guidelines & Patterns
          </div>
          <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            <li>Review saved code templates below to recall optimal patterns for {topic.name}.</li>
            <li>Focus on transition algorithms, boundary edge cases, and recursive structures.</li>
            <li>This document prints directly to PDF. Press <kbd style={{ fontFamily: 'JetBrains Mono', background: 'var(--surface)', padding: '1px 4.5px', borderRadius: 4, border: '1px solid var(--border)' }}>⌘P</kbd> or click the print button above to compile.</li>
          </ul>
        </div>

        {/* Two-Column split layout */}
        {solvedCount === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px', background: 'var(--surface)',
            border: '1px dashed var(--border)', borderRadius: 12
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No Solved Questions Yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 20 }}>
              Go through the DSA sheets and tick questions or save custom code solutions to build your revision sheet automatically!
            </div>
            <Link href={`/dsa/${topic.slug}`} style={{
              display: 'inline-flex', alignItems: 'center', padding: '8px 18px',
              borderRadius: 8, background: phase.color, color: 'white', fontWeight: 800,
              fontSize: 13, textDecoration: 'none', fontFamily: 'Inter, sans-serif'
            }}>
              Start Solving {topic.name}
            </Link>
          </div>
        ) : (
          <div className="revision-layout-with-toc">

            {/* Left Side: Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              {solvedQuestionsWithHtml.map((q, index) => {
                return (
                  <div key={q.id} id={`revision-q-${q.id}`} className="question-container" style={{ scrollMarginTop: 100 }}>
                    {/* Header info matching template */}
                    <div className="question-header">
                      <span className="question-number">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="question-title">
                        {q.name}
                      </h2>
                    </div>

                    {/* Metadata Row matching template */}
                    <div className="metadata-row">
                      <span className="badge">{q.subtopic}</span>
                      <span className="badge">✓ Solved</span>
                      <span className="badge" style={{ color: DIFF_COLORS[q.difficulty] }}>
                        {DIFF_LABELS[q.difficulty]}
                      </span>
                    </div>

                    {/* Code Block Container */}
                    <div>
                      <EditableCodeBlock
                        questionId={q.id}
                        initialCode={q.savedCode}
                        language={q.lang}
                        initialHighlightedHtml={q.highlightedHtml}
                      />
                    </div>

                  </div>
                )
              })}
            </div>

            {/* Right Side: Sticky TOC Sidebar */}
            <div className="no-print revision-toc-sidebar" style={{
              position: 'sticky',
              top: 'calc(var(--header-h) + 24px)',
              maxHeight: 'calc(100vh - var(--header-h) - 40px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '4px 0 4px 20px',
              borderLeft: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-2)' }}>
                On This Page
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {solvedQuestionsWithHtml.map((q, idx) => (
                  <a
                    key={q.id}
                    href={`#revision-q-${q.id}`}
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-2)',
                      textDecoration: 'none',
                      lineHeight: 1.4,
                      transition: 'color 0.15s'
                    }}
                    className="toc-anchor"
                  >
                    {String(idx + 1).padStart(2, '0')}. {q.name}
                  </a>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
