'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { backendUrl } from '@/app/baseUrl'

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
      try {
        const res = await axios.get(`${baseUrl}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled && res.data === 1) {
          router.replace('/v2/finance')
        }
      } catch {
        localStorage.removeItem('token')
      }
    }
    checkExistingSession()
    return () => {
      cancelled = true
    }
  }, [baseUrl, router])

  const persistTokenAndGoFinance = (token: string) => {
    localStorage.setItem('token', token)
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
      const token = response.data?.accessToken
      if (token) {
        persistTokenAndGoFinance(token)
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
      const token = loginRes.data?.accessToken
      if (token) {
        persistTokenAndGoFinance(token)
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md rounded-2xl border border-[#e8e6e1] bg-white p-8 shadow-sm"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a]">
            <span className="text-[11px] font-medium tracking-tight text-white">OS</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1a1a1a]">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-1 text-sm text-[#8a8780]">Phiên bản V2</p>
        </div>

        <div className="mb-6 flex rounded-xl bg-[#f0eeea] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#8a8780] hover:text-[#1a1a1a]'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#8a8780] hover:text-[#1a1a1a]'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="v2-username" className="mb-1 block text-xs font-medium text-[#555]">
                Tên đăng nhập
              </label>
              <input
                id="v2-username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[#e8e6e1] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none ring-[#1a1a1a] placeholder:text-[#b0ada8] focus:border-[#1a1a1a] focus:ring-1"
                placeholder="Username"
              />
            </div>
            <div>
              <label htmlFor="v2-password" className="mb-1 block text-xs font-medium text-[#555]">
                Mật khẩu
              </label>
              <input
                id="v2-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e8e6e1] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#1a1a1a] focus:ring-1"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-[#1a1a1a] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý…' : 'Đăng nhập'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label htmlFor="v2-reg-username" className="mb-1 block text-xs font-medium text-[#555]">
                Tên đăng nhập
              </label>
              <input
                id="v2-reg-username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[#e8e6e1] px-3 py-2 text-sm outline-none focus:border-[#1a1a1a] focus:ring-1"
              />
            </div>
            <div>
              <label htmlFor="v2-email" className="mb-1 block text-xs font-medium text-[#555]">
                Email
              </label>
              <input
                id="v2-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#e8e6e1] px-3 py-2 text-sm outline-none focus:border-[#1a1a1a] focus:ring-1"
              />
            </div>
            <div>
              <label htmlFor="v2-reg-password" className="mb-1 block text-xs font-medium text-[#555]">
                Mật khẩu
              </label>
              <input
                id="v2-reg-password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e8e6e1] px-3 py-2 text-sm outline-none focus:border-[#1a1a1a] focus:ring-1"
              />
            </div>
            <div>
              <label htmlFor="v2-confirm" className="mb-1 block text-xs font-medium text-[#555]">
                Nhập lại mật khẩu
              </label>
              <input
                id="v2-confirm"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e8e6e1] px-3 py-2 text-sm outline-none focus:border-[#1a1a1a] focus:ring-1"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-[#1a1a1a] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý…' : 'Đăng ký'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
