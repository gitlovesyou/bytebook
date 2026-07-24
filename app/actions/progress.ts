'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface ExecutionResult {
  success: boolean
  output: string
  error?: string
  compileError?: string
}

export interface ProgressData {
  questionId: number
  solved: boolean
  revisit: boolean
  userCode: string | null
}

/**
 * Fetch all progress records (solved states & custom user codes) from SQLite
 */
export async function getAllProgress(): Promise<ProgressData[]> {
  try {
    const list = await prisma.progress.findMany({
      select: {
        questionId: true,
        solved: true,
        revisit: true,
        userCode: true,
      },
    })
    return list
  } catch (error) {
    console.error('Error fetching progress list:', error)
    return []
  }
}

/**
 * Toggle the revisit (star) state of a question in the database
 */
export async function toggleRevisitQuestion(questionId: number): Promise<boolean> {
  try {
    const existing = await prisma.progress.findUnique({ where: { questionId } })
    const isRevisit = existing ? !existing.revisit : true
    await prisma.progress.upsert({
      where: { questionId },
      update: { revisit: isRevisit },
      create: { questionId, solved: false, revisit: isRevisit },
    })
    revalidatePath('/my-code')
    return isRevisit
  } catch (error) {
    console.error('Error toggling revisit:', error)
    return false
  }
}

/**
 * Fetch all solved question IDs from the SQLite database
 */
export async function getSolvedQuestions(): Promise<number[]> {
  try {
    const solved = await prisma.progress.findMany({
      where: { solved: true },
      select: { questionId: true },
    })
    return solved.map((s: { questionId: number }) => s.questionId)
  } catch (error) {
    console.error('Error fetching progress:', error)
    return []
  }
}

/**
 * Toggle the solved state of a question in the local database
 */
export async function toggleQuestionSolved(questionId: number): Promise<boolean> {
  try {
    const existing = await prisma.progress.findUnique({
      where: { questionId },
    })

    const isSolved = existing ? !existing.solved : true

    await prisma.progress.upsert({
      where: { questionId },
      update: { solved: isSolved },
      create: { questionId, solved: isSolved },
    })

    // Revalidate layout so all pages and revision sheets update
    revalidatePath('/', 'layout')
    return isSolved
  } catch (error) {
    console.error('Error updating progress:', error)
    return false
  }
}

/**
 * Save user custom code solution to SQLite
 */
export async function saveUserCode(questionId: number, code: string): Promise<boolean> {
  try {
    await prisma.progress.upsert({
      where: { questionId },
      update: { userCode: code, solved: true },
      create: { questionId, solved: true, userCode: code },
    })
    revalidatePath('/', 'layout')
    return true
  } catch (error) {
    console.error('Error saving user code:', error)
    return false
  }
}

/**
 * Compiles and executes code via the Piston API (https://emkc.org)
 * Free, no API key required, works on any serverless platform.
 * Supports: cpp, c, python, javascript, java, rust, go
 */
export async function compileAndRunCode(code: string, input: string, lang: string): Promise<ExecutionResult> {
  // Map our lang keys to Piston language names
  const PISTON_LANGS: Record<string, { language: string; version: string; filename: string }> = {
    cpp:        { language: 'c++',        version: '10.2.0', filename: 'solution.cpp' },
    c:          { language: 'c',          version: '10.2.0', filename: 'solution.c'   },
    python:     { language: 'python',     version: '3.10.0', filename: 'solution.py'  },
    javascript: { language: 'javascript', version: '18.15.0', filename: 'solution.js' },
    java:       { language: 'java',       version: '15.0.2', filename: 'Main.java'    },
  }

  const pistonLang = PISTON_LANGS[lang]
  if (!pistonLang) {
    return { success: false, output: '', error: `Unsupported language: ${lang}` }
  }

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLang.language,
        version: pistonLang.version,
        files: [{ name: pistonLang.filename, content: code }],
        stdin: input || '',
        run_timeout: 5000,
        compile_timeout: 10000,
      }),
    })

    if (!response.ok) {
      return { success: false, output: '', error: `Piston API error: ${response.status} ${response.statusText}` }
    }

    const data = await response.json() as {
      compile?: { code: number; output: string; stderr: string }
      run:      { code: number; output: string; stderr: string }
    }

    // Compile error
    if (data.compile && data.compile.code !== 0) {
      return { success: false, output: '', compileError: data.compile.stderr || data.compile.output }
    }

    const run = data.run
    if (run.code !== 0) {
      return { success: false, output: run.output, error: run.stderr || `Exit code ${run.code}` }
    }

    return { success: true, output: run.output, error: run.stderr || undefined }
  } catch (err) {
    const error = err as Error
    console.error('Piston runner error:', error)
    return { success: false, output: '', error: error.message || 'Failed to reach Piston API' }
  }
}
