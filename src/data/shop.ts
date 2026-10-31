/**
 * SAMPLE CONTENT for the on-device demo (no backend configured), plus the
 * shop's contact details. With Supabase, services, barbers and photos come
 * from the database instead (src/catalogue). Replace the address, phone and
 * hours with the shop's real details before release.
 */
export type Service = {
  id: string
  name: string
  description: string
  duration: number // minutes
  price: number
}

export type Barber = {
  id: string
  name: string
  /** Single letter shown when there's no photo. */
  initial: string
  role: string
  specialties: string[]
  /** Optional portrait, a path inside /public, e.g. "barbers/jacob.jpg". */
  photo?: string
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
  },
  {
    id: 'skin-fade',
    name: 'סקין פייד',
    description: 'מעבר חלק עד העור, עם גימור ידני',
    duration: 45,
    price: 100,
  },
  {
    id: 'cut-beard',
    name: 'תספורת וזקן',
    description: 'תספורת הבית יחד עם עיצוב זקן מלא',
    duration: 70,
    price: 140,
  },
  {
    id: 'beard',
    name: 'עיצוב זקן',
    description: 'עיצוב, קווים וגימור במגבת חמה',
    duration: 25,
    price: 60,
  },
  {
    id: 'shave',
    name: 'גילוח במגבת חמה',
    description: 'גילוח בתער עם מגבות חמות ובאלם',
    duration: 30,
    price: 80,
  },
  {
    id: 'kids',
    name: 'תספורת ילדים',
    description: 'עד גיל 12',
    duration: 30,
    price: 60,
  },
]

/** The demo has only the shop's real founder: no invented team members. */
export const barbers: Barber[] = [
  { id: 'jacob', name: 'יעקב', initial: 'י', role: 'מייסד · ספר ראשי', specialties: ['קלאסי', 'עבודת מספריים'] },
]

