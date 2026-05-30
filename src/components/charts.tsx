"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// BUG-H12 — axis/label color must clear WCAG AA (4.5:1) in BOTH themes. The
// theme token `--muted-foreground` is contrast-checked for light and dark, so
// using it (instead of a hardcoded slate) keeps chart text readable on the
// dark report cards.
const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" } as const;
const GRID = "var(--border)";

/**
 * BUG-H11 — charts must expose a text alternative (WCAG 1.1.1). Wraps a chart
 * in a labelled figure and renders a visually-hidden data table so screen
 * reader and keyboard users get the same information sighted users see.
 */
function ChartFigure({
  label,
  table,
  children,
}: {
  label: string;
  table: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
}) {
  return (
    <figure role="group" aria-label={label} className="m-0">
      {/* `inert` removes the decorative chart (and Recharts' focusable wrapper)
          from both the a11y tree and tab order, avoiding aria-hidden-focus. */}
      <div inert>{children}</div>
      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

export function BurndownChart({
  data,
}: {
  data: { date: string; ideal: number; remaining: number }[];
}) {
  return (
    <ChartFigure
      label="Sprint burndown chart: ideal versus remaining work over time"
      table={{
        columns: ["Date", "Ideal", "Remaining"],
        rows: data.map((d) => [d.date, d.ideal, d.remaining]),
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="ideal"
            name="Ideal"
            stroke="#94a3b8"
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="remaining"
            name="Remaining"
            stroke="#4f46e5"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

export function VelocityChart({
  data,
}: {
  data: { sprint: string; committed: number; completed: number }[];
}) {
  return (
    <ChartFigure
      label="Velocity chart: committed versus completed points per sprint"
      table={{
        columns: ["Sprint", "Committed", "Completed"],
        rows: data.map((d) => [d.sprint, d.committed, d.completed]),
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="sprint" tick={AXIS} tickLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="committed" name="Committed" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" name="Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

export function SimpleBarChart({
  data,
  color = "#4f46e5",
  height = 240,
  label = "Bar chart",
}: {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  label?: string;
}) {
  return (
    <ChartFigure
      label={label}
      table={{ columns: ["Name", "Value"], rows: data.map((d) => [d.name, d.value]) }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

export function DonutChart({
  data,
  height = 240,
  label = "Distribution chart",
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  label?: string;
}) {
  return (
    <ChartFigure
      label={label}
      table={{ columns: ["Name", "Value"], rows: data.map((d) => [d.name, d.value]) }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

export function TrendAreaChart({
  data,
  dataKey,
  color = "#4f46e5",
  height = 240,
  label = "Trend chart",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  color?: string;
  height?: number;
  label?: string;
}) {
  return (
    <ChartFigure
      label={label}
      table={{
        columns: ["Name", dataKey],
        rows: data.map((d) => [String(d.name ?? ""), d[dataKey] ?? ""]),
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
