// lib/highlight.ts — Shiki-based code highlighting

import { createHighlighter, type Highlighter } from 'shiki'

let highlighter: Highlighter | null = null

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['c', 'cpp', 'python', 'javascript', 'typescript', 'bash', 'json', 'markdown', 'text'],
    })
  }
  return highlighter
}

export async function highlight(code: string, lang: string, isDark = true): Promise<string> {
  const hl = await getHighlighter()
  const validLang = hl.getLoadedLanguages().includes(lang) ? lang : 'text'
  return hl.codeToHtml(code, {
    lang: validLang,
    theme: isDark ? 'github-dark' : 'github-light',
  })
}
