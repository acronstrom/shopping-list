import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { InviteMemberForm } from '@/components/household/InviteMemberForm'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

export function SettingsPage() {
  const { user } = useAuth()
  const { data: members = [], isLoading } = useHouseholdMembers()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  return (
    <div>
      <Header title="Settings" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-6">

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Household members
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
                        <p className="text-xs text-gray-400">You</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      member.status === 'accepted'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {member.status === 'accepted' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Invite member
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <InviteMemberForm />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">
            Account
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-600 mb-4">Signed in as <strong>{user?.email}</strong></p>
            <Button
              variant="danger"
              onClick={handleSignOut}
              loading={signingOut}
              className="w-full"
            >
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
