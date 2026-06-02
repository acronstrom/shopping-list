import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
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
    <div className="pb-16">
      <Header title="Veckoplan" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setWeekStart(prev => addDays(prev, -7))}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Föregående vecka"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{formatRangeLabel()}</p>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
            >
              Denna vecka
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWeekStart(prev => addDays(prev, 7))}
            className="p-2 -mr-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Nästa vecka"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
        ) : (
          <div className="flex flex-col gap-2">
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

        <div className="sticky bottom-4 mt-2">
          <Button
            type="button"
            onClick={openPreview}
            loading={generate.preview.isPending}
            disabled={plannedEntries.length === 0}
            className="w-full shadow-lg"
          >
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
          <p className="text-sm text-gray-500">
            Dubbletter har slagits ihop och mängderna är skalade till antalet portioner du planerat.
          </p>
          <ul className="bg-gray-50 rounded-xl divide-y divide-gray-200/70 max-h-[50vh] overflow-y-auto">
            {previewLines.map((line, i) => (
              <li key={`${line.name}-${i}`} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-900 truncate">{line.name}</span>
                {line.quantity && (
                  <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">{line.quantity}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setPreviewOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={confirmGenerate}
              loading={generate.commit.isPending}
            >
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
          'w-full flex items-center gap-4 p-4 rounded-2xl border border-dashed transition-colors text-left',
          isToday
            ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50'
            : 'border-gray-200 hover:bg-gray-50',
        )}
      >
        <DateBubble weekdayName={weekdayName} dayNumber={dayNumber} monthShort={monthShort} isToday={isToday} />
        <span className="text-sm text-gray-500 flex-1">+ Lägg till recept</span>
      </button>
    )
  }

  const recipe = day.entry.recipe
  const servings = day.entry.servings_override ?? recipe.servings
  const status = day.entry.status

  return (
    <div
      className={clsx(
        'rounded-2xl border bg-white shadow-sm flex flex-col',
        isToday ? 'border-emerald-200' : 'border-gray-100',
        status === 'cooked' && 'opacity-80',
        status === 'skipped' && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <DateBubble weekdayName={weekdayName} dayNumber={dayNumber} monthShort={monthShort} isToday={isToday} />
        <button
          type="button"
          onClick={() => navigate(`/recipes/${recipe.id}`)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          {imageUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <span className="text-base" aria-hidden>📖</span>
            </div>
          )}
          <div className="min-w-0">
            <p className={clsx('text-sm font-medium truncate', status === 'skipped' ? 'line-through text-gray-400' : 'text-gray-900')}>
              {recipe.name}
            </p>
            <p className="text-xs text-gray-500">
              {servings} portioner
              {recipe.category && <> · {recipe.category}</>}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Ta bort från veckoplan"
          className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 px-3 pb-3 flex-wrap">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => onChangeServings(Math.max(1, servings - 1))}
            className="px-2.5 text-gray-500 hover:bg-gray-50"
            aria-label="Minska portioner"
          >−</button>
          <span className="px-3 py-1.5 text-xs font-medium text-gray-900 min-w-[2rem] text-center">
            {servings}
          </span>
          <button
            type="button"
            onClick={() => onChangeServings(servings + 1)}
            className="px-2.5 text-gray-500 hover:bg-gray-50"
            aria-label="Öka portioner"
          >+</button>
        </div>

        <div className="inline-flex rounded-xl bg-gray-100 p-0.5 text-[11px] font-medium">
          {(['planned', 'cooked', 'skipped'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeStatus(s)}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition-colors',
                status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
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
        'w-14 flex-shrink-0 flex flex-col items-center justify-center rounded-xl py-1.5',
        isToday ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700',
      )}
    >
      <span className="text-[10px] uppercase tracking-wide">{weekdayName.slice(0, 3)}</span>
      <span className="text-lg font-semibold leading-none mt-0.5">{dayNumber}</span>
      <span className="text-[10px] opacity-80">{monthShort}</span>
    </div>
  )
}
