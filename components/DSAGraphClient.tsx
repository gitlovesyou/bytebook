'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { DSA_DATA, PHASE_COLORS } from '@/lib/dsa-data'
import { useProgress } from '@/hooks/useProgress'

interface NodePosition {
  id: string
  name: string
  x: number // percentage position
  y: number // percentage position
  phase: string
  icon: string
  slug: string
  qCount: number
}

// Define layout positions for each topic node to build a beautiful interactive graph
const NODE_POSITIONS: NodePosition[] = [
  // Phase 1
  { id: 'arrays', name: 'Arrays', x: 10, y: 15, phase: 'Phase 1', icon: '[]', slug: 'arrays', qCount: 29 },
  { id: '2d-arrays', name: '2D Arrays', x: 25, y: 8, phase: 'Phase 1', icon: '⬛', slug: '2d-arrays', qCount: 12 },
  { id: 'basic-maths', name: 'Basic Maths', x: 10, y: 45, phase: 'Phase 1', icon: '🔢', slug: 'basic-maths', qCount: 6 },
  { id: 'strings', name: 'Strings', x: 25, y: 22, phase: 'Phase 1', icon: '📝', slug: 'strings', qCount: 17 },
  
  // Phase 2
  { id: 'binary-search', name: 'Binary Search', x: 40, y: 15, phase: 'Phase 2', icon: '🔍', slug: 'binary-search', qCount: 37 },
  
  // Phase 3
  { id: 'recursion', name: 'Recursion', x: 25, y: 45, phase: 'Phase 3', icon: '🔄', slug: 'recursion', qCount: 10 },
  { id: 'sorting', name: 'Sorting', x: 40, y: 35, phase: 'Phase 3', icon: '🔀', slug: 'sorting', qCount: 9 },
  
  // Phase 4
  { id: 'oops', name: 'OOPS', x: 10, y: 80, phase: 'Phase 4', icon: '🧩', slug: 'oops', qCount: 6 },

  // Phase 5
  { id: 'linked-list', name: 'Linked List', x: 40, y: 60, phase: 'Phase 5', icon: '⛓️', slug: 'linked-list', qCount: 43 },
  { id: 'stacks', name: 'Stacks', x: 55, y: 50, phase: 'Phase 5', icon: '📚', slug: 'stacks', qCount: 28 },
  { id: 'queues', name: 'Queues', x: 55, y: 70, phase: 'Phase 5', icon: '🔁', slug: 'queues', qCount: 10 },

  // Phase 6
  { id: 'binary-trees', name: 'Binary Trees', x: 55, y: 30, phase: 'Phase 6', icon: '🌳', slug: 'binary-trees', qCount: 34 },
  { id: 'bst', name: 'BST', x: 70, y: 20, phase: 'Phase 6', icon: '🔍', slug: 'bst', qCount: 17 },
  { id: 'tries', name: 'Tries', x: 70, y: 40, phase: 'Phase 6', icon: '🌐', slug: 'tries', qCount: 7 },

  // Phase 7
  { id: 'hashmaps', name: 'Hashmaps', x: 55, y: 10, phase: 'Phase 7', icon: '#️⃣', slug: 'hashmaps', qCount: 19 },
  { id: 'heaps-pq', name: 'Heaps / PQ', x: 70, y: 8, phase: 'Phase 7', icon: '⛰️', slug: 'heaps-pq', qCount: 15 },
  { id: 'prefix-sum', name: 'Prefix Sum', x: 25, y: 70, phase: 'Phase 7', icon: '➕', slug: 'prefix-sum', qCount: 10 },
  { id: 'two-pointers', name: 'Two Pointers', x: 55, y: 85, phase: 'Phase 7', icon: '↔️', slug: 'two-pointers', qCount: 25 },
  { id: 'bit-manipulation', name: 'Bit Magic', x: 40, y: 85, phase: 'Phase 7', icon: '🔢', slug: 'bit-manipulation', qCount: 15 },

  // Phase 8
  { id: 'greedy', name: 'Greedy', x: 70, y: 85, phase: 'Phase 8', icon: '💰', slug: 'greedy', qCount: 22 },
  { id: 'graphs', name: 'Graphs', x: 85, y: 30, phase: 'Phase 8', icon: '🕸️', slug: 'graphs', qCount: 55 },

  // Phase 9
  { id: 'backtracking', name: 'Backtracking', x: 85, y: 55, phase: 'Phase 9', icon: '↩️', slug: 'backtracking', qCount: 22 },
  { id: 'dynamic-programming', name: 'Dynamic Prog.', x: 92, y: 42, phase: 'Phase 9', icon: '🧩', slug: 'dynamic-programming', qCount: 55 },
]

