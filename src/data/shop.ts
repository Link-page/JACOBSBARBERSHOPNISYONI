/**
 * SAMPLE CONTENT — every value in this file is placeholder data.
 * Replace the address, phone, hours, prices, team and photos with the
 * shop's real details before release. The UI reads everything from here.
 */
import { Brush, Crown, Droplets, Layers, Scissors, Smile, type LucideIcon } from 'lucide-react'

export type Service = {
  id: string
  name: string
  description: string
  duration: number // minutes
  price: number
  icon: LucideIcon
}

export type Barber = {
  id: string
  name: string
  /** Single letter shown when there's no photo. */
  initial: string
  role: string
  specialties: string[]
  /** Optional portrait, e.g. "/barbers/jacob.jpg" in /public. */
  photo?: string
}

export type LookPattern = 'fade' | 'waves' | 'dots' | 'lines' | 'arcs' | 'rings'
export type LookTone = 'ink' | 'graphite' | 'silver' | 'bone'
export type LookCategory = 'פייד' | 'קלאסי' | 'מרקם' | 'זקן'

export type Look = {
  id: string
  title: string
  category: LookCategory
  barberId: string
  serviceId: string
  pattern: LookPattern
  tone: LookTone
  /** Height / width, used for the masonry grid. */
  ratio: number
  /** Optional photo, e.g. "/lookbook/skin-fade.jpg" in /public. */
  image?: string
}

/** null = closed. Index 0 is Sunday. */
export type DayHours = { open: string; close: string } | null

export const shop = {
  /** Brand wordmark, always set in Latin capitals. */
  name: "JACOB'S",
  descriptor: 'מספרה',
  /** Used for map search and calendar invites. */
  legalName: "JACOB'S Barbershop",
  address: 'דיזנגוף 120',
  city: 'תל אביב',
  phone: '03-000-0000',
  whatsapp: '97230000000',
  instagram: 'jacobs.barbershop',
  locale: 'he-IL',
  currency: 'ILS',
  slotStep: 30, // minutes between bookable start times
  hours: [
    { open: '09:00', close: '20:00' }, // ראשון
    { open: '09:00', close: '20:00' },
    { open: '09:00', close: '20:00' },
    { open: '09:00', close: '20:00' },
    { open: '09:00', close: '21:00' }, // חמישי
    { open: '08:00', close: '15:00' }, // שישי
    null, // שבת
  ] as DayHours[],
}

export const user = {
  firstName: 'דניאל',
  lastName: 'כהן',
  initial: 'ד',
  phone: '054-000-0000',
  memberSince: 'מרץ 2023',
  stamps: 7,
  stampsForReward: 10,
}

export const services: Service[] = [
  {
    id: 'signature',
    name: 'תספורת הבית',
    description: 'ייעוץ, תספורת במספריים ובמכונה, חפיפה ועיצוב',
    duration: 45,
    price: 90,
    icon: Scissors,
  },
  {
    id: 'skin-fade',
    name: 'סקין פייד',
    description: 'מעבר חלק עד העור, עם גימור ידני',
    duration: 45,
    price: 100,
    icon: Layers,
  },
  {
    id: 'cut-beard',
    name: 'תספורת וזקן',
    description: 'תספורת הבית יחד עם עיצוב זקן מלא',
    duration: 70,
    price: 140,
    icon: Crown,
  },
  {
    id: 'beard',
    name: 'עיצוב זקן',
    description: 'עיצוב, קווים וגימור במגבת חמה',
    duration: 25,
    price: 60,
    icon: Brush,
  },
  {
    id: 'shave',
    name: 'גילוח במגבת חמה',
    description: 'גילוח בתער עם מגבות חמות ובאלם',
    duration: 30,
    price: 80,
    icon: Droplets,
  },
  {
    id: 'kids',
    name: 'תספורת ילדים',
    description: 'עד גיל 12',
    duration: 30,
    price: 60,
    icon: Smile,
  },
]

export const barbers: Barber[] = [
  { id: 'jacob', name: 'יעקב', initial: 'י', role: 'מייסד · ספר ראשי', specialties: ['קלאסי', 'עבודת מספריים'] },
  { id: 'eli', name: 'אלי', initial: 'א', role: 'ספר בכיר', specialties: ['סקין פייד', 'טייפר'] },
  { id: 'noam', name: 'נועם', initial: 'נ', role: 'מומחה זקן', specialties: ['זקן', 'גילוח בתער'] },
  { id: 'rafael', name: 'רפאל', initial: 'ר', role: 'ספר', specialties: ['קרופ מרקמי', 'תלתלים'] },
]

export const looks: Look[] = [
  { id: 'skin-fade', title: 'סקין פייד', category: 'פייד', barberId: 'eli', serviceId: 'skin-fade', pattern: 'fade', tone: 'ink', ratio: 1.33 },
  { id: 'textured-crop', title: 'קרופ מרקמי', category: 'מרקם', barberId: 'rafael', serviceId: 'signature', pattern: 'lines', tone: 'silver', ratio: 1.15 },
  { id: 'pompadour', title: 'פומפדור מודרני', category: 'קלאסי', barberId: 'jacob', serviceId: 'signature', pattern: 'waves', tone: 'graphite', ratio: 1.45 },
  { id: 'sculpted-beard', title: 'זקן מפוסל', category: 'זקן', barberId: 'noam', serviceId: 'beard', pattern: 'arcs', tone: 'bone', ratio: 1.25 },
  { id: 'buzz', title: 'באז נקי', category: 'פייד', barberId: 'eli', serviceId: 'skin-fade', pattern: 'dots', tone: 'graphite', ratio: 1.1 },
  { id: 'side-part', title: 'שביל צד קלאסי', category: 'קלאסי', barberId: 'jacob', serviceId: 'signature', pattern: 'rings', tone: 'silver', ratio: 1.38 },
  { id: 'curly-top', title: 'טייפר עם תלתלים', category: 'מרקם', barberId: 'rafael', serviceId: 'skin-fade', pattern: 'waves', tone: 'bone', ratio: 1.2 },
  { id: 'full-groom', title: 'טיפוח מלא', category: 'זקן', barberId: 'noam', serviceId: 'cut-beard', pattern: 'fade', tone: 'graphite', ratio: 1.42 },
]

export const lookCategories: LookCategory[] = ['פייד', 'קלאסי', 'מרקם', 'זקן']

export const serviceById = (id: string) => services.find((s) => s.id === id) ?? services[0]
export const barberById = (id: string) => barbers.find((b) => b.id === id) ?? barbers[0]
export const lookById = (id: string) => looks.find((l) => l.id === id)
