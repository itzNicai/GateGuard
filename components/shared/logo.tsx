import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: number
  showText?: boolean
  href?: string
}

export function Logo({ size = 36, showText = true, href = '/' }: LogoProps) {
  const content = (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="Sabang Dexterville Subdivision"
        width={size}
        height={size}
        className="flex-shrink-0"
      />
      {showText && (
        <div className="leading-tight">
          <p className="font-bold text-primary text-[13px] tracking-tight">GateGuard</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Sabang Dexterville
          </p>
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
