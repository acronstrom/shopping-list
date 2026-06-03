import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Link } from '@/lib/icons'
import {
  useDisconnectMsftTodo,
  useMsftTodoConnection,
  useMsftTodoLists,
  useSetMsftTodoList,
  useStartMsftTodoConnect,
  useSyncMsftTodo,
} from '@/hooks/useMsftTodo'

interface Props {
  flash?: { status: 'ok' | 'error'; reason?: string } | null
  onDismissFlash?: () => void
}

export function MicrosoftTodoSection({ flash, onDismissFlash }: Props) {
  const { data: connection, isLoading } = useMsftTodoConnection()
  const start = useStartMsftTodoConnect()
  const lists = useMsftTodoLists(!!connection && !connection.list_id)
  const setList = useSetMsftTodoList()
  const sync = useSyncMsftTodo()
  const disconnect = useDisconnectMsftTodo()

  const [pendingList, setPendingList] = useState<string>('')
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setError(null)
    try {
      await start.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte starta anslutning')
    }
  }

  async function handleSaveList() {
    setError(null)
    const choice = lists.data?.find(l => l.id === pendingList)
    if (!choice) return
    try {
      await setList.mutateAsync({ listId: choice.id, listName: choice.displayName })
      setPendingList('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara listan')
    }
  }

  async function handleSync() {
    setError(null)
    setSyncFeedback(null)
    try {
      const result = await sync.mutateAsync()
      if (result.error) {
        setError(result.error)
        return
      }
      setSyncFeedback(
        result.added === 0
          ? 'Inget nytt att hämta.'
          : `${result.added} ${result.added === 1 ? 'ny vara' : 'nya varor'} tillagda.`,
      )
      window.setTimeout(() => setSyncFeedback(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synk misslyckades')
    }
  }

  async function handleDisconnect() {
    if (!confirm('Koppla loss Microsoft To Do? Du kan ansluta igen när som helst.')) return
    setError(null)
    try {
      await disconnect.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte koppla loss')
    }
  }

  return (
    <section>
      <h2 className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em] mb-3 px-1.5">
        Microsoft To Do
      </h2>
      <div className="bg-surface rounded-group shadow-card border border-hair p-4 flex flex-col gap-3">
        {flash && (
          <div
            className={`text-xs rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${
              flash.status === 'ok'
                ? 'bg-sage-tint text-sage'
                : 'bg-rose-tint text-rose'
            }`}
          >
            <span>
              {flash.status === 'ok'
                ? 'Microsoft-kontot är anslutet.'
                : `Anslutning misslyckades${flash.reason ? `: ${flash.reason}` : ''}.`}
            </span>
            {onDismissFlash && (
              <button
                type="button"
                onClick={onDismissFlash}
                className="text-current opacity-60 hover:opacity-100"
                aria-label="Stäng"
              >
                ×
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner className="h-5 w-5" /></div>
        ) : !connection ? (
          <>
            <p className="text-sm text-ink-2">
              Anslut din Microsoft-konto för att synka uppgifter från en MS To Do-lista
              till hushållets inköpslista. Nya uppgifter får kategori automatiskt.
            </p>
            <Button
              type="button"
              onClick={handleConnect}
              loading={start.isPending}
            >
              <Link size={17} />
              Anslut Microsoft-konto
            </Button>
          </>
        ) : !connection.list_id ? (
          <>
            <p className="text-xs text-ink-3">Ansluten som <strong>{connection.connected_email}</strong>.</p>
            <p className="text-sm text-ink-2">Välj vilken lista som ska synkas.</p>
            {lists.isLoading ? (
              <div className="flex justify-center py-3"><Spinner className="h-4 w-4" /></div>
            ) : lists.error ? (
              <p className="text-xs text-rose bg-rose-tint rounded-[12px] px-2.5 py-1.5">
                Kunde inte hämta listor. {lists.error instanceof Error ? lists.error.message : ''}
              </p>
            ) : (
              <select
                value={pendingList}
                onChange={e => setPendingList(e.target.value)}
                className="rounded-[12px] border border-hair bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line"
              >
                <option value="">— Välj lista —</option>
                {lists.data?.map(l => (
                  <option key={l.id} value={l.id}>{l.displayName}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSaveList}
                loading={setList.isPending}
                disabled={!pendingList}
                className="flex-1"
              >
                Spara
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDisconnect}
                loading={disconnect.isPending}
              >
                Koppla loss
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-ink">{connection.list_name}</p>
              <p className="text-xs text-ink-3">
                Ansluten som {connection.connected_email}.
                {connection.last_synced_at && (
                  <> Senast synkad {formatRelative(connection.last_synced_at)}.</>
                )}
              </p>
            </div>
            {connection.last_sync_error && (
              <p className="text-xs text-rose bg-rose-tint rounded-[12px] px-2.5 py-1.5">
                {connection.last_sync_error}
              </p>
            )}
            {syncFeedback && (
              <p className="text-xs text-sage bg-sage-tint rounded-[12px] px-2.5 py-1.5">
                {syncFeedback}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                onClick={handleSync}
                loading={sync.isPending}
                className="flex-1"
              >
                Synka nu
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDisconnect}
                loading={disconnect.isPending}
              >
                Koppla loss
              </Button>
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-rose bg-rose-tint rounded-[12px] px-2.5 py-1.5">{error}</p>
        )}
      </div>
    </section>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 60_000) return 'just nu'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min sedan`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h sedan`
  const days = Math.floor(hours / 24)
  return `${days} d sedan`
}
