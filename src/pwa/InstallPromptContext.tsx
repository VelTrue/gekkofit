/* eslint-disable react-refresh/only-export-components -- provider and hook share the captured browser event */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void> }
interface InstallPromptValue { canInstall: boolean; promptInstall: () => Promise<void> }
const InstallPromptContext = createContext<InstallPromptValue>({ canInstall: false, promptInstall: async () => undefined })

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  useEffect(() => { const handler = (event: Event) => { event.preventDefault(); setDeferred(event as BeforeInstallPromptEvent) }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler) }, [])
  async function promptInstall() { if (!deferred) return; await deferred.prompt(); setDeferred(null) }
  return <InstallPromptContext.Provider value={{ canInstall: deferred !== null, promptInstall }}>{children}</InstallPromptContext.Provider>
}

export function useInstallPrompt() { return useContext(InstallPromptContext) }
