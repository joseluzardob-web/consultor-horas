import { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      if (mode === "signin") {
        const data = await api.login(email, password);
		console.log("RESPUESTA LOGIN:", data);
        setToken(data.token);
        console.log("LOGIN OK - TOKEN GUARDADO");
        onLoggedIn();
      } else {
        await api.signup(email, password);
        setInfo("Cuenta creada. Un administrador debe activarla desde \"Cuentas\" antes de que puedas cargar horas.");
        setMode("signin");
      }
    } catch (err) {
      setError(err.message || "Ocurrió un error.");
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <p className="eyebrow">Libro de horas</p>
        <h1 className="title" style={{ fontSize: 20, marginBottom: 18 }}>
          {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>

        <div className="login-tabs">
          <button className={`login-tab ${mode === "signin" ? "active" : ""}`} onClick={() => { setMode("signin"); setError(""); setInfo(""); }}>Ingresar</button>
          <button className={`login-tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); setInfo(""); }}>Crear cuenta</button>
        </div>

        <form onSubmit={submit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@empresa.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn" type="submit" style={{ width: "100%", marginTop: 16 }} disabled={loading}>
            {loading ? "Un momento…" : mode === "signin" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {info && <p className="hint" style={{ marginTop: 12 }}>{info}</p>}

        <p className="login-hint">
          Primer uso: creá tu cuenta de administrador acá con "Crear cuenta" y luego, en el SQL
          Worksheet de tu base Oracle, ejecutá <code>05_bootstrap_admin.sql</code> con tu email.
          Los consultores se registran igual y quedan "pending" hasta que un administrador los
          vincula desde "Cuentas".
        </p>
      </div>
    </div>
  );
}
