'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import en from './en.json'
import vi from './vi.json'

export type Lang = 'en' | 'vi'

type Translations = typeof en

const DICTIONARIES: Record<Lang, Translations> = { en, vi }
const STORAGE_KEY = 'v2-lang'

type I18nCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nCtx>({
  lang: 'vi',
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('vi')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved === 'en' || saved === 'vi') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const t = (key: string): string => {
    const dict = DICTIONARIES[lang] as Record<string, unknown>
    const parts = key.split('.')
    let cur: unknown = dict
    for (const p of parts) {
      if (typeof cur !== 'object' || cur === null) return key
      cur = (cur as Record<string, unknown>)[p]
    }
    return typeof cur === 'string' ? cur : key
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useLang() {
  return useContext(I18nContext)
}
