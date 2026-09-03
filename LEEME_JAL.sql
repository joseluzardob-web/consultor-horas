/*
-- HABILITAR esquema
BEGIN
  ORDS.ENABLE_SCHEMA(
    p_enabled => TRUE,
    p_schema  => 'JLUZARDO'
  );
  COMMIT;
END;
/

-- DESHABILITAR esquema
BEGIN
  ORDS.ENABLE_SCHEMA(
    p_enabled => FALSE,
    p_schema  => 'JLUZARDO'
  );
  COMMIT;
END;
/

-- PROBAR local
http://localhost:5173/


-- PROBAR DESDE CHROME
https://consultor-horas-oracle.vercel.app

El flujo completo está operativo:

Login propio de la aplicación.
Autenticación mediante Oracle ORDS.
Creación de consultores, clientes y proyectos.
Registro de horas.
Acceso remoto desde cualquier ubicación.
CORS configurado para el dominio de producción.
Recuerda compartir únicamente la URL estable de producción, no las URLs temporales de Preview de Vercel.


-- GIT
USUARIO: joseluzardob-web - NOMBRE: JLuzardo
PASW:   


-- VER ESQUEMA
SELECT *
  FROM USER_ORDS_SCHEMAS;


-- ERROR CREAR CUENTA:
Ejecutar:
BEGIN
  ORDS.SET_MODULE_ORIGINS_ALLOWED(
    p_module_name     => 'app.auth',
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

-- =========================================================
-- Libro de horas — esquema para Oracle Autonomous Database
-- =========================================================
-- Ejecutar en el SQL Worksheet de Database Actions, conectado
-- con el usuario/schema de la aplicación (no como ADMIN).
-- =========================================================

SELECT * FROM clientes;
SELECT * FROM consultores;
SELECT * FROM proyectos; 
SELECT * FROM registros;
SELECT * FROM profiles;
SELECT * FROM app_config;

SELECT *
FROM user_ords_handlers
WHERE template_id = 10720;


--- PROBAR DESDE CMD
curl -i -X POST "https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/horas_app/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"joseluzardob@gmail.com\",\"password\":\"Argentina2026*\"}"

curl -i -X POST "https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/horas_app/auth/login" -H "Content-Type: application/json" --data-raw "{\"email\":\"joseluzardob@gmail.com\",\"password\":\"Argentina2026*\"}"

*/

1. Oracle Cloud
   Cloud Account: joseluzardob
   Username     : joseluzardob@gmail.com
   Pasw         : Clou$1234
   
   -- USUARIO ADMINISTRADOR BD:  
   https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/admin/_sdw/
   
   USER:  ADMIN
   PASSW: Besteam2026$  
   BD: DesaBest

   -- USUARIO APLICACION
   https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/horas_app/_sdw/
   USER: horas_app
   PASW: Argentina2026*
   BD  : DesaBest


2. En el SQL Worksheet, ejecutá en este orden **cada archivo completo**
   de la carpeta `oracle/` de este proyecto:
   1. `01_schema.sql` — crea las tablas.
   2. `02_security_pkg.sql` — crea el paquete de contraseñas y JWT.
   3. `03_ords_auth_api.sql` — crea los endpoints `/auth/...`.
   4. `04_ords_data_api.sql` — crea los endpoints `/api/...`.


3. Iniciar un servidor de desarrollo local 
   CMD
   cd C:\Users\josel\Work\Besteam\consultor-horas-oracle\consultor-horas-oracle
   npm run dev

3. URL
   Bases de datos de IA autónomas --> Mas acciones -- Iniciar
   https://swvsvvwprsjtham-desabest.adb.sa-santiago-1.oraclecloudapps.com/ords/horas_app 


   