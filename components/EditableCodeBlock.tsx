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

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  type HistoryEntry = { code: string; start: number; end: number }
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<HistoryEntry[]>([])
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateCanUndoRedo = () => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }

  const handleCodeChange = (newVal: string, forceHistoryPush = false) => {
    const ta = textareaRef.current
    const curStart = ta ? ta.selectionStart : code.length
    const curEnd = ta ? ta.selectionEnd : code.length

    setCode(newVal)
    
    if (redoStackRef.current.length > 0) {
      redoStackRef.current = []
      setCanRedo(false)
    }

    const snapshot: HistoryEntry = { code, start: curStart, end: curEnd }

    if (forceHistoryPush) {
      const last = undoStackRef.current[undoStackRef.current.length - 1]
      if (!last || last.code !== code) {
        undoStackRef.current.push(snapshot)
        if (undoStackRef.current.length > 100) undoStackRef.current.shift()
        setCanUndo(true)
      }
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current)
        historyTimeoutRef.current = null
      }
    } else {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current)
      }
      historyTimeoutRef.current = setTimeout(() => {
        const last = undoStackRef.current[undoStackRef.current.length - 1]
        if (!last || last.code !== snapshot.code) {
          undoStackRef.current.push(snapshot)
          if (undoStackRef.current.length > 100) undoStackRef.current.shift()
          setCanUndo(true)
        }
        historyTimeoutRef.current = null
      }, 800)
    }
  }

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return
    
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current)
      historyTimeoutRef.current = null
    }

    const ta = textareaRef.current
    const curStart = ta ? ta.selectionStart : code.length
    const curEnd = ta ? ta.selectionEnd : code.length
    const currentEntry: HistoryEntry = { code, start: curStart, end: curEnd }

    const prevEntry = undoStackRef.current.pop()!
    
    redoStackRef.current.push(currentEntry)
    setCode(prevEntry.code)
    updateCanUndoRedo()

    setTimeout(() => {
      if (textareaRef.current) {
        const rStart = Math.min(prevEntry.start, prevEntry.code.length)
        const rEnd = Math.min(prevEntry.end, prevEntry.code.length)
        textareaRef.current.selectionStart = rStart
        textareaRef.current.selectionEnd = rEnd
      }
    }, 0)
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return

    const ta = textareaRef.current
    const curStart = ta ? ta.selectionStart : code.length
    const curEnd = ta ? ta.selectionEnd : code.length
    const currentEntry: HistoryEntry = { code, start: curStart, end: curEnd }

    const nextEntry = redoStackRef.current.pop()!

    undoStackRef.current.push(currentEntry)
    setCode(nextEntry.code)
    updateCanUndoRedo()

    setTimeout(() => {
      if (textareaRef.current) {
        const rStart = Math.min(nextEntry.start, nextEntry.code.length)
        const rEnd = Math.min(nextEntry.end, nextEntry.code.length)
        textareaRef.current.selectionStart = rStart
        textareaRef.current.selectionEnd = rEnd
      }
    }, 0)
  }

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
    undoStackRef.current = []
    redoStackRef.current = []
    setCanUndo(false)
    setCanRedo(false)
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current)
      historyTimeoutRef.current = null
    }
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
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        handleRedo()
      } else {
        handleUndo()
      }
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      handleRedo()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value

      let newVal = val
      let newStart = start
      let newEnd = end

      if (e.shiftKey) {
        // Outdent (Shift + Tab) - works for single cursor or multi-line selection
        const effectiveEnd = (start < end && val.charAt(end - 1) === '\n') ? end - 1 : end
        const firstLineStart = val.lastIndexOf('\n', start - 1) + 1
        const nextNL = val.indexOf('\n', effectiveEnd)
        const lastLineEnd = nextNL === -1 ? val.length : nextNL

        const targetText = val.substring(firstLineStart, lastLineEnd)
        const targetLines = targetText.split('\n')

        let firstLineRemoved = 0
        let totalRemoved = 0

        const modifiedLines = targetLines.map((line, idx) => {
          let spacesToRemove = 0
          if (line.startsWith('\t')) {
            spacesToRemove = 1
          } else {
            const match = line.match(/^ {1,4}/)
            spacesToRemove = match ? match[0].length : 0
          }
          if (idx === 0) firstLineRemoved = spacesToRemove
          totalRemoved += spacesToRemove
          return line.substring(spacesToRemove)
        })

        const newBlock = modifiedLines.join('\n')
        newVal = val.substring(0, firstLineStart) + newBlock + val.substring(lastLineEnd)
        newStart = Math.max(firstLineStart, start - firstLineRemoved)
        newEnd = Math.max(newStart, end - totalRemoved)
      } else {
        // Indent (Tab)
        if (start === end) {
          // Single cursor: insert 4 spaces
          newVal = val.substring(0, start) + '    ' + val.substring(end)
          newStart = start + 4
          newEnd = start + 4
        } else {
          // Selection (single or multi-line): indent all selected lines
          const effectiveEnd = (start < end && val.charAt(end - 1) === '\n') ? end - 1 : end
          const firstLineStart = val.lastIndexOf('\n', start - 1) + 1
          const nextNL = val.indexOf('\n', effectiveEnd)
          const lastLineEnd = nextNL === -1 ? val.length : nextNL

          const targetText = val.substring(firstLineStart, lastLineEnd)
          const targetLines = targetText.split('\n')

          const indentedLines = targetLines.map(line => '    ' + line)
          const newBlock = indentedLines.join('\n')

          newVal = val.substring(0, firstLineStart) + newBlock + val.substring(lastLineEnd)
          newStart = start + 4
          newEnd = end + (4 * targetLines.length)
        }
      }

      handleCodeChange(newVal, true)

      setTimeout(() => {
        const el = textareaRef.current || textarea
        if (el) {
          el.selectionStart = newStart
          el.selectionEnd = newEnd
        }
      }, 0)
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value

      const effectiveEnd = (start < end && val.charAt(end - 1) === '\n') ? end - 1 : end
      const firstLineStart = val.lastIndexOf('\n', start - 1) + 1
      const nextNL = val.indexOf('\n', effectiveEnd)
      const lastLineEnd = nextNL === -1 ? val.length : nextNL

      const targetText = val.substring(firstLineStart, lastLineEnd)
      const targetLines = targetText.split('\n')

      const nonEmptyLines = targetLines.filter(l => l.trim().length > 0)
      const allCommented = nonEmptyLines.length > 0 && nonEmptyLines.every(l => l.trim().startsWith('//'))

      let firstLineDelta = 0
      let totalDelta = 0

      const modifiedLines = targetLines.map((line, idx) => {
        let newLine = line
        let delta = 0
        if (allCommented) {
          newLine = line.replace(/(\s*)\/\/ ?/, '$1')
          delta = newLine.length - line.length
        } else {
          const match = line.match(/^(\s*)/)
          const indent = match ? match[1] : ''
          const rest = line.substring(indent.length)
          newLine = indent + '// ' + rest
          delta = newLine.length - line.length
        }
        if (idx === 0) firstLineDelta = delta
        totalDelta += delta
        return newLine
      })

      const newBlock = modifiedLines.join('\n')
      const newVal = val.substring(0, firstLineStart) + newBlock + val.substring(lastLineEnd)
      const newStart = Math.max(firstLineStart, start + firstLineDelta)
      const newEnd = Math.max(newStart, end + totalDelta)

      handleCodeChange(newVal, true)

      setTimeout(() => {
        const el = textareaRef.current || textarea
        if (el) {
          el.selectionStart = newStart
          el.selectionEnd = newEnd
        }
      }, 0)
      return
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
          handleCodeChange(newVal, true)
          
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
      handleCodeChange(newVal, true)

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
      "'": "'",
      '`': '`'
    }

    if (autoPairs[e.key] !== undefined) {
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value
      const closingChar = autoPairs[e.key]

      if (start !== end) {
        // Wrap selected text
        e.preventDefault()
        const selected = val.substring(start, end)
        const newVal = val.substring(0, start) + e.key + selected + closingChar + val.substring(end)
        handleCodeChange(newVal, true)

        setTimeout(() => {
          const el = textareaRef.current || textarea
          if (el) {
            el.selectionStart = start + 1
            el.selectionEnd = end + 1
          }
        }, 0)
        return
      } else {
        // Auto-close single cursor
        e.preventDefault()
        const newVal = val.substring(0, start) + e.key + closingChar + val.substring(end)
        handleCodeChange(newVal, true)

        setTimeout(() => {
          const el = textareaRef.current || textarea
          if (el) {
            el.selectionStart = el.selectionEnd = start + 1
          }
        }, 0)
        return
      }
    }

    // Step over closing brackets and quotes if typed
    const closingChars = new Set(['}', ']', ')', '"', "'", '`'])
    if (closingChars.has(e.key)) {
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start === end) {
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
      comments: '#008000',
      strings: '#a31515',
      preproc: '#008080',
      keywords: '#0000ff',
      customTypes: '#000000',
      numbers: '#098658',
      funcs: '#795e26',
      types: '#2b91af'
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
          : (theme === 'light' ? '#111827' : '#d2a6ff')
        tokens.push({ start: wordIndex, end: wordIndex + word.length, color, content: word })
      }

      const structClass = /\b(struct|class)\s+([a-zA-Z_]\w*)\b/g
      structClass.lastIndex = 0
      let sc: RegExpExecArray | null
      while ((sc = structClass.exec(escaped)) !== null) {
        const word = sc[2]
        const wordIndex = sc.index + sc[1].length + 1
        tokens.push({ start: wordIndex, end: wordIndex + word.length, color: theme === 'light' ? '#111827' : '#d2a6ff', content: word })
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
        const isComment = tok.color === syntaxColors.comments
        const isKwOrType = tok.color === syntaxColors.keywords || tok.color === syntaxColors.customTypes
        const styleStr = `color: ${tok.color};${isComment ? ' font-style: italic;' : ''}${isKwOrType ? ' font-weight: 600;' : ''}`
        tokenizedText += `<span style="${styleStr}">${tok.content}</span>`
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

  const linesToRender = useMemo(() => {
    return highlightedHtml.split('\n')
  }, [highlightedHtml])

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
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              minHeight: '130px',
              fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, Monaco, "Courier New", monospace',
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
            onClick={handleUndo}
            disabled={!canUndo || isPending}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'var(--border)'}`,
              background: theme === 'light' ? '#ffffff' : 'transparent',
              color: theme === 'light' ? '#334155' : 'var(--text-3)',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              fontSize: 11.5,
              fontWeight: 700,
              transition: 'all 0.15s',
              opacity: canUndo ? 1 : 0.4
            }}
            title="Undo"
          >
            ↩️ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo || isPending}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'var(--border)'}`,
              background: theme === 'light' ? '#ffffff' : 'transparent',
              color: theme === 'light' ? '#334155' : 'var(--text-3)',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              fontSize: 11.5,
              fontWeight: 700,
              transition: 'all 0.15s',
              opacity: canRedo ? 1 : 0.4
            }}
            title="Redo"
          >
            ↪️ Redo
          </button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="no-print" style={{ display: 'flex', gap: 6, opacity: 0.85 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
          </div>
          <span className="code-block-lang" style={{ color: theme === 'light' ? '#0f172a' : '#fff' }}>{displayLang}</span>
        </div>
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
            fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, Monaco, "Courier New", monospace',
            fontSize: 12.5,
            lineHeight: 1.6,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            color: theme === 'light' ? '#24292e' : '#c9d1d9'
          }}>
            <code style={{ display: 'block' }}>
              {linesToRender.map((lineHtml, lineIdx) => (
                <div key={lineIdx} className="code-line" style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span className="code-line-number" style={{
                    width: '3em',
                    textAlign: 'right',
                    color: theme === 'light' ? '#64748b' : '#8b949e',
                    paddingRight: '12px',
                    marginRight: '12px',
                    borderRight: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                    userSelect: 'none',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    flexShrink: 0,
                    opacity: 0.75
                  }}>{lineIdx + 1}</span>
                  <span className="code-line-content" dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }} style={{ flex: 1, whiteSpace: 'pre-wrap' }} />
                </div>
              ))}
            </code>
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
