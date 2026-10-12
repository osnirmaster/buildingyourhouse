// Paleta categórica validada (ordem fixa) e tokens de texto/grade para os gráficos.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
export const INK = { primary: '#0b0b0b', secondary: '#52514e', grid: '#e4e3df' };
export const axisProps = {
  tick: { fill: INK.secondary, fontSize: 12 },
  axisLine: { stroke: INK.grid },
  tickLine: false,
} as const;
