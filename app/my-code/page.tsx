import type { Metadata } from 'next'
import { StarredPageClient } from './StarredPageClient'

export const metadata: Metadata = {
  title: 'Starred Problems · ByteBook',
  description: 'All DSA problems you starred — with saved code, grouped by topic.',
}

export default function StarredPage() {
  return <StarredPageClient />
}
