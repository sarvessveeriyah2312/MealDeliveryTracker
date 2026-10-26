import type { LucideIcon } from 'lucide-react'

export function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div>
      <h2 className="section-title flex items-center gap-2">
        <Icon className="h-[1.1rem] w-[1.1rem] text-brand" />
        {title}
      </h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
  )
}
