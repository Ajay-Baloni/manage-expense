import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { authApi } from '../../api/auth'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.requestPasswordReset(email)
      setSent(true)
      toast.success('Reset link sent if email exists')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">📧</div>
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="text-muted-foreground text-sm">
          If an account with <strong>{email}</strong> exists, we sent a password reset link.
        </p>
        <Link to="/auth/login" className="text-primary hover:underline text-sm">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Forgot password</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your email to receive a reset link</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link to="/auth/login" className="text-primary hover:underline">Back to login</Link>
      </p>
    </div>
  )
}
