import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { getDaysInYear, getDiffInDays, getStartOfDay, getStartOfYear } from '@/utils/date'

export function TimelineProgress() {
  const [currentYear, setCurrentYear] = useState(0)
  const [dayOfYear, setDayOfYear] = useState(0)
  const [percentOfYear, setPercentOfYear] = useState(0)
  const [percentOfToday, setPercentOfToday] = useState(0)

  const updateInfo = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())

    const pastDays = getDiffInDays(getStartOfYear(now), now)
    setDayOfYear(pastDays)
    setPercentOfYear((pastDays / getDaysInYear(now)) * 100)

    const pastTime = now.getTime() - getStartOfDay(now).getTime()
    setPercentOfToday((pastTime / 86400 / 1000) * 100)
  }

  useEffect(() => {
    updateInfo()
    const interval = setInterval(updateInfo, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 border-t border-primary pt-4">
      <div>
        <dt className="label">Day of year</dt>
        <dd className="mt-1 mono num text-xl">
          {currentYear} · <CountUp to={dayOfYear} decimals={0} />
        </dd>
      </div>
      <div>
        <dt className="label">Year elapsed</dt>
        <dd className="mt-1 mono num text-xl">
          <CountUp to={percentOfYear} decimals={2} />%
        </dd>
      </div>
      <div>
        <dt className="label">Today elapsed</dt>
        <dd className="mt-1 mono num text-xl">
          <CountUp to={percentOfToday} decimals={2} />%
        </dd>
      </div>
    </dl>
  )
}

function CountUp({
  to,
  decimals,
  duration = 1,
}: {
  to: number
  decimals: number
  duration?: number
}) {
  const node = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    if (!node.current) return

    const control = animate(prev.current, to, {
      duration,
      onUpdate: (value) => {
        node.current!.textContent = value.toFixed(decimals)
      },
    })
    prev.current = to

    return () => {
      control.stop()
    }
  }, [to, decimals, duration])

  return <span ref={node}></span>
}
