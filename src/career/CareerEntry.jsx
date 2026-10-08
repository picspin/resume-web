import { Briefcase } from 'lucide-react'

export default function CareerEntry() {
  return (
    <a
      href="/career"
      className="btn-secondary inline-flex items-center gap-1"
      title="Open local Career Console"
    >
      <Briefcase className="h-4 w-4" />
      Career Console
    </a>
  )
}
