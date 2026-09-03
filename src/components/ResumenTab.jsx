import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api } from "../api";
import { fmtHoras, fmtMonto, monthLabel, todayISO, colorFor } from "../utils/format";
import { exportarExcel } from "../utils/excel";

export default function ResumenTab({ profile, consultores, clientes, proyectos }) {
  const isAdmin = profile.role === "admin";
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMonto, setShowMonto] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.listRegistros();
        setRegistros(data || []);
      } catch (e) { /* noop, se muestra vacío */ }
      setLoading(false);
    })();
  }, []);

  const scopedConsultores = isAdmin ? consultores : consultores.filter((c) => c.id === profile.consultor_id);

  const months = useMemo(() => {
    const s = new Set(registros.map((r) => r.fecha.slice(0, 7)));
    s.add(todayISO().slice(0, 7));
    return Array.from(s).sort().reverse();
  }, [registros]);

  const [month, setMonth] = useState(months[0]);
  useEffect(() => { if (!months.includes(month)) setMonth(months[0]); }, [months]); // eslint-disable-line

  const proyectoCliente = (proyectoId) => proyectos.find((p) => p.id === proyectoId)?.cliente_id;
  const filtered = useMemo(() => registros.filter((r) => r.fecha.slice(0, 7) === month), [registros, month]);

  const totalHoras = filtered.reduce((s, r) => s + Number(r.horas), 0);
  const clientesActivos = new Set(filtered.map((r) => proyectoCliente(r.proyecto_id)).filter(Boolean)).size;
  const consultoresActivos = new Set(filtered.map((r) => r.consultor_id)).size;

  const pivot = useMemo(() => {
    const grid = {};
    scopedConsultores.forEach((c) => { grid[c.id] = {}; clientes.forEach((cl) => (grid[c.id][cl.id] = 0)); });
    filtered.forEach((r) => {
      const clienteId = proyectoCliente(r.proyecto_id);
      if (!grid[r.consultor_id]) grid[r.consultor_id] = {};
      grid[r.consultor_id][clienteId] = (grid[r.consultor_id][clienteId] || 0) + Number(r.horas);
    });
    return grid;
  }, [filtered, scopedConsultores, clientes, proyectos]);

  const totalPorConsultor = (id) => clientes.reduce((s, cl) => s + (pivot[id]?.[cl.id] || 0), 0);
  const totalPorCliente = (id) => scopedConsultores.reduce((s, c) => s + (pivot[c.id]?.[id] || 0), 0);
  const montoTotal = scopedConsultores.reduce((s, c) => s + totalPorConsultor(c.id) * Number(c.tarifa_hora || 0), 0);

  const chartConsultores = scopedConsultores.map((c, i) => ({ name: c.nombre, horas: totalPorConsultor(c.id), idx: i })).filter((d) => d.horas > 0);
  const chartClientes = clientes.map((c, i) => ({ name: c.nombre, horas: totalPorCliente(c.id), idx: i })).filter((d) => d.horas > 0);

  const exportar = () => exportarExcel({ registros: filtered, consultores: scopedConsultores, clientes, proyectos, pivot, month });

  if (loading) return <div className="card"><div className="empty">Cargando resumen…</div></div>;

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2>Resumen de {monthLabel(month)}</h2>
            <p className="hint">Totales de horas trabajadas en el período seleccionado.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="field" style={{ minWidth: 200, marginBottom: 0 }}>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
              </select>
            </div>
            <button className="btn amber" onClick={exportar} disabled={filtered.length === 0}>⬇ Exportar a Excel</button>
          </div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="stat-label">Horas totales</div><div className="stat-value mono">{fmtHoras(totalHoras)}</div></div>
        {isAdmin && <div className="stat"><div className="stat-label">Consultores activos</div><div className="stat-value mono">{consultoresActivos}</div></div>}
        <div className="stat"><div className="stat-label">Clientes con horas</div><div className="stat-value mono">{clientesActivos}</div></div>
        <div className="stat"><div className="stat-label">Monto total</div><div className="stat-value mono">{fmtMonto(montoTotal)}</div></div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div>
            <h2 style={{ marginBottom: 0 }}>Horas por consultor y cliente</h2>
            <p className="hint" style={{ marginBottom: 0 }}>Cruce del mes: filas = consultores, columnas = clientes.</p>
          </div>
          <div className="toggle-group">
            <button className={!showMonto ? "active" : ""} onClick={() => setShowMonto(false)}>Horas</button>
            <button className={showMonto ? "active" : ""} onClick={() => setShowMonto(true)}>Monto $</button>
          </div>
        </div>
        {scopedConsultores.length === 0 || clientes.length === 0 ? (
          <div className="empty">No hay datos suficientes para mostrar la tabla.</div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table className="pivot mono">
              <thead>
                <tr>
                  <th style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Consultor</th>
                  {clientes.map((cl) => (<th key={cl.id}>{cl.nombre}</th>))}
                  <th className="total-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {scopedConsultores.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{c.nombre}</td>
                    {clientes.map((cl) => {
                      const v = pivot[c.id]?.[cl.id] || 0;
                      const shown = showMonto ? v * Number(c.tarifa_hora || 0) : v;
                      return <td key={cl.id}>{v > 0 ? (showMonto ? fmtMonto(shown) : fmtHoras(shown)) : "–"}</td>;
                    })}
                    <td className="total-col">{showMonto ? fmtMonto(totalPorConsultor(c.id) * Number(c.tarifa_hora || 0)) : fmtHoras(totalPorConsultor(c.id))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  {clientes.map((cl) => {
                    const horasCliente = totalPorCliente(cl.id);
                    const montoCliente = scopedConsultores.reduce((s, c) => s + (pivot[c.id]?.[cl.id] || 0) * Number(c.tarifa_hora || 0), 0);
                    return <td key={cl.id}>{showMonto ? fmtMonto(montoCliente) : fmtHoras(horasCliente)}</td>;
                  })}
                  <td className="total-col">{showMonto ? fmtMonto(montoTotal) : fmtHoras(totalHoras)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="charts">
        {isAdmin && (
          <div className="card">
            <h2>Horas por consultor</h2>
            <p className="hint">{monthLabel(month)}</p>
            {chartConsultores.length === 0 ? <div className="empty">Sin datos este mes.</div> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartConsultores} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid stroke="#E2DED2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#667080" }} axisLine={{ stroke: "#E2DED2" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#667080" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [fmtHoras(v), "Horas"]} />
                  <Bar dataKey="horas" radius={[4, 4, 0, 0]}>{chartConsultores.map((d, i) => (<Cell key={i} fill={colorFor(d.idx)} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
        <div className="card">
          <h2>Horas por cliente</h2>
          <p className="hint">{monthLabel(month)}</p>
          {chartClientes.length === 0 ? <div className="empty">Sin datos este mes.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartClientes} margin={{ left: -18, right: 8 }}>
                <CartesianGrid stroke="#E2DED2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#667080" }} axisLine={{ stroke: "#E2DED2" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#667080" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [fmtHoras(v), "Horas"]} />
                <Bar dataKey="horas" radius={[4, 4, 0, 0]}>{chartClientes.map((d, i) => (<Cell key={i} fill={colorFor(d.idx)} />))}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
