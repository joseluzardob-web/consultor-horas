import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { fmtHoras, monthLabel, todayISO, colorFor } from "../utils/format";

export default function RegistroTab({ profile, consultores, clientes, proyectos, onDataChanged }) {
  const isAdmin = profile.role === "admin";
  const myConsultorId = profile.consultor_id;

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("todos");
  const [form, setForm] = useState({
    consultorId: isAdmin ? consultores[0]?.id || "" : myConsultorId || "",
    proyectoId: proyectos[0]?.id || "",
    fecha: todayISO(),
    horas: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadRegistros = async () => {
    setLoading(true);
    try {
      const data = await api.listRegistros();
      setRegistros(data || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadRegistros(); }, []);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      consultorId: isAdmin ? f.consultorId || consultores[0]?.id || "" : myConsultorId || "",
      proyectoId: f.proyectoId || proyectos[0]?.id || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultores, proyectos]);

  const clienteFor = (proyectoId) => {
    const p = proyectos.find((x) => x.id === proyectoId);
    if (!p) return null;
    return clientes.find((c) => c.id === p.cliente_id);
  };

  const canSubmit = form.consultorId && form.proyectoId && form.fecha && Number(form.horas) > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await api.createRegistro({
        consultor_id: isAdmin ? form.consultorId : undefined,
        proyecto_id: form.proyectoId,
        fecha: form.fecha,
        horas: Number(form.horas),
        descripcion: form.descripcion.trim() || null,
      });
      setForm((f) => ({ ...f, horas: "", descripcion: "" }));
      await loadRegistros();
      onDataChanged?.();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api.deleteRegistro(id);
      setRegistros((prev) => prev.filter((r) => r.id !== id));
      onDataChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const months = useMemo(() => {
    const s = new Set(registros.map((r) => r.fecha.slice(0, 7)));
    return Array.from(s).sort().reverse();
  }, [registros]);

  const visible = useMemo(() => {
    const list = monthFilter === "todos" ? registros : registros.filter((r) => r.fecha.slice(0, 7) === monthFilter);
    return [...list].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [registros, monthFilter]);

  if (consultores.length === 0 || proyectos.length === 0) {
    return (
      <div className="card">
        <h2>Todavía no hay consultores o proyectos cargados</h2>
        <p className="hint">Pedile a un administrador que los cree en "Datos maestros" antes de registrar horas.</p>
      </div>
    );
  }

  return (
    <>
      <form className="card" onSubmit={submit}>
        <h2>Nueva entrada</h2>
        <p className="hint">Una fila por día, consultor y proyecto trabajado.</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="consultor">Consultor</label>
            {isAdmin ? (
              <select id="consultor" value={form.consultorId} onChange={(e) => setForm({ ...form, consultorId: e.target.value })}>
                {consultores.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
              </select>
            ) : (
              <input value={consultores.find((c) => c.id === myConsultorId)?.nombre || ""} disabled />
            )}
          </div>
          <div className="field">
            <label htmlFor="proyecto">Proyecto</label>
            <select id="proyecto" value={form.proyectoId} onChange={(e) => setForm({ ...form, proyectoId: e.target.value })}>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {clientes.find((c) => c.id === p.cliente_id)?.nombre || "sin cliente"}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fecha">Fecha</label>
            <input id="fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="horas">Horas</label>
            <input id="horas" type="number" min="0" step="0.5" placeholder="0.0" value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="desc">Descripción (opcional)</label>
            <input id="desc" type="text" placeholder="Qué se hizo en esas horas" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" type="submit" disabled={!canSubmit || saving}>{saving ? "Guardando…" : "Agregar entrada"}</button>
        </div>
      </form>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2>Entradas cargadas</h2>
            <p className="hint">{visible.length} {visible.length === 1 ? "entrada" : "entradas"}</p>
          </div>
          <div className="field" style={{ minWidth: 180, marginBottom: 0 }}>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="todos">Todos los meses</option>
              {months.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty">Cargando entradas…</div>
        ) : visible.length === 0 ? (
          <div className="empty">No hay entradas para mostrar. Cargá la primera arriba.</div>
        ) : (
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Cliente</th><th>Proyecto</th>{isAdmin && <th>Consultor</th>}<th>Fecha</th><th className="num">Horas</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const cliente = clienteFor(r.proyecto_id);
                const proyecto = proyectos.find((p) => p.id === r.proyecto_id);
                const consultor = consultores.find((c) => c.id === r.consultor_id);
                const cIdx = clientes.findIndex((c) => c.id === cliente?.id);
                return (
                  <tr className="ledger-row" key={r.id}>
                    <td><span className="tab-mark" style={{ background: colorFor(cIdx >= 0 ? cIdx : 0) }} />{cliente?.nombre || "—"}</td>
                    <td>{proyecto?.nombre || "—"}{r.descripcion && <div className="list-sub">{r.descripcion}</div>}</td>
                    {isAdmin && <td>{consultor?.nombre || "—"}</td>}
                    <td className="mono">{r.fecha}</td>
                    <td className="num mono">{fmtHoras(r.horas)}</td>
                    <td><button className="btn-icon" onClick={() => remove(r.id)} aria-label="Eliminar entrada">✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
