import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Super150Client } from '@/components/Super150Client'

export const metadata: Metadata = {
  title: 'Super 150 Elite Questions · ByteBook DSA',
  description: 'The 150 most critical, highest-frequency interview questions across Google, Amazon, Meta, Microsoft, and Apple.',
}

export default function Super150Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>Loading Super 150 Elite Sheet...</div>}>
      <Super150Client />
    </Suspense>
  )
}
