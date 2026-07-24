'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
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

  if (isEditing) {
    return (
      <div className="code-block-wrap" style={{ margin: 0 }}>
        <div className="code-block-header">
          <span className="code-block-lang">{displayLang} (EDITING)</span>
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Press Tab for indent</span>
        </div>
        <div className="code-block-body" style={{ padding: 0 }}>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: '260px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              background: 'var(--code-bg)',
              color: '#e6edf3',
              border: 'none',
              padding: '16px 20px',
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
          gap: 10,
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button
            onClick={() => {
              setCode(initialCode)
              setIsEditing(false)
            }}
            disabled={isPending}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              fontSize: 12,
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
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--brand)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              transition: 'all 0.15s'
            }}
          >
            {isPending ? 'Saving...' : 'Save Code'}
          </button>
        </div>
      </div>
    )
  }

  const hasCode = code.trim().length > 0

  return (
    <div className="code-block-wrap" style={{ margin: 0 }}>
      <div className="code-block-header">
        <span className="code-block-lang">{displayLang}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasCode && (
            <button className={`code-block-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
              {copied ? (
                <>Copied!</>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 'var(--r-sm)',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-2)'
              e.currentTarget.style.borderColor = 'var(--border-hover)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-3)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            ✏️ Edit
          </button>
        </div>
      </div>
      
      {hasCode ? (
        initialHighlightedHtml && code === initialCode ? (
          <div className="code-block-body" dangerouslySetInnerHTML={{ __html: initialHighlightedHtml }} />
        ) : (
          <div className="code-block-body" style={{ padding: 0 }}>
            <pre style={{
              margin: 0, padding: '16px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
              lineHeight: 1.6, color: '#e6edf3', overflowX: 'auto', whiteSpace: 'pre-wrap'
            }}>
              <code>{code}</code>
            </pre>
          </div>
        )
      ) : (
        <div style={{
          background: 'var(--surface-2)',
          padding: '24px 20px',
          textAlign: 'center',
          color: 'var(--text-4)',
          fontSize: 12.5,
          fontStyle: 'italic'
        }}>
          No custom code has been saved for this solution yet. Click Edit to write one!
        </div>
      )}
    </div>
  )
}
