import { Link } from 'react-router'
import { ArrowLeft, Download, ExternalLink, CheckCircle2 } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { InstallAppPrompt } from '@/components/shared/InstallAppPrompt'
import { APP_NAME, APP_TAGLINE, APP_URL, APP_RELEASES, APP_VERSION } from '@/lib/version'

export function AppDownloadPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#F0F2FA] to-white pb-safe">
      <header className="border-b border-[#D6DBEF] bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size={36} />
            <div>
              <h1 className="font-display text-lg font-bold text-[#000000]">{APP_NAME}</h1>
              <p className="text-xs text-[#10259C]">{APP_TAGLINE}</p>
            </div>
          </div>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-[#001996] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-[#D6DBEF] bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-[#FF052E]">Current release</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#000000]">Version {APP_VERSION}</h2>
          <p className="mt-1 text-sm text-[#10259C]">Live at <a href={APP_URL} className="font-semibold text-[#001996] hover:underline">{APP_URL}</a></p>
          <div className="mt-4">
            <InstallAppPrompt />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-lg font-bold text-[#000000]">App versions</h3>
          {APP_RELEASES.map((release) => (
            <article
              key={release.version}
              className={`rounded-2xl border p-5 shadow-sm ${
                release.current ? 'border-[#001996] bg-gradient-to-br from-[#F0F2FA] to-white' : 'border-[#D6DBEF] bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-base font-bold text-[#000000]">v{release.version}</h4>
                    {release.current && (
                      <span className="rounded-full bg-[#001996] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#001996]">{release.codename}</p>
                  <p className="mt-0.5 text-xs text-[#10259C]">Released {release.released}</p>
                </div>
                <a
                  href={release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#001996] px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  Open / Install
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </div>
              <ul className="mt-4 space-y-1.5">
                {release.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#000000]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#001996]" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[#D6DBEF] bg-white p-5 text-sm text-[#10259C]">
          <h3 className="font-display font-bold text-[#000000]">Install on your phone</h3>
          <ul className="mt-3 list-inside list-disc space-y-2">
            <li><strong>Android (Chrome):</strong> Tap Install App above, or Menu → Install app / Add to Home screen.</li>
            <li><strong>iPhone (Safari):</strong> Tap Share → Add to Home Screen.</li>
            <li><strong>Desktop:</strong> Use the install icon in your browser address bar, or bookmark {APP_URL}.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}