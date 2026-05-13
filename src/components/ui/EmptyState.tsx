interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-5 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.35)]">
        <span className="text-4xl">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-95 transition-all shadow-[0_6px_16px_-6px_rgba(16,185,129,0.5)]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
