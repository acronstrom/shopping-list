import { useState, type FormEvent } from 'react'
import { useInviteMember } from '@/hooks/useHousehold'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function InviteMemberForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const invite = useInviteMember()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    try {
      await invite.mutateAsync(email)
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="Invite by email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="family@example.com"
        required
      />
      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Invite sent! They'll see it when they sign in.
        </p>
      )}
      <Button type="submit" loading={invite.isPending}>
        Send invite
      </Button>
    </form>
  )
}
