interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-card bg-clay-tint flex items-center justify-center mb-5 shadow-card">
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="font-serif text-[22px] font-medium text-ink mb-1 tracking-[-0.01em]">{title}</h3>
      <p className="text-sm text-ink-3 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2.5 rounded-[13px] bg-clay text-white text-sm font-medium hover:bg-clay-deep active:opacity-80 transition-all shadow-[0_8px_20px_-10px_var(--color-clay)]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
