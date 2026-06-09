import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useDispatch } from 'react-redux'
import { register as registerAction } from '../../store/authSlice'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

const CURRENCIES = [
  { code: 'INR', label: '₹ Indian Rupee' },
  { code: 'USD', label: '$ US Dollar' },
  { code: 'EUR', label: '€ Euro' },
  { code: 'GBP', label: '£ British Pound' },
  { code: 'JPY', label: '¥ Japanese Yen' },
  { code: 'CAD', label: 'C$ Canadian Dollar' },
]

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const register = (data) => dispatch(registerAction(data)).unwrap()
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    currency: 'INR',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form)
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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Create account</h2>
        <p className="text-muted-foreground text-sm">Start tracking your finances today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">First Name</Label>
            <Input placeholder="John" {...f('first_name')} required className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Last Name</Label>
            <Input placeholder="Doe" {...f('last_name')} required className="h-9" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Email</Label>
          <Input type="email" placeholder="you@example.com" {...f('email')} required className="h-9" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Default Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm((s) => ({ ...s, currency: v }))}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Password</Label>
          <Input type="password" placeholder="Min 8 characters" {...f('password')} required minLength={8} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Confirm Password</Label>
          <Input type="password" placeholder="Repeat password" {...f('password_confirm')} required className="h-9" />
        </div>

        <Button type="submit" className="w-full h-9" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  )
}
