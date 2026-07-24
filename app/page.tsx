import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ByteBook — CS Learning Platform',
  description: 'Premium computer science notes with interactive demos for OS, Algorithms, and Data Structures.',
}

const TOPICS = [
  {
    key: 'os', href: '/os/introduction', icon: '💻',
    color: '#6366f1', colorDim: 'rgba(99,102,241,0.12)',
    title: 'Operating Systems',
    desc: 'Processes, scheduling, memory, deadlocks, file systems — with step-by-step visualizers.',
    articles: 6, demos: 2,
  },
  {
    key: 'dsa', href: '/dsa/arrays', icon: '📐',
    color: '#10b981', colorDim: 'rgba(16,185,129,0.12)',
    title: 'Data Structures',
    desc: 'Arrays, linked lists, trees, heaps, graphs — with complexity analysis and code.',
    articles: 5, demos: 1,
  },
  {
    key: 'algo', href: '/algo/sorting', icon: '🧮',
    color: '#f59e0b', colorDim: 'rgba(245,158,11,0.12)',
    title: 'Algorithms',
    desc: 'Sorting, graph traversal, dynamic programming — with visual walkthroughs.',
    articles: 3, demos: 1,
  },
]

const FEATURED = [
  { href: '/os/cpu-scheduling', title: 'CPU Scheduling Algorithms', desc: 'FCFS, SJF, SRTF, Priority, Round Robin — with live interactive demo', tag: 'OS', tagColor: 'tag-os' },
  { href: '/os/processes', title: 'Process Management & PCB', desc: 'Process states, context switching, and the Process Control Block', tag: 'OS', tagColor: 'tag-os' },
  { href: '/os/memory', title: 'Memory Management Deep Dive', desc: 'Paging, segmentation, virtual memory and page replacement', tag: 'OS', tagColor: 'tag-os' },
  { href: '/os/deadlocks', title: 'Deadlocks — Detection & Prevention', desc: "Banker's algorithm, wait-for graphs, and recovery strategies", tag: 'OS', tagColor: 'tag-os' },
  { href: '/os/introduction', title: 'Introduction to Operating Systems', desc: 'Kernel modes, system calls, and the OS boot process', tag: 'OS', tagColor: 'tag-os' },
  { href: '/os/file-systems', title: 'File Systems & Allocation', desc: 'FAT, inode, directory structures, and file allocation methods', tag: 'OS', tagColor: 'tag-os' },
]

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span>✨</span>
          Production-Grade CS Notes
        </div>
        <h1 className="hero-title">
          Learn CS Concepts<br />
          <span className="gradient-text">Deeply & Visually</span>
        </h1>
        <p className="hero-subtitle">
          Rich notes, syntax-highlighted code, and interactive visualizers — all in one beautifully designed platform.
        </p>
        <div className="hero-actions">
          <Link href="/os/introduction" className="btn btn-primary">
            Start Reading
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <Link href="/os/cpu-scheduling" className="btn btn-ghost">
            ⚡ Try Live Demos
          </Link>
        </div>

        <div className="hero-stats">
          <div style={{ textAlign: 'center' }}>
            <div className="hero-stat-num">14+</div>
            <div className="hero-stat-lbl">Articles</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div className="hero-stat-num">5+</div>
            <div className="hero-stat-lbl">Interactive Demos</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div className="hero-stat-num">3</div>
            <div className="hero-stat-lbl">Topics</div>
          </div>
        </div>
      </section>

      {/* TOPICS GRID */}
      <section className="topics-section">
        <div className="section-heading">Browse by Topic</div>
        <h2 className="section-title">What do you want to learn?</h2>
        <div className="topics-grid">
          {TOPICS.map(t => (
            <Link key={t.key} href={t.href} className="topic-card" style={{ '--card-color': t.color, '--card-color-dim': t.colorDim } as React.CSSProperties}>
              <div className="topic-card-icon" style={{ background: t.colorDim }}>
                {t.icon}
              </div>
              <div className="topic-card-title">{t.title}</div>
              <div className="topic-card-desc">{t.desc}</div>
              <div className="topic-card-meta">
                <span style={{ color: t.color, fontWeight: 700, fontSize: '12px' }}>
                  {t.articles} articles
                </span>
                <span style={{ color: 'var(--text-4)' }}>·</span>
                <span>{t.demos} demos</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED ARTICLES */}
      <section className="featured-section">
        <div className="section-heading">Featured</div>
        <h2 className="section-title">Most Popular Articles</h2>
        <div className="articles-list">
          {FEATURED.map((a, i) => (
            <Link key={a.href} href={a.href} className="article-list-item">
              <div className="article-list-num">0{i + 1}</div>
              <div className="article-list-info">
                <div className="article-list-title">{a.title}</div>
                <div className="article-list-desc">{a.desc}</div>
              </div>
              <span className={`article-tag ${a.tagColor}`}>{a.tag}</span>
              <svg className="article-list-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-brand">ByteBook</div>
        <div className="footer-text">Built for learners who want to go deep.</div>
        <div className="footer-links">
          <Link href="/os/introduction">OS Notes</Link>
          <Link href="/dsa/arrays">DSA</Link>
          <Link href="/algo/sorting">Algorithms</Link>
        </div>
      </footer>
    </div>
  )
}
