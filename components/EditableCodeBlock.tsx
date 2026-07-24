'use client'

import { useState, useRef, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { saveUserCode } from '@/app/actions/progress'

interface EditableCodeBlockProps {
  questionId: number
  initialCode: string
  language: string
  initialHighlightedHtml?: string
  onSaveSuccess?: (code: string) => void
}

export function EditableCodeBlock({
  questionId,
  initialCode,
  language,
  initialHighlightedHtml,
  onSaveSuccess
}: EditableCodeBlockProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [code, setCode] = useState(initialCode)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setCode(initialCode)
  }, [initialCode])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      const ok = await saveUserCode(questionId, code)
      if (ok) {
        if (onSaveSuccess) {
          onSaveSuccess(code)
        }
        setIsEditing(false)
        router.refresh()
      } else {
        alert('Failed to save code. Please try again.')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value
      const newVal = val.substring(0, start) + '    ' + val.substring(end)
      setCode(newVal)
      // Reset selection
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }

    if (e.key === 'Backspace') {
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      
      if (start === end) {
        const val = textarea.value
        const lastNewline = val.lastIndexOf('\n', start - 1)
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1
        const prefixOfLine = val.substring(lineStart, start)
        
        if (prefixOfLine.length > 0 && /^ +$/.test(prefixOfLine)) {
          e.preventDefault()
          const len = prefixOfLine.length
          const rem = len % 4
          const deleteCount = rem === 0 ? 4 : rem
          const newVal = val.substring(0, start - deleteCount) + val.substring(end)
          setCode(newVal)
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - deleteCount
          }, 0)
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value

      // Find the start of the current line
      const lastNewline = val.lastIndexOf('\n', start - 1)
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1
      const currentLine = val.substring(lineStart, start)

      // Find leading whitespace (spaces or tabs)
      const match = currentLine.match(/^([ \t]*)/)
      const indent = match ? match[1] : ''

      // Extra indent if current line ends with a curly brace
      let extraIndent = ''
      if (currentLine.trim().endsWith('{')) {
        extraIndent = '    '
      }

      const insertion = '\n' + indent + extraIndent
      const newVal = val.substring(0, start) + insertion + val.substring(end)
      setCode(newVal)

      // Reset selection position after rendering
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertion.length
      }, 0)
    }
  }

  const displayLang = language.toUpperCase()
  const hasCode = code.trim().length > 0

  // Client-side syntax tokenizer helper matching the active editor theme colors
  const highlightedHtml = useMemo(() => {
    if (!hasCode) return ''
    const escape = (text: string) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    let escaped = escape(code)

    const KEYWORDS = /\b(using|namespace|struct|class|void|int|char|bool|float|double|long|short|unsigned|return|if|else|for|while|do|switch|case|break|continue|public|private|protected|new|delete|this|nullptr|true|false|const|static|auto|typename|template|virtual|override|inline|import|from|as|def|self|lambda|and|or|not|in|is|let|var|function|console|log|export|default|package|interface|implements|extends|throws|throw|try|catch|finally)\b/g
    const STRINGS  = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g
    const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g
    const NUMBERS  = /\b(\d+\.?\d*)\b/g
    const PREPROC  = /(#include|#define|#if|#endif|#ifdef)/g
    const CUSTOM_TYPES = /\b(Process|Node|TreeNode|ListNode|Solution|Graph|Queue|Stack|Heap)\b/g
    const FUNCS    = /\b([a-zA-Z_]\w*)(?=\s*\()/g
    const TYPES    = /\b(std|vector|string|map|set|list|cout|cin|endl|System|out|println|print|max|min|sort)\b/g

    type Tok = { start: number; end: number; color: string; content: string }
    const tokens: Tok[] = []

    const addTokens = (re: RegExp, color: string) => {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(escaped)) !== null) {
        tokens.push({ start: m.index, end: m.index + m[0].length, color, content: m[0] })
      }
    }

    // Extract types inside template angle brackets: e.g. <Process> or <int>
    const templates = /&lt;([a-zA-Z_]\w*)&gt;/g
    templates.lastIndex = 0
    let tm: RegExpExecArray | null
    while ((tm = templates.exec(escaped)) !== null) {
      const word = tm[1]
      const wordIndex = tm.index + 4 // after "&lt;"
      const color = /^(int|char|bool|float|double|void)$/.test(word) ? '#ff7b72' : '#d2a6ff'
      tokens.push({ start: wordIndex, end: wordIndex + word.length, color, content: word })
    }

    // Extract types following class/struct: e.g. struct Process
    const structClass = /\b(struct|class)\s+([a-zA-Z_]\w*)\b/g
    structClass.lastIndex = 0
    let sc: RegExpExecArray | null
    while ((sc = structClass.exec(escaped)) !== null) {
      const word = sc[2]
      const wordIndex = sc.index + sc[1].length + 1
      tokens.push({ start: wordIndex, end: wordIndex + word.length, color: '#d2a6ff', content: word })
    }

    addTokens(COMMENTS, '#8b949e')
    addTokens(STRINGS, '#a5d6ff')
    addTokens(PREPROC, '#ff7b72')
    addTokens(KEYWORDS, '#ff7b72')
    addTokens(CUSTOM_TYPES, '#d2a6ff')
    addTokens(NUMBERS, '#79c0ff')
    addTokens(FUNCS, '#dcdcaa')
    addTokens(TYPES, '#ffa657')

    tokens.sort((a, b) => a.start - b.start)
    
    const noOverlap: Tok[] = []
    let cursor = 0
    for (const tok of tokens) {
      if (tok.start >= cursor) {
        noOverlap.push(tok)
        cursor = tok.end
      }
    }

    let result = ''
    let pos = 0
    for (const tok of noOverlap) {
      result += escaped.slice(pos, tok.start)
      result += `<span style="color: ${tok.color}">${tok.content}</span>`
      pos = tok.end
    }
    result += escaped.slice(pos)

    return result
  }, [code, hasCode])

  if (isEditing) {
    return (
      <div className="code-block-wrap" style={{ margin: 0, border: '1px solid var(--border)' }}>
        <div className="code-block-header" style={{ padding: '6px 12px', fontSize: 11 }}>
          <span className="code-block-lang">{displayLang} (EDITING)</span>
          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Press Tab for indent</span>
        </div>
        <div className="code-block-body" style={{ padding: 0 }}>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: '130px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12.5px',
              lineHeight: '1.5',
              background: 'var(--code-bg)',
              color: '#e6edf3',
              border: 'none',
              padding: '10px 14px',
              outline: 'none',
              resize: 'vertical',
              display: 'block'
            }}
            placeholder="// Write your code solution here..."
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.01)',
          borderTop: '1px solid rgba(255,255,255,0.04)'
        }}>
          <button
            onClick={() => {
              setCode(initialCode)
              setIsEditing(false)
            }}
            disabled={isPending}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.15s'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--brand)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              transition: 'all 0.15s'
            }}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="code-block-wrap" style={{ margin: 0, border: '1px solid var(--border)', borderRadius: 8 }}>
      <div className="code-block-header" style={{ padding: '6px 12px', fontSize: 11 }}>
        <span className="code-block-lang">{displayLang}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasCode && (
            <button className={`code-block-copy ${copied ? 'copied' : ''}`} style={{ padding: '2px 8px', fontSize: 11 }} onClick={handleCopy}>
              {copied ? (
                <>Copied!</>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 3 }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            ✏️ Edit
          </button>
        </div>
      </div>
      
      {hasCode ? (
        <div className="code-block-body" style={{ padding: 0, background: '#0d1117', borderRadius: '0 0 8px 8px' }}>
          <pre className="code-block-pre" style={{
            margin: 0, padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5,
            lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap'
          }}>
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          </pre>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface-2)',
          padding: '12px 14px',
          textAlign: 'center',
          color: 'var(--text-4)',
          fontSize: 11.5,
          fontStyle: 'italic',
          borderRadius: '0 0 8px 8px'
        }}>
          No custom code. <span style={{ color: 'var(--brand)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsEditing(true)}>Write one</span>
        </div>
      )}
    </div>
  )
}
