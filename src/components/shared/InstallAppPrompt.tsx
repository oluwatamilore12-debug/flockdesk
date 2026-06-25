import { useEffect, useState } from 'react'
import { Download, Smartphone, Share, X } from 'lucide-react'
import { Link } from 'react-router'
import { APP_NAME, APP_URL, APP_VERSION } from '@/lib/version'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function InstallAppPrompt({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const installed = isStandalone()

  useEffect(() => {
    if (sessionStorage.getItem('flockdesk-install-dismissed') === '1') {
      setDismissed(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDeferredPrompt(null)
      return
    }
    if (isIos()) {
      setIosHint(true)
      return
    }
    window.open(APP_URL, '_blank', 'noopener')
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('flockdesk-install-dismissed', '1')
  }

  if (installed) {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl bg-[#F0F2FA] px-3 py-2 text-xs text-[#001996]', className)}>
        <Smartphone className="h-4 w-4 shrink-0 text-[#001996]" />
        <span>{APP_NAME} v{APP_VERSION} installed</span>
      </div>
    )
  }

  if (dismissed && !compact) return null

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#001996] hover:bg-[#F0F2FA]',
          className
        )}
      >
        <Download className="h-3.5 w-3.5" />
        Install
      </button>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-[#D6DBEF] bg-gradient-to-br from-[#F0F2FA] to-white p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#001996] p-2.5 text-white">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-[#000000]">Install {APP_NAME} on your phone</p>
            <p className="mt-0.5 text-xs text-[#10259C]">
              Add to home screen for quick access — works like a native app. Current version: v{APP_VERSION}
            </p>
          </div>
        </div>
        <button type="button" onClick={handleDismiss} className="rounded-lg p-1 text-[#10259C] hover:bg-[#F0F2FA]" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#001996] to-[#FF052E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          {deferredPrompt ? 'Install App' : isIos() ? 'How to Install' : 'Open App'}
        </button>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 rounded-xl border border-[#D6DBEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#001996] hover:bg-[#F0F2FA]"
        >
          All versions
        </Link>
      </div>

      {iosHint && (
        <div className="mt-3 rounded-xl bg-white p-3 text-xs text-[#001996] ring-1 ring-[#D6DBEF]">
          <p className="flex items-center gap-1.5 font-semibold text-[#000000]">
            <Share className="h-3.5 w-3.5" /> iPhone / iPad
          </p>
          <p className="mt-1">Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.</p>
        </div>
      )}
    </div>
  )
}