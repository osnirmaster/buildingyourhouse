// Paleta categórica validada (ordem fixa; slot 1 = blurple) e tokens de texto/grade para os gráficos.
export const SERIES = ['#635bff', '#eb6834', '#1baf7a', '#eda100'];
export const INK = { primary: '#0a2540', secondary: '#697386', grid: '#e3e8ee' };
export const axisProps = {
  tick: { fill: INK.secondary, fontSize: 12 },
  axisLine: { stroke: INK.grid },
  tickLine: false,
} as const;
