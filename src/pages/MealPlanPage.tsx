import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { RecipePickerModal } from '@/components/recipes/RecipePickerModal'
import { useRecipeImageUrl } from '@/hooks/useRecipes'
import {
  useMealPlanWeek,
  useUpsertMealPlanEntry,
  useUpdateMealPlanEntry,
  useDeleteMealPlanEntry,
  useGenerateShoppingList,
  type MealPlanDay,
  type MealPlanGenerateLine,
} from '@/hooks/useMealPlan'
import {
  addDays,
  isSameDay,
  isoWeekNumber,
  startOfWeek,
  WEEKDAY_NAMES_LONG_SV,
} from '@/lib/week'
import { Book, Cart, ChevronLeft, ChevronRight, Plus, Minus, Trash } from '@/lib/icons'
import { clsx } from 'clsx'

const MONTHS_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
]

export function MealPlanPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const { data: days = [], isLoading } = useMealPlanWeek(weekStart)
  const upsert = useUpsertMealPlanEntry()
  const update = useUpdateMealPlanEntry()
  const remove = useDeleteMealPlanEntry()
  const generate = useGenerateShoppingList()

  const [pickerForDate, setPickerForDate] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLines, setPreviewLines] = useState<MealPlanGenerateLine[]>([])
  const [committedAt, setCommittedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = useMemo(() => new Date(), [])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const weekNumber = useMemo(() => isoWeekNumber(weekStart), [weekStart])
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today))

  const plannedEntries = days.filter(d => d.entry).map(d => d.entry!)

  async function handlePickRecipe(recipeId: string) {
    if (!pickerForDate) return
    try {
      await upsert.mutateAsync({ recipeId, plannedDate: pickerForDate })
      setPickerForDate(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara i veckoplanen')
    }
  }

  async function openPreview() {
    setError(null)
    if (plannedEntries.length === 0) return
    try {
      const lines = await generate.preview.mutateAsync(plannedEntries.map(e => e.id))
      setPreviewLines(lines)
      setPreviewOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte beräkna listan')
    }
  }

  async function confirmGenerate() {
    try {
      await generate.commit.mutateAsync(previewLines)
      setPreviewOpen(false)
      setCommittedAt(Date.now())
      window.setTimeout(() => setCommittedAt(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte lägga till i listan')
    }
  }

  function formatRangeLabel() {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
    const startLabel = sameMonth
      ? weekStart.getDate().toString()
      : `${weekStart.getDate()} ${MONTHS_SV[weekStart.getMonth()].slice(0, 3)}`
    const endLabel = `${weekEnd.getDate()} ${MONTHS_SV[weekEnd.getMonth()].slice(0, 3)}`
    return `v. ${weekNumber} · ${startLabel}–${endLabel}`
  }

  return (
    <div>
      <PageHeader title="Veckoplan" />
      <div className="px-[18px] pt-2 flex flex-col gap-3">
        <div className="flex items-center justify-between bg-surface rounded-group shadow-card border border-hair px-2 py-2.5">
          <button
            type="button"
            onClick={() => setWeekStart(prev => addDays(prev, -7))}
            className="w-9 h-9 grid place-items-center rounded-full text-ink hover:bg-surface-2 flex-none"
            aria-label="Föregående vecka"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-serif text-[18px] font-medium text-ink whitespace-nowrap">{formatRangeLabel()}</p>
            {isCurrentWeek ? (
              <p className="text-[12px] font-medium text-clay-deep">Denna vecka</p>
            ) : (
              <button
                type="button"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="text-[12px] font-medium text-clay-deep hover:opacity-80"
              >
                Till denna vecka
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setWeekStart(prev => addDays(prev, 7))}
            className="w-9 h-9 grid place-items-center rounded-full text-ink hover:bg-surface-2 flex-none"
            aria-label="Nästa vecka"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {error && <p className="text-[13px] text-rose bg-rose-tint rounded-[12px] px-3 py-2">{error}</p>}

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
        ) : (
          <div className="flex flex-col gap-2.5 mt-1">
            {days.map((day, idx) => (
              <DayCard
                key={day.date}
                day={day}
                weekdayIndex={idx}
                isToday={isSameDay(new Date(day.date + 'T00:00'), today)}
                onAddRecipe={() => setPickerForDate(day.date)}
                onChangeStatus={status => {
                  if (day.entry) update.mutate({ id: day.entry.id, status })
                }}
                onChangeServings={value => {
                  if (day.entry) update.mutate({ id: day.entry.id, servingsOverride: value })
                }}
                onDelete={() => {
                  if (day.entry) remove.mutate(day.entry.id)
                }}
              />
            ))}
          </div>
        )}

        <div className="sticky bottom-[92px] mt-2">
          <Button
            type="button"
            variant="clay"
            size="lg"
            onClick={openPreview}
            loading={generate.preview.isPending}
            disabled={plannedEntries.length === 0}
            className="w-full"
          >
            {committedAt ? null : plannedEntries.length > 0 && <Cart size={19} />}
            {committedAt
              ? 'Tillagd i inköpslistan'
              : plannedEntries.length === 0
                ? 'Lägg till recept först'
                : `Generera inköpslista (${plannedEntries.length})`}
          </Button>
        </div>
      </div>

      <RecipePickerModal
        open={pickerForDate !== null}
        onClose={() => setPickerForDate(null)}
        onSelect={recipe => handlePickRecipe(recipe.id)}
        title={pickerForDate ? `Välj recept för ${formatDateLong(pickerForDate)}` : 'Välj recept'}
      />

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Lägg till ${previewLines.length} ingredienser`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-3">
            Dubbletter har slagits ihop och mängderna är skalade till antalet portioner du planerat.
          </p>
          <ul className="bg-surface-2 rounded-[14px] divide-y divide-hair max-h-[50vh] overflow-y-auto">
            {previewLines.map((line, i) => (
              <li key={`${line.name}-${i}`} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-ink truncate">{line.name}</span>
                {line.quantity && (
                  <span className="text-[13px] text-ink-3 whitespace-nowrap tabular-nums">{line.quantity}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setPreviewOpen(false)}>
              Avbryt
            </Button>
            <Button type="button" variant="clay" className="flex-1" onClick={confirmGenerate} loading={generate.commit.isPending}>
              Lägg till i listan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00')
  return `${WEEKDAY_NAMES_LONG_SV[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_SV[d.getMonth()].slice(0, 3)}`
}

interface DayCardProps {
  day: MealPlanDay
  weekdayIndex: number
  isToday: boolean
  onAddRecipe: () => void
  onChangeStatus: (status: 'planned' | 'cooked' | 'skipped') => void
  onChangeServings: (value: number | null) => void
  onDelete: () => void
}

function DayCard({
  day,
  weekdayIndex,
  isToday,
  onAddRecipe,
  onChangeStatus,
  onChangeServings,
  onDelete,
}: DayCardProps) {
  const navigate = useNavigate()
  const { data: imageUrl } = useRecipeImageUrl(day.entry?.recipe.image_path)
  const date = new Date(day.date + 'T00:00')
  const weekdayName = WEEKDAY_NAMES_LONG_SV[weekdayIndex]
  const dayNumber = date.getDate()
  const monthShort = MONTHS_SV[date.getMonth()].slice(0, 3)

  if (!day.entry) {
    return (
      <button
        type="button"
        onClick={onAddRecipe}
        className={clsx(
          'w-full flex items-center gap-3 p-2.5 rounded-[18px] border border-dashed transition-colors text-left',
          isToday ? 'border-clay-line bg-clay-tint' : 'border-hair hover:bg-surface-2',
        )}
      >
        <DateBubble weekdayName={weekdayName} dayNumber={dayNumber} monthShort={monthShort} isToday={isToday} />
        <span className="text-sm text-ink-3 flex-1 flex items-center gap-1.5">
          <Plus size={17} /> Lägg till recept
        </span>
      </button>
    )
  }

  const recipe = day.entry.recipe
  const servings = day.entry.servings_override ?? recipe.servings
  const status = day.entry.status

  return (
    <div
      className={clsx(
        'rounded-[18px] border bg-surface shadow-card flex flex-col',
        isToday ? 'border-clay-line' : 'border-hair',
        status === 'cooked' && 'opacity-80',
        status === 'skipped' && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3 p-2.5">
        <DateBubble weekdayName={weekdayName} dayNumber={dayNumber} monthShort={monthShort} isToday={isToday} />
        <button
          type="button"
          onClick={() => navigate(`/recipes/${recipe.id}`)}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-11 h-11 rounded-[12px] object-cover bg-surface-2 flex-none" />
          ) : (
            <div className="w-11 h-11 rounded-[12px] bg-surface-2 border border-hair grid place-items-center text-ink-3 flex-none">
              <Book size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className={clsx('font-serif text-[17px] font-medium tracking-[-0.01em] truncate', status === 'skipped' ? 'line-through text-ink-4' : 'text-ink')}>
              {recipe.name}
            </p>
            <p className="text-[12.5px] text-ink-3">
              {servings} portioner
              {recipe.category && <> · {recipe.category}</>}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Ta bort från veckoplan"
          className="w-9 h-9 grid place-items-center rounded-full text-ink-4 hover:text-rose hover:bg-rose-tint flex-none"
        >
          <Trash size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2.5 px-2.5 pb-2.5 flex-wrap">
        <div className="inline-flex items-center gap-0.5 rounded-[10px] bg-surface-2 border border-hair p-0.5">
          <button
            type="button"
            onClick={() => onChangeServings(Math.max(1, servings - 1))}
            className="px-2 py-1 text-ink-2 hover:text-ink"
            aria-label="Minska portioner"
          >
            <Minus size={14} />
          </button>
          <span className="px-1.5 text-[13px] font-medium text-ink min-w-[1.5rem] text-center tabular-nums">{servings}</span>
          <button
            type="button"
            onClick={() => onChangeServings(servings + 1)}
            className="px-2 py-1 text-ink-2 hover:text-ink"
            aria-label="Öka portioner"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="inline-flex rounded-[10px] bg-surface-2 border border-hair p-0.5 text-[11px] font-medium">
          {(['planned', 'cooked', 'skipped'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeStatus(s)}
              className={clsx(
                'px-2.5 py-1 rounded-[8px] transition-colors',
                status === s ? 'bg-surface text-ink shadow-[0_1px_2px_oklch(0.4_0.02_60/0.12)]' : 'text-ink-3 hover:text-ink-2',
              )}
            >
              {s === 'planned' ? 'Planerad' : s === 'cooked' ? 'Lagad' : 'Hoppade över'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DateBubble({
  weekdayName,
  dayNumber,
  monthShort,
  isToday,
}: {
  weekdayName: string
  dayNumber: number
  monthShort: string
  isToday: boolean
}) {
  return (
    <div
      className={clsx(
        'w-[52px] flex-none flex flex-col items-center justify-center rounded-[14px] py-2',
        isToday ? 'bg-clay text-white' : 'bg-surface-2 text-ink-2 border border-hair',
      )}
    >
      <span className="text-[10.5px] uppercase tracking-[0.08em] opacity-80">{weekdayName.slice(0, 3)}</span>
      <span className="font-serif text-[21px] font-medium leading-none my-0.5">{dayNumber}</span>
      <span className="text-[10px] opacity-75">{monthShort}</span>
    </div>
  )
}
