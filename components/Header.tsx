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
          <span className="logo-text">ByteBook</span>
        </Link>

        {/* Search */}
        <div className="header-search-wrap">
          <SearchBar />
        </div>

        {/* Right side */}
        <div className="header-right">
          {/* 💻 Workspace quick link */}
          <Link
            href="/workspace"
            className="nav-pill nav-pill-workspace"
          >
            <span className="pill-dot green-dot" />
            <span>💻 Workspace</span>
          </Link>

          {/* ★ Starred quick link */}
          <Link
            href="/my-code"
            className="nav-pill nav-pill-starred"
          >
            <span className="pill-dot amber-dot" />
            <span>★ Starred</span>
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
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex:89, top:'var(--header-h)' }}
          onClick={() => {
            setMenuOpen(false)
            document.querySelector('.sidebar')?.classList.remove('open')
          }}
        />
      )}
    </>
  )
}
