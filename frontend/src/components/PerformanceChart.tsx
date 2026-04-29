import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

interface ChartDataPoint {
  x: number;
  isp_vac: number;
  c_star: number;
  cf: number;
  xLabel?: string;
}

interface Props {
  data: ChartDataPoint[];
  yKey: 'isp_vac' | 'c_star' | 'cf';
  xKey: 'of_ratio' | 'pressure';
  xLabel: string;
  yLabel: string;
  color: string;
  yFormat: (v: number) => string;
}

export default function PerformanceChart({ data, yKey, xLabel, yLabel, color, yFormat }: Props) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      const point = payload[0].payload as ChartDataPoint;
      return (
        <div className="tooltip">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 6, borderBottom: '1px solid var(--color-border-secondary)', paddingBottom: 4 }}>
            {xLabel}: {label}
          </div>
          <div style={{ color: 'var(--color-primary)', marginBottom: 2 }}>
            I<sub>sp</sub>(vac): {point.isp_vac.toFixed(1)} s
          </div>
          <div style={{ color: 'var(--color-success)', marginBottom: 2 }}>
            c*: {(point.c_star * 3.28084).toFixed(0)} ft/s
          </div>
          <div style={{ color: 'var(--color-indigo)' }}>
            Cf: {point.cf.toFixed(3)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" />
          <XAxis
            dataKey="x"
            stroke="var(--color-text-secondary)"
            fontSize={11}
            tick={{ fill: 'var(--color-text-secondary)' }}
          >
            <Label
              value={xLabel}
              offset={0}
              position="insideBottom"
              style={{ fill: 'var(--color-text-tertiary)', fontSize: 11, fontFamily: "'Fira Sans', sans-serif" }}
            />
          </XAxis>
          <YAxis
            stroke="var(--color-text-secondary)"
            fontSize={11}
            tick={{ fill: 'var(--color-text-secondary)' }}
            tickFormatter={yFormat}
            domain={['auto', 'auto']}
          >
            <Label
              value={yLabel}
              angle={-90}
              position="insideLeft"
              style={{ fill: 'var(--color-text-tertiary)', fontSize: 11, fontFamily: "'Fira Sans', sans-serif" }}
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
