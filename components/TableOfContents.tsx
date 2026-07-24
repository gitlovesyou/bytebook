'use client'

import { useState, useEffect } from 'react'
import type { TocEntry } from '@/lib/markdown'

export function TableOfContents({ toc }: { toc: TocEntry[] }) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 }
    )
    toc.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [toc])

  if (toc.length === 0) return null

  return (
    <div className="toc-panel">
      <div className="toc-title">On this page</div>
      {toc.map(entry => (
        <a key={entry.id} href={`#${entry.id}`}
          className={`toc-item ${entry.level === 3 ? 'toc-h3' : ''} ${active === entry.id ? 'active' : ''}`}>
          {entry.text}
        </a>
      ))}
    </div>
  )
}
