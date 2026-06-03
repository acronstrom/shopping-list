import { PageHeader } from '@/components/layout/PageHeader'
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
      <PageHeader title="Inköpslista" />
      <div className="px-[18px] pt-2 flex flex-col gap-4">
        <ModeToggle />
        <SortControls />
        {!isShopping && <SuggestionBar />}
        {!isShopping && <AddGroceryForm />}
        <GroceryList />
      </div>
    </div>
  )
}
