/* eslint-disable react-refresh/only-export-components -- provider and its hook form one public context API */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { t, type Lang, type TranslationKey } from './translations'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangContextValue | null>(null)

function readInitialLang(): Lang {
  return localStorage.getItem('lang') === 'en' ? 'en' : 'ru'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang)
  const setLang = useCallback((nextLang: Lang) => {
    localStorage.setItem('lang', nextLang)
    setLangState(nextLang)
  }, [])
  const translate = useCallback((key: TranslationKey) => t(lang, key), [lang])
  return <LangContext.Provider value={{ lang, setLang, t: translate }}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const context = useContext(LangContext)
  if (!context) throw new Error('useLang must be used within LangProvider')
  return context
}
