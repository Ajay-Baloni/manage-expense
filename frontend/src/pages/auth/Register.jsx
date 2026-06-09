import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useDispatch } from 'react-redux'
import { register } from '../../store/authSlice'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', password: '', password_confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await dispatch(register(form)).unwrap()
      toast.success('Account created!')
      navigate('/')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const f = (field) => ({ value: form[field], onChange: (e) => setForm((s) => ({ ...s, [field]: e.target.value })) })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create account</h2>
        <p className="text-muted-foreground text-sm mt-1">Start tracking your expenses today</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input placeholder="John" {...f('first_name')} />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input placeholder="Doe" {...f('last_name')} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" {...f('email')} required />
        </div>
        <div className="space-y-1">
          <Label>Password</Label>
          <Input type="password" placeholder="Min 8 characters" {...f('password')} required minLength={8} />
        </div>
        <div className="space-y-1">
          <Label>Confirm Password</Label>
          <Input type="password" placeholder="Repeat password" {...f('password_confirm')} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  )
}
