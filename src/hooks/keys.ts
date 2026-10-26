export const keys = {
  subscriptions: ['subscriptions'] as const,
  months: (subId: string) => ['months', subId] as const,
  meals: (monthId: string) => ['meals', monthId] as const,
  payments: (monthId: string) => ['payments', monthId] as const,
  offDays: (subId: string) => ['offDays', subId] as const,
}
