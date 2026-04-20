import Image from 'next/image'
import Link from 'next/link'
import { Shield, LogIn, QrCode, Bell } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="GateGuard" width={30} height={30} />
            <div>
              <p className="text-[13px] font-bold text-primary tracking-tight">GateGuard</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Sabang Dexterville</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/visit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <QrCode className="h-3.5 w-3.5" />
              I&apos;m Visiting
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-12 pb-8 lg:pt-20 lg:pb-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            {/* Left — text */}
            <div className="text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-medium mb-4">
                <Shield className="h-3 w-3" />
                Smart Subdivision Security
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Secure, fast, and
                <span className="text-primary"> convenient</span> gate access
              </h1>
              <p className="text-muted-foreground text-sm lg:text-base mt-3 lg:mt-4 max-w-md mx-auto lg:mx-0 leading-relaxed">
                GateGuard streamlines visitor management for Sabang Dexterville Subdivision. QR-based entry, real-time notifications, and instant homeowner approval.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-6 lg:mt-8 justify-center lg:justify-start">
                <Link
                  href="/visit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  <QrCode className="h-4 w-4" />
                  Get Visitor QR Code
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-card text-foreground ring-1 ring-foreground/[0.08] hover:bg-muted/50 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </div>
            </div>

            {/* Right — illustration */}
            <div className="hidden lg:flex justify-center mt-0">
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 rounded-full blur-3xl" />
                <Image
                  src="/illustrations/waiting.png"
                  alt="Gate security illustration"
                  width={420}
                  height={420}
                  className="relative object-contain"
                  priority
                />
              </div>
            </div>

            {/* Mobile illustration */}
            <div className="lg:hidden flex justify-center mt-8">
              <Image
                src="/illustrations/waiting.png"
                alt="Gate security illustration"
                width={240}
                height={240}
                className="object-contain opacity-90"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <div className="text-center mb-8 lg:mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">How It Works</p>
            <h2 className="text-xl lg:text-3xl font-bold text-foreground">Simple. Secure. Seamless.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {/* Step 1 */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-5 lg:p-6 text-center relative overflow-hidden group hover:shadow-card-hover transition-shadow">
              <div className="absolute top-3 right-3 text-[40px] font-bold text-primary/[0.06] leading-none">1</div>
              <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-sm lg:text-base font-semibold mb-1.5">Register & Get QR</h3>
              <p className="text-[12px] lg:text-sm text-muted-foreground leading-relaxed">
                Visitor fills in details and receives a unique QR code valid for 24 hours.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-5 lg:p-6 text-center relative overflow-hidden group hover:shadow-card-hover transition-shadow">
              <div className="absolute top-3 right-3 text-[40px] font-bold text-primary/[0.06] leading-none">2</div>
              <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="text-sm lg:text-base font-semibold mb-1.5">Guard Scans, Owner Notified</h3>
              <p className="text-[12px] lg:text-sm text-muted-foreground leading-relaxed">
                Guard scans the QR at the gate. Homeowner gets instant SMS and email notification.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-5 lg:p-6 text-center relative overflow-hidden group hover:shadow-card-hover transition-shadow">
              <div className="absolute top-3 right-3 text-[40px] font-bold text-primary/[0.06] leading-none">3</div>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-sm lg:text-base font-semibold mb-1.5">Approve & Enter</h3>
              <p className="text-[12px] lg:text-sm text-muted-foreground leading-relaxed">
                Homeowner approves or denies. Guard confirms entry. All activity is logged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-white relative overflow-hidden">
        <Image
          src="/illustrations/stat-visits.png"
          alt=""
          width={300}
          height={300}
          className="absolute right-0 bottom-0 opacity-10 object-contain hidden lg:block"
        />
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10 lg:py-14 relative z-10 text-center lg:text-left">
          <h2 className="text-lg lg:text-2xl font-bold">Ready to visit?</h2>
          <p className="text-white/70 text-sm mt-1.5">
            Get your visitor QR code in under a minute. No account needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 mt-5 justify-center lg:justify-start">
            <Link
              href="/visit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white text-primary hover:bg-white/90 transition-colors shadow-lg"
            >
              <QrCode className="h-4 w-4" />
              Get QR Code
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors ring-1 ring-white/20"
            >
              Register as Homeowner
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card/80">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} GateGuard. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Sabang Dexterville Subdivision
          </p>
        </div>
      </footer>
    </div>
  )
}
