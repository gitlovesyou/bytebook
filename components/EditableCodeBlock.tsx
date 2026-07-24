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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null
    if (currentTheme) {
      setTheme(currentTheme)
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const nextTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null
          if (nextTheme) {
            setTheme(nextTheme)
          }
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

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

      let insertion = '\n' + indent
      let cursorOffset = insertion.length

      // Check if cursor is between '{' and '}'
      const charBefore = val.charAt(start - 1)
      const charAfter = val.charAt(start)
      
      if (charBefore === '{' && charAfter === '}') {
        insertion = '\n' + indent + '    ' + '\n' + indent
        cursorOffset = 1 + indent.length + 4
      } else if (currentLine.trim().endsWith('{')) {
        insertion = '\n' + indent + '    ' + '\n' + indent + '}'
        cursorOffset = 1 + indent.length + 4
      }

      const newVal = val.substring(0, start) + insertion + val.substring(end)
      setCode(newVal)

      // Reset selection position after rendering
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + cursorOffset
      }, 0)
    }

    // Autocomplete brackets and quotes
    const autoPairs: Record<string, string> = {
      '{': '}',
      '[': ']',
      '(': ')',
      '"': '"',
      "'": "'"
    }

    if (autoPairs[e.key] !== undefined) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value
      const closingChar = autoPairs[e.key]
      
      const newVal = val.substring(0, start) + e.key + closingChar + val.substring(end)
      setCode(newVal)
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
      return
    }

    // Step over closing brackets and quotes if typed
    const closingChars = new Set(['}', ']', ')', '"', "'"])
    if (closingChars.has(e.key)) {
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const val = textarea.value
      if (val.charAt(start) === e.key) {
        e.preventDefault()
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
        return
      }
    }
  }

  const displayLang = language.toUpperCase()
  const hasCode = code.trim().length > 0

  // Client-side syntax tokenizer helper matching the active editor theme colors
  const highlightedHtml = useMemo(() => {
    if (!hasCode) return ''
    const lines = code.split('\n')
    const lineIndents = lines.map(line => {
      if (line.trim() === '') return -1
      const match = line.match(/^ */)
      return match ? match[0].length : 0
    })

    for (let i = 0; i < lines.length; i++) {
      if (lineIndents[i] === -1) {
        let prevIndent = 0
        for (let j = i - 1; j >= 0; j--) {
          if (lineIndents[j] !== -1) { prevIndent = lineIndents[j]; break; }
        }
        let nextIndent = 0
        for (let j = i + 1; j < lines.length; j++) {
          if (lineIndents[j] !== -1) { nextIndent = lineIndents[j]; break; }
        }
        lineIndents[i] = Math.min(prevIndent, nextIndent)
      }
    }

    const syntaxColors = theme === 'light' ? {
      comments: '#3c8054',
      strings: '#0a3069',
      preproc: '#cf222e',
      keywords: '#0056b3',
      customTypes: '#24292e',
      numbers: '#0550ae',
      funcs: '#24292e',
      types: '#0056b3'
    } : {
      comments: '#8b949e',
      strings: '#a5d6ff',
      preproc: '#ff7b72',
      keywords: '#ff7b72',
      customTypes: '#d2a6ff',
      numbers: '#79c0ff',
      funcs: '#dcdcaa',
      types: '#ffa657'
    }

    const guideColor = theme === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'
    const guideStyle = `display: inline-block; width: 4ch; border-left: 1px dashed ${guideColor}; box-sizing: border-box; height: 1.5em; vertical-align: bottom;`

    const outputLines = lines.map((line, idx) => {
      const rawLeading = (line.match(/^ */) || [''])[0].length
      const lineText = line.substring(rawLeading)

      const escape = (text: string) => text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      let escaped = escape(lineText)

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

      const templates = /&lt;([a-zA-Z_]\w*)&gt;/g
      templates.lastIndex = 0
      let tm: RegExpExecArray | null
      while ((tm = templates.exec(escaped)) !== null) {
        const word = tm[1]
        const wordIndex = tm.index + 4
        const color = /^(int|char|bool|float|double|void)$/.test(word)
          ? syntaxColors.keywords
          : (theme === 'light' ? '#24292e' : '#d2a6ff')
        tokens.push({ start: wordIndex, end: wordIndex + word.length, color, content: word })
      }

      const structClass = /\b(struct|class)\s+([a-zA-Z_]\w*)\b/g
      structClass.lastIndex = 0
      let sc: RegExpExecArray | null
      while ((sc = structClass.exec(escaped)) !== null) {
        const word = sc[2]
        const wordIndex = sc.index + sc[1].length + 1
        tokens.push({ start: wordIndex, end: wordIndex + word.length, color: theme === 'light' ? '#24292e' : '#d2a6ff', content: word })
      }

      addTokens(COMMENTS, syntaxColors.comments)
      addTokens(STRINGS, syntaxColors.strings)
      addTokens(PREPROC, syntaxColors.preproc)
      addTokens(KEYWORDS, syntaxColors.keywords)
      addTokens(CUSTOM_TYPES, syntaxColors.customTypes)
      addTokens(NUMBERS, syntaxColors.numbers)
      addTokens(FUNCS, syntaxColors.funcs)
      addTokens(TYPES, syntaxColors.types)

      tokens.sort((a, b) => a.start - b.start)
      
      const noOverlap: Tok[] = []
      let cursor = 0
      for (const tok of tokens) {
        if (tok.start >= cursor) {
          noOverlap.push(tok)
          cursor = tok.end
        }
      }

      let tokenizedText = ''
      let pos = 0
      for (const tok of noOverlap) {
        tokenizedText += escaped.slice(pos, tok.start)
        tokenizedText += `<span style="color: ${tok.color}">${tok.content}</span>`
        pos = tok.end
      }
      tokenizedText += escaped.slice(pos)

      const numGuides = Math.floor(lineIndents[idx] / 4)
      let guidesHtml = ''
      for (let g = 0; g < numGuides; g++) {
        guidesHtml += `<span class="indent-guide" style="${guideStyle}"></span>`
      }

      const extraSpacesCount = rawLeading - (numGuides * 4)
      const remainingSpaces = extraSpacesCount > 0 ? ' '.repeat(extraSpacesCount) : ''

      return guidesHtml + remainingSpaces + tokenizedText
    })

    return outputLines.join('\n')
  }, [code, hasCode, theme])

  if (isEditing) {
    return (
      <div className="code-block-wrap" style={{
        margin: 0,
        border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'var(--border)'}`,
        borderRadius: 8,
        overflow: 'hidden',
        background: theme === 'light' ? '#ffffff' : '#0d1117'
      }}>
        <div className="code-block-header" style={{
          padding: '8px 16px',
          fontSize: 11,
          fontWeight: 700,
          background: theme === 'light' ? '#f8fafc' : '#090d13',
          borderBottom: `1px solid ${theme === 'light' ? '#e2e8f0' : 'var(--border)'}`,
          color: theme === 'light' ? '#475569' : 'var(--text-3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span className="code-block-lang" style={{ color: theme === 'light' ? '#0f172a' : '#fff' }}>{displayLang} (EDITING)</span>
          <span style={{ fontSize: 10.5, color: theme === 'light' ? '#64748b' : 'var(--text-4)' }}>Press Tab for indent</span>
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
              background: theme === 'light' ? '#ffffff' : '#0d1117',
              color: theme === 'light' ? '#24292e' : '#e6edf3',
              border: 'none',
              padding: '12px 16px',
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
          padding: '8px 16px',
          background: theme === 'light' ? '#f8fafc' : '#090d13',
          borderTop: `1px solid ${theme === 'light' ? '#e2e8f0' : 'var(--border)'}`
        }}>
          <button
            onClick={() => {
              setCode(initialCode)
              setIsEditing(false)
            }}
            disabled={isPending}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'var(--border)'}`,
              background: theme === 'light' ? '#ffffff' : 'transparent',
              color: theme === 'light' ? '#334155' : 'var(--text-3)',
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              transition: 'all 0.15s'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--brand)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 11.5,
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
    <div className="code-block-wrap" style={{
      margin: 0,
      border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'var(--border)'}`,
      borderRadius: 8,
      overflow: 'hidden',
      background: theme === 'light' ? '#ffffff' : '#0d1117'
    }}>
      <div className="code-block-header" style={{
        padding: '8px 16px',
        fontSize: 11,
        fontWeight: 700,
        background: theme === 'light' ? '#f8fafc' : '#090d13',
        borderBottom: `1px solid ${theme === 'light' ? '#e2e8f0' : 'var(--border)'}`,
        color: theme === 'light' ? '#475569' : 'var(--text-3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span className="code-block-lang" style={{ color: theme === 'light' ? '#0f172a' : '#fff' }}>{displayLang}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasCode && (
            <button className={`code-block-copy ${copied ? 'copied' : ''}`} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700 }} onClick={handleCopy}>
              {copied ? (
                <>Copied!</>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 3 }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 6,
              background: theme === 'light' ? '#ffffff' : 'transparent',
              border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'var(--border)'}`,
              color: theme === 'light' ? '#334155' : 'var(--text-3)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            ✏️ Edit
          </button>
        </div>
      </div>
      
      {hasCode ? (
        <div className="code-block-body" style={{ padding: 0, background: theme === 'light' ? '#ffffff' : '#0d1117' }}>
          <pre className="code-block-pre" style={{
            margin: 0,
            padding: '12px 16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12.5,
            lineHeight: 1.6,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            color: theme === 'light' ? '#24292e' : '#c9d1d9'
          }}>
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          </pre>
        </div>
      ) : (
        <div style={{
          background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
          padding: '16px 20px',
          textAlign: 'center',
          color: 'var(--text-4)',
          fontSize: 12,
          fontStyle: 'italic'
        }}>
          No custom code. <span style={{ color: 'var(--brand)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }} onClick={() => setIsEditing(true)}>Write one</span>
        </div>
      )}
    </div>
  )
}
