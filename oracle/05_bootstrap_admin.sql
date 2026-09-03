-- =========================================================
-- Primer administrador
-- =========================================================
-- 1. Con la app ya desplegada (o corriendo con "npm run dev"),
--    entrá a la pantalla de login y usá "Crear cuenta" con tu
--    email de administrador.
-- 2. Volvé al SQL Worksheet y ejecutá (reemplazando el email):

update profiles set role = 'admin'
where email = 'joseluzardob@gmail.com';

commit;

-- 3. Volvé a la app e iniciá sesión con esa cuenta: ya entrás
--    como administrador y podés dar de alta consultores, clientes,
--    proyectos, y vincular otras cuentas desde la pestaña "Cuentas".
-- =========================================================
