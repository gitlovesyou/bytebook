// lib/markdown.ts — Full markdown renderer (no MDX runtime needed)

import { highlight } from './highlight'

export interface TocEntry { id: string; text: string; level: number }

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function extractToc(content: string): TocEntry[] {
  const toc: TocEntry[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+)/)
    if (m) {
      const level = m[1].length
      const text = m[2].replace(/[*`_]/g, '')
      toc.push({ id: slugify(text), text, level })
    }
  }
  return toc
}

export async function renderMarkdown(content: string): Promise<string> {
  // Process code blocks first (async)
  const codeBlocks: string[] = []
  let processed = content

  // Extract and highlight code blocks
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  const codeMatches = [...content.matchAll(codeBlockRegex)]
  
  for (const match of codeMatches) {
    const lang = match[1] || 'text'
    const code = match[2].trim()
    const highlighted = await highlight(code, lang)
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(
      `<div class="code-block-wrap">
        <div class="code-block-header">
          <span class="code-block-lang">${lang}</span>
          <button class="code-block-copy" onclick="copyCode(this)" data-code="${encodeURIComponent(code)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
        <div class="code-block-body">${highlighted}</div>
      </div>`
    )
    processed = processed.replace(match[0], placeholder)
  }

  // Inline formatting
  processed = processed
    // Headings
    .replace(/^#### (.+)$/gm, (_, t) => `<h4 id="${slugify(t)}">${t}</h4>`)
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
    .replace(/^# (.+)$/gm, (_, t) => `<h1 id="${slugify(t)}">${t}</h1>`)
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

  // Tables
  processed = processTable(processed)

  // Lists
  processed = processLists(processed)

  // Paragraphs (wrap bare lines)
  processed = processParagraphs(processed)

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    processed = processed.replace(`__CODE_BLOCK_${i}__`, block)
  })

  // Note cards: ::info[title] content ::
  processed = processed
    .replace(/:::(\w+)\[([^\]]*)\]\n([\s\S]*?):::/g, (_, type, title, body) =>
      `<div class="note-card ${type}">
        <div class="note-card-icon">${noteIcon(type)}</div>
        <div class="note-card-body">
          ${title ? `<div class="note-card-title">${title}</div>` : ''}
          <p>${body.trim()}</p>
        </div>
      </div>`
    )

  // Interactive demo embed: :::demo[title](src) :::
  processed = processed
    .replace(/:::demo\[([^\]]*)\]\(([^)]+)\):::/g, (_, title, src) =>
      `<div class="demo-embed">
        <div class="demo-embed-header">
          <div class="demo-embed-title">
            ✨ ${title}
            <span class="demo-embed-badge">Interactive</span>
          </div>
          <a class="demo-embed-link" href="${src}" target="_blank">
            Open fullscreen
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
        <iframe src="${src}" height="620" title="${title}" loading="lazy" allowfullscreen></iframe>
      </div>`
    )

  return processed
}

function noteIcon(type: string): string {
  const icons: Record<string, string> = { info: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🚨' }
  return icons[type] || 'ℹ️'
}

function processTable(content: string): string {
  return content.replace(/(\|[^\n]+\|(\n|$))+/g, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim())
    if (rows.length < 2) return match
    const [header, , ...body] = rows
    const ths = header.split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('')
    const trs = body.map(r => {
      const cells = r.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
  })
}

function processLists(content: string): string {
  // Unordered lists
  content = content.replace(/(^- .+(\n|$))+/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('')
    return `<ul>${items}</ul>`
  })
  // Ordered lists
  content = content.replace(/(^\d+\. .+(\n|$))+/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')
    return `<ol>${items}</ol>`
  })
  return content
}

function processParagraphs(content: string): string {
  return content.split(/\n{2,}/).map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    if (/^<(h[1-6]|ul|ol|table|blockquote|div|pre|hr)/.test(trimmed)) return trimmed
    if (trimmed.startsWith('__CODE_BLOCK_')) return trimmed
    return `<p>${trimmed.replace(/\n/g, ' ')}</p>`
  }).join('\n')
}
