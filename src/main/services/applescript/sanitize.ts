/**
 * Sanitize a Things3 task ID for safe interpolation into AppleScript.
 * Things3 IDs are alphanumeric with hyphens.
 */
export function sanitizeTaskId(taskId: string): string {
  const sanitized = taskId.replace(/[^a-zA-Z0-9\-]/g, '')
  if (!sanitized) throw new Error('Invalid task ID: empty after sanitization')
  return sanitized
}

/**
 * Escape a string for safe use inside AppleScript double-quoted strings.
 * Handles: backslashes, double quotes, newlines, carriage returns, tabs.
 */
export function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}
