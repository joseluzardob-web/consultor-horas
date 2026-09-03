export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtHoras = (n) => {
  const r = Math.round((n || 0) * 100) / 100;
  return r % 1 === 0 ? String(r) : r.toFixed(2).replace(/0$/, "");
};

export const fmtMonto = (n) => "$" + Math.round(n || 0).toLocaleString("es-AR");

export const monthLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const PALETTE = ["#C97F2A", "#3F6650", "#5B6B79", "#8C4A3A", "#4A6B8A", "#8A6D3B"];
export const colorFor = (idx) => PALETTE[((idx % PALETTE.length) + PALETTE.length) % PALETTE.length];
