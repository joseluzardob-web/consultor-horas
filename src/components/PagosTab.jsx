import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { fmtMonto, todayISO } from "../utils/format";

export default function PagosTab({ consultores }) {
  const [registros, setRegistros] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [form, setForm] = useState({
    consultorId: consultores[0]?.id || "",
    fecha: todayISO(),
    monto: "",
    descripcion: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [hours, payments] = await Promise.all([api.listRegistros(), api.listPagos()]);
      setRegistros(hours || []);
      setPagos(payments || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    setForm((current) => ({ ...current, consultorId: current.consultorId || consultores[0]?.id || "" }));
  }, [consultores]);

  const resumen = useMemo(() => consultores.map((consultor) => {
    const trabajado = registros
      .filter((registro) => registro.consultor_id === consultor.id)
      .reduce((total, registro) => total + Number(registro.horas || 0) * Number(consultor.tarifa_hora || 0), 0);
    const pagado = pagos
      .filter((pago) => pago.consultor_id === consultor.id)
      .reduce((total, pago) => total + Number(pago.monto || 0), 0);
    return { ...consultor, trabajado, pagado, pendiente: trabajado - pagado };
  }), [consultores, registros, pagos]);

  const totalPendiente = resumen.reduce((total, consultor) => total + consultor.pendiente, 0);
  const canSubmit = form.consultorId && form.fecha && Number(form.monto) > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await api.createPago({
        consultor_id: form.consultorId,
        fecha: form.fecha,
        monto: Number(form.monto),
        descripcion: form.descripcion.trim() || null,
      });
      setForm((current) => ({ ...current, monto: "", descripcion: "" }));
      await loadData();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api.deletePago(id);
      setPagos((current) => current.filter((pago) => pago.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <form className="card" onSubmit={submit}>
        <h2>Registrar pago</h2>
        <p className="hint">Cargá cada pago realizado y el saldo se actualizará automáticamente.</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pago-consultor">Consultor</label>
            <select id="pago-consultor" value={form.consultorId} onChange={(event) => setForm({ ...form, consultorId: event.target.value })}>
              {consultores.map((consultor) => <option key={consultor.id} value={consultor.id}>{consultor.nombre}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pago-fecha">Fecha</label>
            <input id="pago-fecha" type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="pago-monto">Monto</label>
            <input id="pago-monto" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.monto} onChange={(event) => setForm({ ...form, monto: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="pago-descripcion">Descripción (opcional)</label>
            <input id="pago-descripcion" type="text" placeholder="Anticipo, liquidación..." value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} />
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" type="submit" disabled={!canSubmit || saving}>{saving ? "Guardando…" : "Registrar pago"}</button>
        </div>
      </form>

      <div className="stat-row">
        <div className="stat"><div className="stat-label">Pendiente total</div><div className="stat-value mono">{fmtMonto(totalPendiente)}</div></div>
        <div className="stat"><div className="stat-label">Pagos registrados</div><div className="stat-value mono">{pagos.length}</div></div>
      </div>

      <div className="card">
        <h2>Saldo pendiente por consultor</h2>
        <p className="hint">Horas acumuladas valorizadas a la tarifa actual, menos pagos registrados.</p>
        {loading ? <div className="empty">Cargando saldos…</div> : consultores.length === 0 ? <div className="empty">No hay consultores cargados.</div> : (
          <table className="table">
            <thead><tr><th>Consultor</th><th className="num">Trabajado</th><th className="num">Pagado</th><th className="num">Pendiente</th></tr></thead>
            <tbody>{resumen.map((consultor) => (
              <tr key={consultor.id}>
                <td>{consultor.nombre}</td>
                <td className="num mono">{fmtMonto(consultor.trabajado)}</td>
                <td className="num mono">{fmtMonto(consultor.pagado)}</td>
                <td className="num mono"><strong>{fmtMonto(consultor.pendiente)}</strong></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Pagos realizados</h2>
        {loading ? <div className="empty">Cargando pagos…</div> : pagos.length === 0 ? <div className="empty">Todavía no hay pagos registrados.</div> : (
          <table className="table">
            <thead><tr><th>Consultor</th><th>Fecha</th><th>Detalle</th><th className="num">Monto</th><th></th></tr></thead>
            <tbody>{[...pagos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).map((pago) => (
              <tr key={pago.id}>
                <td>{consultores.find((consultor) => consultor.id === pago.consultor_id)?.nombre || "—"}</td>
                <td className="mono">{pago.fecha}</td>
                <td>{pago.descripcion || "—"}</td>
                <td className="num mono">{fmtMonto(pago.monto)}</td>
                <td><button className="btn-icon" onClick={() => remove(pago.id)} aria-label="Eliminar pago">✕</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
