import { useState, type FormEvent } from 'react'
import { Header } from '@/components/layout/Header'
import { StoreCard } from '@/components/stores/StoreCard'
import { useStores, useAddStore } from '@/hooks/useStores'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function StoresPage() {
  const { data: stores = [], isLoading } = useStores()
  const addStore = useAddStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await addStore.mutateAsync(name)
      setName('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Det gick inte att lägga till butik')
    }
  }

  return (
    <div>
      <Header title="Butiker" action={{ label: '+ Lägg till butik', onClick: () => setOpen(true) }} />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : stores.length === 0 ? (
          <EmptyState
            icon="🏪"
            title="Inga butiker än"
            description="Lägg till en butik för att tilldela gångnummer och sortera din lista under handlingen."
            action={{ label: 'Lägg till din första butik', onClick: () => setOpen(true) }}
          />
        ) : (
          stores.map(store => <StoreCard key={store.id} store={store} />)
        )}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setError('') }} title="Lägg till butik">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input
            label="Butiksnamn"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="t.ex. ICA Maxi"
            required
            autoFocus
          />
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
              Avbryt
            </Button>
            <Button type="submit" loading={addStore.isPending} className="flex-1">
              Lägg till
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
