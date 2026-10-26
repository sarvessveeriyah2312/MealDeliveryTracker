import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMeal as apiUpdateMeal, updateMeals as apiUpdateMeals } from '@/api/meals'
import type { Meal, MealUpdate } from '@/api/types'
import { keys } from './keys'

type MealPatch = { ids: string[]; patch: MealUpdate }

/** Optimistically patches meals in a month's cache, rolling back on error. */
export function useUpdateMeals(monthId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, patch }: MealPatch) => (ids.length === 1 ? apiUpdateMeal(ids[0]!, patch) : apiUpdateMeals(ids, patch)),
    onMutate: async ({ ids, patch }) => {
      await qc.cancelQueries({ queryKey: keys.meals(monthId) })
      const previous = qc.getQueryData<Meal[]>(keys.meals(monthId))
      qc.setQueryData<Meal[]>(keys.meals(monthId), (old) => old?.map((m) => (ids.includes(m.id) ? { ...m, ...patch } : m)))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(keys.meals(monthId), context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.meals(monthId) }),
  })
}

/** Patch for marking a status: user cancellations record when they happened. */
export function statusPatch(status: Meal['status'], now = new Date()): MealUpdate {
  return { status, cancelled_at: status === 'user_cancelled' ? now.toISOString() : null }
}
