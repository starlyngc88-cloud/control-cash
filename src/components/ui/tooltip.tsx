import * as React from "react"

import { cn } from "@/lib/utils"

export function Tooltip({
  content,
  children,
  className,
  side = "bottom",
}: {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  side?: "top" | "bottom"
}) {
  return (
    <div className={cn("group/tooltip relative", className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 max-w-[260px] -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-center text-[10px] font-medium leading-tight text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        )}
      >
        {content}
      </div>
    </div>
  )
}
