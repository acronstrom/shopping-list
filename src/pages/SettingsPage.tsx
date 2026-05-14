import { useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { InviteMemberForm } from '@/components/household/InviteMemberForm'
import { StoreCard } from '@/components/stores/StoreCard'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAddHouseholdCategory, useDeleteHouseholdCategory, useHouseholdCategories } from '@/hooks/useCategories'
import { useStores, useAddStore } from '@/hooks/useStores'

export function SettingsPage() {
  const { user } = useAuth()
  const { data: members = [], isLoading } = useHouseholdMembers()
  const { data: householdCategories = [], isLoading: loadingCategories } = useHouseholdCategories()
  const { data: stores = [], isLoading: loadingStores } = useStores()
  const addCategory = useAddHouseholdCategory()
  const deleteCategory = useDeleteHouseholdCategory()
  const addStore = useAddStore()
  const [signingOut, setSigningOut] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [newStore, setNewStore] = useState('')
  const [storeError, setStoreError] = useState('')

  const orderedCategories = useMemo(() => {
    return [...householdCategories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name)
    })
  }, [householdCategories])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  async function handleAddCategory() {
    setCategoryError('')
    const trimmed = newCategory.trim()
    if (!trimmed) return
    try {
      const maxSort = orderedCategories.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0)
      await addCategory.mutateAsync({ name: trimmed, sortOrder: maxSort + 10 })
      setNewCategory('')
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : 'Det gick inte att lägga till kategori')
    }
  }

  async function handleAddStore() {
    setStoreError('')
    const trimmed = newStore.trim()
    if (!trimmed) return
    try {
      await addStore.mutateAsync(trimmed)
      setNewStore('')
    } catch (e) {
      setStoreError(e instanceof Error ? e.message : 'Det gick inte att lägga till butik')
    }
  }

  return (
    <div>
      <Header title="Inställningar" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-6">

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Kategorier
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingCategories ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Kategorierna används för att sortera din inköpslista. Ordningen per butik ställer du in under <strong>Butiker</strong> nedan.
                  </p>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Ny kategori"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      placeholder="t.ex. Vegetariskt"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddCategory}
                    loading={addCategory.isPending}
                    disabled={!newCategory.trim()}
                  >
                    Lägg till
                  </Button>
                </div>
                {categoryError && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    {categoryError}
                  </p>
                )}

                {orderedCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2 text-center">
                    Inga kategorier ännu.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-50 -mx-4">
                    {orderedCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                          <p className="text-xs text-gray-400">Sortering: {cat.sort_order}</p>
                        </div>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={deleteCategory.isPending}
                          onClick={async () => {
                            setCategoryError('')
                            try {
                              await deleteCategory.mutateAsync({ id: cat.id })
                            } catch (e) {
                              setCategoryError(e instanceof Error ? e.message : 'Det gick inte att ta bort kategori')
                            }
                          }}
                        >
                          Ta bort
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Butiker
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingStores ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  Lägg till butiker för att tilldela gångnummer och kategoriordning under handlingen.
                </p>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Ny butik"
                      value={newStore}
                      onChange={e => setNewStore(e.target.value)}
                      placeholder="t.ex. ICA Maxi"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddStore}
                    loading={addStore.isPending}
                    disabled={!newStore.trim()}
                  >
                    Lägg till
                  </Button>
                </div>
                {storeError && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    {storeError}
                  </p>
                )}

                {stores.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2 text-center">
                    Inga butiker ännu.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stores.map(store => <StoreCard key={store.id} store={store} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Hushållsmedlemmar
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.email}</p>
                      {member.user_id === user?.id && (
                        <p className="text-xs text-gray-400">Du</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      member.status === 'accepted'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {member.status === 'accepted' ? 'Aktiv' : 'Väntande'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Bjud in medlem
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <InviteMemberForm />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Konto
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-600 mb-4">Inloggad som <strong>{user?.email}</strong></p>
            <Button
              variant="danger"
              onClick={handleSignOut}
              loading={signingOut}
              className="w-full"
            >
              Logga ut
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
