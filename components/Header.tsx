'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { SearchBar } from './SearchBar'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="header">
        {/* Logo */}
        <Link href="/" className="header-logo">
          <div className="logo-icon">📚</div>
          ByteBook
        </Link>

        {/* Search */}
        <div className="header-search-wrap">
          <SearchBar />
        </div>

        {/* Right side */}
        <div className="header-right">
          {/* ★ Starred quick link */}
          <Link
            href="/my-code"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, textDecoration: 'none',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', fontWeight: 700, fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.22)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.55)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(245,158,11,0.2)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.12)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.3)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >
            ★ Starred
          </Link>

          <ThemeToggle />


          {/* Hamburger for mobile */}
          <button
            className="icon-btn hamburger"
            onClick={() => {
              setMenuOpen(o => !o)
              document.querySelector('.sidebar')?.classList.toggle('open')
            }}
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:89, top:'var(--header-h)' }}
          onClick={() => {
            setMenuOpen(false)
            document.querySelector('.sidebar')?.classList.remove('open')
          }}
        />
      )}
    </>
  )
}
