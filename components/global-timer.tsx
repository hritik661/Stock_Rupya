"use client"

import { useRouter } from "next/navigation"
import { CountdownTimer } from "@/components/countdown-timer"
import { usePrediction } from "@/contexts/prediction-context"

export function GlobalTimer() {
  const { isTimerActive } = usePrediction()
  const router = useRouter()

  const handleTimerComplete = () => {
    router.push('/payments/prediction')
  }

  if (!isTimerActive) return null

  return (
    <CountdownTimer
      duration={10} // 10 seconds
      onComplete={handleTimerComplete}
    />
  )
}