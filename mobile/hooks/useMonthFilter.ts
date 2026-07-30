import { useState, useEffect } from "react"
import { getMonthId } from "@/utils/format"

export function useMonthFilter() {
  const [months, setMonths] = useState<string[]>([getMonthId(new Date())])

  return { months, setMonths }
}
