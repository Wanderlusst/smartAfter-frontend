"use client"

import * as React from "react"
import * as Recharts from "recharts"
import { cn } from "@/lib/utils"

type ChartConfig = {
  [key: string]: {
    label?: string
    color?: string
  }
}

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartProvider")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ className, config, children, ...props }, ref) => (
  <ChartContext.Provider value={{ config }}>
    <div ref={ref} className={cn("w-full h-full", className)} {...props}>
      {children}
    </div>
  </ChartContext.Provider>
))

ChartContainer.displayName = "ChartContainer"

const ChartTooltip = Recharts.Tooltip
const ChartLegend = Recharts.Legend

interface PayloadItem {
  dataKey?: string
  name?: string
  key?: string
  value?: any
  [key: string]: any
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: PayloadItem | null,
  key: string
) {
  if (!payload) return null
  const payloadKey = payload.dataKey || payload.name || payload.key || key
  return payloadKey ? config[payloadKey] : null
}

export {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  getPayloadConfigFromPayload,
  type ChartConfig,
  type PayloadItem,
}
