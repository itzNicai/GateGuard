export function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard'
    case 'guard':
      return '/guard/dashboard'
    case 'homeowner':
      return '/homeowner/dashboard'
    default:
      return '/login'
  }
}
