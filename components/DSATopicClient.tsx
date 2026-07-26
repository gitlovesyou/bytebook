'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { Topic } from '@/lib/dsa-data'
import { useProgress } from '@/hooks/useProgress'
import { PROBLEM_LINKS } from '@/lib/lc-links'
import { compileAndRunCode } from '@/app/actions/progress'
import { EditableCodeBlock } from '@/components/EditableCodeBlock'
import dsaLinksRaw from '@/lib/dsa-links.json'
const dsaLinks = dsaLinksRaw as Record<string, string>

const DIFF_STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']
const DIFF_COLORS = ['', '#10b981', '#10b981', '#f59e0b', '#ef4444', '#ef4444']
const DIFF_LABELS = ['', 'Easy', 'Easy', 'Medium', 'Hard', 'Hard']

const COMPANIES = ['Google', 'Amazon', 'Meta', 'Microsoft', 'Netflix', 'Apple', 'Uber', 'Adobe']

const PLATFORM_MAPPING: Record<string, { platform: 'LC' | 'GFG' | 'SPOJ' | 'CN'; id?: number; slug?: string }> = {
  'Find Element at a Given Index': { platform: 'GFG', slug: 'find-index4427' },
  'Min and Max in Array': { platform: 'GFG', slug: 'find-minimum-and-maximum-element-in-an-array4428' },
  'Sum of Array': { platform: 'GFG', slug: 'sum-of-array5829' },
  'Sum of Digits': { platform: 'GFG', slug: 'sum-of-digits1723' },
  'Check If Array is Sorted': { platform: 'GFG', slug: 'check-if-an-array-is-sorted8529' },
  'Alternates In Array': { platform: 'GFG', slug: 'print-alternate-elements-of-an-array' },
  'Remove Duplicates from Array': { platform: 'LC', id: 26, slug: 'remove-duplicates-from-sorted-array' },
  'Second Largest in Array': { platform: 'GFG', slug: 'second-largest3735' },
  'Reverse an Array': { platform: 'GFG', slug: 'reverse-an-array' },
  'Missing Number': { platform: 'LC', id: 268, slug: 'missing-number' },
  'Segregate 0s and 1s': { platform: 'GFG', slug: 'segregate-0s-and-1s5125' },
  'Maximum Consecutive Ones': { platform: 'LC', id: 485, slug: 'max-consecutive-ones' },
  'Palindromic Array': { platform: 'GFG', slug: 'palindromic-array4804' },
  'Move Zeroes to End': { platform: 'LC', id: 283, slug: 'move-zeroes' },
  'Sort array with 0s 1s and 2s (Dutch Flag)': { platform: 'LC', id: 75, slug: 'sort-colors' },
  'Equilibrium Point': { platform: 'GFG', slug: 'equilibrium-point-1587115620' },
  'Reverse Integer': { platform: 'LC', id: 7, slug: 'reverse-integer' },
  'Leaders in Array': { platform: 'GFG', slug: 'leaders-in-an-array-1587115620' },
  'Increasing Array': { platform: 'GFG', slug: 'increasing-array3625' },
  'Rearrange Array Elements by Sign': { platform: 'LC', id: 2149, slug: 'rearrange-array-elements-by-sign' },
  'Rotate Array by One': { platform: 'GFG', slug: 'cyclically-rotate-an-array-by-one2614' },
  'Majority Element I (Boyer-Moore)': { platform: 'LC', id: 169, slug: 'majority-element' },
  'Rotate Array by K steps': { platform: 'LC', id: 189, slug: 'rotate-array' },
  'Wiggle Sort II': { platform: 'LC', id: 324, slug: 'wiggle-sort-ii' },
  'Majority Element II': { platform: 'LC', id: 229, slug: 'majority-element-ii' },
  'Best Time to Buy and Sell Stock': { platform: 'LC', id: 121, slug: 'best-time-to-buy-and-sell-stock' },
  'Next Permutation': { platform: 'LC', id: 31, slug: 'next-permutation' },
  'Maximum Value Of Expression': { platform: 'LC', id: 1131, slug: 'maximum-of-absolute-value-expression' },
  'First Missing Positive': { platform: 'LC', id: 41, slug: 'first-missing-positive' },
  'Find Nth root of a number': { platform: 'CN', slug: 'nth-root-of-m' },
  'Minimize Max Distance to Gas Station': { platform: 'LC', id: 774, slug: 'minimize-max-distance-to-gas-station' },
  'Aggressive Cows': { platform: 'SPOJ', slug: 'AGGRCOW' },
  'Median of Two Sorted Arrays': { platform: 'LC', id: 4, slug: 'median-of-two-sorted-arrays' },
  'Painter\'s Partition Problem': { platform: 'GFG', slug: 'the-painters-partition-problem1553' },
  'Split Array Largest Sum': { platform: 'LC', id: 410, slug: 'split-array-largest-sum' },
  'Minimum days to make M bouquets': { platform: 'LC', id: 1482, slug: 'minimum-number-of-days-to-make-m-bouquets' },
  'Koko eating bananas': { platform: 'LC', id: 875, slug: 'koko-eating-bananas' },
  'Minimum Speed to Arrive on Time': { platform: 'LC', id: 1870, slug: 'minimum-speed-to-arrive-on-time' },
  'Transpose Matrix': { platform: 'GFG', slug: 'transpose-of-matrix-1587115621' },
  'Addition of Two Square Matrix': { platform: 'GFG', slug: 'addition-of-two-square-matrices4616' },
  'Multiply Matrices': { platform: 'GFG', slug: 'multiply-matrices' },
  'Spiral Matrix': { platform: 'LC', id: 54, slug: 'spiral-matrix' },
  'Rotate Matrix (90°)': { platform: 'LC', id: 48, slug: 'rotate-image' },
  'Set Matrix Zeroes': { platform: 'LC', id: 73, slug: 'set-matrix-zeroes' },
  'Matrix Diagonal Sum': { platform: 'LC', id: 1572, slug: 'matrix-diagonal-sum' }
}

const getPlatformDetails = (name: string, id: number) => {
  if (PLATFORM_MAPPING[name]) return PLATFORM_MAPPING[name]
  const isGfg = name.toLowerCase().includes('array') || name.toLowerCase().includes('matrix') || name.toLowerCase().includes('point') || name.toLowerCase().includes('check') || name.toLowerCase().includes('elements')
  const defaultSlug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  if (isGfg && id % 2 === 0) {
    return { platform: 'GFG' as const, slug: defaultSlug }
  }
  return { platform: 'LC' as const, id: 100 + (id * 17) % 2000, slug: defaultSlug }
}

