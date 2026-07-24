import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPage, getAllSlugs, getAllTopics } from '@/lib/mdx'
import { renderMarkdown, extractToc } from '@/lib/markdown'
import { ReadingProgress } from '@/components/ReadingProgress'
import { TableOfContents } from '@/components/TableOfContents'

interface Props {
  params: Promise<{ topic: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic, slug } = await params
  const page = await getPage(topic, slug)
  if (!page) return { title: 'Not Found' }
  return {
    title: page.frontmatter.title,
    description: page.frontmatter.description,
  }
}

export async function generateStaticParams() {
  const topics = await getAllTopics()
  const paths: { topic: string; slug: string }[] = []
  for (const topic of topics) {
    const slugs = await getAllSlugs(topic)
    slugs.forEach(slug => paths.push({ topic, slug }))
  }
  return paths
}

export default async function ArticlePage({ params }: Props) {
  const { topic, slug } = await params
  const page = await getPage(topic, slug)
  if (!page) notFound()

  const html = await renderMarkdown(page.content)
  const toc = extractToc(page.content)
  const { frontmatter: fm } = page

  const TAG_MAP: Record<string, string> = {
    os: 'tag-os', algo: 'tag-algo', ds: 'tag-ds'
  }
  return (
    <>
      <ReadingProgress />
      <div className="content-with-toc">
        <article className="article-content">
          {/* Breadcrumb */}
          <div className="article-header">
            <div className="article-breadcrumb">
              <Link href="/">Home</Link>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <Link href={`/${topic}/introduction`} style={{ textTransform: 'capitalize' }}>{topic === 'os' ? 'Operating Systems' : topic.toUpperCase()}</Link>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span>{fm.title}</span>
            </div>
            <h1 style={{ margin: 0 }}>{fm.title}</h1>
            <p style={{ fontSize: '17px', color: 'var(--text-3)', marginTop: 10, lineHeight: 1.6, marginBottom: 0 }}>{fm.description}</p>
            <div className="article-meta">
              {fm.tags?.map(tag => (
                <span key={tag} className={`article-tag ${TAG_MAP[tag] || 'tag-os'}`}>{tag.toUpperCase()}</span>
              ))}
              {fm.readTime && <span className="article-read-time">⏱ {fm.readTime}</span>}
            </div>
          </div>

          {/* Content */}
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Copy button script */}
          <script dangerouslySetInnerHTML={{ __html: `
            function copyCode(btn) {
              const code = decodeURIComponent(btn.getAttribute('data-code'));
              navigator.clipboard.writeText(code).then(() => {
                btn.classList.add('copied');
                btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 12 4 18"/></svg> Copied!';
                setTimeout(() => {
                  btn.classList.remove('copied');
                  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
                }, 2000);
              });
            }
          `}} />

          {/* Prev / Next */}
          {(fm.prev || fm.next) && (
            <nav className="article-nav">
              {fm.prev ? (
                <Link href={fm.prev.href} className="article-nav-btn">
                  <span className="article-nav-label">← Previous</span>
                  <span className="article-nav-title">{fm.prev.label}</span>
                </Link>
              ) : <div />}
              {fm.next ? (
                <Link href={fm.next.href} className="article-nav-btn next">
                  <span className="article-nav-label">Next →</span>
                  <span className="article-nav-title">{fm.next.label}</span>
                </Link>
              ) : <div />}
            </nav>
          )}
        </article>

        {/* Table of Contents */}
        <TableOfContents toc={toc} />
      </div>
    </>
  )
}
