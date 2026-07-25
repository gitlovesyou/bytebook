'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { NavSection } from '@/lib/navigation'
import { DSA_DATA } from '@/lib/dsa-data'
import { useProgress } from '@/hooks/useProgress'

const COMPANIES = ['Google', 'Amazon', 'Meta', 'Microsoft', 'Netflix', 'Apple', 'Uber', 'Adobe']
import dsaLinksRaw from '@/lib/dsa-links.json'
const dsaLinks = dsaLinksRaw as Record<string, string>

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
  const link = dsaLinks[name] || dsaLinks[name.replace(/\u2019/g, "'").replace(/`/g, "'").trim()]
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
  return { platform: details.platform, id: details.id, slug: details.slug, link: fallbackLink }
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

export function Sidebar({ nav }: { nav: NavSection[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [activeQId, setActiveQId] = useState<string | null>(null)
  const { solved: rawSolved, revisit: rawRevisit, toggle, toggleRevisit, addCustomQuestion } = useProgress()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const solved = mounted ? rawSolved : new Set<number>()
  const revisit = mounted ? rawRevisit : new Set<number>()

  const [customQuestions, setCustomQuestions] = useState<any[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(268)
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({})
  const [isResizing, setIsResizing] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sidebarCompany, setSidebarCompany] = useState('all')
  const [sidebarImportance, setSidebarImportance] = useState('all')
  const [sidebarStatus, setSidebarStatus] = useState('all')
  const [sidebarSort, setSidebarSort] = useState('default')
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
          const val = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null
          if (val) setTheme(val)
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const loadCustomQs = () => {
      try {
        const raw = localStorage.getItem('bytebook_custom_questions')
        if (raw) setCustomQuestions(JSON.parse(raw))
      } catch { }
    }
    loadCustomQs()
    window.addEventListener('bytebook_custom_questions_updated', loadCustomQs)
    window.addEventListener('storage', loadCustomQs)
    return () => {
      window.removeEventListener('bytebook_custom_questions_updated', loadCustomQs)
      window.removeEventListener('storage', loadCustomQs)
    }
  }, [])

  // Auto-sort by frequency when a company filter is applied inside the sidebar
  useEffect(() => {
    if (sidebarCompany !== 'all') {
      setSidebarSort('frequency')
    }
  }, [sidebarCompany])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bytebook_sidebar_width')
      if (saved) {
        const w = parseInt(saved, 10)
        setSidebarWidth(w)
        document.documentElement.style.setProperty('--sidebar-w', `${w}px`)
      }
    }
  }, [])

  // Auto-expand active topic when pathname changes
  useEffect(() => {
    if (pathname.startsWith('/dsa/')) {
      const slug = pathname.split('/').pop()
      if (slug) {
        setExpandedTopics(prev => ({ ...prev, [slug]: true }))
      }
    }
  }, [pathname])

  function toggleTopicExpand(slug: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setExpandedTopics(prev => ({ ...prev, [slug]: !prev[slug] }))
  }

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    setIsResizing(true)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    const startWidth = sidebarWidth
    const startX = mouseDownEvent.clientX

    const doDrag = (mouseMoveEvent: MouseEvent) => {
      const currentX = mouseMoveEvent.clientX
      const newWidth = Math.max(200, Math.min(600, startWidth + (currentX - startX)))
      setSidebarWidth(newWidth)
      document.documentElement.style.setProperty('--sidebar-w', `${newWidth}px`)
      try {
        localStorage.setItem('bytebook_sidebar_width', String(newWidth))
      } catch { }
    }

    const stopDrag = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
      window.removeEventListener('mousemove', doDrag)
      window.removeEventListener('mouseup', stopDrag)
    }

    window.addEventListener('mousemove', doDrag)
    window.addEventListener('mouseup', stopDrag)
  }

  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        setActiveQId(params.get('q'))
      }
    }
    handleUrlChange()

    const interval = setInterval(handleUrlChange, 250)
    return () => clearInterval(interval)
  }, [pathname])

  function toggleCollapse(key: string) {
    setCollapsed(c => ({ ...c, [key]: !c[key] }))
  }

  return (
    <>
      <nav className="sidebar" style={{ width: sidebarWidth }}>
        {/* Compact Global Sidebar Filter Panel */}
        <div style={{
          margin: '14px 12px 6px',
          padding: '10px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0
        }}>
          {/* Search Input */}
          <input
            type="text"
            placeholder="🔍 Search questions..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              color: 'var(--text)',
              outline: 'none'
            }}
          />

          <div style={{ display: 'flex', gap: 6 }}>
            {/* Company select */}
            <select
              value={sidebarCompany}
              onChange={(e) => setSidebarCompany(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '3px 6px',
                fontSize: 11,
                color: 'var(--text-2)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">🏢 All Companies</option>
              {COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Importance select */}
            <select
              value={sidebarImportance}
              onChange={(e) => setSidebarImportance(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '3px 6px',
                fontSize: 11,
                color: 'var(--text-2)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">⚠️ Importance</option>
              <option value="Crucial">🔥 Crucial</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🔵 Medium</option>
              <option value="Low">⚪ Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Status Select */}
            <select
              value={sidebarStatus}
              onChange={(e) => setSidebarStatus(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '3px 6px',
                fontSize: 11,
                color: 'var(--text-2)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">📝 Status</option>
              <option value="solved">✅ Solved</option>
              <option value="unsolved">❌ Unsolved</option>
              <option value="revisit">⭐ Revisit</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sidebarSort}
              onChange={(e) => setSidebarSort(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '3px 6px',
                fontSize: 11,
                color: 'var(--text-2)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="default">🔢 Default Order</option>
              <option value="frequency">🔥 Frequency</option>
              <option value="difficulty">⭐ Difficulty</option>
            </select>
          </div>
        </div>

        {nav.map((section) => {
          const isCollapsed = collapsed[section.key] ?? false
          return (
            <div key={section.key} className="sidebar-section">
              <div className="sidebar-section-title" onClick={() => toggleCollapse(section.key)}>
                <span>{section.title}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              <div className="sidebar-section-items" style={{ maxHeight: isCollapsed ? '0' : '9999px' }}>
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const slug = item.href.startsWith('/dsa') ? item.href.split('/').pop() || '' : ''

                  // Keep open if it's in expandedTopics state
                  const isExpanded = slug ? (expandedTopics[slug] ?? isActive) : false

                  // Calculate progress for DSA topics
                  let solvedCount = 0
                  let totalCount = 0
                  let groupedChildren: { subtopic: string; questions: { id: number; globalIdx: number; label: string; href: string; companies: string[]; frequency: number; acRate: number; importance: string; difficulty: number; leetcodeNumber: number; platform: string; link?: string; questionSlug?: string }[] }[] = []

                  if (item.href.startsWith('/dsa')) {
                    for (const phase of Object.values(DSA_DATA)) {
                      const topic = phase.topics.find(t => t.slug === slug)
                      if (topic) {
                        const topicCustomQuestions = customQuestions.filter(q => q.topicSlug === topic.slug)
                        const topicAllQuestions = [...topic.questions, ...topicCustomQuestions]
                        totalCount = topicAllQuestions.length
                        solvedCount = topicAllQuestions.filter(q => solved.has(q.id)).length

                        // Pull questions if topic is expanded
                        if (isExpanded) {
                          let qs = topicAllQuestions.map((q, originalIdx) => getEnrichedQuestion({ ...q, globalIdx: originalIdx + 1 }))

                          // Apply sidebar search
                          if (sidebarSearch.trim() !== '') {
                            const query = sidebarSearch.toLowerCase()
                            qs = qs.filter(q => q.name.toLowerCase().includes(query))
                          }

                          // Apply company filter
                          if (sidebarCompany !== 'all') {
                            qs = qs.filter(q => q.companies.includes(sidebarCompany))
                          }

                          // Apply importance filter
                          if (sidebarImportance !== 'all') {
                            qs = qs.filter(q => q.importance === sidebarImportance)
                          }

                          // Apply status filter
                          if (sidebarStatus === 'solved') {
                            qs = qs.filter(q => solved.has(q.id))
                          } else if (sidebarStatus === 'unsolved') {
                            qs = qs.filter(q => !solved.has(q.id))
                          } else if (sidebarStatus === 'revisit') {
                            qs = qs.filter(q => revisit?.has(q.id))
                          }

                          // Apply sorting
                          if (sidebarSort === 'frequency') {
                            qs = [...qs].sort((a, b) => b.frequency - a.frequency)
                          } else if (sidebarSort === 'difficulty') {
                            qs = [...qs].sort((a, b) => b.difficulty - a.difficulty)
                          }

                          const groups: Record<string, { id: number; globalIdx: number; label: string; href: string; companies: string[]; frequency: number; acRate: number; importance: string; difficulty: number; leetcodeNumber: number; platform: string; link?: string; questionSlug?: string; isCustom?: boolean }[]> = {}
                          qs.forEach((q) => {
                            if (!groups[q.subtopic]) {
                              groups[q.subtopic] = []
                            }
                            groups[q.subtopic].push({
                              id: q.id,
                              globalIdx: q.globalIdx,
                              label: q.name,
                              href: `${item.href}?q=${q.id}`,
                              companies: q.companies,
                              frequency: q.frequency,
                              acRate: q.acRate,
                              importance: q.importance,
                              difficulty: q.difficulty,
                              leetcodeNumber: q.leetcodeNumber,
                              platform: q.platform,
                              link: q.link,
                              questionSlug: q.questionSlug,
                              isCustom: q.isCustom
                            })
                          })

                          groupedChildren = Object.entries(groups).map(([subtopic, qs]) => ({
                            subtopic,
                            questions: qs
                          }))
                        }
                        break
                      }
                    }
                  }

                  return (
                    <div key={item.href}>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                        {/* Collapse/Expand Arrow for DSA topics */}
                        {totalCount > 0 && (
                          <span
                            onClick={(e) => toggleTopicExpand(slug, e)}
                            style={{
                              position: 'absolute',
                              left: '6px',
                              fontSize: '9px',
                              color: 'var(--text-4)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 14,
                              height: 14,
                              cursor: 'pointer',
                              zIndex: 10,
                              transition: 'transform 0.18s var(--ease)',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                            }}
                          >
                            ▶
                          </span>
                        )}

                        <Link
                          href={item.href}
                          scroll={false}
                          onClick={(e) => {
                            if (activeQId !== null) {
                              e.preventDefault()
                              toggleTopicExpand(slug, e)
                            }
                          }}
                          className={`sidebar-link ${isActive ? 'active' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: 6,
                            paddingLeft: totalCount > 0 ? '24px' : '18px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            {item.icon && <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                          </div>
                          {mounted && totalCount > 0 && (
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              color: solvedCount === totalCount ? '#10b981' : 'var(--text-4)',
                              background: solvedCount === totalCount ? '#10b98115' : 'var(--surface-2)',
                              padding: '1px 5px',
                              borderRadius: 4,
                              border: `1px solid ${solvedCount === totalCount ? '#10b98130' : 'var(--border)'}`,
                              flexShrink: 0
                            }}>
                              {solvedCount}/{totalCount}
                            </span>
                          )}
                        </Link>
                      </div>



                      {/* Dynamic Outline Checklist Grouped by Subtopic */}
                      {isExpanded && groupedChildren.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 16, margin: '8px 0', borderLeft: '1px solid var(--border)', marginLeft: '12px' }}>
                          {groupedChildren.map(group => (
                            <div key={group.subtopic} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {/* Subtopic Header divider label with '+' Button */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingRight: 8,
                                marginBottom: 2,
                                marginTop: 4
                              }}>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.8px',
                                  color: 'var(--brand)',
                                  opacity: 0.95,
                                  paddingLeft: 4
                                }}>
                                  {group.subtopic}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    const newId = addCustomQuestion(slug, group.subtopic)
                                    router.push(`/dsa/${slug}?q=${newId}`, { scroll: false })
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    color: 'var(--text-4)',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s'
                                  }}
                                  title="Add Blank Custom Question"
                                  onMouseEnter={el => el.currentTarget.style.color = 'var(--brand)'}
                                  onMouseLeave={el => el.currentTarget.style.color = 'var(--text-4)'}
                                >
                                  ➕
                                </button>
                              </div>

                              {/* Questions nested inside subtopic */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {group.questions.map(child => {
                                  const isSubActive = activeQId === String(child.id)
                                  const isSolved = solved.has(child.id)
                                  const isRevisit = revisit ? revisit.has(child.id) : false
                                  const isCustom = !!(child as any).isCustom

                                  const cardBg = isCustom
                                    ? (theme === 'light' ? (isSubActive ? '#cbd5e1' : '#f1f5f9') : (isSubActive ? '#090d16' : '#05070a'))
                                    : (isSubActive ? 'var(--brand-dim)' : 'transparent')
                                  const cardBorder = isCustom
                                    ? `1px solid ${isSubActive ? 'var(--brand)' : (theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)')}`
                                    : (isSubActive ? '1px solid var(--brand-glow)' : '1px solid transparent')

                                  return (
                                    <div
                                      key={child.href}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        width: '100%',
                                        minWidth: 0,
                                        padding: isCustom ? '6px 10px' : '5px 8px',
                                        borderRadius: '6px',
                                        background: cardBg,
                                        border: cardBorder,
                                        boxShadow: isCustom && !isSubActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                                        transition: 'all 0.15s var(--ease)'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSubActive) {
                                          e.currentTarget.style.background = isCustom
                                            ? (theme === 'light' ? '#e2e8f0' : '#0e121a')
                                            : 'var(--surface-3)'
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSubActive) {
                                          e.currentTarget.style.background = cardBg
                                        }
                                      }}
                                    >
                                      {/* Toggle Solved Checkbox */}
                                      <div
                                        onClick={(e) => { e.stopPropagation(); toggle(child.id); }}
                                        style={{
                                          width: 14, height: 14, borderRadius: '50%',
                                          border: `1.5px solid ${isSolved ? '#10b981' : (theme === 'light' ? '#64748b' : '#8b949e')}`,
                                          background: isSolved ? '#10b981' : 'transparent',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s'
                                        }}
                                        title={isSolved ? 'Mark unsolved' : 'Mark solved'}
                                      >
                                        {isSolved && (
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        )}
                                      </div>

                                      {/* Toggle Revisit Checkbox */}
                                      <div
                                        onClick={(e) => { e.stopPropagation(); toggleRevisit(child.id); }}
                                        style={{
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                                          transform: isRevisit ? 'scale(1.15)' : 'scale(1)',
                                          opacity: isRevisit ? 1 : 0.35
                                        }}
                                        title={isRevisit ? 'Remove from revisit list' : 'Mark to revisit / revise'}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => { if (!isRevisit) e.currentTarget.style.opacity = '0.35' }}
                                      >
                                        <span style={{ fontSize: '13px', color: isRevisit ? '#f59e0b' : 'var(--text-4)', fontWeight: 900, lineHeight: 1 }}>★</span>
                                      </div>

                                      {/* Platform badge link */}
                                      <a
                                        href={child.link || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          fontFamily: 'JetBrains Mono, monospace',
                                          fontSize: '9px',
                                          fontWeight: 800,
                                          color: isCustom
                                            ? (isSubActive ? 'var(--text)' : 'var(--text-3)')
                                            : (child.platform === 'LC' ? '#f39c12' : (child.platform === 'GFG' ? '#2ecc71' : 'var(--brand)')),
                                          background: isCustom
                                            ? (theme === 'light' ? '#cbd5e1' : '#161b22')
                                            : (child.platform === 'LC'
                                                ? (theme === 'light' ? '#fff9db' : '#2c1e00')
                                                : (child.platform === 'GFG'
                                                    ? (theme === 'light' ? '#ebfbee' : '#072b0c')
                                                    : 'var(--brand-dim)')),
                                          border: isCustom
                                            ? (theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)')
                                            : (child.platform === 'LC'
                                                ? '1px solid rgba(243, 156, 18, 0.4)'
                                                : (child.platform === 'GFG'
                                                    ? '1px solid rgba(46, 204, 113, 0.4)'
                                                    : '1px solid var(--brand-glow)')),
                                          borderRadius: 20,
                                          padding: '2px 6px',
                                          minWidth: '58px',
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
                                          if (isCustom) {
                                            e.currentTarget.style.background = theme === 'light' ? '#b8c5d6' : '#21262d';
                                          } else {
                                            e.currentTarget.style.background = child.platform === 'LC'
                                              ? (theme === 'light' ? '#ffe8cc' : '#3d2b00')
                                              : (child.platform === 'GFG'
                                                  ? (theme === 'light' ? '#d3f9d8' : '#0f3d13')
                                                  : 'var(--brand-glow)');
                                          }
                                          e.currentTarget.style.transform = 'scale(1.03)';
                                        }}
                                        onMouseLeave={(e) => {
                                          if (isCustom) {
                                            e.currentTarget.style.background = theme === 'light' ? '#cbd5e1' : '#161b22';
                                          } else {
                                            e.currentTarget.style.background = child.platform === 'LC'
                                              ? (theme === 'light' ? '#fff9db' : '#2c1e00')
                                              : (child.platform === 'GFG'
                                                  ? (theme === 'light' ? '#ebfbee' : '#072b0c')
                                                  : 'var(--brand-dim)');
                                          }
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                      >
                                        {isCustom
                                          ? (child.platform === 'LC' && child.leetcodeNumber ? `LC #${child.leetcodeNumber}` : '✏️ Custom')
                                          : (child.platform === 'LC' ? `LC #${child.leetcodeNumber}` : (child.platform === 'CN' ? 'Ninja' : child.platform))
                                        }
                                      </a>

                                      <Link
                                        href={child.href}
                                        scroll={false}
                                        className={`sidebar-sub-item ${isSubActive ? 'active' : ''}`}
                                        style={{
                                          fontSize: '13px',
                                          flex: 1,
                                          padding: 0,
                                          textDecoration: 'none',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          transition: 'all 0.15s',
                                          fontWeight: isSubActive ? 700 : 450,
                                          color: isSubActive
                                            ? 'var(--brand)'
                                            : (isSolved ? 'var(--text-3)' : 'var(--text-2)'),
                                        }}
                                        title={child.label}
                                      >
                                        {child.label}
                                      </Link>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Standard static children */}
                      {!isActive && item.children && item.children.map(child => (
                        <Link key={child.href} href={child.href} scroll={false}
                          className={`sidebar-sub-item ${pathname === child.href ? 'active' : ''}`}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div className="sidebar-divider" />
            </div>
          )
        })}
      </nav>
      {/* Fixed Resizing Handle (always outside scrolling viewport) */}
      <div
        onMouseDown={startResizing}
        style={{
          position: 'fixed',
          top: 'var(--header-h)',
          left: `calc(${sidebarWidth}px - 2px)`,
          width: '5px',
          height: 'calc(100vh - var(--header-h))',
          cursor: 'col-resize',
          zIndex: 1000,
          background: isResizing ? 'var(--brand)' : 'transparent',
          transition: 'background 0.15s var(--ease)'
        }}
        className="sidebar-resize-handle"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--brand-light)'
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      />
    </>
  )
}
