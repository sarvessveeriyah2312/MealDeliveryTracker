import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { MEAL_TIMES, TZ, type MealType } from './constants'

// Calendar dates are plain 'yyyy-MM-dd' strings (Postgres `date`). Arithmetic on them is done in UTC
// so the host machine's timezone can never shift a day; "now" is always converted via MYT.

/** Today's date in Malaysia, regardless of the device timezone. */
export function todayLocal(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, 'yyyy-MM-dd')
}

/** The MYT calendar date an instant falls on. */
export function toLocalDate(instant: Date | string): string {
  return formatInTimeZone(typeof instant === 'string' ? new Date(instant) : instant, TZ, 'yyyy-MM-dd')
}

/** The instant a meal is due (lunch 12:00 / dinner 19:00 MYT) on a local date. */
export function mealDateTime(date: string, mealType: MealType): Date {
  return fromZonedTime(`${date}T${MEAL_TIMES[mealType]}:00`, TZ)
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  const d = toUtc(date)
  d.setUTCDate(d.getUTCDate() + n)
  return fromUtc(d)
}

/** 0 = Sunday … 6 = Saturday, matching delivery_weekdays. */
export function weekdayOf(date: string): number {
  return toUtc(date).getUTCDay()
}

/** First day of the month containing `date`. */
export function periodOf(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function addMonths(period: string, n: number): string {
  const d = toUtc(period)
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  return fromUtc(d)
}

export function lastDayOfPeriod(period: string): string {
  return addDays(addMonths(period, 1), -1)
}

export function daysInPeriod(period: string): string[] {
  const days: string[] = []
  const end = lastDayOfPeriod(period)
  for (let d = period; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}

export function eachDay(from: string, to: string): string[] {
  const [a, b] = from <= to ? [from, to] : [to, from]
  const days: string[] = []
  for (let d = a; d <= b; d = addDays(d, 1)) days.push(d)
  return days
}

export function formatPeriod(period: string): string {
  return formatInTimeZone(toUtc(period), 'UTC', 'MMMM yyyy')
}

export function formatDay(date: string, pattern = 'EEE d MMM'): string {
  return formatInTimeZone(toUtc(date), 'UTC', pattern)
}

/** ISO instant → value for an <input type="datetime-local">, shown in MYT. */
export function toLocalInputValue(instant: string): string {
  return formatInTimeZone(new Date(instant), TZ, "yyyy-MM-dd'T'HH:mm")
}

/** <input type="datetime-local"> value (read as MYT) → ISO instant. */
export function fromLocalInputValue(value: string): string {
  return fromZonedTime(value, TZ).toISOString()
}

export function formatInstant(instant: string, pattern = 'd MMM, h:mm a'): string {
  return formatInTimeZone(new Date(instant), TZ, pattern)
}

export function greetingFor(now: Date = new Date()): string {
  const hour = Number(formatInTimeZone(now, TZ, 'H'))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
