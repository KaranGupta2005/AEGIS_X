const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const API_BASE = `${BACKEND_URL}/api/v1/auth`

export interface AuthUser {
  user_id: string
  username: string
  email: string
}

export interface AuthResponse {
  access_token: string
  user_id: string
  username: string
  email: string
}

export function getAuthToken(): string | null {
  return localStorage.getItem('aegisx_token')
}

export function getUserId(): string | null {
  return localStorage.getItem('aegisx_user_id')
}

export function getUsername(): string | null {
  return localStorage.getItem('aegisx_username')
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

export function logout(): void {
  localStorage.removeItem('aegisx_token')
  localStorage.removeItem('aegisx_user_id')
  localStorage.removeItem('aegisx_username')
  localStorage.removeItem('aegisx_email')
  window.location.href = '/login'
}

function storeAuth(data: AuthResponse): void {
  localStorage.setItem('aegisx_token', data.access_token)
  localStorage.setItem('aegisx_user_id', data.user_id)
  localStorage.setItem('aegisx_username', data.username)
  localStorage.setItem('aegisx_email', data.email)
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
  } catch {
    throw new Error('Cannot connect to server. Start backend with: uvicorn backend.main:app --port 8000')
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    throw new Error(`Server returned status ${res.status}. Is the backend running?`)
  }

  if (!res.ok) {
    const detail = data?.detail
    const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg || d.message || String(d)).join(', ') : `Request failed (${res.status})`
    throw new Error(msg)
  }

  storeAuth(data)
  return data
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error('Cannot connect to server. Start backend with: uvicorn backend.main:app --port 8000')
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    throw new Error(`Server returned status ${res.status}. Is the backend running?`)
  }

  if (!res.ok) {
    const detail = data?.detail
    const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg || d.message || String(d)).join(', ') : `Login failed (${res.status})`
    throw new Error(msg)
  }

  storeAuth(data)
  return data
}

export async function verifyToken(): Promise<AuthUser | null> {
  const token = getAuthToken()
  if (!token) return null

  try {
    const res = await fetch(`${API_BASE}/verify?token=${token}`, { method: 'POST' })
    if (!res.ok) {
      logout()
      return null
    }
    return await res.json()
  } catch {
    return null
  }
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const userId = getUserId()
  if (userId) headers['X-User-Id'] = userId
  return headers
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...getAuthHeaders(), ...options.headers }
  const response = await fetch(url, { ...options, headers })
  if (response.status === 401) logout()
  return response
}
