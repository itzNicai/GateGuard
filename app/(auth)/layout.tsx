import Image from 'next/image'
import Link from 'next/link'
import { Shield, QrCode } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#3d3229]">
      <header className="sticky top-0 z-20 shrink-0 bg-[#3d3229]/95 backdrop-blur-md border-b border-[#d4c5b0]/20">
        <div className="max-w-lg mx-auto flex h-20 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#d4c5b0]/20 backdrop-blur-md border border-[#e8dcc8]/30 rounded-xl flex items-center justify-center group-hover:bg-[#d4c5b0]/30 transition-all duration-300">
              <Shield className="w-5 h-5 text-[#f5e6d3]" />
            </div>
            <div className="flex flex-col">
              <p className="text-[15px] font-bold text-[#f5e6d3] leading-none tracking-wide">GateGuard</p>
              <p className="text-[11px] text-[#d4c5b0] leading-tight mt-1 font-medium tracking-wider uppercase">Sabang Dexterville</p>
            </div>
          </Link>
          <Link
            href="/visit"
            className="group relative px-5 py-2.5 bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] text-[13px] font-bold rounded-full hover:shadow-lg hover:shadow-[#c9a962]/30 transition-all duration-300 flex items-center gap-2 overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
            <QrCode className="w-4 h-4 relative z-10" />
            <span className="relative z-10">I&apos;m Visiting</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="w-full max-w-md mx-auto animate-fade-in">
          {children}
        </div>
      </main>

      <footer className="hidden lg:block shrink-0 border-t border-[#d4c5b0]/20 bg-[#3d3229]/80">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] text-[#d4c5b0]/60">
            &copy; {new Date().getFullYear()} GateGuard
          </p>
          <p className="text-[11px] text-[#d4c5b0]/60">
            Sabang Dexterville Subdivision
          </p>
        </div>
      </footer>
    </div>
  )
}