import { Header } from '@/components/layout/Header'
import { AddGroceryForm } from '@/components/groceries/AddGroceryForm'
import { GroceryList } from '@/components/groceries/GroceryList'
import { SortControls } from '@/components/groceries/SortControls'
import { SuggestionBar } from '@/components/groceries/SuggestionBar'
import { ModeToggle } from '@/components/groceries/ModeToggle'
import { useUI } from '@/contexts/UIContext'

export function ShoppingListPage() {
  const { mode } = useUI()
  const isShopping = mode === 'shopping'

  return (
    <div>
      <Header title="Inköpslista" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
        <ModeToggle />
        <SortControls />
        {!isShopping && <SuggestionBar />}
        {!isShopping && <AddGroceryForm />}
        <GroceryList />
      </div>
    </div>
  )
}
