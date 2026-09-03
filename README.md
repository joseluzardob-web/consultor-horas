# Libro de horas — Consultoría (versión Oracle)

React + Vite en el frontend, Oracle Autonomous Database como base de datos,
y ORDS (Oracle REST Data Services) haciendo de API y de sistema de login.
No hay ningún servidor intermedio propio: todo lo que en la versión
Supabase resolvía "Auth" acá lo resuelve un paquete PL/SQL que vive
dentro de la base (`app_security`), y ORDS expone esa lógica como
endpoints HTTP que el frontend consume con `fetch()`.

## Qué incluye

- Registro de horas por consultor, proyecto y fecha.
- Tabla dinámica de horas por consultor y cliente, por mes.
- Tarifa por hora por consultor y cálculo de monto.
- Exportación a Excel (.xlsx).
- Login real: cada consultor entra con su email y contraseña (hasheada
  con salt + SHA-512 iterado) y recibe un token JWT firmado por la base,
  que el frontend guarda y manda en cada pedido.
- Cada consultor solo ve y carga sus propias horas; el administrador ve
  y gestiona todo. Este control vive en el PL/SQL de cada endpoint, no
  solo en el frontend.

## 1. Crear la base de datos

1. Entrá a [Oracle Cloud (OCI)](https://cloud.oracle.com) y creá una
   cuenta (el nivel "Always Free" alcanza para esto).
2. Menú → **Oracle Database → Autonomous Database** → **Create Autonomous
   Database**.
   - Elegí un nombre (ej. `horasdb`).
   - Workload type: **Transaction Processing**.
   - Deployment: **Serverless**.
   - Podés dejar el resto en los valores por defecto (Always Free si está
     disponible en tu región).
  - Definí la contraseña del usuario **ADMIN** y guardala de forma segura.
3. Esperá a que el estado pase a "Available" (1-2 minutos).

## 2. Crear el usuario/esquema de la aplicación

No trabajes con el usuario ADMIN para la app. Creá un esquema propio:

1. En la página de tu Autonomous Database, abrí **Database Actions**
   (botón arriba) → conectate como **ADMIN**.
2. Andá a **SQL** (el editor de SQL Worksheet) y ejecutá:

   ```sql
   -- Reemplazá la contraseña por una fuerte y propia
   create user horas_app identified by "UnaClaveFuerte#2026";
   grant connect, resource, create view to horas_app;
   grant unlimited tablespace to horas_app;
   grant execute on dbms_crypto to horas_app;
   ```

3. Habilitá REST (ORDS) para ese esquema. Todavía como ADMIN:

   ```sql
   begin
     ords.enable_schema(
       p_enabled             => true,
       p_schema              => 'HORAS_APP',
       p_url_mapping_type    => 'BASE_PATH',
       p_url_mapping_pattern => 'horas',
       p_auto_rest_auth      => false
     );
     commit;
   end;
   /
   ```

## 3. Ejecutar los scripts del proyecto

1. Cerrá sesión de ADMIN en Database Actions y volvé a entrar, esta vez
   con el usuario **horas_app** que acabás de crear (mismo link de
   Database Actions, cambiá el usuario en el login).
2. En el SQL Worksheet, ejecutá en este orden **cada archivo completo**
   de la carpeta `oracle/` de este proyecto:
   1. `01_schema.sql` — crea las tablas.
   2. `02_security_pkg.sql` — crea el paquete de contraseñas y JWT.
   3. `03_ords_auth_api.sql` — crea los endpoints `/auth/...`.
   4. `04_ords_data_api.sql` — crea los endpoints `/api/...`.

  (El `ords.enable_schema` ya lo hiciste en el paso 2. El archivo
  `03_ords_auth_api.sql` no debe volver a ejecutar ese procedimiento,
  porque ORDS no permite modificar el mapping mientras el esquema está
  habilitado.)

3. Anotá la **URL base de ORDS** para tu esquema. La encontrás en
   Database Actions → ícono de "..." o en la pantalla principal, algo
   como:

   ```
   https://xxxxxxxx.adb.sa-saopaulo-1.oraclecloudapps.com/ords/horas_app   --- https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/sql-developer
                                                                           --- https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/horas_app 
   ```

   Podés confirmar que quedó bien probando en el navegador (te debería
   dar un error de "no autorizado" en JSON, no un 404):

   ```
  https://xxxxxxxx.../ords/horas_app/auth/me
   ```

## 4. Configurar el proyecto localmente

Necesitás [Node.js](https://nodejs.org) 18+.

```bash
cd consultor-horas-oracle
npm install
cp .env.example .env
```

Editá `.env`:

```
VITE_ORDS_BASE_URL=https://xxxxxxxx.adb.sa-saopaulo-1.oraclecloudapps.com/ords/horas_app
```

Probá localmente:

```bash
npm run dev
```

Abrí `http://localhost:5173`.    --- http://localhost:5173/

## 5. Crear el primer administrador    --- error:

--- solucion de GPT  
/*
BEGIN
  ORDS.SET_MODULE_ORIGINS_ALLOWED(
    p_module_name     => 'app.auth',
    p_origins_allowed => 'http://localhost:5173'
  );
  COMMIT;
END;

BEGIN
  ORDS.SET_MODULE_ORIGINS_ALLOWED(
    p_module_name     => 'app.api',
    p_origins_allowed => 'http://localhost:5173'
  );
  COMMIT;
END;
/

UPDATE profiles
SET role = 'admin'
WHERE email = 'joseluzardob@gmail.com'
  AND role = 'pending';
COMMIT;
*/


1. En la app, "Crear cuenta" con tu email y una contraseña.
2. Volvé al SQL Worksheet (conectado como `horas_app`) y ejecutá
   `oracle/05_bootstrap_admin.sql`, reemplazando el email por el tuyo.
3. Volvé a la app e iniciá sesión: ya entrás como administrador.

## 6. Dar de alta consultores con acceso propio

1. Como administrador, creá al consultor en "Consultores, clientes y
   proyectos" (nombre + tarifa).
2. El consultor entra a la app y se crea su propia cuenta con "Crear
   cuenta".
3. Vos, como admin, en la pestaña **"Cuentas"**, le cambiás el rol a
   "consultor" y lo vinculás con el consultor correspondiente.

## 7. Desplegar en producción

El frontend es un sitio estático: podés desplegarlo igual que la
versión Supabase, en [Vercel](https://vercel.com) o
[Netlify](https://netlify.com):

1. Subí esta carpeta a un repositorio de GitHub.
2. Import project en Vercel/Netlify.
3. Variable de entorno: `VITE_ORDS_BASE_URL` con el mismo valor de tu
   `.env`.
4. Build command: `npm run build` — Output directory: `dist`.
5. Deploy.

La base de datos y las APIs ya están corriendo en Oracle Cloud desde el
paso 1-3; no hay nada más que desplegar de ese lado.

## Notas sobre seguridad

- Las contraseñas se guardan como `salt$hash` (salt aleatorio de 16
  bytes + SHA-512 aplicado 5000 veces). Es más robusto que un hash
  simple, pero si tu organización necesita cumplir normas específicas
  (PCI, SOC2, etc.), lo estándar de la industria hoy es bcrypt/argon2 —
  Oracle no los trae nativos en PL/SQL, así que evaluá si te alcanza
  con este esquema o si preferís mover la autenticación a un servicio
  externo (Auth0, Oracle Identity, etc.) más adelante.
- El secreto para firmar los tokens JWT se genera solo, aleatorio, en
  `01_schema.sql` (tabla `app_config`). Podés rotarlo ejecutando:
  ```sql
  update app_config set cfg_value = rawtohex(dbms_crypto.randombytes(32))
  where cfg_key = 'jwt_secret';
  commit;
  ```
  Rotarlo invalida todos los tokens activos (todos tendrían que volver
  a iniciar sesión).
- Los tokens duran 12 horas (configurable en `generate_token`, parámetro
  `p_ttl_seconds`, dentro de `02_security_pkg.sql`).
- CORS está abierto a cualquier origen (`*`) para que puedas probarlo
  fácil. Antes de ir a producción de verdad, restringilo a tu dominio:
  ```sql
  exec ords.set_module_origins_allowed('app.auth', 'https://tu-dominio.com');
  exec ords.set_module_origins_allowed('app.api', 'https://tu-dominio.com');
  commit;
  ```

## Estructura del proyecto

```
consultor-horas-oracle/
├─ oracle/
│  ├─ 01_schema.sql            ← Tablas
│  ├─ 02_security_pkg.sql      ← Contraseñas + JWT (reemplaza a Supabase Auth)
│  ├─ 03_ords_auth_api.sql     ← Endpoints /auth/login, /auth/signup, /auth/me
│  ├─ 04_ords_data_api.sql     ← Endpoints /api/consultores, /clientes, /proyectos, /registros, /profiles
│  └─ 05_bootstrap_admin.sql   ← Cómo promover al primer administrador
├─ src/
│  ├─ components/ (Login, RegistroTab, ResumenTab, DatosTab)
│  ├─ utils/ (format.js, excel.js)
│  ├─ api.js       ← Cliente fetch() que reemplaza a supabaseClient.js
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ styles.css
├─ index.html
├─ package.json
├─ vite.config.js
└─ .env.example
```
