import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/[0.03] via-background to-background px-4">
      <Image src="/logo.png" alt="GateGuard" width={64} height={64} className="mb-4" />
      <h1 className="text-5xl font-bold text-primary mb-2">404</h1>
      <p className="text-muted-foreground text-sm mb-6">This page could not be found.</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}
