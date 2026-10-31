import { shop } from '@/data/shop'

const fullAddress = `${shop.address}, ${shop.city}`

export const links = {
  directions: `https://maps.apple.com/?q=${encodeURIComponent(shop.legalName)}&address=${encodeURIComponent(fullAddress)}`,
  call: `tel:${shop.phone.replace(/[^+\d]/g, '')}`,
  whatsapp: `https://wa.me/${shop.whatsapp}`,
  instagram: `https://instagram.com/${shop.instagram}`,
  fullAddress,
}
