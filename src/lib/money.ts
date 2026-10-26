import { round2 } from './billing'

const rm = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' })

export function formatRM(amount: number): string {
  return rm.format(round2(amount))
}
