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
 * Helper to auto-harness LeetCode class snippets for standalone execution
 */
function prepareExecutableCode(code: string, lang: string): string {
  const trimmed = code.trim()
  if (!trimmed) return code

  if (lang === 'cpp') {
    if (!trimmed.includes('int main')) {
      return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <cmath>
#include <climits>
using namespace std;

${code}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    cout << "=== Code Compiled & Executed Successfully ===" << endl;
    #if defined(_GLIBCXX_VECTOR) || defined(_GLIBCXX_IOSTREAM)
    Solution sol;
    cout << "Ready to run tests on Solution instance." << endl;
    #endif
    return 0;
}`
    }
  } else if (lang === 'c') {
    if (!trimmed.includes('int main')) {
      return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${code}

int main() {
    printf("=== C Code Compiled & Executed Successfully ===\\n");
    return 0;
}`
    }
  } else if (lang === 'java') {
    if (!trimmed.includes('class Main') && !trimmed.includes('public static void main')) {
      return `import java.util.*;
import java.io.*;

${code}

public class Main {
    public static void main(String[] args) {
        System.out.println("=== Java Program Compiled & Executed Successfully ===");
        try {
            Solution sol = new Solution();
            System.out.println("Solution object initialized successfully.");
        } catch (Exception e) {
            // Ignored if Solution class isn't defined
        }
    }
}`
    }
  }

  return code
}

/**
 * Native Node JS Execution Engine (Instant, 0ms network lag, 100% reliable)
 */
function executeJavaScriptNative(code: string, input: string): ExecutionResult {
  try {
    const logs: string[] = []
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => logs.push('[Error] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      warn: (...args: any[]) => logs.push('[Warn] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      info: (...args: any[]) => logs.push(args.map(a => String(a)).join(' '))
    }

    const runnerFn = new Function('console', 'input', `
      try {
        ${code}
        if (typeof main === 'function') {
          const res = main(input);
          if (res !== undefined) console.log(res);
        }
      } catch (err) {
        throw err;
      }
    `)

    runnerFn(customConsole, input)

    return {
      success: true,
      output: logs.join('\n') || 'Code executed cleanly (No console output printed).'
    }
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err.message || String(err)
    }
  }
}

/**
 * Engine 1: Piston API (https://emkc.org/api/v2/piston/execute)
 */
async function runWithPiston(code: string, input: string, lang: string): Promise<ExecutionResult | null> {
  const pistonLangs: Record<string, { language: string; version: string; filename: string }> = {
    cpp:        { language: 'c++',        version: '10.2.0', filename: 'solution.cpp' },
    c:          { language: 'c',          version: '10.2.0', filename: 'solution.c'   },
    python:     { language: 'python',     version: '3.10.0', filename: 'solution.py'  },
    javascript: { language: 'javascript', version: '18.15.0', filename: 'solution.js' },
    java:       { language: 'java',       version: '15.0.2', filename: 'Main.java'    },
  }

  const config = pistonLangs[lang]
  if (!config) return null

  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [{ name: config.filename, content: code }],
        stdin: input || '',
        run_timeout: 5000,
        compile_timeout: 10000,
      }),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      compile?: { code: number; output: string; stderr: string }
      run?:      { code: number; output: string; stderr: string }
    }

    if (data.compile && data.compile.code !== 0) {
      return { success: false, output: '', compileError: data.compile.stderr || data.compile.output }
    }

    if (data.run) {
      if (data.run.code !== 0) {
        return { success: false, output: data.run.output || '', error: data.run.stderr || `Exit code ${data.run.code}` }
      }
      return { success: true, output: data.run.output || 'Code executed successfully.', error: data.run.stderr || undefined }
    }

    return null
  } catch (err) {
    console.warn('Piston Engine error:', err)
    return null
  }
}

/**
 * Engine 2: Judge0 CE Public API (https://ce.judge0.com)
 */
async function runWithJudge0(code: string, input: string, lang: string): Promise<ExecutionResult | null> {
  const judge0Langs: Record<string, number> = {
    cpp: 54,        // C++ (GCC 9.2.0)
    c: 50,          // C (GCC 9.2.0)
    python: 71,     // Python (3.8.1)
    javascript: 63, // JavaScript (Node.js 12.14.0)
    java: 62,       // Java (OpenJDK 13.0.1)
  }

  const langId = judge0Langs[lang]
  if (!langId) return null

  try {
    const res = await fetch('https://ce.judge0.com/submissions?wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: input || '',
      }),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      stdout?: string
      stderr?: string
      compile_output?: string
      status?: { id: number; description: string }
    }

    if (data.compile_output) {
      return { success: false, output: '', compileError: data.compile_output }
    }

    if (data.status && data.status.id !== 3 && data.status.id !== 0) {
      return { success: false, output: data.stdout || '', error: data.stderr || data.status.description }
    }

    return { success: true, output: data.stdout || 'Code executed successfully.', error: data.stderr || undefined }
  } catch (err) {
    console.warn('Judge0 Engine error:', err)
    return null
  }
}

export async function compileAndRunCode(code: string, input: string, lang: string): Promise<ExecutionResult> {
  const preparedCode = prepareExecutableCode(code, lang)

  // 1. If JavaScript, try instant native VM engine
  if (lang === 'javascript') {
    const nativeRes = executeJavaScriptNative(preparedCode, input)
    if (nativeRes.success || nativeRes.compileError) {
      return nativeRes
    }
  }

  // 2. Primary Engine: Piston API
  const pistonRes = await runWithPiston(preparedCode, input, lang)
  if (pistonRes !== null) {
    return pistonRes
  }

  // 3. Fallback Engine: Judge0 CE API
  const judge0Res = await runWithJudge0(preparedCode, input, lang)
  if (judge0Res !== null) {
    return judge0Res
  }

  // 4. Final Fallback if network blocked
  return {
    success: false,
    output: '',
    error: 'All compiler services are currently unreachable. Please check your internet connection or try running JavaScript code.'
  }
}
