// Cliente HTTP liviano para hablar con las APIs de ORDS.
// Reemplaza a supabaseClient.js: acá no hay SDK, son fetch() comunes.

const BASE_URL = import.meta.env.VITE_ORDS_BASE_URL;
const TOKEN_KEY = "horas_token";

if (!BASE_URL) {
  console.error(
    "Falta la variable VITE_ORDS_BASE_URL. Copiá .env.example a .env y completá " +
      "la URL base de tu esquema ORDS (terminada en /ords/tu_schema)."
  );
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(`No se pudo conectar con ORDS en ${path}: ${err.message}`);
  }

  let data = null;
  const text = await res.text();
 // if (text) {
//    try { data = JSON.parse(text); } catch { data = null; }
//  }

	console.log("URL ORDS:", `${BASE_URL}${path}`);
	console.log("STATUS ORDS:", res.status);
	console.log("RESPUESTA ORDS:", text);

	if (text) {
	  try {
		data = JSON.parse(text);
	  } catch (e) {
		console.error("ERROR PARSEANDO JSON:", e);
		data = null;
	  }
	}

  if (!res.ok) {
    const message = data?.error || `Error ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // --- auth ---
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  signup: (email, password) => request("/auth/signup", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),

  // --- consultores ---
  listConsultores: () => request("/api/consultores"),
  createConsultor: (nombre, tarifa_hora) => request("/api/consultores", { method: "POST", body: { nombre, tarifa_hora } }),
  updateConsultor: (id, nombre, tarifa_hora) => request(`/api/consultores/${id}`, { method: "PATCH", body: { nombre, tarifa_hora } }),
  deleteConsultor: (id) => request(`/api/consultores/${id}`, { method: "DELETE" }),

  // --- clientes ---
  listClientes: () => request("/api/clientes"),
  createCliente: (nombre) => request("/api/clientes", { method: "POST", body: { nombre } }),
  deleteCliente: (id) => request(`/api/clientes/${id}`, { method: "DELETE" }),

  // --- proyectos ---
  listProyectos: () => request("/api/proyectos"),
  createProyecto: (nombre, cliente_id) => request("/api/proyectos", { method: "POST", body: { nombre, cliente_id } }),
  deleteProyecto: (id) => request(`/api/proyectos/${id}`, { method: "DELETE" }),

  // --- registros ---
  listRegistros: (mes) => request(`/api/registros${mes ? `?mes=${encodeURIComponent(mes)}` : ""}`),
  createRegistro: (payload) => request("/api/registros", { method: "POST", body: payload }),
  deleteRegistro: (id) => request(`/api/registros/${id}`, { method: "DELETE" }),

  // --- cuentas (admin) ---
  listProfiles: () => request("/api/profiles"),
  updateProfile: (id, role, consultor_id) => request(`/api/profiles/${id}`, { method: "PATCH", body: { role, consultor_id: consultor_id || "" } }),
};
