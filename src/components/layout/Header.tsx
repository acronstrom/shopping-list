import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  title: string
  action?: { label: string; onClick: () => void }
}

export function Header({ title, action }: HeaderProps) {
  const { householdId } = useAuth()
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-base">🛒</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        {action && householdId && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </header>
  )
}
