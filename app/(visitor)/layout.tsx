import Image from 'next/image'
import Link from 'next/link'
import { QrCode } from 'lucide-react'

export default function VisitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <header className="sticky top-0 z-20 bg-[#3a3228]/95 backdrop-blur-md border-b border-white/10 relative">
        <div className="max-w-lg mx-auto flex h-14 items-center justify-between px-4 relative">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg border border-white/30 bg-transparent flex items-center justify-center">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-4 h-4 text-white/80"
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-white tracking-tight">GateGuard</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Sabang Dexterville</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[12px] font-medium px-4 py-2 rounded-full border border-white/30 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/visitor"
              className="flex items-center gap-2 text-[12px] font-medium px-4 py-2 rounded-full bg-[#c9a96e] text-[#3a3228] hover:bg-[#d4b87a] transition-all duration-200"
            >
              <QrCode className="w-3.5 h-3.5" />
              I'm Visiting
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 relative">
        <div className="max-w-lg mx-auto relative">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30 rounded-2xl blur-lg opacity-40 group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-md opacity-20 group-hover:opacity-50 transition duration-500" />
            
            <div className="absolute -inset-[2px] bg-gradient-to-r from-primary/0 via-primary/80 to-primary/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]" />
            
            <div className="relative bg-card/95 backdrop-blur-sm rounded-xl border-2 border-primary/20 shadow-[0_0_40px_rgba(var(--primary),0.15)] overflow-hidden group-hover:border-primary/40 group-hover:shadow-[0_0_60px_rgba(var(--primary),0.25)] transition-all duration-500">

              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 blur-sm" />
              
              <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" />
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
              
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-transparent via-primary/30 to-transparent blur-sm" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-transparent via-primary/30 to-transparent blur-sm" />
              
              <div className="p-6 animate-fade-in relative">
                {children}
              </div>
              
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-4 bg-primary/20 blur-xl" />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 bg-card/80 backdrop-blur-sm relative mt-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-70" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between relative">
          <p className="text-[11px] text-muted-foreground/60 hover:text-primary hover:drop-shadow-[0_0_5px_rgba(var(--primary),0.6)] transition-all duration-300 cursor-default">
            &copy; {new Date().getFullYear()} GateGuard
          </p>
          <p className="text-[11px] text-muted-foreground/60 hover:text-primary hover:drop-shadow-[0_0_5px_rgba(var(--primary),0.6)] transition-all duration-300 cursor-default">
            Sabang Dexterville Subdivision
          </p>
        </div>
      </footer>
    </div>
  )
}