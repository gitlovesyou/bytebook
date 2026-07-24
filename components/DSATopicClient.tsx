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

interface ActiveQuestionWorkspaceProps {
  active: NonNullable<Topic['questions'][number]>
  phaseColor: string
  initialCode: string
  topicSlug: string
  isFocusMode: boolean
  setIsFocusMode: (f: boolean) => void
  onSave: (code: string) => void
  onClose: () => void
}

const BOILERPLATES: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ code here\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write C code here\n    return 0;\n}`,
  python: `# Write Python code here\nprint("Hello World")`,
  javascript: `// Write JavaScript code here\nconsole.log("Hello World");`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write Java code here\n        System.out.println("Hello World");\n    }\n}`
}

function ActiveQuestionWorkspace({ active, phaseColor, initialCode, topicSlug, isFocusMode, setIsFocusMode, onSave, onClose }: ActiveQuestionWorkspaceProps) {
  const [lang, setLang] = useState<string>('cpp')
  const [editorCode, setEditorCode] = useState<string>(initialCode || BOILERPLATES.cpp)
  const [isSaved, setIsSaved] = useState<boolean>(false)
  const [stdin, setStdin] = useState<string>('')
  const [consoleOutput, setConsoleOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [runSuccess, setRunSuccess] = useState<boolean | null>(null)
  const [consoleTab, setConsoleTab] = useState<'input' | 'output'>('input')
  const [showRunner, setShowRunner] = useState<boolean>(true)
  const [fontSize, setFontSize] = useState<number>(14)

  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [activeLine, setActiveLine] = useState<number>(1)
  const [showSettings, setShowSettings] = useState<boolean>(false)

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
  }, [active.id]) // Rebind when active question changes

  // Sync editor code when active question changes or lang changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditorCode(initialCode || BOILERPLATES[lang] || '')
    setIsSaved(false)
    setConsoleOutput('')
    setRunSuccess(null)
    setConsoleTab('input')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id, initialCode])

  // Handle Save
  function handleSaveLocal() {
    onSave(editorCode)
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

  // Intercept key down inside the editor for tabs and cmd+s saving
  function handleKeyDownLocal(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const val = e.currentTarget.value
      const newVal = val.substring(0, start) + '    ' + val.substring(end)
      setEditorCode(newVal)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
          const newlines = newVal.substring(0, start + 4).split('\n')
          setActiveLine(newlines.length)
        }
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
          setEditorCode(newVal)
          
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
      setEditorCode(newVal)

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
      setEditorCode(newVal)
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1
        }
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
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1
          }
        }, 0)
        return
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      handleSaveLocal()
    }
  }

  const lineCount = editorCode.split('\n').length
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
    <div style={{
      position: 'sticky',
      top: 'calc(var(--header-h) + 12px)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Panel Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: `linear-gradient(135deg, ${phaseColor}18, transparent)`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.name}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: DIFF_COLORS[active.difficulty], background: DIFF_COLORS[active.difficulty] + '20', padding: '2px 6px', borderRadius: 4 }}>
                {DIFF_LABELS[active.difficulty]}
              </span>
              <span style={{ color: 'var(--text-4)', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{active.subtopic}</span>
              
              {/* Practice Links merged inline */}
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
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {/* Focus Mode Button */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              style={{
                padding: '5px 12px', background: isFocusMode ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: `1px solid ${isFocusMode ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 6, color: isFocusMode ? 'var(--brand-light)' : 'var(--text-3)',
                fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s'
              }}
            >
              {isFocusMode ? '🗖 Focus Mode: ON' : '🗗 Focus Mode'}
            </button>
            
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
              padding: '5px 12px', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, fontFamily: 'Inter, sans-serif'
            }}>✕ Close</button>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 16 }}>
        
        {/* Solution Editor Section */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          
          {/* Unified Editor Component */}
          <div style={{
            background: theme === 'light' ? '#ffffff' : '#0d1117',
            borderRadius: 12,
            border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '680px',
            boxShadow: theme === 'light' ? '0 4px 20px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            {/* Topbar/Header inside the Editor */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              borderBottom: `1px solid ${theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
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
                  }}
                  style={{
                    padding: '4px 24px 4px 8px',
                    borderRadius: 6,
                    border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                    background: theme === 'light' ? '#ffffff' : '#0d1117',
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
                      border: `1px solid ${theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
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
            <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
              
              {/* Line Numbers Gutter */}
              <div
                ref={gutterRef}
                style={{
                  background: theme === 'light' ? '#ffffff' : '#090d13',
                  borderRight: `1px solid ${theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                  padding: '16px 8px 16px 12px', userSelect: 'none', textAlign: 'right',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize, lineHeight: 1.6,
                  color: theme === 'light' ? '#94a3b8' : '#484f58',
                  minWidth: '46px', boxSizing: 'border-box', overflowY: 'hidden',
                  flexShrink: 0
                }}
              >
                {Array.from({ length: Math.max(lineCount, 12) }).map((_, i) => {
                  const isCurrent = i + 1 === activeLine
                  return (
                    <div
                      key={i}
                      style={{
                        color: isCurrent
                          ? (theme === 'light' ? '#0f172a' : '#ffffff')
                          : undefined,
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        transition: 'color 0.15s'
                      }}
                    >
                      {i + 1}
                    </div>
                  )
                })}
              </div>

              {/* Editor Overlay Container */}
              <div style={{
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
                      height: fontSize * 1.6,
                      top: 16 + (activeLine - 1) * fontSize * 1.6,
                      background: theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)',
                      transition: 'top 0.08s ease-out',
                      zIndex: 0
                    }}
                  />
                </div>

                {/* Highlighted Code (Behind Textarea) */}
                <pre
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    padding: 16,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: fontSize,
                    lineHeight: 1.6,
                    color: theme === 'light' ? '#24292e' : '#c9d1d9',
                    whiteSpace: 'pre',
                    overflow: 'auto',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    backgroundImage: `linear-gradient(to right, transparent calc(4ch - 1px), ${theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'} calc(4ch - 1px), ${theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.05)'} 4ch)`,
                    backgroundSize: '4ch 100%',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: '16px 0',
                    backgroundAttachment: 'local',
                    zIndex: 1
                  }}
                  ref={preRef}
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const escape = (text: string) => text
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')

                      let escaped = escape(editorCode)

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

                      // Extract types inside template angle brackets: e.g. <Process> or <int>
                      const templates = /&lt;([a-zA-Z_]\w*)&gt;/g
                      templates.lastIndex = 0
                      let tm: RegExpExecArray | null
                      while ((tm = templates.exec(escaped)) !== null) {
                        const word = tm[1]
                        const wordIndex = tm.index + 4 // after "&lt;"
                        const color = /^(int|char|bool|float|double|void)$/.test(word)
                          ? syntaxColors.keywords
                          : (theme === 'light' ? '#24292e' : '#d2a6ff')
                        tokens.push({ start: wordIndex, end: wordIndex + word.length, color, content: word })
                      }

                      // Extract types following class/struct: e.g. struct Process
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

                      let result = ''
                      let pos = 0
                      for (const tok of noOverlap) {
                        result += escaped.slice(pos, tok.start)
                        result += `<span style="color: ${tok.color}">${tok.content}</span>`
                        pos = tok.end
                      }
                      result += escaped.slice(pos)

                      return result + '\n\n'
                    })()
                  }}
                />

                {/* Input Area (Textarea - Transparent on top) */}
                <textarea
                  ref={textareaRef}
                  value={editorCode}
                  onChange={e => setEditorCode(e.target.value)}
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
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: 16,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: fontSize,
                    lineHeight: 1.6,
                    color: 'transparent',
                    caretColor: theme === 'light' ? '#000000' : '#ffffff',
                    resize: 'none',
                    tabSize: 4,
                    boxSizing: 'border-box',
                    overflow: 'auto',
                    whiteSpace: 'pre',
                    WebkitTextFillColor: 'transparent',
                    display: 'block',
                    zIndex: 2
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status footer info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
            <span>Lines: {lineCount}</span>
            <span>Database: Neon PostgreSQL (production)</span>
          </div>
        </div>

        {/* C++ Code Runner (Placed Vertically Below - Collapsible) */}
        {showRunner && (
          <div style={{ flexDirection: 'column', display: 'flex', flexShrink: 0, height: '140px', gap: 6 }}>
            
            {/* Console Tabs and Run Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={() => setConsoleTab('input')}
                  style={{
                    padding: '3px 8px', border: 'none', cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                    background: consoleTab === 'input' ? 'var(--surface-2)' : 'transparent',
                    color: consoleTab === 'input' ? phaseColor : 'var(--text-3)',
                    borderBottom: consoleTab === 'input' ? `2px solid ${phaseColor}` : '2px solid transparent',
                    borderTopLeftRadius: 6, borderTopRightRadius: 6
                  }}
                >
                  📥 Test Input
                </button>
                <button
                  onClick={() => setConsoleTab('output')}
                  style={{
                    padding: '3px 8px', border: 'none', cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                    background: consoleTab === 'output' ? 'var(--surface-2)' : 'transparent',
                    color: consoleTab === 'output' ? (runSuccess === false ? '#ef4444' : (runSuccess === true ? '#10b981' : phaseColor)) : 'var(--text-3)',
                    borderBottom: consoleTab === 'output' ? `2px solid ${runSuccess === false ? '#ef4444' : (runSuccess === true ? '#10b981' : phaseColor)}` : '2px solid transparent',
                    borderTopLeftRadius: 6, borderTopRightRadius: 6,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  📤 Console Output
                  {runSuccess !== null && (
                    <span style={{ fontSize: 7, color: runSuccess ? '#10b981' : '#ef4444' }}>●</span>
                  )}
                </button>
              </div>

              <button
                onClick={handleRunCodeLocal}
                disabled={isRunning}
                style={{
                  padding: '4px 12px', borderRadius: 6, cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontSize: 11.5, fontWeight: 800, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  background: isRunning ? 'var(--surface-2)' : phaseColor,
                  color: isRunning ? 'var(--text-4)' : 'white',
                  border: 'none',
                  boxShadow: `0 3px 10px ${phaseColor}20`
                }}
              >
                {isRunning ? 'Running...' : 'Compile & Run'}
              </button>
            </div>

            {/* Compact Console Tab Body */}
            <div style={{ flex: 1, minHeight: 0 }}>
              {consoleTab === 'input' ? (
                <textarea
                  value={stdin}
                  onChange={e => setStdin(e.target.value)}
                  placeholder="Enter input values here..."
                  spellCheck={false}
                  style={{
                    width: '100%', height: '100%', background: 'var(--surface-2)',
                    border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
                    color: 'var(--text)', fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.4
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: 'var(--surface-2)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px',
                  color: runSuccess === false ? '#ef4444' : '#e6edf3', fontSize: 12.5,
                  fontFamily: 'JetBrains Mono, monospace', overflowY: 'auto',
                  whiteSpace: 'pre-wrap', boxSizing: 'border-box', lineHeight: 1.4
                }}>
                  {consoleOutput || '// Output will appear here after compilation...'}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export function DSATopicClient({ topic, phaseColor }: { topic: Topic; phaseColor: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

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
  
  const { solved, revisit, userCodes, toggle, toggleRevisit, saveCode } = useProgress()

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

  const subtopics = [...new Set(topic.questions.map(q => q.subtopic))]
  
  const enrichedQuestions = useMemo(() => {
    return topic.questions.map(q => getEnrichedQuestion(q))
  }, [topic.questions])

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

  const active = activeQ !== null ? topic.questions.find(q => q.id === activeQ) : null

  return (
    <div>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, alignItems: 'start' }}>

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
            />
          )}
        </div>
      )}
    </div>
  )
}