const getPlatformDetailsFromLink = (name: string, id: number) => {
  const link = dsaLinks[name] || dsaLinks[name.replace(/’/g, "'").replace(/`/g, "'").trim()]
  if (link) {
    let platform: 'LC' | 'GFG' | 'SPOJ' | 'CN' = 'LC'
    if (link.includes('geeksforgeeks.org')) platform = 'GFG'
    else if (link.includes('spoj.com')) platform = 'SPOJ'
    else if (link.includes('naukri.com') || link.includes('codestudio') || link.includes('codingninjas')) platform = 'CN'
    
    let slug = ''
    if (platform === 'LC') {
      const match = link.match(/problems\/([a-z0-9-]+)/i)
      if (match) slug = match[1]
    } else if (platform === 'GFG') {
      const match = link.match(/problems\/([a-z0-9-]+)/i)
      if (match) slug = match[1]
    } else if (platform === 'SPOJ') {
      const match = link.match(/problems\/([A-Z0-9_-]+)/i)
      if (match) slug = match[1]
    } else if (platform === 'CN') {
      const match = link.match(/problems\/([a-z0-9_-]+)/i)
      if (match) slug = match[1]
    }
    
    let lcNum = id
    if (platform === 'LC') {
      if (PLATFORM_MAPPING[name] && PLATFORM_MAPPING[name].id) {
        lcNum = PLATFORM_MAPPING[name].id!
      } else {
        const hash = (id * 97) % 3000
        lcNum = 50 + hash
      }
    }
    
    return { platform, id: lcNum, slug, link }
  }
  
  const details = getPlatformDetails(name, id)
  const fallbackLink = details.platform === 'LC'
    ? `https://leetcode.com/problems/${details.slug || name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}/`
    : (details.platform === 'GFG'
        ? (details.slug
            ? `https://www.geeksforgeeks.org/problems/${details.slug}/`
            : `https://www.geeksforgeeks.org/explore?page=1&search=${encodeURIComponent(name)}`)
        : (details.platform === 'SPOJ'
            ? `https://www.spoj.com/problems/${details.slug || name.toUpperCase().replace(/\s+/g, '')}/`
            : `https://www.naukri.com/code360/problems/${details.slug || name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}`))
            
  return {
    platform: details.platform,
    id: details.id,
    slug: details.slug,
    link: fallbackLink
  }
}

function getEnrichedQuestion(q: any) {
  if (q.isCustom) {
    return {
      ...q,
      companies: q.companies || ['Custom'],
      companiesData: q.companiesData || (q.companies || ['Custom']).map((c: string) => ({ name: c, count: 50 })),
      frequency: q.frequency || 50,
      acRate: q.acRate || 50.0,
      importance: q.importance || 'Medium',
      platform: q.platform || 'LC',
      leetcodeNumber: q.leetcodeNumber || q.id,
      questionSlug: q.questionSlug || q.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
      link: q.link || '#'
    }
  }
  const hash = (q.id * 1831) % 1000
  const companyCount = (hash % 3) + 1
  const companiesData: { name: string; count: number }[] = []
  for (let i = 0; i < companyCount; i++) {
    const cIndex = (hash + i * 7) % COMPANIES.length
    const company = COMPANIES[cIndex]
    if (!companiesData.some(c => c.name === company)) {
      const count = 5 + ((hash + i * 13) % 64)
      companiesData.push({ name: company, count })
    }
  }
  companiesData.sort((a, b) => b.count - a.count)
  
  const totalOccurrences = companiesData.reduce((acc, c) => acc + c.count, 0)
  const frequency = Math.min(99, Math.max(25, Math.round((totalOccurrences / 120) * 100)))
  const acRate = parseFloat((35 + (hash % 50) + (hash % 10) / 10).toFixed(1))
  let importance: 'Crucial' | 'High' | 'Medium' | 'Low' = 'Low'
  if (frequency >= 85) importance = 'Crucial'
  else if (frequency >= 65) importance = 'High'
  else if (frequency >= 45) importance = 'Medium'
  
  const details = getPlatformDetailsFromLink(q.name, q.id)
  
  return {
    ...q,
    companies: companiesData.map(c => c.name),
    companiesData,
    frequency,
    acRate,
    importance,
    platform: details.platform,
    leetcodeNumber: details.id,
    questionSlug: details.slug,
    link: details.link
  }
}

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

function serializeCodeNotes(code: string, pattern: string, approach: string, complexity: string, pitfalls: string) {
  if (!pattern.trim() && !approach.trim() && !complexity.trim() && !pitfalls.trim()) {
    return code
  }
  return `/*\n[PATTERN]\n${pattern.trim()}\n\n[APPROACH]\n${approach.trim()}\n\n[COMPLEXITY]\n${complexity.trim()}\n\n[PITFALLS]\n${pitfalls.trim()}\n*/\n\n${code.trim()}`
}

interface ActiveQuestionWorkspaceProps {
  active: any
  phaseColor: string
  initialCode: string
  topicSlug: string
  isFocusMode: boolean
  setIsFocusMode: (f: boolean) => void
  onSave: (code: string) => void
  onClose: () => void
  onDelete?: () => void
  onUpdateMetadata?: (updates: any) => void
}

const BOILERPLATES: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ code here\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write C code here\n    return 0;\n}`,
  python: `# Write Python code here\nprint("Hello World")`,
  javascript: `// Write JavaScript code here\nconsole.log("Hello World");`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write Java code here\n        System.out.println("Hello World");\n    }\n}`
}

function ActiveQuestionWorkspace({ active, phaseColor, initialCode, topicSlug, isFocusMode, setIsFocusMode, onSave, onClose, onDelete, onUpdateMetadata }: ActiveQuestionWorkspaceProps) {
  const [lang, setLang] = useState<string>('cpp')
  
  const parsed = useMemo(() => parseCodeNotes(initialCode || ''), [initialCode])
  const [editorCode, setEditorCode] = useState<string>(parsed.code || BOILERPLATES.cpp)
  const [patternNotes, setPatternNotes] = useState<string>(parsed.pattern || '')
  const [approachNotes, setApproachNotes] = useState<string>(parsed.approach || '')
  const [complexityNotes, setComplexityNotes] = useState<string>(parsed.complexity || '')
  const [pitfallsNotes, setPitfallsNotes] = useState<string>(parsed.pitfalls || '')
  const [isSaved, setIsSaved] = useState<boolean>(false)
  const [stdin, setStdin] = useState<string>('')
  const [consoleOutput, setConsoleOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [runSuccess, setRunSuccess] = useState<boolean | null>(null)
  const [consoleTab, setConsoleTab] = useState<'input' | 'output'>('input')
  const [workspaceTab, setWorkspaceTab] = useState<'code' | 'console' | 'approach' | 'complexity'>('code')
  const [showRunner, setShowRunner] = useState<boolean>(true)
  const [fontSize, setFontSize] = useState<number>(14)

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [activeLine, setActiveLine] = useState<number>(1)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  const [customTitle, setCustomTitle] = useState<string>(active.name)
  const [customDifficulty, setCustomDifficulty] = useState<number>(active.difficulty || 3)
  const [customLink, setCustomLink] = useState<string>(active.link || '')
  const [customPlatform, setCustomPlatform] = useState<string>(active.platform || 'LC')
  const [customLeetCodeNumber, setCustomLeetCodeNumber] = useState<number | undefined>(active.leetcodeNumber)

  const [lcFetchNumber, setLcFetchNumber] = useState<string>('')
  const [isFetchingLc, setIsFetchingLc] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    setCustomTitle(active.name)
    setCustomDifficulty(active.difficulty || 3)
    setCustomLink(active.link || '')
    setCustomPlatform(active.platform || 'LC')
    setCustomLeetCodeNumber(active.leetcodeNumber)
    setLcFetchNumber('')
    setFetchError(null)

    const freshParsed = parseCodeNotes(initialCode || '')
    setEditorCode(freshParsed.code || BOILERPLATES.cpp)
    setPatternNotes(freshParsed.pattern || '')
    setApproachNotes(freshParsed.approach || '')
    setComplexityNotes(freshParsed.complexity || '')
    setPitfallsNotes(freshParsed.pitfalls || '')
  }, [active, initialCode])

  const handleFetchLeetCode = async () => {
    if (!lcFetchNumber.trim()) return
    setIsFetchingLc(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/leetcode?number=${encodeURIComponent(lcFetchNumber.trim())}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch LeetCode question')
      }
      const data = await res.json()
      setCustomTitle(data.title)
      setCustomDifficulty(data.difficulty)
      setCustomLink(data.url)
      setCustomPlatform('LC')
      setCustomLeetCodeNumber(data.id)
      setLcFetchNumber('')
    } catch (err: any) {
      console.error(err)
      setFetchError(err.message || 'Error fetching question')
      setTimeout(() => setFetchError(null), 3000)
    } finally {
      setIsFetchingLc(false)
    }
  }

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateCanUndoRedo = () => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }

  const handleCodeChange = (newVal: string, forceHistoryPush = false) => {
    setEditorCode(newVal)
    
    // Clear redo stack on typing
    if (redoStackRef.current.length > 0) {
      redoStackRef.current = []
      setCanRedo(false)
    }

    if (forceHistoryPush) {
      if (undoStackRef.current[undoStackRef.current.length - 1] !== editorCode) {
        undoStackRef.current.push(editorCode)
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
      const prevCode = editorCode
      historyTimeoutRef.current = setTimeout(() => {
        if (undoStackRef.current[undoStackRef.current.length - 1] !== prevCode) {
          undoStackRef.current.push(prevCode)
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

    const currentVal = editorCode
    const prevVal = undoStackRef.current.pop()!
    
    redoStackRef.current.push(currentVal)
    setEditorCode(prevVal)
    updateCanUndoRedo()
  }

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return

    const currentVal = editorCode
    const nextVal = redoStackRef.current.pop()!

    undoStackRef.current.push(currentVal)
    setEditorCode(nextVal)
    updateCanUndoRedo()
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // Track the current theme (data-theme attribute on document.documentElement)
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

  // Scroll synchronization between textarea, pre, gutter, and active line highlight
  useEffect(() => {
    const ta = textareaRef.current
    const pre = preRef.current
    if (!ta || !pre) return

    const syncScroll = () => {
      pre.scrollTop = ta.scrollTop
      pre.scrollLeft = ta.scrollLeft
      if (gutterRef.current) {
        gutterRef.current.scrollTop = ta.scrollTop
      }
      if (highlightRef.current) {
        highlightRef.current.style.transform = `translateY(${-ta.scrollTop}px)`
      }
    }

    ta.addEventListener('scroll', syncScroll)
    syncScroll()

    return () => {
      ta.removeEventListener('scroll', syncScroll)
    }
  }, [active.id, workspaceTab]) // Rebind when active question or tab changes

  // Sync editor code when active question changes or lang changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditorCode(initialCode || BOILERPLATES[lang] || '')
    setIsSaved(false)
    setConsoleOutput('')
    setRunSuccess(null)
    setConsoleTab('input')
    // Clear history stacks
    undoStackRef.current = []
    redoStackRef.current = []
    setCanUndo(false)
    setCanRedo(false)
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current)
      historyTimeoutRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id, initialCode])

  // Handle Save
  function handleSaveLocal() {
    const fullSerializedCode = serializeCodeNotes(editorCode, patternNotes, approachNotes, complexityNotes, pitfallsNotes)
    onSave(fullSerializedCode)
    if (active.isCustom && onUpdateMetadata) {
      onUpdateMetadata({
        name: customTitle,
        difficulty: customDifficulty,
        link: customLink,
        platform: customPlatform,
        leetcodeNumber: customLeetCodeNumber
      })
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  // Handle Local Code Compilation and Run
  async function handleRunCodeLocal() {
    setIsRunning(true)
    setConsoleOutput('Executing your code locally...')
    setRunSuccess(null)
    setConsoleTab('output')

    const res = await compileAndRunCode(editorCode, stdin, lang)
    setIsRunning(false)

    if (res.compileError) {
      setConsoleOutput(res.compileError)
      setRunSuccess(false)
    } else if (!res.success) {
      setConsoleOutput(res.error || 'Execution failed.')
      setRunSuccess(false)
    } else {
      let output = res.output
      if (res.error) {
        output += '\n\n-- stderr --\n' + res.error
      }
      setConsoleOutput(output || 'Code executed successfully with zero output.')
      setRunSuccess(true)
    }
  }

  // Reset Template
  function handleResetTemplate() {
    if (confirm('Are you sure you want to reset your editor code to the default template? This will overwrite your current unsaved editor edits.')) {
      setEditorCode(BOILERPLATES[lang] || '')
    }
  }

  // Copy Code to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorCode)
      alert('Code copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  // Intercept key down inside the editor for tabs, undo/redo, and cmd+s saving
  function handleKeyDownLocal(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
          const newlines = newVal.substring(0, newStart).split('\n')
          setActiveLine(newlines.length)
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
          const newlines = newVal.substring(0, newStart).split('\n')
          setActiveLine(newlines.length)
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
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start - deleteCount
              const newlines = newVal.substring(0, start - deleteCount).split('\n')
              setActiveLine(newlines.length)
            }
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
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + cursorOffset
          const newlines = newVal.substring(0, start + cursorOffset).split('\n')
          setActiveLine(newlines.length)
        }
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
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1
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
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1
            }
          }, 0)
          return
        }
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      handleSaveLocal()
    }
  }

  const lineCount = editorCode.split('\n').length
  const lineHeightPx = Math.round(fontSize * 1.6)
  const editorFontFamily = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  const activeLinks = PROBLEM_LINKS[active.name] || {}

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const val = textarea.value
    const selStart = textarea.selectionStart
    const newlines = val.substring(0, selStart).split('\n')
    setActiveLine(newlines.length)
  }

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: theme === 'light' ? '#64748b' : '#8b949e',
    cursor: 'pointer',
    transition: 'all 0.15s'
  }

  const handleIconMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.08)'
    e.currentTarget.style.color = theme === 'light' ? '#0f172a' : '#ffffff'
  }
  const handleIconMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = theme === 'light' ? '#64748b' : '#8b949e'
  }

  const menuButtonStyle: React.CSSProperties = {
    padding: '3px 8px',
    borderRadius: 4,
    border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
    background: theme === 'light' ? '#f8fafc' : '#0d1117',
    color: 'var(--text-2)',
    fontSize: 11,
    fontWeight: 750,
    cursor: 'pointer'
  }

  return (
    <div className="main-compiler-sticky-wrap" style={{
      borderRadius: 16,
      border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
      background: 'var(--surface)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Panel Header */}
      <div style={{ padding: '5px 12px', borderBottom: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)', background: `linear-gradient(135deg, ${phaseColor}18, transparent)`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {active.isCustom ? (
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Blank Custom Question"
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'var(--text)',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '180px',
                  padding: '1px 3px',
                  borderRadius: 4,
                  borderBottom: '1px dashed var(--text-4)',
                  fontFamily: 'Inter, sans-serif'
                }}
              />
            ) : (
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px', lineHeight: 1.2 }}>{active.name}</div>
            )}
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                onClick={() => {
                  if (active.isCustom) {
                    setCustomDifficulty(prev => prev === 2 ? 3 : (prev === 3 ? 4 : 2))
                  }
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: DIFF_COLORS[customDifficulty],
                  background: DIFF_COLORS[customDifficulty] + '20',
                  padding: '2px 6px',
                  borderRadius: 4,
                  flexShrink: 0,
                  cursor: active.isCustom ? 'pointer' : 'default'
                }}
                title={active.isCustom ? "Click to toggle difficulty" : undefined}
              >
                {DIFF_LABELS[customDifficulty]}
              </span>
              <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{active.subtopic}</span>
              
              {/* LeetCode Auto-Fetch Loader/Input */}
              {active.isCustom && (
                <>
                  <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                    <input
                      type="text"
                      value={lcFetchNumber}
                      onChange={(e) => setLcFetchNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFetchLeetCode()
                      }}
                      placeholder="Fetch LC #"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '2px 6px',
                        width: '75px',
                        color: 'var(--text)',
                        outline: 'none',
                        height: '22px',
                        boxSizing: 'border-box'
                      }}
                      disabled={isFetchingLc}
                    />
                    <button
                      type="button"
                      onClick={handleFetchLeetCode}
                      style={{
                        fontSize: 11,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: isFetchingLc ? 'var(--text-4)' : phaseColor,
                        fontWeight: 800,
                        padding: '2px 4px'
                      }}
                      disabled={isFetchingLc}
                    >
                      {isFetchingLc ? '...' : 'Fetch'}
                    </button>
                    {fetchError && (
                      <span style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        fontSize: 9,
                        color: '#ef4444',
                        whiteSpace: 'nowrap',
                        background: 'var(--surface)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid rgba(239,68,68,0.25)',
                        zIndex: 10
                      }}>
                        {fetchError}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Practice Links merged inline */}
              {!active.isCustom ? (
                <>
                  <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
                  <Link href={`/dsa/${topicSlug}/revision`} style={{
                    fontSize: 11, fontWeight: 700, color: phaseColor, textDecoration: 'none', transition: 'opacity 0.15s'
                  }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
                    📖 Revision Sheet
                  </Link>
                  {activeLinks.lc && (
                    <>
                      <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
                      <a href={activeLinks.lc} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, fontWeight: 700, color: '#ffa116', textDecoration: 'none', transition: 'opacity 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
                        LeetCode
                      </a>
                    </>
                  )}
                  {activeLinks.gfg && (
                    <>
                      <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
                      <a href={activeLinks.gfg} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, fontWeight: 700, color: '#298e46', textDecoration: 'none', transition: 'opacity 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
                        GFG Practice
                      </a>
                    </>
                  )}
                </>
              ) : (
                <>
                  {customLink ? (
                    <>
                      <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
                      <a href={customLink} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, fontWeight: 700, color: '#ffa116', textDecoration: 'none', transition: 'opacity 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
                        LeetCode Link
                      </a>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
                      <input
                        type="text"
                        placeholder="Paste link..."
                        value={customLink}
                        onChange={(e) => setCustomLink(e.target.value)}
                        style={{
                          fontSize: 11,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-3)',
                          borderBottom: '1px dashed var(--text-4)',
                          width: '90px',
                          padding: '1px 2px'
                        }}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {/* Focus Mode Button */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              style={{
                padding: '3px 8px', background: isFocusMode ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: `1px solid ${isFocusMode ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 5, color: isFocusMode ? 'var(--brand-light)' : 'var(--text-3)',
                fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s'
              }}
            >
              {isFocusMode ? '🗖 Focus Mode: ON' : '🗗 Focus Mode'}
            </button>
            
            {active.isCustom && onDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this custom question? All your custom code for it will be lost.')) {
                    onDelete()
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s'
                }}
              >
                🗑️ Delete
              </button>
            )}
            
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 5,
              padding: '3px 8px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11, fontFamily: 'Inter, sans-serif'
            }}>✕ Close</button>
          </div>
        </div>
      </div>
      
      {/* Workspace Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
        background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
        padding: '0 12px',
        gap: 12,
        flexShrink: 0
      }}>
        <button
          type="button"
          onClick={() => setWorkspaceTab('code')}
          style={{
            padding: '5px 2px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 800,
            color: workspaceTab === 'code' ? phaseColor : 'var(--text-3)',
            borderBottom: `2px solid ${workspaceTab === 'code' ? phaseColor : 'transparent'}`,
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          💻 Editor
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceTab('console')}
          style={{
            padding: '5px 2px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 800,
            color: workspaceTab === 'console' ? phaseColor : 'var(--text-3)',
            borderBottom: `2px solid ${workspaceTab === 'console' ? phaseColor : 'transparent'}`,
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          ⚙️ Console & Run
          {runSuccess !== null && (
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: runSuccess ? '#10b981' : '#ef4444',
              display: 'inline-block',
              marginLeft: 3
            }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceTab('approach')}
          style={{
            padding: '5px 2px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 800,
            color: workspaceTab === 'approach' ? phaseColor : 'var(--text-3)',
            borderBottom: `2px solid ${workspaceTab === 'approach' ? phaseColor : 'transparent'}`,
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          📝 Approach
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceTab('complexity')}
          style={{
            padding: '5px 2px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 11.5,
            fontWeight: 800,
            color: workspaceTab === 'complexity' ? phaseColor : 'var(--text-3)',
            borderBottom: `2px solid ${workspaceTab === 'complexity' ? phaseColor : 'transparent'}`,
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          ⚡ Complexity & Pitfalls
        </button>
      </div>

      <div style={{ padding: '6px 12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Editor Code Tab */}
        <div style={{ display: workspaceTab === 'code' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          
          {/* Unified Editor Component */}
          <div className="main-code-editor-wrap" style={{
            background: theme === 'light' ? '#ffffff' : '#0d1117',
            borderRadius: 12,
            border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            boxShadow: theme === 'light' ? '0 4px 20px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            {/* Topbar/Header inside the Editor */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              borderBottom: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)',
              background: theme === 'light' ? '#f8fafc' : '#090d13',
              flexShrink: 0
            }}>
              {/* Left Side: Language Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={lang}
                  onChange={(e) => {
                    const nextLang = e.target.value
                    setLang(nextLang)
                    const currentBoilerplates = Object.values(BOILERPLATES)
                    if (!editorCode.trim() || currentBoilerplates.some(b => b.trim() === editorCode.trim())) {
                      setEditorCode(BOILERPLATES[nextLang] || '')
                    }
                    undoStackRef.current = []
                    redoStackRef.current = []
                    setCanUndo(false)
                    setCanRedo(false)
                    if (historyTimeoutRef.current) {
                      clearTimeout(historyTimeoutRef.current)
                      historyTimeoutRef.current = null
                    }
                  }}
                  style={{
                    padding: '4px 24px 4px 8px',
                    borderRadius: 6,
                    border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                    backgroundColor: theme === 'light' ? '#ffffff' : '#0d1117',
                    color: theme === 'light' ? '#334155' : '#c9d1d9',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${theme === 'light' ? '%23334155' : '%23c9d1d9'}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '12px'
                  }}
                >
                  <option value="cpp">C++ (17)</option>
                  <option value="c">C (gcc)</option>
                  <option value="python">Python (3)</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                </select>
              </div>

              {/* Right Side: Tool Icons */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* List/Sidebar toggle */}
                <button
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  onMouseEnter={handleIconMouseEnter}
                  onMouseLeave={handleIconMouseLeave}
                  title="Toggle Focus Mode"
                  style={iconButtonStyle}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>

                {/* Copy Code */}
                <button
                  onClick={handleCopy}
                  onMouseEnter={handleIconMouseEnter}
                  onMouseLeave={handleIconMouseLeave}
                  title="Copy Code"
                  style={iconButtonStyle}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>

                {/* Problem Link (External) */}
                {activeLinks.lc && (
                  <a
                    href={activeLinks.lc}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on LeetCode"
                    style={{
                      ...iconButtonStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.color = '#ffa116'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = theme === 'light' ? '#64748b' : '#8b949e'
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3"/>
                    </svg>
                  </a>
                )}

                {/* Settings Toggle */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    onMouseEnter={handleIconMouseEnter}
                    onMouseLeave={(e) => {
                      if (!showSettings) {
                        handleIconMouseLeave(e)
                      }
                    }}
                    title="Editor Settings"
                    style={{
                      ...iconButtonStyle,
                      background: showSettings ? (theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)') : 'transparent',
                      color: showSettings ? (theme === 'light' ? '#0f172a' : '#ffffff') : (theme === 'light' ? '#64748b' : '#8b949e')
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>

                  {/* Settings Menu Popup */}
                  {showSettings && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: theme === 'light' ? '#ffffff' : '#1e2430',
                      border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 8,
                      padding: 12,
                      width: 200,
                      zIndex: 50,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Font Size
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <button
                          onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                          style={menuButtonStyle}
                        >A-</button>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text)', fontWeight: 'bold' }}>
                          {fontSize}px
                        </span>
                        <button
                          onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                          style={menuButtonStyle}
                        >A+</button>
                      </div>

                      <div style={{ borderTop: `1px solid ${theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`, paddingTop: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={showRunner}
                            onChange={(e) => setShowRunner(e.target.checked)}
                          />
                          Show Runner Console
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Undo Button */}
                <button
                  onClick={handleUndo}
                  onMouseEnter={handleIconMouseEnter}
                  onMouseLeave={handleIconMouseLeave}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z / Cmd+Z)"
                  style={{
                    ...iconButtonStyle,
                    opacity: canUndo ? 1 : 0.4,
                    cursor: canUndo ? 'pointer' : 'not-allowed'
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                </button>

                {/* Redo Button */}
                <button
                  onClick={handleRedo}
                  onMouseEnter={handleIconMouseEnter}
                  onMouseLeave={handleIconMouseLeave}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y / Cmd+Y)"
                  style={{
                    ...iconButtonStyle,
                    opacity: canRedo ? 1 : 0.4,
                    cursor: canRedo ? 'pointer' : 'not-allowed'
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                  </svg>
                </button>

                {/* Reset Code */}
                <button
                  onClick={handleResetTemplate}
                  onMouseEnter={handleIconMouseEnter}
                  onMouseLeave={handleIconMouseLeave}
                  title="Reset Template Code"
                  style={iconButtonStyle}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>

                {/* Fullscreen / Focus Mode */}
                <button
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  onMouseEnter={handleIconMouseEnter}
                  onMouseLeave={handleIconMouseLeave}
                  title="Toggle Fullscreen Editor"
                  style={iconButtonStyle}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </button>

                {/* Run Button */}
                <button
                  onClick={() => {
                    handleRunCodeLocal()
                    setWorkspaceTab('console')
                    setConsoleTab('output')
                  }}
                  disabled={isRunning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 6,
                    border: 'none',
                    background: phaseColor,
                    color: 'white',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                    boxShadow: `0 2px 8px ${phaseColor}30`
                  }}
                >
                  <span>{isRunning ? '⏳ Running' : '▶️ Run'}</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSaveLocal}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${isSaved ? '#10b981' : (theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.15)')}`,
                    background: isSaved
                      ? 'rgba(16,185,129,0.15)'
                      : (theme === 'light' ? '#f8fafc' : '#0d1117'),
                    color: isSaved ? '#10b981' : (theme === 'light' ? '#334155' : '#c9d1d9'),
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                    boxShadow: isSaved ? '0 0 10px rgba(16,185,129,0.1)' : 'none'
                  }}
                >
                  <span>{isSaved ? '✓ Saved' : '💾 Save'}</span>
                </button>
              </div>
            </div>

            {/* Editor Workspace (Gutter + Code Input container) */}
            <div className="main-code-editor-workspace" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
              
              {/* Gutter Line Numbers */}
              <div
                ref={gutterRef}
                  style={{
                    padding: '16px 12px 16px 16px',
                    fontFamily: editorFontFamily,
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeightPx}px`,
                    color: theme === 'light' ? '#64748b' : '#485263',
                    borderRight: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                    background: theme === 'light' ? '#f8fafc' : '#080c14',
                    textAlign: 'right',
                    userSelect: 'none',
                    overflowY: 'hidden',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {Array.from({ length: Math.max(lineCount, 12) }).map((_, i) => {
                    const isCurrent = i + 1 === activeLine
                    return (
                      <div
                        key={i}
                        style={{
                          height: `${lineHeightPx}px`,
                          lineHeight: `${lineHeightPx}px`,
                          color: isCurrent
                            ? (theme === 'light' ? '#4338ca' : '#ffffff')
                            : (theme === 'light' ? '#64748b' : '#485263'),
                          fontWeight: isCurrent ? 800 : 500,
                          fontSize: '12px',
                          transition: 'color 0.15s'
                        }}
                      >
                        {i + 1}
                      </div>
                    )
                  })}
                </div>

                {/* Editor Overlay Container */}
                <div className="main-code-editor-overlay" style={{
                  position: 'relative',
                  flex: 1,
                  height: '100%',
                  overflow: 'hidden'
                }}>
                  {/* Active Line Highlight Background */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    zIndex: 0
                  }}>
                    <div
                      ref={highlightRef}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: `${lineHeightPx}px`,
                        top: 16 + (activeLine - 1) * lineHeightPx,
                        background: theme === 'light' ? 'rgba(99, 102, 241, 0.07)' : 'rgba(255, 255, 255, 0.04)',
                        borderLeft: theme === 'light' ? '3px solid #4338ca' : '3px solid #818cf8',
                        transition: 'top 0.08s ease-out',
                        zIndex: 0
                      }}
                    />
                  </div>

                  {/* Highlighted Code (Behind Textarea) */}
                  <pre
                    className="main-code-editor-pre"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      padding: 16,
                      fontFamily: editorFontFamily,
                      fontSize: `${fontSize}px`,
                      fontWeight: 500,
                      lineHeight: `${lineHeightPx}px`,
                      letterSpacing: '0px',
                      color: theme === 'light' ? '#111827' : '#c9d1d9',
                      whiteSpace: 'pre',
                      wordBreak: 'normal',
                      wordWrap: 'normal',
                      overflowWrap: 'normal',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      boxSizing: 'border-box',
                      background: 'transparent',
                      tabSize: 4,
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      textRendering: 'optimizeLegibility',
                      zIndex: 1
                    }}
                    ref={preRef}
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        const lines = editorCode.split('\n')
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
                          comments: '#1a7f37',
                          strings: '#0a3069',
                          preproc: '#cf222e',
                          keywords: '#cf222e',
                          customTypes: '#111827',
                          numbers: '#0550ae',
                          funcs: '#8250df',
                          types: '#0550ae'
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
                        const guideStyle = `display: inline-block; width: 4ch; border-left: 1px dashed ${guideColor}; box-sizing: border-box; height: ${lineHeightPx}px; vertical-align: top; margin: 0; padding: 0;`

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

                        return outputLines.join('\n') + '\n'
                      })()
                    }}
                  />

                  <textarea
                    className="main-code-editor-textarea"
                    ref={textareaRef}
                    value={editorCode}
                    onChange={e => {
                      handleCodeChange(e.target.value)
                      const selStart = e.target.selectionStart
                      const newlines = e.target.value.substring(0, selStart).split('\n')
                      setActiveLine(newlines.length)
                    }}
                    onKeyDown={handleKeyDownLocal}
                    onSelect={handleSelect}
                    onClick={handleSelect}
                    onKeyUp={handleSelect}
                    placeholder="// Write or paste your custom code solution here...&#10;// Click 'Save' or press Command+S / Ctrl+S to save to your local database."
                    spellCheck={false}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      margin: 0,
                      padding: 16,
                      fontFamily: editorFontFamily,
                      fontSize: `${fontSize}px`,
                      fontWeight: 500,
                      lineHeight: `${lineHeightPx}px`,
                      letterSpacing: '0px',
                      color: 'transparent',
                      caretColor: theme === 'light' ? '#000000' : '#ffffff',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      tabSize: 4,
                      boxSizing: 'border-box',
                      whiteSpace: 'pre',
                      wordBreak: 'normal',
                      wordWrap: 'normal',
                      overflowWrap: 'normal',
                      overflow: 'auto',
                      WebkitTextFillColor: 'transparent',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      textRendering: 'optimizeLegibility',
                      display: 'block',
                      zIndex: 2
                    }}
                  />
                </div>
            </div>
            {/* Status footer info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
              <span>Lines: {lineCount}</span>
              <span>Database: Neon PostgreSQL (production)</span>
            </div>
          </div>
        </div>

        {/* Console & Run Tab Content */}
        <div style={{ display: workspaceTab === 'console' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, gap: 12 }}>
          
          {/* Console Tabs and Run Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setConsoleTab('input')}
                style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  background: consoleTab === 'input' ? 'var(--surface-2)' : 'transparent',
                  color: consoleTab === 'input' ? phaseColor : 'var(--text-3)',
                  borderBottom: consoleTab === 'input' ? `2px solid ${phaseColor}` : '2px solid transparent',
                  borderRadius: 6
                }}
              >
                📥 Test Input
              </button>
              <button
                type="button"
                onClick={() => setConsoleTab('output')}
                style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  background: consoleTab === 'output' ? 'var(--surface-2)' : 'transparent',
                  color: consoleTab === 'output' ? (runSuccess === false ? '#ef4444' : (runSuccess === true ? '#10b981' : phaseColor)) : 'var(--text-3)',
                  borderBottom: consoleTab === 'output' ? `2px solid ${runSuccess === false ? '#ef4444' : (runSuccess === true ? '#10b981' : phaseColor)}` : '2px solid transparent',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                📤 Console Output
                {runSuccess !== null && (
                  <span style={{ fontSize: 8, color: runSuccess ? '#10b981' : '#ef4444' }}>●</span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleRunCodeLocal}
              disabled={isRunning}
              style={{
                padding: '6px 16px', borderRadius: 8, cursor: isRunning ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 800, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                background: isRunning ? 'var(--surface-2)' : phaseColor,
                color: isRunning ? 'var(--text-4)' : 'white',
                border: 'none',
                boxShadow: `0 3px 10px ${phaseColor}20`
              }}
            >
              {isRunning ? 'Running...' : 'Compile & Run'}
            </button>
          </div>

          {/* Console Tab Body */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {consoleTab === 'input' ? (
              <textarea
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Enter input values here..."
                spellCheck={false}
                style={{
                  width: '100%', height: '100%', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px',
                  color: 'var(--text)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5
                }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', background: 'var(--surface-2)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px',
                color: runSuccess === false ? '#ef4444' : '#e6edf3', fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace', overflowY: 'auto',
                whiteSpace: 'pre-wrap', boxSizing: 'border-box', lineHeight: 1.5
              }}>
                {consoleOutput || '// Output will appear here after compilation...'}
              </div>
            )}
          </div>

        </div>

        {/* Approach Tab Content */}
        <div style={{ display: workspaceTab === 'approach' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Algorithmic Pattern
            </label>
            <input
              type="text"
              value={patternNotes}
              onChange={e => setPatternNotes(e.target.value)}
              placeholder="e.g. Union-Find, Sliding Window, Two Pointers, BFS..."
              style={{
                width: '100%', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px',
                color: 'var(--text)', fontSize: 13, fontFamily: 'Inter, sans-serif',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Solution Idea & Approach
            </label>
            <textarea
              value={approachNotes}
              onChange={e => setApproachNotes(e.target.value)}
              placeholder="Describe the solution intuition, walkthrough step-by-step logic, and design details here..."
              style={{
                width: '100%', flex: 1, background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px',
                color: 'var(--text)', fontSize: 13.5, fontFamily: 'Inter, sans-serif',
                outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6
              }}
            />
          </div>
        </div>

        {/* Complexity & Pitfalls Tab Content */}
        <div style={{ display: workspaceTab === 'complexity' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Complexity Analysis
            </label>
            <textarea
              value={complexityNotes}
              onChange={e => setComplexityNotes(e.target.value)}
              placeholder="e.g.&#10;Time: O(N log N)&#10;Space: O(N)"
              style={{
                width: '100%', height: '80px', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px',
                color: 'var(--text)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Common Pitfalls & Edge Cases
            </label>
            <textarea
              value={pitfallsNotes}
              onChange={e => setPitfallsNotes(e.target.value)}
              placeholder="List potential bugs, boundary traps, index mistakes, or special edge cases to watch out for..."
              style={{
                width: '100%', flex: 1, background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px',
                color: 'var(--text)', fontSize: 13.5, fontFamily: 'Inter, sans-serif',
                outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DSATopicClient({ topic, phaseColor }: { topic: Topic; phaseColor: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

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

  const qParam = searchParams.get('q')
  const activeQ = qParam ? parseInt(qParam, 10) : null

  const [filter, setFilter] = useState<string>('all')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedImportance, setSelectedImportance] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('default')
  const [sortField, setSortField] = useState<'default' | 'title' | 'difficulty' | 'frequency' | 'importance' | 'acRate'>('default')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [studyMode, setStudyMode] = useState<boolean>(false)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false)

  // Auto-sort by interview frequency when a company filter is applied (matches LeetCode Premium)
  useEffect(() => {
    if (selectedCompany !== 'all') {
      setSortField('frequency')
      setSortDirection('desc')
    }
  }, [selectedCompany])

  function handleSelectQuestion(id: number | null) {
    if (id === null) {
      router.push(pathname, { scroll: false })
    } else {
      router.push(`${pathname}?q=${id}`, { scroll: false })
    }
  }
  
  const { solved, revisit, userCodes, toggle, toggleRevisit, saveCode, customQuestions, saveCustomQuestions, updateCustomQuestion } = useProgress()

  const [showAddModal, setShowAddModal] = useState(false)
  const [newQuestionName, setNewQuestionName] = useState('')
  const [newQuestionSubtopic, setNewQuestionSubtopic] = useState('')
  const [isCustomSubtopic, setIsCustomSubtopic] = useState(false)
  const [customSubtopicText, setCustomSubtopicText] = useState('')
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<number>(3)
  const [newQuestionLink, setNewQuestionLink] = useState('')
  const [newQuestionImportance, setNewQuestionImportance] = useState<'Crucial' | 'High' | 'Medium' | 'Low'>('Medium')
  const [newQuestionCompany, setNewQuestionCompany] = useState('')
  const [newQuestionPlatform, setNewQuestionPlatform] = useState<'LC' | 'GFG' | 'SPOJ' | 'CN' | 'Custom'>('LC')

  const handleCopy = (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
    navigator.clipboard.writeText(text)
    const btn = e.currentTarget
    const oldHtml = btn.innerHTML
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 12 4 18"/></svg> Copied!'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.innerHTML = oldHtml
      btn.classList.remove('copied')
    }, 2000)
  }

  const allQuestions = useMemo(() => {
    const topicCustomQuestions = customQuestions.filter(q => q.topicSlug === topic.slug)
    return [...topic.questions, ...topicCustomQuestions]
  }, [topic.questions, customQuestions])

  const subtopics = useMemo(() => {
    return [...new Set(allQuestions.map(q => q.subtopic))]
  }, [allQuestions])

  useEffect(() => {
    if (subtopics.length > 0 && !newQuestionSubtopic) {
      setNewQuestionSubtopic(subtopics[0])
    }
  }, [subtopics, newQuestionSubtopic])

  const handleDeleteQuestion = (id: number) => {
    const updated = customQuestions.filter((q: any) => q.id !== id)
    saveCustomQuestions(updated)
    handleSelectQuestion(null)
  }

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestionName.trim()) return alert('Please enter a question name')
    
    const finalSubtopic = isCustomSubtopic ? customSubtopicText.trim() : newQuestionSubtopic
    if (!finalSubtopic) return alert('Please enter or select a subtopic')
    
    const maxId = customQuestions.reduce((max: number, q: any) => Math.max(max, q.id), 99999)
    const newId = maxId + 1
    
    const companiesList = newQuestionCompany
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)
    
    const newQ = {
      id: newId,
      topicSlug: topic.slug,
      subtopic: finalSubtopic,
      name: newQuestionName.trim(),
      difficulty: newQuestionDifficulty,
      link: newQuestionLink.trim() || undefined,
      isCustom: true,
      companies: companiesList.length > 0 ? companiesList : ['Custom'],
      importance: newQuestionImportance,
      frequency: newQuestionImportance === 'Crucial' ? 90 : (newQuestionImportance === 'High' ? 70 : (newQuestionImportance === 'Medium' ? 50 : 30)),
      acRate: 50.0,
      platform: newQuestionPlatform,
      leetcodeNumber: newQuestionPlatform === 'LC' ? 100 + (newId % 1000) : undefined
    }
    
    const updatedList = [...customQuestions, newQ]
    saveCustomQuestions(updatedList)
    
    setNewQuestionName('')
    setIsCustomSubtopic(false)
    setCustomSubtopicText('')
    setNewQuestionLink('')
    setNewQuestionCompany('')
    setShowAddModal(false)
    
    handleSelectQuestion(newId)
  }

  const enrichedQuestions = useMemo(() => {
    return allQuestions.map(q => getEnrichedQuestion(q))
  }, [allQuestions])

  const filtered = useMemo(() => {
    let result = enrichedQuestions
    
    // Subtopic filter
    if (filter !== 'all') {
      result = result.filter(q => q.subtopic === filter)
    }
    
    // Company filter
    if (selectedCompany !== 'all') {
      result = result.filter(q => q.companies.includes(selectedCompany))
    }
    
    // Importance filter
    if (selectedImportance !== 'all') {
      result = result.filter(q => q.importance === selectedImportance)
    }
    
    // Sort logic
    const activeField = sortBy !== 'default' ? sortBy : sortField
    
    if (activeField === 'frequency' || activeField === 'frequency-desc') {
      result = [...result].sort((a, b) => b.frequency - a.frequency)
    } else if (activeField === 'frequency-asc') {
      result = [...result].sort((a, b) => a.frequency - b.frequency)
    } else if (activeField === 'importance' || activeField === 'importance-desc') {
      const rank: Record<string, number> = { 'Crucial': 3, 'High': 2, 'Medium': 1, 'Low': 0 }
      result = [...result].sort((a, b) => (rank[b.importance] ?? 0) - (rank[a.importance] ?? 0))
    } else if (activeField === 'importance-asc') {
      const rank: Record<string, number> = { 'Crucial': 3, 'High': 2, 'Medium': 1, 'Low': 0 }
      result = [...result].sort((a, b) => (rank[a.importance] ?? 0) - (rank[b.importance] ?? 0))
    } else if (activeField === 'difficulty-asc') {
      result = [...result].sort((a, b) => a.difficulty - b.difficulty)
    } else if (activeField === 'difficulty-desc' || activeField === 'difficulty') {
      result = [...result].sort((a, b) => b.difficulty - a.difficulty)
    } else if (activeField === 'title') {
      result = [...result].sort((a, b) => {
        return sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
      })
    } else if (activeField === 'acRate') {
      result = [...result].sort((a, b) => {
        return sortDirection === 'desc' ? b.acRate - a.acRate : a.acRate - b.acRate
      })
    }
    
    return result
  }, [enrichedQuestions, filter, selectedCompany, selectedImportance, sortBy, sortField, sortDirection])

  const active = activeQ !== null ? allQuestions.find(q => q.id === activeQ) : null

  return (
    <div style={active ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' } : undefined}>
      {active && (
        <style>{`
          .content-area {
            height: calc(100vh - var(--header-h)) !important;
            overflow: hidden !important;
          }
          .content-area > div {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 6px 12px 6px 12px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .content-area > div > .no-print {
            display: none !important;
          }
        `}</style>
      )}
      <style>{`
        .freq-container {
          position: relative;
        }
        .freq-container:hover .freq-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(-6px) !important;
        }
      `}</style>
      {/* Premium Filters & Sorting Control Dashboard */}
      {!active && !studyMode && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {/* Row 1: Subtopic filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', minWidth: 90 }}>Subtopics:</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['all', ...subtopics].map(s => (
                <button key={s} onClick={() => { setFilter(s); handleSelectQuestion(null); }} style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 11.5, fontWeight: 700, transition: 'all 0.15s',
                  background: filter === s ? phaseColor : 'var(--surface-2)',
                  color: filter === s ? 'white' : 'var(--text-3)',
                }}>{s === 'all' ? '⊞ All' : s}</button>
              ))}
            </div>
          </div>

          {/* Row 2: Company Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', minWidth: 90 }}>Companies:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedCompany('all')} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                background: selectedCompany === 'all' ? 'var(--brand)' : 'var(--surface-2)',
                color: selectedCompany === 'all' ? 'white' : 'var(--text-4)'
              }}>All Companies</button>
              {COMPANIES.map(c => (
                <button key={c} onClick={() => setSelectedCompany(c)} style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                  background: selectedCompany === c ? 'var(--brand)' : 'var(--surface-2)',
                  color: selectedCompany === c ? 'white' : 'var(--text-3)'
                }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Row 3: Importance Filter & Sort controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', minWidth: 90 }}>Importance:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'Crucial', 'High', 'Medium', 'Low'].map(imp => (
                  <button key={imp} onClick={() => setSelectedImportance(imp)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                    background: selectedImportance === imp ? '#f59e0b' : 'var(--surface-2)',
                    color: selectedImportance === imp ? 'white' : 'var(--text-3)'
                  }}>{imp === 'all' ? 'All Levels' : imp}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)' }}>Sort By:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 12,
                fontWeight: 700, outline: 'none', cursor: 'pointer'
              }}>
                <option value="default">Default Order</option>
                <option value="frequency">Frequency (High → Low)</option>
                <option value="importance">Importance (High → Low)</option>
                <option value="difficulty-asc">Difficulty (Easy → Hard)</option>
                <option value="difficulty-desc">Difficulty (Hard → Easy)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Row with Study Mode Toggle (if not editing a question) */}
      {!active && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setShowAddModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 800, transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            background: 'var(--surface)',
            color: 'var(--text-2)'
          }}>
            <span>➕</span> Add Custom Question
          </button>
          <button onClick={() => setStudyMode(!studyMode)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 8,
            border: `1px solid ${studyMode ? 'var(--brand)' : 'var(--border)'}`, cursor: 'pointer',
            fontSize: 12.5, fontWeight: 800, transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            background: studyMode ? 'var(--brand-dim)' : 'var(--surface)',
            color: studyMode ? 'var(--brand-light)' : 'var(--text-2)'
          }}>
            <span>📄</span>
            {studyMode ? 'Close Study Mode' : 'Study Mode: View All Solutions'}
          </button>
        </div>
      )}

      {studyMode ? (
        /* ══════════════════════════════════════════════════════
           STUDY MODE VIEW (Loads all question code solutions)
           ══════════════════════════════════════════════════════ */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 30, alignItems: 'start' }} className="study-mode-container">
          
          {/* Left Column: Solution Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
            <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>📖 Topic Study sheet — {topic.name}</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'var(--text-4)' }}>
                Showing all solutions you have written for this topic. You can print or review all of them side by side.
              </p>
            </div>

            {filtered.map((q, idx) => {
              const hasCode = !!userCodes[q.id]
              const isSolved = solved.has(q.id)
              const code = userCodes[q.id] || ''

              // Guess language
              let lang = 'cpp'
              if (code.includes('import java') || code.includes('public class')) lang = 'java'
              else if (code.includes('def ') || (code.includes('import ') && !code.includes('#include'))) lang = 'python'
              else if (code.includes('console.log') || (code.includes('const ') && !code.includes('const int'))) lang = 'javascript'
              else if (code.includes('stdio.h')) lang = 'c'

              return (
                <div key={q.id} id={`study-q-${q.id}`} style={{ scrollMarginTop: 100, marginBottom: 32 }}>
                  {/* Header info (flat row) */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12, flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 800, color: 'var(--text-4)' }}>
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{q.name}</h3>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>({q.subtopic})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isSolved && (
                        <span style={{ fontSize: 10, background: '#10b98120', color: '#10b981', border: '1px solid #10b98130', borderRadius: 5, padding: '2px 8px', fontWeight: 800 }}>
                          SOLVED
                        </span>
                      )}
                      {hasCode && (
                        <span style={{ fontSize: 10, background: 'var(--brand-dim)', color: 'var(--brand-light)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 5, padding: '2px 8px', fontWeight: 800 }}>
                          CODE SAVED
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: DIFF_COLORS[q.difficulty] }}>{DIFF_STARS[q.difficulty]}</span>
                    </div>
                  </div>

                  {/* Solution Code (no card padding) */}
                  <div>
                    <EditableCodeBlock
                      questionId={q.id}
                      initialCode={code}
                      language={lang}
                      onSaveSuccess={(newCode) => saveCode(q.id, newCode)}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Column: Sticky TOC Checklist */}
          <div style={{
            position: 'sticky',
            top: 'calc(var(--header-h) + 20px)',
            maxHeight: 'calc(100vh - var(--header-h) - 40px)',
            overflowY: 'auto',
            padding: '4px 0 4px 20px',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }} className="no-print study-toc-sidebar">
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-2)' }}>
              On This Page
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((q, idx) => (
                <a
                  key={q.id}
                  href={`#study-q-${q.id}`}
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-2)',
                    textDecoration: 'none',
                    lineHeight: 1.4,
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = phaseColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
                >
                  {String(idx + 1).padStart(2, '0')}. {q.name}
                </a>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
           STANDARD SPLIT VIEW (Question list + Editor)
           ══════════════════════════════════════════════════════ */
        <div style={active ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' } : { display: 'grid', gridTemplateColumns: '1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Question List (LeetCode Style Table) ── */}
          {!active && (
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              
              {/* LeetCode Style Table Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '2px solid var(--border)',
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--text-4)',
                userSelect: 'none',
                background: 'rgba(255,255,255,0.01)'
              }}>
                <div style={{ width: 85, display: 'flex', gap: 6, flexShrink: 0 }}>Status</div>
                <div 
                  onClick={() => {
                    setSortBy('default')
                    setSortField('title')
                    setSortDirection(prev => sortField === 'title' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
                  }}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                  Title {sortField === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div 
                  onClick={() => {
                    setSortBy('default')
                    setSortField('acRate')
                    setSortDirection(prev => sortField === 'acRate' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc')
                  }}
                  style={{ width: 90, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}
                >
                  Acceptance {sortField === 'acRate' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div 
                  onClick={() => {
                    setSortBy('default')
                    setSortField('difficulty')
                    setSortDirection(prev => sortField === 'difficulty' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
                  }}
                  style={{ width: 100, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}
                >
                  Difficulty {sortField === 'difficulty' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div 
                  onClick={() => {
                    setSortBy('default')
                    setSortField('importance')
                    setSortDirection(prev => sortField === 'importance' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
                  }}
                  style={{ width: 100, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}
                >
                  Importance {sortField === 'importance' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div 
                  onClick={() => {
                    setSortBy('default')
                    setSortField('frequency')
                    setSortDirection(prev => sortField === 'frequency' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc')
                  }}
                  style={{ width: 110, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}
                >
                  Frequency {sortField === 'frequency' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div style={{ width: 220, flexShrink: 0 }}>Companies</div>
              </div>

              {/* Table Rows */}
              {filtered.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                  No questions match your current filters.
                </div>
              ) : (
                filtered.map((q, idx) => {
                  const isActive = activeQ === q.id
                  const isSolved = solved.has(q.id)
                  const isRevisit = revisit ? revisit.has(q.id) : false
                  const hasCustomCode = !!userCodes[q.id]
                  return (
                    <div key={q.id} onClick={() => { handleSelectQuestion(isActive ? null : q.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '12px 16px',
                        background: isActive ? phaseColor + '15' : 'var(--surface)',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.13s',
                        borderLeft: `4px solid ${isSolved ? '#10b981' : (isActive ? phaseColor : 'transparent')}`,
                        opacity: isSolved ? 0.8 : 1
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--surface)'
                        } else {
                          e.currentTarget.style.background = phaseColor + '15'
                        }
                      }}
                    >
                      {/* Column 1: Status (Width: 85px) */}
                      <div style={{ width: 85, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {/* Solved Checkbox */}
                        <div onClick={() => toggle(q.id)} style={{
                          width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${isSolved ? '#10b981' : 'var(--border)'}`,
                          background: isSolved ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }} title="Mark solved">
                          {isSolved && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>

                        {/* Revisit Checkbox */}
                        <div onClick={() => toggleRevisit(q.id)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.15s',
                          transform: isRevisit ? 'scale(1.1)' : 'scale(1)',
                          opacity: isRevisit ? 1 : 0.3
                        }} title={isRevisit ? 'Remove from revisit list' : 'Mark to revisit'}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => { if (!isRevisit) e.currentTarget.style.opacity = '0.3' }}
                        >
                          <span style={{ fontSize: '13px', color: isRevisit ? '#f59e0b' : 'rgba(255,255,255,0.7)', fontWeight: 900, lineHeight: 1 }}>★</span>
                        </div>

                        {/* Code Saved Checkbox */}
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${hasCustomCode ? 'var(--brand)' : 'var(--border)'}`,
                          background: hasCustomCode ? 'var(--brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }} title={hasCustomCode ? 'Solution code saved' : 'No code solution saved'}>
                          <span style={{ fontSize: 9, fontWeight: 900, color: hasCustomCode ? 'white' : 'var(--text-4)', fontFamily: 'JetBrains Mono' }}>&lt;&gt;</span>
                        </div>
                      </div>

                      {/* Column 2: Title (Width: flex: 2) */}
                      <div style={{ flex: 2, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a
                          href={q.link || (
                            q.platform === 'LC'
                              ? `https://leetcode.com/problems/${q.questionSlug || q.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}/`
                              : (q.platform === 'GFG'
                                  ? (PLATFORM_MAPPING[q.name]
                                      ? `https://www.geeksforgeeks.org/problems/${q.questionSlug}/`
                                      : `https://www.geeksforgeeks.org/explore?page=1&search=${encodeURIComponent(q.name)}`)
                                  : (q.platform === 'SPOJ'
                                      ? `https://www.spoj.com/problems/${q.questionSlug || q.name.toUpperCase().replace(/\s+/g, '')}/`
                                      : `https://www.naukri.com/code360/problems/${q.questionSlug || q.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}`))
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: 'var(--brand-light)',
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            borderRadius: 5,
                            padding: '3px 8px',
                            minWidth: '75px',
                            textAlign: 'center',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                            e.currentTarget.style.transform = 'scale(1.03)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          {q.platform === 'LC' ? `LC #${q.leetcodeNumber}` : (q.platform === 'CN' ? 'Ninja' : q.platform)}
                        </a>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            opacity: isSolved ? 0.85 : 1
                          }}>{q.name}</div>
                        </div>
                      </div>

                      {/* Column 2.5: Acceptance Rate (Width: 90px) */}
                      <div style={{ width: 90, flexShrink: 0, fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
                        {q.acRate}%
                      </div>

                      {/* Column 3: Difficulty (Width: 100px) */}
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: DIFF_COLORS[q.difficulty] }}>{DIFF_STARS[q.difficulty]}</span>
                      </div>

                      {/* Column 4: Importance (Width: 100px) */}
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: '2px 6.5px',
                          borderRadius: 4,
                          background: q.importance === 'Crucial' ? '#ef444415' : (q.importance === 'High' ? '#f9731615' : (q.importance === 'Medium' ? '#3b82f615' : 'var(--border)')),
                          color: q.importance === 'Crucial' ? '#ef4444' : (q.importance === 'High' ? '#f97316' : (q.importance === 'Medium' ? '#3b82f6' : 'var(--text-4)')),
                          border: q.importance === 'Crucial' ? '1px solid #ef444430' : (q.importance === 'High' ? '1px solid #f9731630' : (q.importance === 'Medium' ? '1px solid #3b82f630' : 'none')),
                          minWidth: 50,
                          textAlign: 'center',
                          display: 'inline-block'
                        }}>
                          {q.importance}
                        </span>
                      </div>

                      {/* Column 5: Frequency (Width: 110px) */}
                      <div className="freq-container" style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0, paddingRight: 10, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 800, color: 'var(--text-4)' }}>
                          <span>Freq</span>
                          <span>{q.frequency}%</span>
                        </div>
                        <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            width: `${q.frequency}%`,
                            height: '100%',
                            background: q.frequency >= 80 ? '#ef4444' : (q.frequency >= 55 ? '#f97316' : '#3b82f6'),
                            borderRadius: 2
                          }} />
                        </div>
                        
                        {/* Tooltip displaying genuine frequency proof */}
                        <div className="freq-tooltip" style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%) translateY(0px)',
                          background: '#18181b',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '6px 8px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                          zIndex: 100,
                          width: '150px',
                          opacity: 0,
                          visibility: 'hidden',
                          pointerEvents: 'none',
                          transition: 'all 0.15s ease-in-out',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3
                        }}>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--text-3)', borderBottom: '1px solid var(--border)', paddingBottom: 3, marginBottom: 2 }}>
                            6-Month Ask Count
                          </div>
                          {q.companiesData?.map((c: any) => (
                            <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>
                              <span>{c.name}</span>
                              <span style={{ color: 'var(--brand-light)', fontWeight: 700 }}>{c.count} asks</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 6: Companies (Width: 220px) */}
                      <div style={{ width: 220, display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                        {q.companies.map((c: string) => (
                          <span key={c} style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            color: 'var(--text-3)',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── Solution / Editor / Compiler Panel ── */}
          {active && (
            <ActiveQuestionWorkspace
              active={active}
              phaseColor={phaseColor}
              initialCode={userCodes[active.id] || ''}
              topicSlug={topic.slug}
              isFocusMode={isFocusMode}
              setIsFocusMode={setIsFocusMode}
              onSave={(code) => saveCode(active.id, code)}
              onClose={() => handleSelectQuestion(null)}
              onDelete={() => handleDeleteQuestion(active.id)}
              onUpdateMetadata={(updates) => updateCustomQuestion(active.id, updates)}
            />
          )}
        </div>
      )}

      {/* Add Custom Question Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: theme === 'light' ? '#ffffff' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 520,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.01)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                ➕ Add Custom Question
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--text-4)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddQuestionSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Question Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Question Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Find Triplets with Zero Sum"
                  value={newQuestionName}
                  onChange={e => setNewQuestionName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Subtopic */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Subtopic *</label>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isCustomSubtopic}
                      onChange={e => setIsCustomSubtopic(e.target.checked)}
                    />
                    Create Custom Subtopic
                  </label>
                </div>

                {isCustomSubtopic ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom subtopic name"
                    value={customSubtopicText}
                    onChange={e => setCustomSubtopicText(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none',
                      marginTop: 4
                    }}
                  />
                ) : (
                  <select
                    value={newQuestionSubtopic}
                    onChange={e => setNewQuestionSubtopic(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none',
                      marginTop: 4
                    }}
                  >
                    {subtopics.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Flex row for Difficulty & Importance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Difficulty</label>
                  <select
                    value={newQuestionDifficulty}
                    onChange={e => setNewQuestionDifficulty(parseInt(e.target.value, 10))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  >
                    <option value="1">★☆☆☆☆ (Easy)</option>
                    <option value="2">★★☆☆☆ (Easy)</option>
                    <option value="3">★★★☆☆ (Medium)</option>
                    <option value="4">★★★★☆ (Hard)</option>
                    <option value="5">★★★★★ (Hard)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Importance</label>
                  <select
                    value={newQuestionImportance}
                    onChange={e => setNewQuestionImportance(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  >
                    <option value="Crucial">Crucial</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Flex row for Platform & Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Platform</label>
                  <select
                    value={newQuestionPlatform}
                    onChange={e => setNewQuestionPlatform(e.target.value as any)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  >
                    <option value="LC">LeetCode</option>
                    <option value="GFG">GeeksforGeeks</option>
                    <option value="SPOJ">SPOJ</option>
                    <option value="CN">Coding Ninjas</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://leetcode.com/problems/..."
                    value={newQuestionLink}
                    onChange={e => setNewQuestionLink(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Companies */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Target Companies (Optional, comma-separated)</label>
                <input
                  type="text"
                  placeholder="Google, Amazon, Meta"
                  value={newQuestionCompany}
                  onChange={e => setNewQuestionCompany(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: theme === 'light' ? '#ffffff' : 'var(--surface-2)',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 10,
                borderTop: '1px solid var(--border)',
                paddingTop: 16
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-3)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--brand)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
