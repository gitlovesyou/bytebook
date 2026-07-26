'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useProgress } from '@/hooks/useProgress'
import { DSA_DATA, Question } from '@/lib/dsa-data'
import { compileAndRunCode } from '@/app/actions/progress'

// Boilerplates map
const BOILERPLATES: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ code here\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write C code here\n    return 0;\n}`,
  python: `# Write Python code here\nprint("Hello World")`,
  javascript: `// Write JavaScript code here\nconsole.log("Hello World");`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write Java code here\n        System.out.println("Hello World");\n    }\n}`
}

// Helper to parse notes from code block comments
function parseCodeNotes(rawCode: string) {
  const result = {
    code: rawCode,
    pattern: '',
    approach: '',
    complexity: '',
    pitfalls: ''
  }
  if (!rawCode) return result

  const match = rawCode.match(/^\/\*([\s\S]*?)\*\//)
  if (match) {
    const blockContent = match[1]
    const patternMatch = blockContent.match(/\[PATTERN\]([\s\S]*?)(?=\[\w+\]|$)/)
    const approachMatch = blockContent.match(/\[APPROACH\]([\s\S]*?)(?=\[\w+\]|$)/)
    const complexityMatch = blockContent.match(/\[COMPLEXITY\]([\s\S]*?)(?=\[\w+\]|$)/)
    const pitfallsMatch = blockContent.match(/\[PITFALLS\]([\s\S]*?)(?=\[\w+\]|$)/)

    if (patternMatch || approachMatch || complexityMatch || pitfallsMatch) {
      if (patternMatch) result.pattern = patternMatch[1].trim()
      if (approachMatch) result.approach = approachMatch[1].trim()
      if (complexityMatch) result.complexity = complexityMatch[1].trim()
      if (pitfallsMatch) result.pitfalls = pitfallsMatch[1].trim()
      result.code = rawCode.substring(match[0].length).trim()
    }
  }
  return result
}

// Helper to serialize notes into code block comments
function serializeCodeNotes(code: string, pattern: string, approach: string, complexity: string, pitfalls: string) {
  if (!pattern.trim() && !approach.trim() && !complexity.trim() && !pitfalls.trim()) {
    return code
  }
  return `/*\n[PATTERN]\n${pattern.trim()}\n\n[APPROACH]\n${approach.trim()}\n\n[COMPLEXITY]\n${complexity.trim()}\n\n[PITFALLS]\n${pitfalls.trim()}\n*/\n\n${code.trim()}`
}

export default function WorkspacePage() {
  const { solved, revisit, userCodes, saveCode, customQuestions } = useProgress()

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  // Flat list of all questions (standard + custom)
  const allStandardQuestions = useMemo(() => {
    const list: Question[] = []
    if (DSA_DATA) {
      Object.values(DSA_DATA).forEach(phase => {
        if (phase && phase.topics) {
          phase.topics.forEach(topic => {
            if (topic && topic.questions) {
              topic.questions.forEach(q => {
                list.push({ ...q, topicSlug: topic.slug } as any)
              })
            }
          })
        }
      })
    }
    return list
  }, [])

  const allQuestions = useMemo(() => {
    const list = [...allStandardQuestions]
    if (customQuestions && Array.isArray(customQuestions)) {
      customQuestions.forEach(q => {
        if (q && q.id) {
          list.push({
            id: q.id,
            subId: q.id,
            subtopic: q.subtopic || 'Custom',
            name: q.name || 'Blank Custom Question',
            difficulty: q.difficulty || 3,
            link: q.link,
            topicSlug: 'custom',
            isCustom: true
          } as any)
        }
      })
    }
    return list
  }, [allStandardQuestions, customQuestions])

  // Sidebar search & filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'solved' | 'starred'>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Filtered list
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (q.subtopic || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchDiff = filterDifficulty === null || q.difficulty === filterDifficulty
      const matchStatus = filterStatus === 'all' || 
        (filterStatus === 'solved' && solved && solved.has(q.id)) ||
        (filterStatus === 'starred' && revisit && revisit.has(q.id))
      return matchSearch && matchDiff && matchStatus
    })
  }, [allQuestions, searchQuery, filterDifficulty, filterStatus, solved, revisit])

  // Resizable Split Screen Drag State
  const [layoutPanes, setLayoutPanes] = useState<1 | 2 | 3>(1)
  const [splitWidth1, setSplitWidth1] = useState(50) // Drag percentage for first split (left vs right, or left vs mid)
  const [splitWidth2, setSplitWidth2] = useState(66.6) // Drag percentage for second split (mid vs right)
  const [activeResizer, setActiveResizer] = useState<null | 1 | 2>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [activePane, setActivePane] = useState<'left' | 'mid' | 'right'>('left')

  const handleMouseDownResizer1 = (e: React.MouseEvent) => {
    e.preventDefault()
    setActiveResizer(1)
  }

  const handleMouseDownResizer2 = (e: React.MouseEvent) => {
    e.preventDefault()
    setActiveResizer(2)
  }

  useEffect(() => {
    if (activeResizer === null) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceRef.current) return
      const rect = workspaceRef.current.getBoundingClientRect()
      const relativeX = e.clientX - rect.left
      let newPercentage = (relativeX / rect.width) * 100

      if (activeResizer === 1) {
        const maxVal = layoutPanes === 3 ? splitWidth2 - 10 : 85
        if (newPercentage < 15) newPercentage = 15
        if (newPercentage > maxVal) newPercentage = maxVal
        setSplitWidth1(newPercentage)
      } else if (activeResizer === 2) {
        const minVal = splitWidth1 + 10
        if (newPercentage < minVal) newPercentage = minVal
        if (newPercentage > 85) newPercentage = 85
        setSplitWidth2(newPercentage)
      }
    }

    const handleMouseUp = () => {
      setActiveResizer(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeResizer, splitWidth1, splitWidth2, layoutPanes])

  // Grouped Editor states: Left Pane
  const [leftTabs, setLeftTabs] = useState<number[]>([]) 
  const [leftActiveId, setLeftActiveId] = useState<number | null>(null)
  const [leftTabMode, setLeftTabMode] = useState<'code' | 'console'>('code')
  const [leftShowInfo, setLeftShowInfo] = useState(false)

  const [leftCode, setLeftCode] = useState('')
  const [leftPattern, setLeftPattern] = useState('')
  const [leftApproach, setLeftApproach] = useState('')
  const [leftComplexity, setLeftComplexity] = useState('')
  const [leftPitfalls, setLeftPitfalls] = useState('')
  const [leftStdin, setLeftStdin] = useState('')
  const [leftOutput, setLeftOutput] = useState('')
  const [leftRunning, setLeftRunning] = useState(false)
  const [leftRunSuccess, setLeftRunSuccess] = useState<boolean | null>(null)
  const [leftLang, setLeftLang] = useState('cpp')
  const [leftConsoleTab, setLeftConsoleTab] = useState<'input' | 'output'>('input')

  // Grouped Editor states: Right Pane
  const [rightTabs, setRightTabs] = useState<number[]>([])
  const [rightActiveId, setRightActiveId] = useState<number | null>(null)
  const [rightTabMode, setRightTabMode] = useState<'code' | 'console'>('code')
  const [rightShowInfo, setRightShowInfo] = useState(false)

  const [rightCode, setRightCode] = useState('')
  const [rightPattern, setRightPattern] = useState('')
  const [rightApproach, setRightApproach] = useState('')
  const [rightComplexity, setRightComplexity] = useState('')
  const [rightPitfalls, setRightPitfalls] = useState('')
  const [rightStdin, setRightStdin] = useState('')
  const [rightOutput, setRightOutput] = useState('')
  const [rightRunning, setRightRunning] = useState(false)
  const [rightRunSuccess, setRightRunSuccess] = useState<boolean | null>(null)
  const [rightLang, setRightLang] = useState('cpp')
  const [rightConsoleTab, setRightConsoleTab] = useState<'input' | 'output'>('input')

  // Grouped Editor states: Middle Pane
  const [midTabs, setMidTabs] = useState<number[]>([])
  const [midActiveId, setMidActiveId] = useState<number | null>(null)
  const [midTabMode, setMidTabMode] = useState<'code' | 'console'>('code')
  const [midShowInfo, setMidShowInfo] = useState(false)

  const [midCode, setMidCode] = useState('')
  const [midPattern, setMidPattern] = useState('')
  const [midApproach, setMidApproach] = useState('')
  const [midComplexity, setMidComplexity] = useState('')
  const [midPitfalls, setMidPitfalls] = useState('')
  const [midStdin, setMidStdin] = useState('')
  const [midOutput, setMidOutput] = useState('')
  const [midRunning, setMidRunning] = useState(false)
  const [midRunSuccess, setMidRunSuccess] = useState<boolean | null>(null)
  const [midLang, setMidLang] = useState('cpp')
  const [midConsoleTab, setMidConsoleTab] = useState<'input' | 'output'>('input')

  // Ref details
  const leftPreRef = useRef<HTMLPreElement>(null)
  const leftTextareaRef = useRef<HTMLTextAreaElement>(null)
  const midPreRef = useRef<HTMLPreElement>(null)
  const midTextareaRef = useRef<HTMLTextAreaElement>(null)
  const rightPreRef = useRef<HTMLPreElement>(null)
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Hide Website main navigation sidebar on mount, select first question, and set theme
  useEffect(() => {
    setMounted(true)
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
    setTheme(currentTheme === 'light' ? 'light' : 'dark')

    // Set first standard question dynamically on mount
    setLeftTabs([1])
    setLeftActiveId(1)

    const sidebarEl = document.querySelector('.sidebar') as HTMLElement
    const shellEl = document.querySelector('.layout-shell') as HTMLElement
    
    if (sidebarEl) sidebarEl.style.display = 'none'
    if (shellEl) shellEl.style.gridTemplateColumns = '1fr'

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const val = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null
          if (val) setTheme(val)
        }
      })
    })
    observer.observe(document.documentElement, { attributes: true })

    return () => {
      observer.disconnect()
      if (sidebarEl) sidebarEl.style.display = ''
      if (shellEl) shellEl.style.gridTemplateColumns = ''
    }
  }, [])

  // Sync scroll between textarea and pre highlight overlays
  const handleLeftScroll = () => {
    if (leftPreRef.current && leftTextareaRef.current) {
      leftPreRef.current.scrollTop = leftTextareaRef.current.scrollTop
      leftPreRef.current.scrollLeft = leftTextareaRef.current.scrollLeft
    }
  }
  const handleMidScroll = () => {
    if (midPreRef.current && midTextareaRef.current) {
      midPreRef.current.scrollTop = midTextareaRef.current.scrollTop
      midPreRef.current.scrollLeft = midTextareaRef.current.scrollLeft
    }
  }
  const handleRightScroll = () => {
    if (rightPreRef.current && rightTextareaRef.current) {
      rightPreRef.current.scrollTop = rightTextareaRef.current.scrollTop
      rightPreRef.current.scrollLeft = rightTextareaRef.current.scrollLeft
    }
  }

  // Load and Parse Question details for Left
  useEffect(() => {
    if (leftActiveId !== null) {
      const raw = (userCodes && userCodes[leftActiveId]) || ''
      const parsed = parseCodeNotes(raw)
      setLeftCode(parsed.code || BOILERPLATES.cpp)
      setLeftPattern(parsed.pattern || '')
      setLeftApproach(parsed.approach || '')
      setLeftComplexity(parsed.complexity || '')
      setLeftPitfalls(parsed.pitfalls || '')
      setLeftOutput('')
      setLeftRunSuccess(null)
      
      if (raw.includes('import java') || raw.includes('public class')) setLeftLang('java')
      else if (raw.includes('def ') && !raw.includes('#include')) setLeftLang('python')
      else if (raw.includes('console.log')) setLeftLang('javascript')
      else if (raw.includes('stdio.h')) setLeftLang('c')
      else setLeftLang('cpp')
    }
  }, [leftActiveId, userCodes])

  // Load and Parse Question details for Mid
  useEffect(() => {
    if (midActiveId !== null) {
      const raw = (userCodes && userCodes[midActiveId]) || ''
      const parsed = parseCodeNotes(raw)
      setMidCode(parsed.code || BOILERPLATES.cpp)
      setMidPattern(parsed.pattern || '')
      setMidApproach(parsed.approach || '')
      setMidComplexity(parsed.complexity || '')
      setMidPitfalls(parsed.pitfalls || '')
      setMidOutput('')
      setMidRunSuccess(null)

      if (raw.includes('import java') || raw.includes('public class')) setMidLang('java')
      else if (raw.includes('def ') && !raw.includes('#include')) setMidLang('python')
      else if (raw.includes('console.log')) setMidLang('javascript')
      else if (raw.includes('stdio.h')) setMidLang('c')
      else setMidLang('cpp')
    }
  }, [midActiveId, userCodes])

  // Load and Parse Question details for Right
  useEffect(() => {
    if (rightActiveId !== null) {
      const raw = (userCodes && userCodes[rightActiveId]) || ''
      const parsed = parseCodeNotes(raw)
      setRightCode(parsed.code || BOILERPLATES.cpp)
      setRightPattern(parsed.pattern || '')
      setRightApproach(parsed.approach || '')
      setRightComplexity(parsed.complexity || '')
      setRightPitfalls(parsed.pitfalls || '')
      setRightOutput('')
      setRightRunSuccess(null)

      if (raw.includes('import java') || raw.includes('public class')) setRightLang('java')
      else if (raw.includes('def ') && !raw.includes('#include')) setRightLang('python')
      else if (raw.includes('console.log')) setRightLang('javascript')
      else if (raw.includes('stdio.h')) setRightLang('c')
      else setRightLang('cpp')
    }
  }, [rightActiveId, userCodes])

  const leftActiveQuestion = useMemo(() => {
    if (!allQuestions || leftActiveId === null) return undefined
    return allQuestions.find(q => q.id === leftActiveId)
  }, [leftActiveId, allQuestions])

  const midActiveQuestion = useMemo(() => {
    if (!allQuestions || midActiveId === null) return undefined
    return allQuestions.find(q => q.id === midActiveId)
  }, [midActiveId, allQuestions])

  const rightActiveQuestion = useMemo(() => {
    if (!allQuestions || rightActiveId === null) return undefined
    return allQuestions.find(q => q.id === rightActiveId)
  }, [rightActiveId, allQuestions])

  // Save changes helper
  const handleSaveLeft = () => {
    if (leftActiveId === null) return
    const serialized = serializeCodeNotes(leftCode, leftPattern, leftApproach, leftComplexity, leftPitfalls)
    saveCode(leftActiveId, serialized)
  }

  const handleSaveMid = () => {
    if (midActiveId === null) return
    const serialized = serializeCodeNotes(midCode, midPattern, midApproach, midComplexity, midPitfalls)
    saveCode(midActiveId, serialized)
  }

  const handleSaveRight = () => {
    if (rightActiveId === null) return
    const serialized = serializeCodeNotes(rightCode, rightPattern, rightApproach, rightComplexity, rightPitfalls)
    saveCode(rightActiveId, serialized)
  }

  // Open question inside active editor group
  const handleOpenQuestion = (qId: number) => {
    if (activePane === 'left') {
      if (!leftTabs.includes(qId)) {
        setLeftTabs([...leftTabs, qId])
      }
      setLeftActiveId(qId)
    } else if (activePane === 'mid') {
      if (!midTabs.includes(qId)) {
        setMidTabs([...midTabs, qId])
      }
      setMidActiveId(qId)
    } else {
      if (!rightTabs.includes(qId)) {
        setRightTabs([...rightTabs, qId])
      }
      setRightActiveId(qId)
    }
  }

  // Close Tab
  const handleCloseTab = (qId: number, side: 'left' | 'mid' | 'right') => {
    if (side === 'left') {
      const remaining = leftTabs.filter(id => id !== qId)
      setLeftTabs(remaining)
      if (leftActiveId === qId) {
        setLeftActiveId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
      }
    } else if (side === 'mid') {
      const remaining = midTabs.filter(id => id !== qId)
      setMidTabs(remaining)
      if (midActiveId === qId) {
        setMidActiveId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
      }
    } else {
      const remaining = rightTabs.filter(id => id !== qId)
      setRightTabs(remaining)
      if (rightActiveId === qId) {
        setRightActiveId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
      }
    }
  }

  // Split clone tab
  const handleSplitToNext = (sourceSide: 'left' | 'mid') => {
    let sourceId: number | null = null
    if (sourceSide === 'left') sourceId = leftActiveId
    else if (sourceSide === 'mid') sourceId = midActiveId

    if (sourceId === null) return

    if (layoutPanes === 1) {
      setLayoutPanes(2)
      setActivePane('right')
      if (!rightTabs.includes(sourceId)) {
        setRightTabs([...rightTabs, sourceId])
      }
      setRightActiveId(sourceId)
    } else if (layoutPanes === 2) {
      setLayoutPanes(3)
      setActivePane('mid')
      if (!midTabs.includes(sourceId)) {
        setMidTabs([...midTabs, sourceId])
      }
      setMidActiveId(sourceId)
    }
  }

  // Compile & Run for Left Pane
  const handleRunLeft = async () => {
    if (leftActiveId === null) return
    setLeftRunning(true)
    setLeftConsoleTab('output')
    try {
      const res = await compileAndRunCode(leftCode, leftStdin, leftLang)
      setLeftOutput(res.output)
      setLeftRunSuccess(res.success)
    } catch (e) {
      setLeftOutput('Runtime Error compiling code.')
      setLeftRunSuccess(false)
    } finally {
      setLeftRunning(false)
    }
  }

  // Compile & Run for Middle Pane
  const handleRunMid = async () => {
    if (midActiveId === null) return
    setMidRunning(true)
    setMidConsoleTab('output')
    try {
      const res = await compileAndRunCode(midCode, midStdin, midLang)
      setMidOutput(res.output)
      setMidRunSuccess(res.success)
    } catch (e) {
      setMidOutput('Runtime Error compiling code.')
      setMidRunSuccess(false)
    } finally {
      setMidRunning(false)
    }
  }

  // Compile & Run for Right Pane
  const handleRunRight = async () => {
    if (rightActiveId === null) return
    setRightRunning(true)
    setRightConsoleTab('output')
    try {
      const res = await compileAndRunCode(rightCode, rightStdin, rightLang)
      setRightOutput(res.output)
      setRightRunSuccess(res.success)
    } catch (e) {
      setRightOutput('Runtime Error compiling code.')
      setRightRunSuccess(false)
    } finally {
      setRightRunning(false)
    }
  }

  // Generate Syntax tokens helper
  const tokenize = (codeStr: string) => {
    const lines = codeStr.split('\n')
    return lines.map(line => {
      const rawLeading = (line.match(/^ */) || [''])[0].length
      const lineText = line.substring(rawLeading)
      const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
      const syntaxColors = theme === 'light' ? {
        comments: '#3c8054', strings: '#0a3069', preproc: '#cf222e', keywords: '#0056b3', customTypes: '#24292e', numbers: '#0550ae', funcs: '#24292e', types: '#0056b3'
      } : {
        comments: '#8b949e', strings: '#a5d6ff', preproc: '#ff7b72', keywords: '#ff7b72', customTypes: '#d2a6ff', numbers: '#79c0ff', funcs: '#dcdcaa', types: '#ffa657'
      }

      const addTokens = (re: RegExp, color: string) => {
        re.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(escaped)) !== null) {
          tokens.push({ start: m.index, end: m.index + m[0].length, color, content: m[0] })
        }
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
      return ' '.repeat(rawLeading) + tokenizedText
    }).join('\n')
  }

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        height: 'calc(100vh - var(--header-h))',
        width: '100%',
        background: 'var(--background)',
        color: 'var(--text-4)',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif'
      }}>
        Loading Workspace...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - var(--header-h))',
      width: '100%',
      background: 'var(--background)',
      color: 'var(--text)',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* 1. COLLAPSIBLE SIDEBAR: Question Bank explorer */}
      <div style={{
        width: sidebarCollapsed ? 0 : 280,
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s',
        flexShrink: 0,
        position: 'relative'
      }}>
        {/* Sidebar Header & Filters */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-2)' }}>Explorer</span>
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: 'var(--text-4)' }}>{filteredQuestions.length} files</span>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '5px 8px', color: 'var(--text)', fontSize: 11.5, outline: 'none'
            }}
          />

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 9.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: filterStatus === 'all' ? 'var(--brand)' : 'var(--surface-2)',
                color: filterStatus === 'all' ? 'white' : 'var(--text-3)'
              }}
            >All</button>
            <button
              style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 9.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: filterStatus === 'solved' ? '#10b981' : 'var(--surface-2)',
                color: filterStatus === 'solved' ? 'white' : 'var(--text-3)'
              }}
              onClick={() => setFilterStatus('solved')}
            >Solved</button>
            <button
              style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 9.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: filterStatus === 'starred' ? '#f59e0b' : 'var(--surface-2)',
                color: filterStatus === 'starred' ? 'white' : 'var(--text-3)'
              }}
              onClick={() => setFilterStatus('starred')}
            >Starred</button>
          </div>
        </div>

        {/* Sidebar Accordion List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredQuestions.map(q => {
              const isSolved = solved ? solved.has(q.id) : false
              const isStarred = revisit ? revisit.has(q.id) : false
              return (
                <div
                  key={q.id}
                  onClick={() => handleOpenQuestion(q.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                    background: (leftActiveId === q.id || rightActiveId === q.id) ? 'rgba(99,102,241,0.08)' : 'transparent',
                    border: (leftActiveId === q.id || rightActiveId === q.id) ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (leftActiveId !== q.id && rightActiveId !== q.id) {
                      e.currentTarget.style.background = 'var(--surface-2)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (leftActiveId !== q.id && rightActiveId !== q.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <span style={{
                      color: isStarred ? '#f59e0b' : isSolved ? '#10b981' : 'var(--text-4)',
                      fontWeight: 800
                    }}>
                      {isStarred ? '★' : isSolved ? '✓' : '•'}
                    </span>
                    <span style={{
                      color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: (leftActiveId === q.id || rightActiveId === q.id) ? 700 : 500
                    }}>{q.name}</span>
                  </div>
                  <span style={{
                    fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 4,
                    background: q.difficulty === 1 ? '#22c55e20' : q.difficulty <= 3 ? '#eab30820' : '#ef444420',
                    color: q.difficulty === 1 ? '#22c55e' : q.difficulty <= 3 ? '#eab308' : '#ef4444'
                  }}>
                    E{q.difficulty}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE TOGGLE HANDLE */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          width: 12, background: 'var(--surface)', border: 'none',
          borderRight: '1px solid var(--border)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 9,
          padding: 0, outline: 'none'
        }}
      >
        {sidebarCollapsed ? '→' : '←'}
      </button>

      {/* 2. PANE CONTAINER (Main Workspace) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--background)', overflow: 'hidden' }}>
        
        {/* Workspace Toolbar controls */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>💻 IDE Multi-Workspace</span>
            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Focus a pane, then click sidebar questions</span>
          </div>

          <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 2, borderRadius: 6, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setLayoutPanes(1)}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                background: layoutPanes === 1 ? '#6366f1' : 'transparent',
                color: layoutPanes === 1 ? 'white' : 'var(--text-2)', transition: 'all 0.15s'
              }}
            >Single</button>
            <button
              onClick={() => {
                setLayoutPanes(2)
                if (rightTabs.length === 0 && leftActiveId !== null) {
                  setRightTabs([leftActiveId])
                  setRightActiveId(leftActiveId)
                }
              }}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                background: layoutPanes === 2 ? '#6366f1' : 'transparent',
                color: layoutPanes === 2 ? 'white' : 'var(--text-2)', transition: 'all 0.15s'
              }}
            >Double Split</button>
            <button
              onClick={() => {
                setLayoutPanes(3)
                if (rightTabs.length === 0 && leftActiveId !== null) {
                  setRightTabs([leftActiveId])
                  setRightActiveId(leftActiveId)
                }
                if (midTabs.length === 0 && leftActiveId !== null) {
                  setMidTabs([leftActiveId])
                  setMidActiveId(leftActiveId)
                }
              }}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                background: layoutPanes === 3 ? '#6366f1' : 'transparent',
                color: layoutPanes === 3 ? 'white' : 'var(--text-2)', transition: 'all 0.15s'
              }}
            >Triple Split</button>
          </div>
        </div>

        {/* Split Panes Body */}
        <div ref={workspaceRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          
          {/* PANE 1 (LEFT/MAIN) */}
          <div
            onClick={() => setActivePane('left')}
            style={{
              width: layoutPanes === 1 ? '100%' : `${splitWidth1}%`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRight: (layoutPanes >= 2 && activeResizer === null) ? '1px solid var(--border)' : 'none',
              outline: (activePane === 'left' && layoutPanes >= 2) ? '1px solid rgba(99,102,241,0.4)' : 'none',
              outlineOffset: '-1px',
              zIndex: activePane === 'left' ? 2 : 1,
              transition: activeResizer !== null ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Tab Bar Left */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: theme === 'light' ? '#f1f5f9' : '#0a0d14',
              height: 32, flexShrink: 0, padding: '0 8px', borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%', flex: 1, overflow: 'hidden' }}>
                {leftTabs.map(tabId => {
                  const q = allQuestions.find(x => x.id === tabId)
                  if (!q) return null
                  const isActive = leftActiveId === tabId
                  const textColor = isActive
                    ? (theme === 'light' ? '#0f172a' : '#f8fafc')
                    : (theme === 'light' ? '#64748b' : '#94a3b8')
                  return (
                    <div
                      key={tabId}
                      onClick={(e) => {
                        e.stopPropagation()
                        setLeftActiveId(tabId)
                        setActivePane('left')
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '4px 8px',
                        borderRadius: '5px 5px 0 0', cursor: 'pointer', fontSize: 11,
                        background: isActive ? (theme === 'light' ? '#ffffff' : 'var(--background)') : 'transparent',
                        color: textColor,
                        fontWeight: isActive ? 700 : 500,
                        height: 26, border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                        borderBottom: isActive ? (theme === 'light' ? '1px solid #ffffff' : '1px solid var(--background)') : 'none',
                        whiteSpace: 'nowrap',
                        flex: '1 1 0px',
                        minWidth: 40,
                        maxWidth: 120,
                        overflow: 'hidden'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloseTab(tabId, 'left')
                        }}
                        style={{
                          background: 'transparent', border: 'none', color: textColor,
                          fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 12, height: 12, borderRadius: '50%', opacity: 0.7, flexShrink: 0
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >✕</button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active Left Panel Workarea */}
            {leftActiveId && leftActiveQuestion ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Thin, compact Header controls */}
                <div style={{
                  padding: '6px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{leftActiveQuestion.name}</span>
                    <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>{leftActiveQuestion.subtopic}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Notes Split Toggle */}
                    <button
                      onClick={() => setLeftShowInfo(!leftShowInfo)}
                      style={{
                        padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 10,
                        cursor: 'pointer', fontWeight: 700,
                        background: leftShowInfo ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: leftShowInfo ? '#818cf8' : 'var(--text-3)',
                        display: 'flex', alignItems: 'center', gap: 3
                      }}
                    >
                      📖 {leftShowInfo ? 'Hide Info' : 'Show Info'}
                    </button>

                    {/* Inner tab controls */}
                    <div style={{ display: 'flex', background: 'var(--surface)', padding: 1.5, borderRadius: 5, border: '1px solid var(--border)' }}>
                      <button
                        onClick={() => setLeftTabMode('code')}
                        style={{
                          padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                          background: leftTabMode === 'code' ? '#6366f1' : 'transparent',
                          color: leftTabMode === 'code' ? 'white' : 'var(--text-3)'
                        }}
                      >Code</button>
                      <button
                        onClick={() => setLeftTabMode('console')}
                        style={{
                          padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                          background: leftTabMode === 'console' ? '#6366f1' : 'transparent',
                          color: leftTabMode === 'console' ? 'white' : 'var(--text-3)'
                        }}
                      >Run</button>
                    </div>

                    <button
                      onClick={handleSaveLeft}
                      style={{
                        padding: '3px 10px', background: '#10b981', color: 'white', border: 'none',
                        borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer'
                      }}
                    >Save</button>

                    {layoutPanes < 3 && (
                      <button
                        onClick={() => handleSplitToNext('left')}
                        style={{
                          padding: '3px 6px', background: 'transparent', border: '1px solid var(--border)',
                          borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer', color: 'var(--text-3)'
                        }}
                      >Split</button>
                    )}
                  </div>
                </div>

                {/* Left Pane Workspace Body Container */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 6, gap: 6 }}>
                  
                  {/* Left Column inside Pane: Question details & notes */}
                  {leftShowInfo && (
                    <div style={{
                      width: '35%', minWidth: '180px', display: 'flex', flexDirection: 'column',
                      gap: 8, overflowY: 'auto', borderRight: '1px solid var(--border)', paddingRight: 6, flexShrink: 0
                    }}>
                      <div>
                        <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Algorithmic Pattern</label>
                        <input
                          type="text"
                          value={leftPattern}
                          onChange={e => setLeftPattern(e.target.value)}
                          placeholder="e.g. DFS, DP..."
                          style={{
                            width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 5, padding: '5px 8px', fontSize: 11, color: 'var(--text)', outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 100 }}>
                        <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Solution Approach</label>
                        <textarea
                          value={leftApproach}
                          onChange={e => setLeftApproach(e.target.value)}
                          placeholder="Intuitive logic details..."
                          style={{
                            width: '100%', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 5, padding: '6px 10px', fontSize: 11.5, color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.4
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Complexity</label>
                          <textarea
                            value={leftComplexity}
                            onChange={e => setLeftComplexity(e.target.value)}
                            placeholder="Time: O(N)\nSpace: O(1)"
                            style={{
                              width: '100%', height: 35, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 5, padding: '4px 8px', fontSize: 10, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'monospace'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Pitfalls</label>
                          <textarea
                            value={leftPitfalls}
                            onChange={e => setLeftPitfalls(e.target.value)}
                            placeholder="Traps / edge cases..."
                            style={{
                              width: '100%', height: 35, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 5, padding: '4px 8px', fontSize: 10.5, color: 'var(--text)', outline: 'none', resize: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Right Column inside Pane: Code / Compile Console */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 6 }}>
                    
                    {/* Code tab */}
                    {leftTabMode === 'code' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                          <select
                            value={leftLang}
                            onChange={e => setLeftLang(e.target.value)}
                            style={{
                              background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
                              borderRadius: 4, padding: '2px 6px', fontSize: 11, outline: 'none'
                            }}
                          >
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="java">Java</option>
                          </select>
                        </div>

                        <div style={{
                          flex: 1, display: 'flex', position: 'relative', background: theme === 'light' ? '#f8fafc' : '#0a0d14',
                          border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', minHeight: 0
                        }}>
                          {/* Highlights overlay */}
                          <pre
                            ref={leftPreRef}
                            style={{
                              position: 'absolute', inset: 0, padding: 8, margin: 0, pointerEvents: 'none',
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
                              color: theme === 'light' ? '#0f172a' : '#f8fafc', background: 'transparent',
                              whiteSpace: 'pre', overflow: 'hidden', boxSizing: 'border-box', zIndex: 1
                            }}
                            dangerouslySetInnerHTML={{ __html: tokenize(leftCode) }}
                          />

                          {/* Input textarea */}
                          <textarea
                            ref={leftTextareaRef}
                            value={leftCode}
                            onChange={e => setLeftCode(e.target.value)}
                            onScroll={handleLeftScroll}
                            placeholder="// Write your code solution here..."
                            spellCheck={false}
                            style={{
                              position: 'absolute', inset: 0, padding: 8, border: 'none', outline: 'none',
                              background: 'transparent', color: 'transparent', caretColor: theme === 'light' ? '#0f172a' : '#f8fafc',
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
                              resize: 'none', tabSize: 4, boxSizing: 'border-box', overflow: 'auto',
                              whiteSpace: 'pre', WebkitTextFillColor: 'transparent', display: 'block', zIndex: 2
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Console Tab */}
                    {leftTabMode === 'console' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 1.5, borderRadius: 5 }}>
                            <button
                              onClick={() => setLeftConsoleTab('input')}
                              style={{
                                padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                                background: leftConsoleTab === 'input' ? 'var(--surface)' : 'transparent',
                                color: leftConsoleTab === 'input' ? 'var(--text)' : 'var(--text-4)'
                              }}
                            >Test Input</button>
                            <button
                              onClick={() => setLeftConsoleTab('output')}
                              style={{
                                padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                                background: leftConsoleTab === 'output' ? 'var(--surface)' : 'transparent',
                                color: leftConsoleTab === 'output' ? 'var(--text)' : 'var(--text-4)'
                              }}
                            >Output</button>
                          </div>
                          <button
                            onClick={handleRunLeft}
                            disabled={leftRunning}
                            style={{
                              padding: '3px 10px', background: '#6366f1', color: 'white', border: 'none',
                              borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer'
                            }}
                          >{leftRunning ? 'Running...' : 'Run'}</button>
                        </div>

                        <div style={{ flex: 1, minHeight: 0 }}>
                          {leftConsoleTab === 'input' ? (
                            <textarea
                              value={leftStdin}
                              onChange={e => setLeftStdin(e.target.value)}
                              placeholder="Enter execution input lines here..."
                              style={{
                                width: '100%', height: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 6, padding: '8px 12px', fontSize: 11.5, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'monospace'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%', height: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '10px 12px', fontSize: 11.5, color: leftRunSuccess === false ? '#ef4444' : 'var(--text)',
                              fontFamily: 'monospace', overflowY: 'auto', whiteSpace: 'pre-wrap'
                            }}>
                              {leftOutput || '// Run outputs appear here...'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                Select a question from explorer
              </div>
            )}
          </div>

          {/* DRAGGABLE RESIZER 1 DIVISION COLUMN */}
          {layoutPanes >= 2 && (
            <div
              onMouseDown={handleMouseDownResizer1}
              style={{
                width: 5,
                background: activeResizer === 1 ? '#6366f1' : 'var(--border)',
                cursor: 'col-resize',
                zIndex: 100,
                transition: 'background 0.1s',
                flexShrink: 0
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
              onMouseLeave={e => {
                if (activeResizer !== 1) e.currentTarget.style.background = 'var(--border)'
              }}
            />
          )}

          {/* PANE 2 (MIDDLE) - ONLY VISIBLE IF layoutPanes === 3 */}
          {layoutPanes === 3 && (
            <div
              onClick={() => setActivePane('mid')}
              style={{
                width: `${splitWidth2 - splitWidth1}%`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                outline: (activePane === 'mid') ? '1px solid rgba(99,102,241,0.4)' : 'none',
                outlineOffset: '-1px',
                zIndex: activePane === 'mid' ? 2 : 1,
                transition: activeResizer !== null ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Tab Bar Mid */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: theme === 'light' ? '#f1f5f9' : '#0a0d14',
                height: 32, flexShrink: 0, padding: '0 8px', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%', flex: 1, overflow: 'hidden' }}>
                  {midTabs.map(tabId => {
                    const q = allQuestions.find(x => x.id === tabId)
                    if (!q) return null
                    const isActive = midActiveId === tabId
                    const textColor = isActive
                      ? (theme === 'light' ? '#0f172a' : '#f8fafc')
                      : (theme === 'light' ? '#64748b' : '#94a3b8')
                    return (
                      <div
                        key={tabId}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMidActiveId(tabId)
                          setActivePane('mid')
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '4px 8px',
                          borderRadius: '5px 5px 0 0', cursor: 'pointer', fontSize: 11,
                          background: isActive ? (theme === 'light' ? '#ffffff' : 'var(--background)') : 'transparent',
                          color: textColor,
                          fontWeight: isActive ? 700 : 500,
                          height: 26, border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                          borderBottom: isActive ? (theme === 'light' ? '1px solid #ffffff' : '1px solid var(--background)') : 'none',
                          whiteSpace: 'nowrap',
                          flex: '1 1 0px',
                          minWidth: 40,
                          maxWidth: 120,
                          overflow: 'hidden'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCloseTab(tabId, 'mid')
                          }}
                          style={{
                            background: 'transparent', border: 'none', color: textColor,
                            fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 12, height: 12, borderRadius: '50%', opacity: 0.7, flexShrink: 0
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >✕</button>
                      </div>
                    )
                  })}
                </div>

                {/* Close Mid Pane Button */}
                <button
                  onClick={() => setLayoutPanes(2)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-3)', fontSize: 10,
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    e.currentTarget.style.color = '#ef4444'
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-3)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  ✕ Close Pane
                </button>
              </div>

              {/* Active Mid Pane Workarea */}
              {midActiveId && midActiveQuestion ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Controls */}
                  <div style={{
                    padding: '6px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{midActiveQuestion.name}</span>
                      <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>{midActiveQuestion.subtopic}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => setMidShowInfo(!midShowInfo)}
                        style={{
                          padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 10,
                          cursor: 'pointer', fontWeight: 700,
                          background: midShowInfo ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: midShowInfo ? '#818cf8' : 'var(--text-3)',
                          display: 'flex', alignItems: 'center', gap: 3
                        }}
                      >
                        📖 {midShowInfo ? 'Hide Info' : 'Show Info'}
                      </button>

                      <div style={{ display: 'flex', background: 'var(--surface)', padding: 1.5, borderRadius: 5, border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => setMidTabMode('code')}
                          style={{
                            padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                            background: midTabMode === 'code' ? '#6366f1' : 'transparent',
                            color: midTabMode === 'code' ? 'white' : 'var(--text-3)'
                          }}
                        >Code</button>
                        <button
                          onClick={() => setMidTabMode('console')}
                          style={{
                            padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                            background: midTabMode === 'console' ? '#6366f1' : 'transparent',
                            color: midTabMode === 'console' ? 'white' : 'var(--text-3)'
                          }}
                        >Run</button>
                      </div>

                      <button
                        onClick={handleSaveMid}
                        style={{
                          padding: '3px 10px', background: '#10b981', color: 'white', border: 'none',
                          borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer'
                        }}
                      >Save</button>

                      {layoutPanes < 3 && (
                        <button
                          onClick={() => handleSplitToNext('mid')}
                          style={{
                            padding: '3px 6px', background: 'transparent', border: '1px solid var(--border)',
                            borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer', color: 'var(--text-3)'
                          }}
                        >Split</button>
                      )}
                    </div>
                  </div>

                  {/* Body columns */}
                  <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--background)' }}>
                    {midShowInfo && (
                      <div style={{
                        width: '320px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                        overflowY: 'auto', padding: '14px', gap: 14, flexShrink: 0
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Pattern</label>
                          <textarea
                            value={midPattern}
                            onChange={e => setMidPattern(e.target.value)}
                            placeholder="e.g. Sliding Window, DFS..."
                            style={{
                              width: '100%', minHeight: 45, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 11.5, outline: 'none', resize: 'none'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Approach & Strategy</label>
                          <textarea
                            value={midApproach}
                            onChange={e => setMidApproach(e.target.value)}
                            placeholder="Outline the core algorithm logic here..."
                            style={{
                              width: '100%', minHeight: 90, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 11.5, outline: 'none', resize: 'none'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Complexity</label>
                          <textarea
                            value={midComplexity}
                            onChange={e => setMidComplexity(e.target.value)}
                            placeholder="Time: O(N)\nSpace: O(1)"
                            style={{
                              width: '100%', height: 45, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 11.5, outline: 'none', resize: 'none'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Edge Cases & Pitfalls</label>
                          <textarea
                            value={midPitfalls}
                            onChange={e => setMidPitfalls(e.target.value)}
                            placeholder="What could break this? Overflow, empty lists..."
                            style={{
                              width: '100%', height: 45, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 11.5, outline: 'none', resize: 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Code or compile panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 6, padding: 8 }}>
                      {midTabMode === 'code' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                            <select
                              value={midLang}
                              onChange={e => setMidLang(e.target.value)}
                              style={{
                                background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
                                borderRadius: 4, padding: '2px 6px', fontSize: 11, outline: 'none'
                              }}
                            >
                              <option value="cpp">C++</option>
                              <option value="c">C</option>
                              <option value="python">Python</option>
                              <option value="javascript">JavaScript</option>
                              <option value="java">Java</option>
                            </select>
                          </div>

                          <div style={{
                            flex: 1, display: 'flex', position: 'relative', background: theme === 'light' ? '#f8fafc' : '#0a0d14',
                            border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', minHeight: 0
                          }}>
                            <pre
                              ref={midPreRef}
                              style={{
                                position: 'absolute', inset: 0, padding: 8, margin: 0, pointerEvents: 'none',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
                                color: theme === 'light' ? '#0f172a' : '#f8fafc', background: 'transparent',
                                whiteSpace: 'pre', overflow: 'hidden', boxSizing: 'border-box', zIndex: 1
                              }}
                              dangerouslySetInnerHTML={{ __html: tokenize(midCode) }}
                            />
                            <textarea
                              ref={midTextareaRef}
                              value={midCode}
                              onChange={e => setMidCode(e.target.value)}
                              onScroll={handleMidScroll}
                              placeholder="// Write your code solution here..."
                              spellCheck={false}
                              style={{
                                position: 'absolute', inset: 0, padding: 8, border: 'none', outline: 'none',
                                background: 'transparent', color: 'transparent', caretColor: theme === 'light' ? '#0f172a' : '#f8fafc',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
                                resize: 'none', tabSize: 4, boxSizing: 'border-box', overflow: 'auto',
                                whiteSpace: 'pre', WebkitTextFillColor: 'transparent', display: 'block', zIndex: 2
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {midTabMode === 'console' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 1.5, borderRadius: 5 }}>
                              <button
                                onClick={() => setMidConsoleTab('input')}
                                style={{
                                  padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                                  background: midConsoleTab === 'input' ? 'var(--surface)' : 'transparent',
                                  color: midConsoleTab === 'input' ? 'var(--text)' : 'var(--text-4)'
                                }}
                              >Input</button>
                              <button
                                onClick={() => setMidConsoleTab('output')}
                                style={{
                                  padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                                  background: midConsoleTab === 'output' ? 'var(--surface)' : 'transparent',
                                  color: midConsoleTab === 'output' ? 'var(--text)' : 'var(--text-4)'
                                }}
                              >Output</button>
                            </div>
                            <button
                              onClick={handleRunMid}
                              disabled={midRunning}
                              style={{
                                padding: '3px 10px', background: '#6366f1', color: 'white', border: 'none',
                                borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer'
                              }}
                            >{midRunning ? 'Running...' : 'Run'}</button>
                          </div>

                          <div style={{ flex: 1, minHeight: 0 }}>
                            {midConsoleTab === 'input' ? (
                              <textarea
                                value={midStdin}
                                onChange={e => setMidStdin(e.target.value)}
                                placeholder="Enter execution input lines here..."
                                style={{
                                  width: '100%', height: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                                  borderRadius: 6, padding: '8px 12px', fontSize: 11.5, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'monospace'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '100%', height: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 6, padding: '10px 12px', fontSize: 11.5, color: midRunSuccess === false ? '#ef4444' : 'var(--text)',
                                fontFamily: 'monospace', overflowY: 'auto', whiteSpace: 'pre-wrap'
                              }}>
                                {midOutput || '// Run outputs appear here...'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                  Select a question from explorer
                </div>
              )}
            </div>
          )}

          {/* DRAGGABLE RESIZER 2 DIVISION COLUMN */}
          {layoutPanes === 3 && (
            <div
              onMouseDown={handleMouseDownResizer2}
              style={{
                width: 5,
                background: activeResizer === 2 ? '#6366f1' : 'var(--border)',
                cursor: 'col-resize',
                zIndex: 100,
                transition: 'background 0.1s',
                flexShrink: 0
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
              onMouseLeave={e => {
                if (activeResizer !== 2) e.currentTarget.style.background = 'var(--border)'
              }}
            />
          )}

          {/* PANE 3 (RIGHT) */}
          {layoutPanes >= 2 && (
            <div
              onClick={() => setActivePane('right')}
              style={{
                width: layoutPanes === 2 ? `${100 - splitWidth1}%` : `${100 - splitWidth2}%`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                outline: (activePane === 'right') ? '1px solid rgba(99,102,241,0.4)' : 'none',
                outlineOffset: '-1px',
                zIndex: activePane === 'right' ? 2 : 1,
                transition: activeResizer !== null ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Tab Bar Right */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: theme === 'light' ? '#f1f5f9' : '#0a0d14',
                height: 32, flexShrink: 0, padding: '0 8px', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%', flex: 1, overflow: 'hidden' }}>
                  {rightTabs.map(tabId => {
                    const q = allQuestions.find(x => x.id === tabId)
                    if (!q) return null
                    const isActive = rightActiveId === tabId
                    const textColor = isActive
                      ? (theme === 'light' ? '#0f172a' : '#f8fafc')
                      : (theme === 'light' ? '#64748b' : '#94a3b8')
                    return (
                      <div
                        key={tabId}
                        onClick={(e) => {
                          e.stopPropagation()
                          setRightActiveId(tabId)
                          setActivePane('right')
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '4px 8px',
                          borderRadius: '5px 5px 0 0', cursor: 'pointer', fontSize: 11,
                          background: isActive ? (theme === 'light' ? '#ffffff' : 'var(--background)') : 'transparent',
                          color: textColor,
                          fontWeight: isActive ? 700 : 500,
                          height: 26, border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                          borderBottom: isActive ? (theme === 'light' ? '1px solid #ffffff' : '1px solid var(--background)') : 'none',
                          whiteSpace: 'nowrap',
                          flex: '1 1 0px',
                          minWidth: 40,
                          maxWidth: 120,
                          overflow: 'hidden'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCloseTab(tabId, 'right')
                          }}
                          style={{
                            background: 'transparent', border: 'none', color: textColor,
                            fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 12, height: 12, borderRadius: '50%', opacity: 0.7, flexShrink: 0
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >✕</button>
                      </div>
                    )
                  })}
                </div>

                {/* Close Split Button */}
                <button
                  onClick={() => setLayoutPanes(layoutPanes === 3 ? 2 : 1)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-3)', fontSize: 10,
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    e.currentTarget.style.color = '#ef4444'
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-3)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  ✕ Close Pane
                </button>
              </div>

              {/* Active Right Panel Workarea */}
              {rightActiveId && rightActiveQuestion ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  
                  {/* Thin, compact Header controls */}
                  <div style={{
                    padding: '6px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{rightActiveQuestion.name}</span>
                      <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>{rightActiveQuestion.subtopic}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Notes Split Toggle */}
                      <button
                        onClick={() => setRightShowInfo(!rightShowInfo)}
                        style={{
                          padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 10,
                          cursor: 'pointer', fontWeight: 700,
                          background: rightShowInfo ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: rightShowInfo ? '#818cf8' : 'var(--text-3)',
                          display: 'flex', alignItems: 'center', gap: 3
                        }}
                      >
                        📖 {rightShowInfo ? 'Hide Info' : 'Show Info'}
                      </button>

                      {/* Inner tab controls */}
                      <div style={{ display: 'flex', background: 'var(--surface)', padding: 1.5, borderRadius: 5, border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => setRightTabMode('code')}
                          style={{
                            padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                            background: rightTabMode === 'code' ? '#6366f1' : 'transparent',
                            color: rightTabMode === 'code' ? 'white' : 'var(--text-3)'
                          }}
                        >Code</button>
                        <button
                          onClick={() => setRightTabMode('console')}
                          style={{
                            padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                            background: rightTabMode === 'console' ? '#6366f1' : 'transparent',
                            color: rightTabMode === 'console' ? 'white' : 'var(--text-3)'
                          }}
                        >Run</button>
                      </div>

                      <button
                        onClick={handleSaveRight}
                        style={{
                          padding: '3px 10px', background: '#10b981', color: 'white', border: 'none',
                          borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer'
                        }}
                      >Save</button>
                    </div>
                  </div>

                  {/* Right Pane Workspace Body Container */}
                  <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 6, gap: 6 }}>
                    
                    {/* Left Column inside Pane: Question details & notes */}
                    {rightShowInfo && (
                      <div style={{
                        width: '35%', minWidth: '180px', display: 'flex', flexDirection: 'column',
                        gap: 8, overflowY: 'auto', borderRight: '1px solid var(--border)', paddingRight: 6, flexShrink: 0
                      }}>
                        <div>
                          <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Algorithmic Pattern</label>
                          <input
                            type="text"
                            value={rightPattern}
                            onChange={e => setRightPattern(e.target.value)}
                            placeholder="e.g. DFS, DP..."
                            style={{
                              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 5, padding: '5px 8px', fontSize: 11, color: 'var(--text)', outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 100 }}>
                          <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Solution Approach</label>
                          <textarea
                            value={rightApproach}
                            onChange={e => setRightApproach(e.target.value)}
                            placeholder="Intuitive logic details..."
                            style={{
                              width: '100%', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 5, padding: '6px 10px', fontSize: 11.5, color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.4
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div>
                            <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Complexity</label>
                            <textarea
                              value={rightComplexity}
                              onChange={e => setRightComplexity(e.target.value)}
                              placeholder="Time: O(N)\nSpace: O(1)"
                              style={{
                                width: '100%', height: 35, background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 5, padding: '4px 8px', fontSize: 10, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'monospace'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Pitfalls</label>
                            <textarea
                              value={rightPitfalls}
                              onChange={e => setRightPitfalls(e.target.value)}
                              placeholder="Traps / edge cases..."
                              style={{
                                width: '100%', height: 35, background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 5, padding: '4px 8px', fontSize: 10.5, color: 'var(--text)', outline: 'none', resize: 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Right Column inside Pane: Code / Compile Console */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 6 }}>
                      
                      {/* Code tab */}
                      {rightTabMode === 'code' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                            <select
                              value={rightLang}
                              onChange={e => setRightLang(e.target.value)}
                              style={{
                                background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
                                borderRadius: 4, padding: '2px 6px', fontSize: 11, outline: 'none'
                              }}
                            >
                              <option value="cpp">C++</option>
                              <option value="c">C</option>
                              <option value="python">Python</option>
                              <option value="javascript">JavaScript</option>
                              <option value="java">Java</option>
                            </select>
                          </div>

                          <div style={{
                            flex: 1, display: 'flex', position: 'relative', background: theme === 'light' ? '#f8fafc' : '#0a0d14',
                            border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', minHeight: 0
                          }}>
                            {/* Highlights overlay */}
                            <pre
                              ref={rightPreRef}
                              style={{
                                position: 'absolute', inset: 0, padding: 8, margin: 0, pointerEvents: 'none',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
                                color: theme === 'light' ? '#0f172a' : '#f8fafc', background: 'transparent',
                                whiteSpace: 'pre', overflow: 'hidden', boxSizing: 'border-box', zIndex: 1
                              }}
                              dangerouslySetInnerHTML={{ __html: tokenize(rightCode) }}
                            />

                            {/* Input textarea */}
                            <textarea
                              ref={rightTextareaRef}
                              value={rightCode}
                              onChange={e => setRightCode(e.target.value)}
                              onScroll={handleRightScroll}
                              placeholder="// Write your code solution here..."
                              spellCheck={false}
                              style={{
                                position: 'absolute', inset: 0, padding: 8, border: 'none', outline: 'none',
                                background: 'transparent', color: 'transparent', caretColor: theme === 'light' ? '#0f172a' : '#f8fafc',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.5,
                                resize: 'none', tabSize: 4, boxSizing: 'border-box', overflow: 'auto',
                                whiteSpace: 'pre', WebkitTextFillColor: 'transparent', display: 'block', zIndex: 2
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Console Tab */}
                      {rightTabMode === 'console' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 1.5, borderRadius: 5 }}>
                              <button
                                onClick={() => setRightConsoleTab('input')}
                                style={{
                                  padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                                  background: rightConsoleTab === 'input' ? 'var(--surface)' : 'transparent',
                                  color: rightConsoleTab === 'input' ? 'var(--text)' : 'var(--text-4)'
                                }}
                              >Test Input</button>
                              <button
                                onClick={() => setRightConsoleTab('output')}
                                style={{
                                  padding: '2px 6px', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                                  background: rightConsoleTab === 'output' ? 'var(--surface)' : 'transparent',
                                  color: rightConsoleTab === 'output' ? 'var(--text)' : 'var(--text-4)'
                                }}
                              >Output</button>
                            </div>
                            <button
                              onClick={handleRunRight}
                              disabled={rightRunning}
                              style={{
                                padding: '3px 10px', background: '#6366f1', color: 'white', border: 'none',
                                borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer'
                              }}
                            >{rightRunning ? 'Running...' : 'Run'}</button>
                          </div>

                          <div style={{ flex: 1, minHeight: 0 }}>
                            {rightConsoleTab === 'input' ? (
                              <textarea
                                value={rightStdin}
                                onChange={e => setRightStdin(e.target.value)}
                                placeholder="Enter execution input lines here..."
                                style={{
                                  width: '100%', height: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                                  borderRadius: 6, padding: '8px 12px', fontSize: 11.5, color: 'var(--text)', outline: 'none', resize: 'none', fontFamily: 'monospace'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '100%', height: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 6, padding: '10px 12px', fontSize: 11.5, color: rightRunSuccess === false ? '#ef4444' : 'var(--text)',
                                fontFamily: 'monospace', overflowY: 'auto', whiteSpace: 'pre-wrap'
                              }}>
                                {rightOutput || '// Run outputs appear here...'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                  Select a question from explorer
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
