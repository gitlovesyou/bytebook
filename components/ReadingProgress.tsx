'use client'

import { useEffect, useRef } from 'react'

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function update() {
      const article = document.querySelector('.article-content') as HTMLElement
      if (!article || !barRef.current) return
      const total = article.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const pct = Math.min((scrolled / Math.max(total, 1)) * 100, 100)
      barRef.current.style.width = pct + '%'
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div className="reading-progress">
      <div className="reading-progress-bar" ref={barRef} />
    </div>
  )
}
