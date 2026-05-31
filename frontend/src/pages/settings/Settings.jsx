import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../context/ThemeContext'
import { authApi } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD']
const THEMES = ['light', 'dark', 'system']
const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo']

export default function Settings() {
  const { user, updateUser } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    profile: {
      currency: user?.profile?.currency || 'USD',
      timezone: user?.profile?.timezone || 'UTC',
      theme: user?.profile?.theme || 'system',
    }
  })

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password_confirm: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const res = await authApi.updateProfile(profileForm)
      updateUser(res.data)
      setTheme(profileForm.profile.theme)
      toast.success('Profile updated')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setProfileLoading(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      toast.error('New passwords do not match')
      return
    }
    setPwLoading(true)
    try {
      await authApi.changePassword(pwForm)
      toast.success('Password changed')
      setPwForm({ current_password: '', new_password: '', new_password_confirm: '' })
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setPwLoading(false) }
  }

  const pf = (field) => ({
    value: profileForm[field],
    onChange: (e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }))
  })

  const pfProfile = (field) => ({
    value: profileForm.profile[field],
    onChange: (v) => setProfileForm((f) => ({ ...f, profile: { ...f.profile, [field]: v } }))
  })

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input {...pf('first_name')} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input {...pf('last_name')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user?.email} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select {...pfProfile('currency')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Theme</Label>
                <Select value={profileForm.profile.theme} onValueChange={(v) => setProfileForm((f) => ({ ...f, profile: { ...f.profile, theme: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Timezone</Label>
              <Select value={profileForm.profile.timezone} onValueChange={(v) => setProfileForm((f) => ({ ...f, profile: { ...f.profile, timezone: v } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1">
              <Label>Current Password</Label>
              <Input type="password" value={pwForm.current_password} onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} required minLength={8} />
            </div>
            <div className="space-y-1">
              <Label>Confirm New Password</Label>
              <Input type="password" value={pwForm.new_password_confirm} onChange={(e) => setPwForm((f) => ({ ...f, new_password_confirm: e.target.value }))} required />
            </div>
            <Button type="submit" variant="outline" disabled={pwLoading}>
              {pwLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
