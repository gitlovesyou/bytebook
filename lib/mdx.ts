// lib/mdx.ts — Content loader

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export interface FrontMatter {
  title: string
  description: string
  tags?: string[]
  order?: number
  readTime?: string
  next?: { label: string; href: string }
  prev?: { label: string; href: string }
}

export interface ContentPage {
  frontmatter: FrontMatter
  content: string
  slug: string
  topic: string
}

export async function getPage(topic: string, slug: string): Promise<ContentPage | null> {
  const filePath = path.join(CONTENT_DIR, topic, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    frontmatter: data as FrontMatter,
    content,
    slug,
    topic,
  }
}

export async function getAllSlugs(topic: string): Promise<string[]> {
  const dir = path.join(CONTENT_DIR, topic)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace('.mdx', ''))
}

export async function getAllTopics(): Promise<string[]> {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs.readdirSync(CONTENT_DIR).filter(f =>
    fs.statSync(path.join(CONTENT_DIR, f)).isDirectory()
  )
}
