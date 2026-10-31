import { describe, expect, it } from 'vitest'

import { detectPushSupport, type PushEnvironment } from './push-support'
import { classifyVapidKey, vapidKeyBytes } from './vapid-key'

const desktop: PushEnvironment = { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130', platform: 'Win32', maxTouchPoints: 0, standalone: false, hasServiceWorker: true, hasPushManager: true, hasNotification: true }
const iphone = { ...desktop, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 }

describe('push support', () => {
  it('lets desktop and Android browsers with the APIs subscribe', () => {
    expect(detectPushSupport(desktop)).toBe('supported')
    expect(detectPushSupport({ ...desktop, userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/130' })).toBe('supported')
  })

  it('sends iPhone and iPad users to the Home Screen first', () => {
    expect(detectPushSupport(iphone)).toBe('needs-home-screen')
    expect(detectPushSupport({ ...desktop, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('needs-home-screen') // iPadOS
    expect(detectPushSupport({ ...iphone, standalone: true })).toBe('supported') // opened from the Home Screen
  })

  it('reports browsers without Web Push', () => {
    expect(detectPushSupport({ ...desktop, hasPushManager: false })).toBe('unsupported')
  })

  it('decodes a base64url VAPID public key', () => {
    const bytes = vapidKeyBytes('BAEC')
    expect([...bytes]).toEqual([4, 1, 2])
  })
})

describe('VAPID key check', () => {
  const b64url = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  it('accepts a public key and recognises a private key pasted in its place', () => {
    expect(classifyVapidKey(b64url([4, ...Array(64).fill(7)]))).toBe('public')
    expect(classifyVapidKey(b64url(Array(32).fill(9)))).toBe('private')
    expect(classifyVapidKey(b64url([5, ...Array(64).fill(7)]))).toBe('invalid')
    expect(classifyVapidKey('not a key!')).toBe('invalid')
    expect(classifyVapidKey('')).toBe('invalid')
  })
})
