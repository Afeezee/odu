"use client";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

const DEFAULT_SERIES: ChartSeries[] = [
  { key: "messages", label: "total", color: "#7A1F2E" },
  { key: "userMessages", label: "questions", color: "#D4A017" },
];

/**
 * Minimal SVG line chart used across the admin area for recent activity.
 * It keeps the bundle small while allowing multiple overlaid series.
 */
export function MessagesChart<T extends { day: string }>({
  data,
  title = "Activity",
  subtitle = "Messages, last 14 days",
  ariaLabel = subtitle,
  series = DEFAULT_SERIES,
  areaKey,
}: {
  data: T[];
  title?: string;
  subtitle?: string;
  ariaLabel?: string;
  series?: ChartSeries[];
  areaKey?: string;
}) {
  const W = 640;
  const H = 200;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;
  const iw = W - PAD_L - PAD_R;
  const ih = H - PAD_T - PAD_B;

  const n = Math.max(data.length, 1);
  const numericValue = (point: T, key: string) =>
    Number((point as Record<string, string | number | undefined>)[key] ?? 0);
  const maxY = Math.max(
    1,
    ...data.flatMap((point) => series.map((item) => numericValue(point, item.key))),
  );

  const x = (i: number) => PAD_L + (i / Math.max(n - 1, 1)) * iw;
  const y = (v: number) => PAD_T + ih - (v / maxY) * ih;

  const pathFor = (key: string) =>
    data
      .map((point, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(numericValue(point, key)).toFixed(1)}`)
      .join(" ");

  const areaFor = (key: string) => {
    if (data.length === 0) return "";
    return (
      `M ${x(0).toFixed(1)} ${(PAD_T + ih).toFixed(1)} ` +
      data.map((point, i) => `L ${x(i).toFixed(1)} ${y(numericValue(point, key)).toFixed(1)}`).join(" ") +
      ` L ${x(data.length - 1).toFixed(1)} ${(PAD_T + ih).toFixed(1)} Z`
    );
  };

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxY / yTicks) * i));
  const labelStep = data.length > 24 ? 4 : data.length > 12 ? 2 : 1;
  const primarySeries = series[0] ?? DEFAULT_SERIES[0];
  const filledKey = areaKey ?? primarySeries.key;
  const filledColor = series.find((item) => item.key === filledKey)?.color ?? primarySeries.color;

  return (
    <div className="rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-oui-muted">{title}</div>
          <div className="mt-1 font-serif text-xl">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-oui-muted">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[520px]" role="img" aria-label={ariaLabel}>
          {/* Y-axis grid + ticks */}
          {tickValues.map((v, i) => {
            const yy = y(v);
            return (
              <g key={i}>
                <line x1={PAD_L} x2={W - PAD_R} y1={yy} y2={yy} stroke="currentColor" opacity="0.08" />
                <text x={PAD_L - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">
                  {v}
                </text>
              </g>
            );
          })}

          <path d={areaFor(filledKey)} fill={filledColor} opacity="0.08" />

          {series.map((item) => (
            <path
              key={item.key}
              d={pathFor(item.key)}
              fill="none"
              stroke={item.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          ))}

          {data.map((point, i) => (
            <circle key={i} cx={x(i)} cy={y(numericValue(point, primarySeries.key))} r="2.5" fill={primarySeries.color}>
              <title>{`${point.day} — ${series.map((item) => `${numericValue(point, item.key)} ${item.label}`).join(", ")}`}</title>
            </circle>
          ))}

          {data.map((point, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null;
            const label = point.day.slice(5);
            return (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity="0.55"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
