import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { InviteMemberForm } from '@/components/household/InviteMemberForm'
import { HouseholdCategoriesSection } from '@/components/household/HouseholdCategoriesSection'
import { HouseholdSubcategoriesSection } from '@/components/household/HouseholdSubcategoriesSection'
import { HouseholdRecipeCategoriesSection } from '@/components/household/HouseholdRecipeCategoriesSection'
import { MicrosoftTodoSection } from '@/components/settings/MicrosoftTodoSection'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

export function SettingsPage() {
  const { user } = useAuth()
  const { data: members = [], isLoading } = useHouseholdMembers()
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [msftFlash, setMsftFlash] = useState<{ status: 'ok' | 'error'; reason?: string } | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const msft = params.get('msft')
    if (msft === 'ok' || msft === 'error') {
      return { status: msft, reason: params.get('reason') ?? undefined }
    }
    return null
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('msft') && !params.has('reason')) return
    params.delete('msft')
    params.delete('reason')
    const next = params.toString()
    navigate(next ? `${location.pathname}?${next}` : location.pathname, { replace: true })
  }, [location.search, location.pathname, navigate])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  return (
    <div>
      <PageHeader eyebrow="Mer" title="Inställningar" />
      <div className="px-[18px] pt-2 flex flex-col gap-6">

        <HouseholdCategoriesSection />

        <HouseholdSubcategoriesSection />

        <HouseholdRecipeCategoriesSection />

        <MicrosoftTodoSection
          flash={msftFlash}
          onDismissFlash={() => setMsftFlash(null)}
        />

        <section>
          <h2 className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em] mb-3 px-1.5">
            Hushållsmedlemmar
          </h2>
          <div className="bg-surface rounded-group shadow-card border border-hair overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : (
              <div className="divide-y divide-hair-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-[15px] text-ink">{member.email}</p>
                      {member.user_id === user?.id && (
                        <p className="text-[13px] text-ink-4">Du</p>
                      )}
                    </div>
                    <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
                      member.status === 'accepted'
                        ? 'bg-sage-tint text-sage'
                        : 'bg-clay-tint text-clay-deep'
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
          <h2 className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em] mb-3 px-1.5">
            Bjud in medlem
          </h2>
          <div className="bg-surface rounded-group shadow-card border border-hair p-4">
            <InviteMemberForm />
          </div>
        </section>

        <section>
          <h2 className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em] mb-3 px-1.5">
            Konto
          </h2>
          <div className="bg-surface rounded-group shadow-card border border-hair p-4">
            <p className="text-sm text-ink-2 mb-4">Inloggad som <strong className="text-ink">{user?.email}</strong></p>
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
