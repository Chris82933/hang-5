import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Chrome/Android fire `beforeinstallprompt` early (often before React mounts),
// so we capture it at module load and re-broadcast via a custom event.
let deferred: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    window.dispatchEvent(new Event('pwa:installable'))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    window.dispatchEvent(new Event('pwa:installed'))
  })
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as a Mac but has a touch screen
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** Trigger the native install prompt (Android/Chrome). Returns true if added. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  window.dispatchEvent(new Event('pwa:installable'))
  return outcome === 'accepted'
}

export interface InstallState {
  installed: boolean
  canPrompt: boolean // native prompt available (Android/Chrome)
  ios: boolean
}

/** Reactive install state for the settings screen. */
export function useInstallState(): InstallState {
  const [state, setState] = useState<InstallState>(() => ({
    installed: isStandalone(),
    canPrompt: deferred !== null,
    ios: isIOS(),
  }))

  useEffect(() => {
    const update = () =>
      setState({ installed: isStandalone(), canPrompt: deferred !== null, ios: isIOS() })
    window.addEventListener('pwa:installable', update)
    window.addEventListener('pwa:installed', update)
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('pwa:installable', update)
      window.removeEventListener('pwa:installed', update)
      mq?.removeEventListener?.('change', update)
    }
  }, [])

  return state
}
