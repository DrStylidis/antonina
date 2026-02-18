import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const exec = promisify(execFile)

export const FIELD_SEP = '<<FIELD>>'
export const RECORD_SEP = '<<RECORD>>'

export async function runAppleScript(script: string, timeout = 30000): Promise<string> {
  // Write script to temp file for reliable multi-line execution
  const tmpFile = join(tmpdir(), `fa-script-${randomBytes(4).toString('hex')}.scpt`)
  try {
    writeFileSync(tmpFile, script, 'utf-8')
    const { stdout } = await exec('osascript', [tmpFile], { timeout })
    return stdout.trim()
  } catch (error) {
    console.error('AppleScript error:', error)
    throw new Error(
      `AppleScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    try {
      unlinkSync(tmpFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function parseDelimitedOutput<T>(
  raw: string,
  fieldNames: string[],
  transform?: (record: Record<string, string>) => T
): T[] {
  if (!raw || raw.trim() === '') return []

  return raw
    .split(RECORD_SEP)
    .filter((entry) => entry.trim())
    .map((entry) => {
      const fields = entry.split(FIELD_SEP)
      const record: Record<string, string> = {}
      fieldNames.forEach((name, i) => {
        record[name] = (fields[i] || '').trim()
      })
      return transform ? transform(record) : (record as T)
    })
}
