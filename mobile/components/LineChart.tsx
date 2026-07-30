import { View, Text } from "react-native"
import Svg, { Path, Line, Circle, G, Text as SvgText } from "react-native-svg"

type DataPoint = { label: string; value: number }
type Dataset = { label: string; data: DataPoint[]; color: string; fillColor?: string; dash?: number[] }

interface LineChartProps {
  datasets: Dataset[]
  width?: number
  height?: number
  showGrid?: boolean
}

export default function LineChart({
  datasets,
  width = 320,
  height = 180,
  showGrid = true,
}: LineChartProps) {
  if (datasets.length === 0 || datasets.every((d) => d.data.length === 0)) {
    return (
      <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#94a3b8" }}>Sin datos</Text>
      </View>
    )
  }

  const firstDataset = datasets.find((d) => d.data.length > 0)
  if (!firstDataset) return null

  const allValues = datasets.flatMap((ds) => ds.data.map((d) => d.value))
  const maxVal = Math.max(...allValues, 1)
  const minVal = Math.min(...allValues, 0)
  const range = maxVal - minVal || 1

  const padding = { top: 20, right: 16, bottom: 24, left: 16 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const labels = firstDataset.data.map((d) => d.label)
  const xStep = chartW / Math.max(labels.length - 1, 1)

  const yGridLines = [0.25, 0.5, 0.75].map((ratio) => ({
    y: padding.top + chartH * (1 - ratio),
    value: minVal + range * ratio,
  }))

  return (
    <Svg width={width} height={height}>
      {showGrid && yGridLines.map((g, i) => (
        <G key={i}>
          <Line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,4" />
        </G>
      ))}
      {datasets.map((ds) => {
        if (ds.data.length === 0) return null
        const points = ds.data.map((d, i) => ({
          x: padding.left + i * xStep,
          y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
        }))
        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
        const last = points[points.length - 1]
        const fillPath = ds.fillColor
          ? `${linePath} L${last.x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`
          : null
        return (
          <G key={ds.label}>
            {fillPath && <Path d={fillPath} fill={ds.fillColor} />}
            <Path d={linePath} stroke={ds.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={ds.dash?.join(",")} />
            {points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke={ds.color} strokeWidth={2} />
            ))}
          </G>
        )
      })}
      {labels.length > 1 && labels.map((label, i) =>
        i % Math.max(1, Math.floor(labels.length / 6)) === 0 && (
          <SvgText key={i} x={padding.left + i * xStep} y={height - 4} fill="#94a3b8" fontSize={8} textAnchor="middle">
            {label}
          </SvgText>
        )
      )}
      {/* Legend */}
      {datasets.length > 1 && (
        <G>
          {datasets.map((ds, i) => (
            <G key={ds.label}>
              <Line x1={width - 80} y1={8 + i * 16} x2={width - 68} y2={8 + i * 16} stroke={ds.color} strokeWidth={2} />
              <SvgText x={width - 64} y={12 + i * 16} fill="#64748b" fontSize={9}>{ds.label}</SvgText>
            </G>
          ))}
        </G>
      )}
    </Svg>
  )
}
