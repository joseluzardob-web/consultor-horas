import { useEffect, useState } from "react";
import { api } from "../api";
import { colorFor } from "../utils/format";

export default function DatosTab({ consultores, clientes, proyectos, onDataChanged }) {
  const [nuevoConsultor, setNuevoConsultor] = useState("");
  const [nuevaTarifa, setNuevaTarifa] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState("");
  const [nuevoProyecto, setNuevoProyecto] = useState("");
  const [proyectoClienteId, setProyectoClienteId] = useState(clientes[0]?.id || "");
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data = await api.listProfiles();
      setProfiles(data || []);
    } catch (err) { setError(err.message); }
    setLoadingProfiles(false);
  };

  useEffect(() => { loadProfiles(); }, []);
  useEffect(() => { if (!proyectoClienteId && clientes[0]) setProyectoClienteId(clientes[0].id); }, [clientes]);

  const wrap = async (fn) => {
    try { await fn(); onDataChanged?.(); }
    catch (err) { setError(err.message); }
  };

  const addConsultor = (e) => {
    e.preventDefault();
    const nombre = nuevoConsultor.trim();
    if (!nombre) return;
    wrap(async () => {
      await api.createConsultor(nombre, Number(nuevaTarifa) || 0);
      setNuevoConsultor(""); setNuevaTarifa("");
    });
  };
  const addCliente = (e) => {
    e.preventDefault();
    const nombre = nuevoCliente.trim();
    if (!nombre) return;
    wrap(async () => { await api.createCliente(nombre); setNuevoCliente(""); });
  };
  const addProyecto = (e) => {
    e.preventDefault();
    const nombre = nuevoProyecto.trim();
    if (!nombre || !proyectoClienteId) return;
    wrap(async () => { await api.createProyecto(nombre, proyectoClienteId); setNuevoProyecto(""); });
  };

  const updateConsultor = (id, nombre, tarifa_hora) => wrap(() => api.updateConsultor(id, nombre, tarifa_hora));
  const removeConsultor = (id) => wrap(() => api.deleteConsultor(id));
  const removeCliente = (id) => wrap(() => api.deleteCliente(id));
  const removeProyecto = (id) => wrap(() => api.deleteProyecto(id));

  const updateProfile = async (id, role, consultor_id) => {
    try { await api.updateProfile(id, role, consultor_id); loadProfiles(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="masters-grid">
      {error && (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <p className="error-text" style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="card">
        <h2>Consultores</h2>
        <p className="hint">Nombre y tarifa por hora. El acceso se vincula desde "Cuentas".</p>
        <form className="master-form" onSubmit={addConsultor}>
          <input type="text" placeholder="Nombre del consultor" value={nuevoConsultor} onChange={(e) => setNuevoConsultor(e.target.value)} />
          <input type="number" min="0" placeholder="Tarifa/h" value={nuevaTarifa} onChange={(e) => setNuevaTarifa(e.target.value)}
            />
          <button className="btn secondary" type="submit">Agregar</button>
        </form>
        {consultores.length === 0 ? <div className="empty">Sin consultores todavía.</div> : consultores.map((c) => (
          <div className="list-item" key={c.id}>
            <span>{c.nombre}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input className="mini-input" type="number" min="0" defaultValue={c.tarifa_hora ?? 0} title="Tarifa por hora"
                onBlur={(e) => updateConsultor(c.id, c.nombre, Number(e.target.value) || 0)} />
              <button className="btn-icon" onClick={() => removeConsultor(c.id)} aria-label="Eliminar consultor">✕</button>
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Clientes</h2>
        <p className="hint">Empresas facturadas por proyecto.</p>
        <form onSubmit={addCliente} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input type="text" placeholder="Nombre del cliente" value={nuevoCliente} onChange={(e) => setNuevoCliente(e.target.value)}
            style={{ flex: 1, padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13.5 }} />
          <button className="btn secondary" type="submit">Agregar</button>
        </form>
        {clientes.length === 0 ? <div className="empty">Sin clientes todavía.</div> : clientes.map((c, i) => (
          <div className="list-item" key={c.id}>
            <span><span className="chip" style={{ background: colorFor(i) + "22", color: colorFor(i), marginRight: 8 }}>●</span>{c.nombre}</span>
            <button className="btn-icon" onClick={() => removeCliente(c.id)} aria-label="Eliminar cliente">✕</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Proyectos</h2>
        <p className="hint">Cada proyecto pertenece a un cliente.</p>
        <form onSubmit={addProyecto} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <input type="text" placeholder="Nombre del proyecto" value={nuevoProyecto} onChange={(e) => setNuevoProyecto(e.target.value)}
            style={{ padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13.5 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={proyectoClienteId} onChange={(e) => setProyectoClienteId(e.target.value)}
              style={{ flex: 1, padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13.5 }} disabled={clientes.length === 0}>
              {clientes.length === 0 && <option>Creá un cliente primero</option>}
              {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
            </select>
            <button className="btn secondary" type="submit" disabled={clientes.length === 0}>Agregar</button>
          </div>
        </form>
        {proyectos.length === 0 ? <div className="empty">Sin proyectos todavía.</div> : proyectos.map((p) => (
          <div className="list-item" key={p.id}>
            <span>{p.nombre}<div className="list-sub">{clientes.find((c) => c.id === p.cliente_id)?.nombre || "sin cliente"}</div></span>
            <button className="btn-icon" onClick={() => removeProyecto(p.id)} aria-label="Eliminar proyecto">✕</button>
          </div>
        ))}
      </div>

      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h2>Cuentas</h2>
        <p className="hint">
          Vinculá cada usuario que se registró en la pantalla de login con un consultor, y asignale
          rol de administrador si corresponde. Las cuentas nuevas aparecen con rol "pending".
        </p>
        {loadingProfiles ? <div className="empty">Cargando cuentas…</div> : profiles.length === 0 ? (
          <div className="empty">Todavía no se registró ninguna cuenta.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Email</th><th>Rol</th><th>Consultor vinculado</th></tr></thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.email}</td>
                  <td>
                    <select className="mini-select" value={p.role} onChange={(e) => updateProfile(p.id, e.target.value, p.consultor_id)}>
                      <option value="pending">pending</option>
                      <option value="consultor">consultor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <select className="mini-select" value={p.consultor_id || ""} onChange={(e) => updateProfile(p.id, p.role, e.target.value)} disabled={p.role !== "consultor"}>
                      <option value="">— sin vincular —</option>
                      {consultores.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
