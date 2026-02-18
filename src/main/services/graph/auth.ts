import { Client } from '@microsoft/microsoft-graph-client'
import { createServer } from 'http'
import { createHash, randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { shell, safeStorage } from 'electron'

const TOKEN_FILE = join(homedir(), '.outlook-tokens-fa.json')
const REDIRECT_URI = 'http://localhost:3847/callback'
const SCOPES = [
  'Calendars.ReadWrite',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'offline_access'
]

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

function getClientId(): string {
  return process.env.MICROSOFT_CLIENT_ID || ''
}

function getTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID || 'common'
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function loadTokens(): TokenData | null {
  if (existsSync(TOKEN_FILE)) {
    try {
      const raw = readFileSync(TOKEN_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      // New encrypted format
      if (parsed.encrypted && safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(parsed.data, 'base64'))
        return JSON.parse(decrypted) as TokenData
      }
      // Legacy plaintext format — return as-is, will be re-encrypted on next save
      if (parsed.accessToken) {
        return parsed as TokenData
      }
    } catch {
      // Fall through
    }
  }
  // Fall back to MCP server's token file (read-only, no encryption)
  const mcpTokenFile = join(homedir(), '.outlook-tokens.json')
  if (existsSync(mcpTokenFile)) {
    try {
      return JSON.parse(readFileSync(mcpTokenFile, 'utf-8'))
    } catch {
      // Fall through
    }
  }
  return null
}

function saveTokens(tokens: TokenData): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(JSON.stringify(tokens))
    writeFileSync(TOKEN_FILE, JSON.stringify({ encrypted: true, data: encrypted.toString('base64') }), 'utf-8')
  } else {
    writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8')
  }
}

async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const clientId = getClientId()
  const tenantId = getTenantId()
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES.join(' ')
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000
  }
}

// Track active OAuth server so we can close it if needed
let activeOAuthServer: ReturnType<typeof createServer> | null = null

async function performOAuthFlow(): Promise<TokenData> {
  const clientId = getClientId()
  const tenantId = getTenantId()

  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const state = base64UrlEncode(randomBytes(16))

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_mode', 'query')
  authUrl.searchParams.set('scope', SCOPES.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  // Close any previous OAuth server still listening
  if (activeOAuthServer) {
    try { activeOAuthServer.close() } catch { /* ignore */ }
    activeOAuthServer = null
  }

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400)
        res.end('Bad Request')
        return
      }

      const url = new URL(req.url, `http://${req.headers.host}`)

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code')
        const returnedState = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error || !code || returnedState !== state) {
          res.writeHead(400)
          res.end(
            '<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>'
          )
          server.close()
          activeOAuthServer = null
          reject(new Error(`OAuth error: ${error || 'invalid state'}`))
          return
        }

        try {
          const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
          const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              code,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code',
              code_verifier: codeVerifier,
              scope: SCOPES.join(' ')
            })
          })

          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            res.writeHead(400)
            res.end(
              `<html><body><h1>Token Exchange Failed</h1><p>${errorText}</p></body></html>`
            )
            server.close()
            activeOAuthServer = null
            reject(new Error(`Token exchange failed: ${errorText}`))
            return
          }

          const tokenData = await tokenResponse.json()
          const tokens: TokenData = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000
          }

          saveTokens(tokens)

          res.writeHead(200)
          res.end(
            '<html><body><h1>Antonina Connected!</h1><p>You can close this window and return to the app.</p></body></html>'
          )
          server.close()
          activeOAuthServer = null
          resolve(tokens)
        } catch (err) {
          res.writeHead(500)
          res.end('<html><body><h1>Error</h1></body></html>')
          server.close()
          activeOAuthServer = null
          reject(err)
        }
      }
    })

    activeOAuthServer = server

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error('OAuth port 3847 in use, retrying in 1s...')
        setTimeout(() => {
          server.close()
          server.listen(3847)
        }, 1000)
      } else {
        reject(err)
      }
    })

    server.listen(3847, () => {
      console.log('OAuth callback server listening on port 3847')
      shell.openExternal(authUrl.toString())
    })

    setTimeout(() => {
      server.close()
      activeOAuthServer = null
      reject(new Error('OAuth flow timed out after 5 minutes'))
    }, 300000)
  })
}

export async function getAccessToken(): Promise<string> {
  const tokens = loadTokens()

  // Valid token exists
  if (tokens && tokens.expiresAt > Date.now() + 60000) {
    return tokens.accessToken
  }

  // Try refresh
  if (tokens && tokens.refreshToken) {
    try {
      const newTokens = await refreshAccessToken(tokens.refreshToken)
      saveTokens(newTokens)
      return newTokens.accessToken
    } catch (error) {
      console.error('Token refresh failed, starting new OAuth flow:', error)
    }
  }

  // New OAuth flow
  const newTokens = await performOAuthFlow()
  saveTokens(newTokens)
  return newTokens.accessToken
}

let graphClient: Client | null = null

export async function getGraphClient(): Promise<Client> {
  if (!graphClient) {
    graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const token = await getAccessToken()
          done(null, token)
        } catch (error: unknown) {
          done(error as Error, null)
        }
      }
    })
  }
  return graphClient
}

export function isGraphConfigured(): boolean {
  return !!getClientId()
}

export function hasTokens(): boolean {
  return loadTokens() !== null
}
