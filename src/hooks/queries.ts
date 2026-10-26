import { useQuery } from '@tanstack/react-query'
import { listMeals, listMonths } from '@/api/months'
import { listOffDays } from '@/api/offDays'
import { listPayments } from '@/api/payments'
import { listSubscriptions } from '@/api/subscriptions'
import { keys } from './keys'

export function useSubscriptions() {
  return useQuery({ queryKey: keys.subscriptions, queryFn: listSubscriptions })
}

export function useMonths(subId: string | undefined) {
  return useQuery({ queryKey: keys.months(subId ?? ''), queryFn: () => listMonths(subId!), enabled: !!subId })
}

export function useMeals(monthId: string | undefined) {
  return useQuery({ queryKey: keys.meals(monthId ?? ''), queryFn: () => listMeals(monthId!), enabled: !!monthId })
}

export function usePayments(monthId: string | undefined) {
  return useQuery({ queryKey: keys.payments(monthId ?? ''), queryFn: () => listPayments(monthId!), enabled: !!monthId })
}

export function useOffDays(subId: string | undefined) {
  return useQuery({ queryKey: keys.offDays(subId ?? ''), queryFn: () => listOffDays(subId!), enabled: !!subId })
}
