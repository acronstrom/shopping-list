import { Header } from '@/components/layout/Header'
import { AddGroceryForm } from '@/components/groceries/AddGroceryForm'
import { GroceryList } from '@/components/groceries/GroceryList'
import { SortControls } from '@/components/groceries/SortControls'
import { SuggestionBar } from '@/components/groceries/SuggestionBar'

export function ShoppingListPage() {
  return (
    <div>
      <Header title="Inköpslista" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
        <SortControls />
        <SuggestionBar />
        <AddGroceryForm />
        <GroceryList />
      </div>
    </div>
  )
}
