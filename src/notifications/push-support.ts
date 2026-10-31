/**
 * Whether this device can receive Web Push from the app:
 *   supported          — ask for permission with the button
 *   needs-home-screen  — iPhone/iPad Safari: push works only after "Add to Home Screen" (iOS 16.4+)
 *   unsupported        — this browser has no Web Push
 */
export type PushSupport = 'supported' | 'needs-home-screen' | 'unsupported'

export type PushEnvironment = {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}

export function detectPushSupport(env: PushEnvironment): PushSupport {
  // iPadOS reports itself as a Mac; touch support gives it away.
  const apple = /iPad|iPhone|iPod/.test(env.userAgent) || (env.platform === 'MacIntel' && env.maxTouchPoints > 1)
  if (apple && !env.standalone) return 'needs-home-screen'
  return env.hasServiceWorker && env.hasPushManager && env.hasNotification ? 'supported' : 'unsupported'
}

/** The current browser's environment. */
export function browserPushEnvironment(): PushEnvironment {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
  }
}
