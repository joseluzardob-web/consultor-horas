import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { fmtMonto } from "../utils/format";

export default function ReportePagosTab({ consultores }) {
  const [registros, setRegistros] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [hours, payments] = await Promise.all([api.listRegistros(), api.listPagos()]);
        setRegistros(hours || []);
        setPagos(payments || []);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    })();
  }, []);

  const resumen = useMemo(() => consultores.map((consultor) => {
    const totalTrabajado = registros
      .filter((registro) => registro.consultor_id === consultor.id)
      .reduce((total, registro) => total + Number(registro.horas || 0) * Number(consultor.tarifa_hora || 0), 0);
    const totalPagado = pagos
      .filter((pago) => pago.consultor_id === consultor.id)
      .reduce((total, pago) => total + Number(pago.monto || 0), 0);
    return { ...consultor, totalTrabajado, totalPagado, totalPendiente: totalTrabajado - totalPagado };
  }), [consultores, registros, pagos]);

  const totales = resumen.reduce((total, consultor) => ({
    trabajado: total.trabajado + consultor.totalTrabajado,
    pagado: total.pagado + consultor.totalPagado,
    pendiente: total.pendiente + consultor.totalPendiente,
  }), { trabajado: 0, pagado: 0, pendiente: 0 });

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2>Reporte de pagos por consultor</h2>
          <p className="hint">Comparativo acumulado entre lo trabajado, lo pagado y lo pendiente.</p>
        </div>
        <button className="btn secondary" onClick={() => window.location.reload()} disabled={loading}>Actualizar reporte</button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading ? <div className="empty">Cargando reporte…</div> : consultores.length === 0 ? <div className="empty">No hay consultores cargados.</div> : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr><th>Consultor</th><th className="num">Total trabajado</th><th className="num">Total pagado</th><th className="num">Total pendiente</th></tr>
            </thead>
            <tbody>
              {resumen.map((consultor) => (
                <tr key={consultor.id}>
                  <td>{consultor.nombre}</td>
                  <td className="num mono">{fmtMonto(consultor.totalTrabajado)}</td>
                  <td className="num mono">{fmtMonto(consultor.totalPagado)}</td>
                  <td className="num mono"><strong>{fmtMonto(consultor.totalPendiente)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total general</td>
                <td className="num mono">{fmtMonto(totales.trabajado)}</td>
                <td className="num mono">{fmtMonto(totales.pagado)}</td>
                <td className="num mono">{fmtMonto(totales.pendiente)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
