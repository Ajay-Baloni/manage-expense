import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, updateUser as updateUserAction } from '../../store/authSlice'
import { useTheme } from '../../context/ThemeContext'
import { authApi } from '../../api/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
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
const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
]

export default function Settings() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const updateUser = (data) => dispatch(updateUserAction(data))
  const { setTheme } = useTheme()

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    profile: {
      currency: user?.profile?.currency || 'INR',
      timezone: user?.profile?.timezone || 'Asia/Kolkata',
      theme: user?.profile?.theme || 'system',
    },
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
      toast.success('Profile saved')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setProfileLoading(false)
    }
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
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPwLoading(false)
    }
  }

  const setProfileField = (field, value) =>
    setProfileForm((f) => ({ ...f, [field]: value }))

  const setNestedField = (field, value) =>
    setProfileForm((f) => ({ ...f, profile: { ...f.profile, [field]: value } }))

  return (
    <div className="max-w-2xl space-y-5">
      {/* Profile */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
          <CardDescription className="text-sm">Update your personal details and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">First Name</Label>
                <Input
                  value={profileForm.first_name}
                  onChange={(e) => setProfileField('first_name', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Last Name</Label>
                <Input
                  value={profileForm.last_name}
                  onChange={(e) => setProfileField('last_name', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input value={user?.email} disabled className="h-9 opacity-50 cursor-not-allowed" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Currency</Label>
                <Select
                  value={profileForm.profile.currency}
                  onValueChange={(v) => setNestedField('currency', v)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-md">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Theme</Label>
                <Select
                  value={profileForm.profile.theme}
                  onValueChange={(v) => {
                    setNestedField('theme', v)
                    setTheme(v)
                  }}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-md">
                    {THEMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Timezone</Label>
              <Select
                value={profileForm.profile.timezone}
                onValueChange={(v) => setNestedField('timezone', v)}
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-md">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-1">
              <Button type="submit" disabled={profileLoading} className="h-9">
                {profileLoading ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
          <CardDescription className="text-sm">Use a strong, unique password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Current Password</Label>
              <Input
                type="password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">New Password</Label>
              <Input
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                required
                minLength={8}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Confirm New Password</Label>
              <Input
                type="password"
                value={pwForm.new_password_confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password_confirm: e.target.value }))}
                required
                className="h-9"
              />
            </div>
            <div className="pt-1">
              <Button type="submit" variant="outline" disabled={pwLoading} className="h-9">
                {pwLoading ? 'Changing…' : 'Change password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