// Dependency connections between topics
const DEPENDENCIES = [
  { from: 'arrays', to: '2d-arrays' },
  { from: 'arrays', to: 'strings' },
  { from: 'arrays', to: 'binary-search' },
  { from: 'basic-maths', to: 'recursion' },
  { from: 'recursion', to: 'sorting' },
  { from: 'recursion', to: 'binary-trees' },
  { from: 'recursion', to: 'backtracking' },
  { from: 'linked-list', to: 'stacks' },
  { from: 'linked-list', to: 'queues' },
  { from: 'stacks', to: 'queues' },
  { from: 'binary-trees', to: 'bst' },
  { from: 'binary-trees', to: 'tries' },
  { from: 'binary-trees', to: 'graphs' },
  { from: 'hashmaps', to: 'heaps-pq' },
  { from: 'arrays', to: 'prefix-sum' },
  { from: 'arrays', to: 'two-pointers' },
  { from: 'two-pointers', to: 'greedy' },
  { from: 'backtracking', to: 'graphs' },
  { from: 'graphs', to: 'dynamic-programming' },
  { from: 'backtracking', to: 'dynamic-programming' },
]

export function DSAGraphClient() {
  const { solved, loaded } = useProgress()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Map slugs to full lists of questions so we can compute correct solved states
  const topicStats = useMemo(() => {
    if (!loaded) return {}
    const stats: Record<string, { solved: number; total: number }> = {}
    
    // Scan all phases and topics to calculate solved questions count
    Object.values(DSA_DATA).forEach(phase => {
      phase.topics.forEach(topic => {
        const total = topic.questions.length
        const solvedCount = topic.questions.filter(q => solved.has(q.id)).length
        stats[topic.slug] = { solved: solvedCount, total }
      })
    })

    return stats
  }, [solved, loaded])

  const totalProblems = 502
  const totalSolved = Object.values(topicStats).reduce((sum, t) => sum + t.solved, 0)
  const percentCompleted = Math.round((totalSolved / totalProblems) * 100) || 0

  return (
    <div>
      {/* Overview Stats Dashboard */}
      <div style={{
        background: 'linear-gradient(135deg, var(--surface-2), var(--surface))',
        border: '1px solid var(--border)', borderRadius: 16, padding: '24px 32px',
        marginBottom: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-4)' }}>Overall Completion</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 42, fontWeight: 900, fontFamily: 'JetBrains Mono', color: 'var(--brand-light)' }}>{percentCompleted}%</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>
              ({totalSolved} of {totalProblems} solved)
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${percentCompleted}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--brand), var(--cyan))',
              borderRadius: 4, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>

        {/* Breakdown counters */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'EASY', count: totalSolved, color: '#10b981' }, // Approximate difficulty grouping for simplicity
            { label: 'ACTIVE TOPICS', count: Object.values(topicStats).filter(t => t.solved > 0).length, color: 'var(--cyan)' }
          ].map(b => (
            <div key={b.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', minWidth: 130, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', letterSpacing: '0.5px', marginBottom: 4 }}>{b.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono', color: b.color }}>{b.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Skill Tree & Connection Graph */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🗺️ Skill Dependency Roadmap</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-4)', background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>Interactive Graph</span>
      </h2>
      <p style={{ color: 'var(--text-3)', fontSize: 13.5, marginBottom: 24, marginTop: -8 }}>
        Hover over nodes to visualize prerequisites and unlock criteria. Green paths represent completed dependency pipelines.
      </p>

      <div style={{
        position: 'relative', width: '100%', height: 620,
        background: '#0a0d14', border: '1px solid var(--border)', borderRadius: 16,
        overflow: 'hidden', boxShadow: 'inset 0 4px 24px rgba(0,0,0,0.5)'
      }}>
        {/* Subtle grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px', opacity: 0.15
        }} />

        {/* SVG connection lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="var(--cyan)" />
            </linearGradient>
          </defs>

          {DEPENDENCIES.map((dep, index) => {
            const fromNode = NODE_POSITIONS.find(n => n.id === dep.from)
            const toNode = NODE_POSITIONS.find(n => n.id === dep.to)
            if (!fromNode || !toNode) return null

            // Calculate exact connection coordinates based on percentages
            const x1 = `${fromNode.x}%`
            const y1 = `${fromNode.y}%`
            const x2 = `${toNode.x}%`
            const y2 = `${toNode.y}%`

            // Determine if the link is active (from node is completely or partially solved)
            const fromStats = topicStats[fromNode.slug]
            const toStats = topicStats[toNode.slug]
            const isFromActive = fromStats && fromStats.solved > 0
            const isPathSolved = fromStats && toStats && fromStats.solved === fromStats.total && toStats.solved > 0

            const isHovered = hoveredNode === fromNode.id || hoveredNode === toNode.id

            return (
              <g key={index}>
                {/* Background line */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isHovered ? 'var(--text-4)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  style={{ transition: 'all 0.2s' }}
                />
                {/* Active lighting path */}
                {isFromActive && (
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isPathSolved ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeDasharray={isPathSolved ? undefined : "6,6"}
                    className={isPathSolved ? "" : "dash-animate"}
                    style={{ transition: 'all 0.2s' }}
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Graph Nodes */}
        {NODE_POSITIONS.map(node => {
          const stats = topicStats[node.slug] || { solved: 0, total: node.qCount }
          const isSolved = stats.solved === stats.total && stats.total > 0
          const isStarted = stats.solved > 0
          const percent = Math.round((stats.solved / stats.total) * 100) || 0

          const isHovered = hoveredNode === node.id
          const pColor = PHASE_COLORS[node.phase] || 'var(--brand)'

          return (
            <Link key={node.id} href={`/dsa/${node.slug}`} style={{ textDecoration: 'none' }}>
              <div
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  position: 'absolute',
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: isHovered ? 10 : 2,
                  transition: 'all 0.2s'
                }}
              >
                {/* Node Box */}
                <div style={{
                  background: isHovered ? 'var(--surface-2)' : 'var(--surface)',
                  border: `2px solid ${isSolved ? '#10b981' : (isStarted ? pColor : 'var(--border)')}`,
                  borderRadius: 12, padding: '10px 14px',
                  display: 'flex', flexDirection: 'column', gap: 3, minWidth: 130,
                  boxShadow: isHovered ? `0 0 20px ${pColor}30` : '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s',
                  transform: isHovered ? 'scale(1.06)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                      {node.icon} {node.name}
                    </span>
                  </div>
                  
                  {/* Solved stats */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-4)', fontWeight: 700 }}>
                    <span>{stats.solved}/{stats.total} Q</span>
                    <span style={{ color: isSolved ? '#10b981' : (isStarted ? pColor : 'var(--text-4)') }}>{percent}%</span>
                  </div>

                  {/* Micro Progress Bar on Node */}
                  <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                    <div style={{
                      width: `${percent}%`, height: '100%',
                      background: isSolved ? '#10b981' : pColor,
                      borderRadius: 2
                    }} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .dash-animate {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
