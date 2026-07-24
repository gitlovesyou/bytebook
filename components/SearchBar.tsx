'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Build searchable index from navigation + content summaries
const SEARCH_DATA = [
  { title: 'Introduction to Operating Systems', section: 'Operating Systems', slug: '/os/introduction', desc: 'What is an OS? Kernel, processes, memory management overview.' },
  { title: 'Process Management', section: 'Operating Systems', slug: '/os/processes', desc: 'Process states, PCB, context switching, creation and termination.' },
  { title: 'CPU Scheduling Algorithms', section: 'Operating Systems', slug: '/os/cpu-scheduling', desc: 'FCFS, SJF, SRTF, Priority, Round Robin — with interactive demos.' },
  { title: 'Memory Management', section: 'Operating Systems', slug: '/os/memory', desc: 'Paging, segmentation, virtual memory, page replacement algorithms.' },
  { title: 'Deadlocks', section: 'Operating Systems', slug: '/os/deadlocks', desc: 'Deadlock conditions, prevention, avoidance, detection and recovery.' },
  { title: 'File Systems', section: 'Operating Systems', slug: '/os/file-systems', desc: 'File allocation, directory structures, FAT, inode-based file systems.' },
]

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = query.trim().length > 1
    ? SEARCH_DATA.filter(d =>
        d.title.toLowerCase().includes(query.toLowerCase()) ||
        d.desc.toLowerCase().includes(query.toLowerCase()) ||
        d.section.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : []

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickOut)
    return () => document.removeEventListener('mousedown', clickOut)
  }, [])

  function navigate(slug: string) {
    router.push(slug)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="header-search">
        <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search articles..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { setFocused(f => Math.min(f+1, results.length-1)); e.preventDefault(); }
            if (e.key === 'ArrowUp')   { setFocused(f => Math.max(f-1, 0)); e.preventDefault(); }
            if (e.key === 'Enter' && results[focused]) navigate(results[focused].slug)
          }}
        />
        <span className="search-shortcut">⌘K</span>
      </div>
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((r, i) => (
            <div key={r.slug} className="search-result-item" style={i === focused ? { background: 'var(--surface-2)' } : {}}
              onMouseEnter={() => setFocused(i)} onClick={() => navigate(r.slug)}>
              <div style={{ flex: 1 }}>
                <div className="search-result-title">{r.title}</div>
                <div className="search-result-section">{r.section}</div>
                <div className="search-result-snippet">{r.desc}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          ))}
        </div>
      )}
      {open && query.trim().length > 1 && results.length === 0 && (
        <div className="search-results">
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>No results for &quot;{query}&quot;</div>
        </div>
      )}
    </div>
  )
}
