'use client'

export function PrintButton({ color }: { color: string }) {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 18px', borderRadius: 8, border: `1px solid ${color}40`,
        background: `${color}15`, color: color, fontSize: 13, fontWeight: 800,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'Inter, sans-serif', transition: 'all 0.15s'
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}30`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}15`; }}
    >
      🖨️ Print / Save PDF
    </button>
  )
}
