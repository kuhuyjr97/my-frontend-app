'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { backendUrl } from '@/app/baseUrl'
import {
  clearSessionTokens,
  setSessionTokens,
  tryRefreshAccessToken,
} from '@/lib/v2/auth-session'

type Mode = 'login' | 'register'

export default function V2LoginPage() {
  const router = useRouter()
  const baseUrl = backendUrl()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function checkExistingSession() {
      const token = localStorage.getItem('token')
      if (!token) return
      const tryCheck = async (access: string) =>
        axios.get(`${baseUrl}/auth/check`, {
          headers: { Authorization: `Bearer ${access}` },
        })
      try {
        const res = await tryCheck(token)
        if (!cancelled && res.data === 1) {
          router.replace('/v2/finance')
        }
      } catch {
        const refreshed = await tryRefreshAccessToken()
        if (!refreshed) {
          clearSessionTokens()
          return
        }
        try {
          const next = localStorage.getItem('token')
          if (!next) return
          const res2 = await tryCheck(next)
          if (!cancelled && res2.data === 1) router.replace('/v2/finance')
        } catch {
          clearSessionTokens()
        }
      }
    }
    checkExistingSession()
    return () => {
      cancelled = true
    }
  }, [baseUrl, router])

  const persistTokenAndGoFinance = (accessToken: string, refreshToken?: string) => {
    setSessionTokens(accessToken, refreshToken)
    router.push('/v2/finance')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${baseUrl}/auth/login`, {
        username,
        password,
      })
      const token = response.data?.accessToken as string | undefined
      const refresh = response.data?.refreshToken as string | undefined
      if (token) {
        persistTokenAndGoFinance(token, refresh)
      } else {
        setError('Không nhận được token từ server')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message))
      } else {
        setError('Đăng nhập thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    setLoading(true)
    try {
      await axios.post(`${baseUrl}/auth/register`, {
        username: username.trim(),
        email: email.trim(),
        password,
      })
      const loginRes = await axios.post(`${baseUrl}/auth/login`, {
        username: username.trim(),
        password,
      })
      const token = loginRes.data?.accessToken as string | undefined
      const refresh = loginRes.data?.refreshToken as string | undefined
      if (token) {
        persistTokenAndGoFinance(token, refresh)
      } else {
        setError('Đăng ký xong nhưng không đăng nhập được — thử đăng nhập thủ công')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message))
      } else {
        setError('Đăng ký thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1'
  const inputStyle = {
    border: '1px solid var(--v-border)',
    backgroundColor: 'var(--v-input-bg)',
    color: 'var(--v-text)',
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo + title */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--v-btn-bg)' }}
          >
            <span className="text-[11px] font-medium tracking-tight" style={{ color: 'var(--v-btn-text)' }}>OS</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--v-text)' }}>
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--v-muted)' }}>Phiên bản V2</p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex rounded-xl p-1" style={{ backgroundColor: 'var(--v-hover)' }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === m ? 'var(--v-surface)' : 'transparent',
                color: mode === m ? 'var(--v-text)' : 'var(--v-muted)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid #f5c6cb', backgroundColor: '#fdf0f0', color: '#b05040' }}
          >
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="v2-username" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--v-text-2)' }}>
                Tên đăng nhập
              </label>
              <input
                id="v2-username" name="username" type="text" required autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className={inputCls} style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="v2-password" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--v-text-2)' }}>
                Mật khẩu
              </label>
              <input
                id="v2-password" name="password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls} style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="mt-2 w-full rounded-lg py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
            >
              {loading ? 'Đang xử lý…' : 'Đăng nhập'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label htmlFor="v2-reg-username" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--v-text-2)' }}>
                Tên đăng nhập
              </label>
              <input
                id="v2-reg-username" name="username" type="text" required autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                className={inputCls} style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="v2-email" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--v-text-2)' }}>
                Email
              </label>
              <input
                id="v2-email" name="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputCls} style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="v2-reg-password" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--v-text-2)' }}>
                Mật khẩu
              </label>
              <input
                id="v2-reg-password" name="password" type="password" required autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputCls} style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="v2-confirm" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--v-text-2)' }}>
                Nhập lại mật khẩu
              </label>
              <input
                id="v2-confirm" name="confirmPassword" type="password" required autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls} style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="mt-2 w-full rounded-lg py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
            >
              {loading ? 'Đang xử lý…' : 'Đăng ký'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
