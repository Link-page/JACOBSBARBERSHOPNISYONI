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
  initials: string
  role: string
  specialties: string[]
  /** Optional portrait, e.g. "/barbers/jacob.jpg" in /public. */
  photo?: string
}

export type LookPattern = 'fade' | 'waves' | 'dots' | 'lines' | 'arcs' | 'rings'
export type LookTone = 'ink' | 'graphite' | 'silver' | 'bone'
export type LookCategory = 'Fades' | 'Classic' | 'Textured' | 'Beard'

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
  name: "Jacob's",
  legalName: "Jacob's Barbershop",
  address: '120 Dizengoff St',
  city: 'Tel Aviv',
  phone: '+972 3-000-0000',
  whatsapp: '97230000000',
  instagram: 'jacobs.barbershop',
  locale: 'en-GB',
  currency: 'ILS',
  slotStep: 30, // minutes between bookable start times
  hours: [
    { open: '09:00', close: '20:00' }, // Sunday
    { open: '09:00', close: '20:00' },
    { open: '09:00', close: '20:00' },
    { open: '09:00', close: '20:00' },
    { open: '09:00', close: '21:00' }, // Thursday
    { open: '08:00', close: '15:00' }, // Friday
    null, // Saturday
  ] as DayHours[],
}

export const user = {
  firstName: 'Daniel',
  lastName: 'Cohen',
  initials: 'DC',
  phone: '+972 54-000-0000',
  memberSince: 'March 2023',
  stamps: 7,
  stampsForReward: 10,
}

export const services: Service[] = [
  {
    id: 'signature',
    name: 'Signature Cut',
    description: 'Consultation, scissor & clipper cut, wash and style',
    duration: 45,
    price: 90,
    icon: Scissors,
  },
  {
    id: 'skin-fade',
    name: 'Skin Fade',
    description: 'Seamless fade down to the skin, finished by hand',
    duration: 45,
    price: 100,
    icon: Layers,
  },
  {
    id: 'cut-beard',
    name: 'Cut & Beard',
    description: 'Our signature cut with a full beard sculpt',
    duration: 70,
    price: 140,
    icon: Crown,
  },
  {
    id: 'beard',
    name: 'Beard Sculpt',
    description: 'Shape, line-up and hot towel finish',
    duration: 25,
    price: 60,
    icon: Brush,
  },
  {
    id: 'shave',
    name: 'Hot Towel Shave',
    description: 'Straight razor shave with hot towels and balm',
    duration: 30,
    price: 80,
    icon: Droplets,
  },
  {
    id: 'kids',
    name: 'Kids Cut',
    description: 'For gentlemen under 12',
    duration: 30,
    price: 60,
    icon: Smile,
  },
]

export const barbers: Barber[] = [
  { id: 'jacob', name: 'Jacob', initials: 'J', role: 'Founder · Master Barber', specialties: ['Classic', 'Scissor work'] },
  { id: 'eli', name: 'Eli', initials: 'E', role: 'Senior Barber', specialties: ['Skin fades', 'Tapers'] },
  { id: 'noam', name: 'Noam', initials: 'N', role: 'Beard Specialist', specialties: ['Beards', 'Hot towel shaves'] },
  { id: 'rafael', name: 'Rafael', initials: 'R', role: 'Barber', specialties: ['Textured crops', 'Curls'] },
]

export const looks: Look[] = [
  { id: 'skin-fade', title: 'Skin Fade', category: 'Fades', barberId: 'eli', serviceId: 'skin-fade', pattern: 'fade', tone: 'ink', ratio: 1.33 },
  { id: 'textured-crop', title: 'Textured Crop', category: 'Textured', barberId: 'rafael', serviceId: 'signature', pattern: 'lines', tone: 'silver', ratio: 1.15 },
  { id: 'pompadour', title: 'Modern Pompadour', category: 'Classic', barberId: 'jacob', serviceId: 'signature', pattern: 'waves', tone: 'graphite', ratio: 1.45 },
  { id: 'sculpted-beard', title: 'Sculpted Beard', category: 'Beard', barberId: 'noam', serviceId: 'beard', pattern: 'arcs', tone: 'bone', ratio: 1.25 },
  { id: 'buzz', title: 'Clean Buzz', category: 'Fades', barberId: 'eli', serviceId: 'skin-fade', pattern: 'dots', tone: 'graphite', ratio: 1.1 },
  { id: 'side-part', title: 'Classic Side Part', category: 'Classic', barberId: 'jacob', serviceId: 'signature', pattern: 'rings', tone: 'silver', ratio: 1.38 },
  { id: 'curly-top', title: 'Curly Top Taper', category: 'Textured', barberId: 'rafael', serviceId: 'skin-fade', pattern: 'waves', tone: 'bone', ratio: 1.2 },
  { id: 'cut-and-beard', title: 'Full Groom', category: 'Beard', barberId: 'noam', serviceId: 'cut-beard', pattern: 'fade', tone: 'graphite', ratio: 1.42 },
]

export const lookCategories: LookCategory[] = ['Fades', 'Classic', 'Textured', 'Beard']

export const serviceById = (id: string) => services.find((s) => s.id === id) ?? services[0]
export const barberById = (id: string) => barbers.find((b) => b.id === id) ?? barbers[0]
export const lookById = (id: string) => looks.find((l) => l.id === id)
