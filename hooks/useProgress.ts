'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllProgress, toggleQuestionSolved, saveUserCode, toggleRevisitQuestion } from '@/app/actions/progress'

const STORAGE_KEY = 'bytebook_dsa_progress'
const STORAGE_CODE_KEY = 'bytebook_dsa_codes'
const STORAGE_REVISIT_KEY = 'bytebook_dsa_revisit'

export function useProgress() {
  const [solved, setSolved] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return new Set(JSON.parse(raw))
      } catch {}
    }
    return new Set()
  })
  
  const [revisit, setRevisit] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_REVISIT_KEY)
        if (raw) return new Set(JSON.parse(raw))
      } catch {}
    }
    return new Set()
  })

  const [userCodes, setUserCodes] = useState<Record<number, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_CODE_KEY)
        if (raw) return JSON.parse(raw)
      } catch {}
    }
    return {}
  })
  
  const [customQuestions, setCustomQuestions] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('bytebook_custom_questions')
        if (raw) return JSON.parse(raw)
      } catch {}
    }
    return []
  })

  const [loaded, setLoaded] = useState(false)

  // Sync custom questions across tabs/components
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem('bytebook_custom_questions')
        if (raw) setCustomQuestions(JSON.parse(raw))
      } catch {}
    }
    window.addEventListener('bytebook_custom_questions_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('bytebook_custom_questions_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // 1. Initial Load: merge localStorage + DB, seed any local-only stars into DB
  useEffect(() => {
    // Read what was already in localStorage (the "old" stars before DB existed)
    let localRevisitIds = new Set<number>()
    try {
      const raw = localStorage.getItem(STORAGE_REVISIT_KEY)
      if (raw) localRevisitIds = new Set(JSON.parse(raw))
    } catch {}

    getAllProgress().then(async records => {
      const solvedIds = new Set<number>()
      const dbRevisitIds = new Set<number>()
      const codes: Record<number, string> = {}

      records.forEach(r => {
        if (r.questionId === 999999) return // Skip custom questions dummy record from standard lists
        if (r.solved) solvedIds.add(r.questionId)
        if (r.revisit) dbRevisitIds.add(r.questionId)
        if (r.userCode) codes[r.questionId] = r.userCode
      })

      // Extract custom questions stored in DB record 999999
      const dbCustomRecord = records.find(r => r.questionId === 999999)
      let dbCustomQuestions: any[] = []
      if (dbCustomRecord && dbCustomRecord.userCode) {
        try {
          dbCustomQuestions = JSON.parse(dbCustomRecord.userCode)
        } catch (e) {
          console.error('Failed to parse custom questions from DB', e)
        }
      }

      // Merge custom questions from local storage and DB
      let localCustomQuestions: any[] = []
      try {
        const raw = localStorage.getItem('bytebook_custom_questions')
        if (raw) localCustomQuestions = JSON.parse(raw)
      } catch {}

      // Union by ID to avoid duplicates
      const customMap = new Map<number, any>()
      dbCustomQuestions.forEach(q => customMap.set(q.id, q))
      localCustomQuestions.forEach(q => customMap.set(q.id, q))
      const mergedCustom = Array.from(customMap.values())

      setCustomQuestions(mergedCustom)
      try {
        localStorage.setItem('bytebook_custom_questions', JSON.stringify(mergedCustom))
      } catch {}

      // Merge: anything starred in localStorage but not yet in DB → seed it
      const mergedRevisit = new Set([...dbRevisitIds])
      const toSeed: number[] = []
      localRevisitIds.forEach(id => {
        if (!dbRevisitIds.has(id)) {
          mergedRevisit.add(id)
          toSeed.push(id)
        }
      })

      // Fire-and-forget: persist local stars to DB in background
      if (toSeed.length > 0) {
        for (const id of toSeed) {
          toggleRevisitQuestion(id).catch(() => {})
        }
      }

      setSolved(solvedIds)
      setRevisit(mergedRevisit)
      setUserCodes(codes)

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...solvedIds]))
        localStorage.setItem(STORAGE_REVISIT_KEY, JSON.stringify([...mergedRevisit]))
        localStorage.setItem(STORAGE_CODE_KEY, JSON.stringify(codes))
      } catch {}

      setLoaded(true)
    })
  }, [])


  // 2. Toggle Solved State
  const toggle = useCallback((id: number) => {
    setSolved(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      
      return next
    })

    toggleQuestionSolved(id).then(isSolved => {
      setSolved(prev => {
        const next = new Set(prev)
        if (isSolved) next.add(id)
        else next.delete(id)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
        } catch {}
        return next
      })
    })
  }, [])

  // 3. Save Custom Code
  const saveCode = useCallback((id: number, code: string) => {
    // Update local state instantly
    setUserCodes(prev => {
      const next = { ...prev, [id]: code }
      try {
        localStorage.setItem(STORAGE_CODE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })

    setSolved(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })

    // Persist to local SQLite database
    saveUserCode(id, code)
  }, [])

  const markSolved = useCallback((id: number) => {
    setSolved(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      toggleQuestionSolved(id)
      return next
    })
  }, [])

  const markUnsolved = useCallback((id: number) => {
    setSolved(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      toggleQuestionSolved(id)
      return next
    })
  }, [])

  const toggleRevisit = useCallback((id: number) => {
    setRevisit(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(STORAGE_REVISIT_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
    // Persist to DB so /my-code server page can read it
    toggleRevisitQuestion(id)
  }, [])

  const saveCustomQuestions = useCallback((questions: any[]) => {
    setCustomQuestions(questions)
    try {
      localStorage.setItem('bytebook_custom_questions', JSON.stringify(questions))
    } catch {}
    saveUserCode(999999, JSON.stringify(questions))
    window.dispatchEvent(new Event('bytebook_custom_questions_updated'))
  }, [])

  const addCustomQuestion = useCallback((topicSlug: string, subtopic: string) => {
    const maxId = customQuestions.reduce((max: number, q: any) => Math.max(max, q.id), 99999)
    const newId = maxId + 1
    const newQ = {
      id: newId,
      topicSlug,
      subtopic,
      name: `Blank Custom Question`,
      difficulty: 3, // Medium
      isCustom: true,
      companies: ['Custom'],
      importance: 'Medium',
      frequency: 50,
      acRate: 50.0,
      platform: 'LC'
    }
    const updated = [...customQuestions, newQ]
    saveCustomQuestions(updated)
    return newId
  }, [customQuestions, saveCustomQuestions])

  const updateCustomQuestion = useCallback((id: number, updates: any) => {
    const updated = customQuestions.map(q => q.id === id ? { ...q, ...updates } : q)
    saveCustomQuestions(updated)
  }, [customQuestions, saveCustomQuestions])

  const reset = useCallback(() => {
    setSolved(new Set())
    setRevisit(new Set())
    setUserCodes({})
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_CODE_KEY)
    localStorage.removeItem(STORAGE_REVISIT_KEY)
    localStorage.removeItem('bytebook_custom_questions')
  }, [])

  return { 
    solved, revisit, userCodes, loaded, 
    markSolved, markUnsolved, toggle, toggleRevisit, 
    saveCode, reset, customQuestions, saveCustomQuestions,
    addCustomQuestion, updateCustomQuestion
  }
}
