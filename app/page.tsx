'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Shield, LogIn, QrCode, Bell, Clock, CheckCircle, Menu, X, ArrowRight, MapPin, Users, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#3d3229] relative">
      <div className="fixed inset-0 z-0">
        <Image
          src="/illustrations/saba.png"
          alt="Sabang Dexterville Subdivision"
          fill
          className="object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#5c4d3c]/70 via-[#4a3f35]/50 to-[#3d3229]/90"></div>
      </div>
      <nav className="relative z-50 border-b border-[#d4c5b0]/20">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#d4c5b0]/20 backdrop-blur-md border border-[#e8dcc8]/30 rounded-xl flex items-center justify-center group-hover:bg-[#d4c5b0]/30 transition-all duration-300">
              <Shield className="w-5 h-5 text-[#f5e6d3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-[#f5e6d3] leading-none tracking-wide">GateGuard</span>
              <span className="text-[12px] text-[#d4c5b0] leading-tight mt-1 font-medium tracking-wider uppercase">Sabang Dexterville</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-5 py-2.5 text-[14px] text-[#e8dcc8] hover:text-[#f5e6d3] transition-colors rounded-full border border-[#d4c5b0]/30 hover:border-[#e8dcc8]/50 hover:bg-[#d4c5b0]/10"
            >
              Sign In
            </Link>
            <Link 
              href="/visit" 
              className="group relative px-6 py-3 bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] text-[14px] font-bold rounded-full hover:shadow-lg hover:shadow-[#c9a962]/30 transition-all duration-300 flex items-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
              <QrCode className="w-4 h-4 relative z-10" />
              <span className="relative z-10">I&apos;m Visiting</span>
            </Link>
          </div>

          <button 
            className="md:hidden p-2.5 text-[#f5e6d3] hover:bg-[#d4c5b0]/20 rounded-xl border border-[#d4c5b0]/30"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-[#4a3f35]/95 backdrop-blur-md border-t border-[#d4c5b0]/20 px-6 py-6 space-y-3">
            <Link 
              href="/login" 
              className="block py-3 text-[14px] text-[#e8dcc8] hover:text-[#f5e6d3] text-center rounded-xl border border-[#d4c5b0]/30"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link 
              href="/visit" 
              className="block py-3.5 bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] text-[14px] font-bold rounded-xl text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              Get Visitor QR Code
            </Link>
          </div>
        )}
      </nav>

      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d4c5b0]/15 backdrop-blur-md border border-[#e8dcc8]/30 rounded-full mb-10">
          <Sparkles className="w-4 h-4 text-[#c9a962]" />
          <span className="text-[13px] font-semibold text-[#e8dcc8] tracking-wide">Sabang Dexterville Subdivision</span>
        </div>

        <h1 className="text-[44px] md:text-[68px] font-light text-[#f5e6d3] leading-[1.05] tracking-tight mb-8 font-serif">
          Welcome to Your{' '}
          <span className="italic text-[#c9a962] font-normal">Secure</span>{' '}
          Community
        </h1>
        
        <p className="text-[18px] md:text-[20px] text-[#d4c5b0] leading-relaxed max-w-2xl mx-auto mb-12 font-light">
          Modern gate access management designed for elegant living. Quick QR entry, instant notifications, and complete visitor control.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/visit" 
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-[#c9a962] via-[#d4b978] to-[#c9a962] bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#3d3229] rounded-full font-bold text-[16px] transition-all duration-500 shadow-xl shadow-[#c9a962]/20 hover:shadow-[#c9a962]/40 overflow-hidden"
          >
            <QrCode className="w-5 h-5" />
            Get Visitor QR Code
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="group inline-flex items-center justify-center gap-3 px-10 py-4 bg-transparent text-[#f5e6d3] border-2 border-[#d4c5b0]/50 rounded-full font-medium text-[16px] hover:bg-[#d4c5b0]/10 hover:border-[#e8dcc8] transition-all duration-300"
          >
            <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Resident Sign In
          </Link>
        </div>
      </section>

      <section className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#c9a962] mb-3">How It Works</p>
            <h2 className="text-[32px] md:text-[42px] font-light text-[#f5e6d3] font-serif">Simple. Secure. Seamless.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Request Access',
                desc: 'Visitors fill out a quick form with their details and intended resident.',
                icon: <QrCode className="w-6 h-6" />
              },
              {
                step: '02',
                title: 'Instant Alert',
                desc: 'Homeowners receive real-time notifications via push, SMS, or email.',
                icon: <Bell className="w-6 h-6" />
              },
              {
                step: '03',
                title: 'Quick Entry',
                desc: 'One-tap approval generates a unique QR code for gate access.',
                icon: <CheckCircle className="w-6 h-6" />
              }
            ].map((item, index) => (
              <div key={index} className="group relative bg-[#d4c5b0]/8 backdrop-blur-md border border-[#e8dcc8]/15 rounded-3xl p-8 hover:bg-[#d4c5b0]/12 hover:border-[#e8dcc8]/30 transition-all duration-500">
                <div className="absolute top-6 right-6 text-[64px] font-serif text-[#c9a962]/10 group-hover:text-[#c9a962]/20 transition-colors leading-none">
                  {item.step}
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-[#c9a962]/30 to-[#d4b978]/20 rounded-2xl flex items-center justify-center text-[#c9a962] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-[#c9a962]/10">
                  {item.icon}
                </div>
                <h3 className="text-[22px] font-medium text-[#f5e6d3] mb-4 font-serif">{item.title}</h3>
                <p className="text-[15px] text-[#d4c5b0] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative bg-[#d4c5b0]/10 backdrop-blur-md border border-[#e8dcc8]/20 rounded-[2.5rem] p-12 md:p-16 overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#c9a962]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#d4b978]/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-[32px] md:text-[44px] font-light text-[#f5e6d3] mb-6 font-serif relative z-10">
              Ready to <span className="italic text-[#c9a962]">Visit?</span>
            </h2>
            <p className="text-[17px] text-[#d4c5b0] mb-10 leading-relaxed font-light relative z-10">
              Get your visitor QR code in under a minute. No account required for single visits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link 
                href="/visit" 
                className="group inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-[#c9a962] via-[#d4b978] to-[#c9a962] bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#3d3229] rounded-full font-bold text-[16px] transition-all duration-500 shadow-xl shadow-[#c9a962]/30 hover:shadow-[#c9a962]/50"
              >
                <QrCode className="w-5 h-5" />
                Get QR Code Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/register" 
                className="inline-flex items-center justify-center gap-3 px-10 py-4 bg-transparent text-[#f5e6d3] border-2 border-[#d4c5b0]/50 rounded-full font-medium text-[16px] hover:bg-[#d4c5b0]/10 hover:border-[#e8dcc8] transition-all duration-300"
              >
                Register as Resident
              </Link>
            </div>
          </div>
        </div>
      </section>
      <footer className="relative z-10 border-t border-[#d4c5b0]/20 bg-[#3d3229]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#d4c5b0]/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#d4c5b0]" />
            </div>
            <span className="text-[14px] text-[#d4c5b0] font-light">GateGuard for Sabang Dexterville</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] text-[#d4c5b0]/80">
            <Link href="#" className="hover:text-[#f5e6d3] transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-[#f5e6d3] transition-colors">Terms</Link>
            <Link href="#" className="hover:text-[#f5e6d3] transition-colors">Support</Link>
          </div>
          <p className="text-[12px] text-[#d4c5b0]/60 font-light">&copy; {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>
    </div>
  )
}