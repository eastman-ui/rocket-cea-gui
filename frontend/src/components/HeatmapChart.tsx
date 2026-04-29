interface DataPoint {
  of: number;
  pressure: number;
  isp_vac: number;
  c_star: number;
  cf: number;
}

interface Props {
  data: DataPoint[];
  valueKey: 'isp_vac' | 'c_star' | 'cf';
  xLabel: string;
  yLabel: string;
  valueLabel: string;
  colorScale: string[];
  onCellClick?: (of: number, pressure: number) => void;
  pressureUnit?: string;
}

export default function HeatmapChart({ data, valueKey, xLabel, yLabel, valueLabel, colorScale, onCellClick, pressureUnit = '' }: Props) {
  if (!data || data.length === 0) return null;

  const ofValues = [...new Set(data.map(d => d.of))].sort((a, b) => a - b);
  const pValues = [...new Set(data.map(d => d.pressure))].sort((a, b) => a - b);

  const values = data.map(d => d[valueKey]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Find max value location
  let maxOf = ofValues[0];
  let maxP = pValues[0];
  let maxVal = maxValue;

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    const index = Math.min(Math.floor(normalized * colorScale.length), colorScale.length - 1);
    return colorScale[index];
  };

  // Build lookup map for quick value access and find max
  const valueMap = new Map<string, number>();
  data.forEach(d => {
    const key = `${d.of.toFixed(2)}_${d.pressure.toFixed(1)}`;
    const val = d[valueKey];
    valueMap.set(key, val);
    if (val > maxVal) {
      maxVal = val;
      maxOf = d.of;
      maxP = d.pressure;
    }
  });

  // Reverse pressure for display (highest at top)
  const pValuesReversed = [...pValues].reverse();

  const cellWidth = 42;
  const cellHeight = 28;

  return (
    <div style={{ padding: '16px', overflowX: 'auto' }}>
      {/* Max value indicator */}
      <div style={{
        marginBottom: '16px',
        padding: '10px 14px',
        background: '#00E5B21a',
        border: '1px solid #00E5B240',
        borderRadius: 2,
        fontSize: 10,
        fontWeight: 600,
        color: '#00E5B2',
        fontFamily: "'Fira Code', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
      }}>
        MAX {valueLabel}: {maxVal.toFixed(2)} @ O/F {maxOf.toFixed(2)}, Pc {maxP.toFixed(0)} {yLabel.includes('Pressure') ? pressureUnit : ''}
      </div>

      <div style={{ display: 'flex' }}>
        {/* Y-axis labels */}
        <div style={{ display: 'flex', flexDirection: 'column', marginRight: '12px', minWidth: 50 }}>
          {pValuesReversed.map((p, i) => (
            <div key={i} style={{ height: cellHeight + 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 9, color: '#4a5560', paddingRight: 8, fontFamily: "'Fira Code', monospace" }}>
              {p.toFixed(0)}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {pValuesReversed.map((p, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', gap: '3px' }}>
                {ofValues.map((of, colIdx) => {
                  const key = `${of.toFixed(2)}_${p.toFixed(1)}`;
                  const value = valueMap.get(key);
                  const isMax = of === maxOf && p === maxP;
                  const isLight = value !== undefined && (value - minValue) / (maxValue - minValue || 1) > 0.5;
                  return (
                    <div
                      key={colIdx}
                      onClick={() => onCellClick?.(of, p)}
                      title={`O/F: ${of.toFixed(2)}, Pc: ${p.toFixed(0)}, ${valueLabel}: ${value?.toFixed(2) ?? 'N/A'}${isMax ? ' (MAX)' : ''}`}
                      style={{
                        width: cellWidth,
                        height: cellHeight,
                        background: value !== undefined ? getColor(value) : '#0a0e14',
                        border: isMax ? '2px solid #00E5B2' : '1px solid #1e2a38',
                        boxShadow: isMax ? '0 0 16px #00E5B240' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: isMax ? 700 : 500,
                        color: isLight ? '#fff' : '#e0e0e0',
                        cursor: onCellClick ? 'pointer' : 'default',
                        borderRadius: 2,
                        position: 'relative',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isMax) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.zIndex = '1'; e.currentTarget.style.boxShadow = '0 0 12px #00E5B240'; } }}
                      onMouseLeave={(e) => { if (!isMax) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '0'; e.currentTarget.style.boxShadow = 'none'; } }}
                    >
                      {value !== undefined ? value.toFixed(1) : '-'}
                      {isMax && <span style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, background: '#00E5B2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#000', fontWeight: 700 }}>★</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div style={{ display: 'flex', gap: '3px', marginTop: '10px', marginLeft: 2 }}>
            {ofValues.map((of, i) => (
              <div key={i} style={{ width: cellWidth, textAlign: 'center', fontSize: 9, color: '#4a5560', paddingTop: 4, fontFamily: "'Fira Code', monospace" }}>
                {of.toFixed(2)}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: 9, fontWeight: 600, color: '#8899a6', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {xLabel}
          </div>
        </div>
      </div>

      {/* Y-axis label */}
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: 9, fontWeight: 600, color: '#8899a6', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {yLabel}
      </div>

      {/* Color legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e2a38' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#4a5560', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase' }}>LOW</span>
        <div style={{ display: 'flex', height: 12, borderRadius: 2, overflow: 'hidden', flex: 1, maxWidth: 200 }}>
          {colorScale.map((color, i) => (
            <div key={i} style={{ width: 22, height: '100%', background: color }} />
          ))}
        </div>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#4a5560', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase' }}>HIGH</span>
      </div>
    </div>
  );
}
