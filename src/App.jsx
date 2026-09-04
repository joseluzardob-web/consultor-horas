import { useEffect, useState, useCallback } from "react";
import { api, getToken, clearToken } from "./api";
import Login from "./components/Login";
import RegistroTab from "./components/RegistroTab";
import ResumenTab from "./components/ResumenTab";
import DatosTab from "./components/DatosTab";
import PagosTab from "./components/PagosTab";
import ReportePagosTab from "./components/ReportePagosTab";

function Brand() {
  return (
    <div className="brand" aria-label="Besteam">
      <span className="brand-logo-frame"><img className="brand-logo" src="/Logo_BT.png" alt="BT Consulting" /></span>
    </div>
  );
}

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("registro");

  const [consultores, setConsultores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterError, setMasterError] = useState("");

  const loadSession = useCallback(async () => {
    if (!getToken()) { setProfile(null); setCheckingSession(false); return; }
    try {
      const me = await api.me();
      setProfile(me);
    } catch {
      clearToken();
      setProfile(null);
    }
    setCheckingSession(false);
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  const loadMasterData = useCallback(async () => {
    setMasterLoading(true);
    setMasterError("");
    try {
      const results = await Promise.allSettled([
        api.listConsultores(),
        api.listClientes(),
        api.listProyectos(),
      ]);
      const failed = results.find((result) => result.status === "rejected");
      if (failed) throw failed.reason;
      setConsultores(results[0].value || []);
      setClientes(results[1].value || []);
      setProyectos(results[2].value || []);
    } catch (err) {
      setMasterError(err.message || "No se pudieron cargar los datos maestros.");
    }
    setMasterLoading(false);
  }, []);

  useEffect(() => {
    if (profile && profile.role !== "pending") loadMasterData();
  }, [profile, loadMasterData]);

  const logout = () => { clearToken(); setProfile(null); setTab("registro"); };

  if (checkingSession) return <div className="loading-wrap">Cargando…</div>;
  if (!profile) return <Login onLoggedIn={loadSession} />;

  if (profile.role === "pending") {
    return (
      <div className="pending-wrap">
        <div className="pending-card">
          <Brand />
          <p className="eyebrow">Libro de horas</p>
          <h2 className="title" style={{ fontSize: 18 }}>Cuenta pendiente de aprobación</h2>
          <p className="hint">
            Tu cuenta ({profile.email}) todavía no fue vinculada a un consultor. Pedile a un
            administrador que la asigne desde la pestaña "Cuentas".
          </p>
          <button className="btn secondary" onClick={logout} style={{ marginTop: 12 }}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  if (profile.role === "consultor" && !profile.consultor_id) {
    return (
      <div className="pending-wrap">
        <div className="pending-card">
          <Brand />
          <p className="eyebrow">Libro de horas</p>
          <h2 className="title" style={{ fontSize: 18 }}>Falta vincular tu usuario</h2>
          <p className="hint">
            Tu cuenta tiene rol "consultor" pero todavía no está asociada a ningún consultor de la
            planilla. Pedile a un administrador que la vincule desde "Cuentas".
          </p>
          <button className="btn secondary" onClick={logout} style={{ marginTop: 12 }}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-row">
          <div>
            <Brand />
            <p className="eyebrow">Libro de horas · Consultoría</p>
            <h1 className="title">Registro de horas por consultor</h1>
            <p className="sub">Cargá horas, asignalas a cliente y proyecto, y mirá los totales del mes.</p>
          </div>
          <div className="session">
            <div>Sesión: <strong>{isAdmin ? "Administrador" : profile.nombre || profile.email}</strong></div>
            <button className="logout" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === "registro" ? "active" : ""}`} onClick={() => setTab("registro")}>{isAdmin ? "Registrar horas" : "Mis horas"}</button>
        <button className={`tab ${tab === "resumen" ? "active" : ""}`} onClick={() => setTab("resumen")}>{isAdmin ? "Resumen mensual" : "Mi resumen"}</button>
        {isAdmin && <button className={`tab ${tab === "datos" ? "active" : ""}`} onClick={() => setTab("datos")}>Consultores, clientes y proyectos</button>}
        {isAdmin && <button className={`tab ${tab === "pagos" ? "active" : ""}`} onClick={() => setTab("pagos")}>Pagos y pendientes</button>}
        {isAdmin && <button className={`tab ${tab === "reporte-pagos" ? "active" : ""}`} onClick={() => setTab("reporte-pagos")}>Reporte de pagos</button>}
      </nav>

      <main className="body">
        {masterLoading ? <div className="empty">Cargando datos…</div> : masterError ? (
          <div className="card">
            <p className="error-text">{masterError}</p>
            <button className="btn secondary" onClick={loadMasterData}>Reintentar</button>
          </div>
        ) : (
          <>
            {tab === "registro" && <RegistroTab profile={profile} consultores={consultores} clientes={clientes} proyectos={proyectos} onDataChanged={loadMasterData} />}
            {tab === "resumen" && <ResumenTab profile={profile} consultores={consultores} clientes={clientes} proyectos={proyectos} />}
            {tab === "datos" && isAdmin && <DatosTab consultores={consultores} clientes={clientes} proyectos={proyectos} onDataChanged={loadMasterData} />}
            {tab === "pagos" && isAdmin && <PagosTab consultores={consultores} />}
            {tab === "reporte-pagos" && isAdmin && <ReportePagosTab consultores={consultores} />}
          </>
        )}
      </main>
    </div>
  );
}
