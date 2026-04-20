import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="max-w-lg mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="GateGuard" width={28} height={28} />
            <div>
              <p className="text-[13px] font-bold text-primary tracking-tight">GateGuard</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Sabang Dexterville</p>
            </div>
          </Link>
          <Link
            href="/visit"
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            I&apos;m Visiting
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="w-full max-w-md mx-auto animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer — desktop only */}
      <footer className="hidden lg:block shrink-0 border-t border-border/60 bg-card/80">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} GateGuard
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Sabang Dexterville Subdivision
          </p>
        </div>
      </footer>
    </div>
  )
}
