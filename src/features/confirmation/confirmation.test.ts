import { describe, expect, it } from 'vitest'

import { attendanceView, canSelfManage } from './attendance'
import { cancellationRequestLink, toWhatsAppNumber } from './whatsapp-link'

const now = new Date('2026-11-09T12:00:00Z')

describe('attendance view', () => {
  it('asks for confirmation before the deadline and reports when it has passed', () => {
    const view = attendanceView({ confirmationStatus: 'pending', confirmationDeadline: '2026-11-09T18:00:00Z', confirmedAt: null }, now)
    expect(view).toEqual({ kind: 'needs-confirmation', deadline: new Date('2026-11-09T18:00:00Z') })
    expect(attendanceView({ confirmationStatus: 'pending', confirmationDeadline: '2026-11-09T11:00:00Z', confirmedAt: null }, now).kind).toBe('closed')
  })

  it('locks self-service once confirmed', () => {
    const confirmed = attendanceView({ confirmationStatus: 'confirmed', confirmationDeadline: null, confirmedAt: '2026-11-08T09:00:00Z' }, now)
    expect(confirmed.kind).toBe('confirmed')
    expect(canSelfManage(confirmed)).toBe(false)
    expect(canSelfManage(attendanceView({ confirmationStatus: 'not_required', confirmationDeadline: null, confirmedAt: null }, now))).toBe(true)
  })
})

describe('WhatsApp cancellation request', () => {
  it('normalises Israeli numbers for wa.me', () => {
    expect(toWhatsAppNumber('054-123-4567')).toBe('972541234567')
    expect(toWhatsAppNumber('+972 54 123 4567')).toBe('972541234567')
    expect(toWhatsAppNumber('')).toBeNull()
  })

  it('prefills a Hebrew message with the appointment details', () => {
    const link = cancellationRequestLink('0541234567', { customerName: 'דניאל', when: 'יום שלישי 10.11 בשעה 17:00', service: 'תספורת הבית', barber: 'יעקב' })!
    expect(link.startsWith('https://wa.me/972541234567?text=')).toBe(true)
    const text = decodeURIComponent(link.split('text=')[1])
    expect(text).toBe('שלום, כאן דניאל. אבקש לבטל את התור שלי יום שלישי 10.11 בשעה 17:00 — תספורת הבית אצל יעקב. תודה!')
    expect(cancellationRequestLink('', { customerName: 'א', when: 'ב', service: 'ג', barber: 'ד' })).toBeNull()
  })
})
