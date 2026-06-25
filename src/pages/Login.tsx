import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { InstallAppPrompt } from '@/components/shared/InstallAppPrompt'
import { APP_VERSION } from '@/lib/version'
import { useAuthStore } from '@/stores/authStore'
import { Button, Input } from '@/components/ui'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, loading } = useAuthStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn(email, password)
    if (result.error) toast.error(result.error)
    else if (result.redirect) {
      toast.success('Welcome back!')
      navigate(result.redirect)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative hidden w-[40%] flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ background: 'linear-gradient(180deg, #001996 0%, #000D4D 55%, #000000 100%)' }}
      >
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <BrandLogo size={32} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">Jmages Dbestline</h1>
              <p className="text-sm text-[#F0F2FA]">DOC Division</p>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Where Every Chick Counts
          </h2>
          <p className="mt-3 max-w-sm text-[#F0F2FA]">
            Total control over your hatchery operations — sales, accounts, and executive insights in one platform.
          </p>
        </div>
        <img
          src="/assets/hero-login.webp"
          alt="Nigerian poultry hatchery illustration"
          className="mx-auto w-full max-w-md animate-float object-contain"
        />
        <p className="text-xs text-[#10259C]">FlockDesk — Your Flock. Your Desk. Total Control.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-1 items-center justify-center bg-white px-4 py-6 pb-safe sm:p-6"
      >
        <div className="w-full max-w-md space-y-6">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex items-center gap-2">
              <BrandLogo size={32} />
              <span className="font-display text-xl font-bold text-[#000000]">FlockDesk</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-[#000000]">Sign in</h2>
          <p className="mt-1 text-sm text-[#001996]">Access your department dashboard</p>

          {params.get('timeout') && (
            <div className="mt-4 rounded-xl bg-[#F0F2FA] p-3 text-sm text-[#001996]" role="alert">
              Session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              focusColor="#001996"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              focusColor="#001996"
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#001996] to-[#FF052E] text-white shadow-md"
              loading={loading}
              loadingText="Signing in..."
            >
              Login
            </Button>
          </form>

          <div className="rounded-xl bg-[#F0F2FA] p-4 text-xs text-[#001996]">
            <p className="font-semibold text-[#000000]">Client logins:</p>
            <p className="mt-1">sales@jmages.ng · accounts@jmages.ng · md@jmages.ng · admin@jmages.ng</p>
            <p>Contact your administrator for credentials.</p>
          </div>

          <InstallAppPrompt />

          <p className="text-center text-xs text-[#10259C]">
            <Link to="/app" className="font-semibold text-[#001996] hover:underline">
              FlockDesk v{APP_VERSION} — versions &amp; install
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}