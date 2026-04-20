const variants: Record<string, string> = {
  registered: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-secondary/10 text-secondary border-secondary/30',
  active: 'bg-accent/10 text-accent border-accent/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  approved: 'bg-accent/10 text-accent border-accent/30',
  denied: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${variants[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
