import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatPrice } from "../../lib/format";

const compactInr = (v) =>
  v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs shadow-lift">
      <p className="font-semibold text-ink-900">{row.tooltipLabel || label}</p>
      <p className="mt-0.5 text-brand-700">Revenue: {formatPrice(row.revenue)}</p>
      <p className="text-ink-500">
        {row.orders} order{row.orders === 1 ? "" : "s"}
      </p>
    </div>
  );
}

// rows: [{ label, revenue, orders, tooltipLabel? }]
export default function RevenueChart({ data, id = "rev" }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 260 }}>
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={`${id}Fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5f40ec" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#5f40ec" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eeeef2" vertical={false} />
        <XAxis dataKey="label" stroke="#9a9cae" fontSize={12} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis yAxisId="rev" stroke="#9a9cae" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compactInr} width={56} />
        <YAxis yAxisId="ord" orientation="right" stroke="#9a9cae" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f4f3ff" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#c9c2fb" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Area
          yAxisId="rev"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#5f40ec"
          strokeWidth={2.5}
          fill={`url(#${id}Fill)`}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
