-- =========================================================
-- Módulo ORDS: /auth/  (login, alta de cuenta, sesión actual)
-- =========================================================
-- Ejecutar después de 01_schema.sql y 02_security_pkg.sql,
-- conectado directamente al esquema donde corren las tablas.
-- El esquema ORDS debe estar habilitado previamente como /horas_app.
-- =========================================================

begin
  ords.define_module(
    p_module_name    => 'app.auth',
    p_base_path      => 'auth/',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED',
    p_comments       => 'Login, alta de cuenta y sesion actual'
  );

  ords.set_module_origins_allowed(
    p_module_name => 'app.auth',
    p_origins_allowed => 'https://consultor-horas-oracle.vercel.app'
  );

  -- ---------------------------------------------------
  -- POST /auth/login   body: { "email": "...", "password": "..." }
  -- ---------------------------------------------------
  ords.define_template(p_module_name => 'app.auth', p_pattern => 'login');

  ORDS.DEFINE_HANDLER(
    p_module_name    => 'app.auth',
    p_pattern        => 'login',
    p_method         => 'POST',
    p_source_type    => 'plsql/block',
    p_mimes_allowed => 'application/json',
    p_source         => q'[
BEGIN
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;

  DECLARE
    l_id     profiles.id%type;
    l_email  profiles.email%type;
    l_hash   profiles.password_hash%type;
    l_role   profiles.role%type;
    l_cid    profiles.consultor_id%type;
    l_token  varchar2(2000);
  BEGIN

    SELECT id, email, password_hash, role, consultor_id
      INTO l_id, l_email, l_hash, l_role, l_cid
      FROM profiles
     WHERE lower(email) = lower(:email);

    IF NOT app_security.verify_password(:password, l_hash) THEN
      :status_code := 401;
      htp.p('{"error":"Email o contrasena incorrectos"}');
      RETURN;
    END IF;

    l_token := app_security.generate_token(
      l_id,
      l_email,
      l_role,
      l_cid
    );

    :status_code := 200;

    htp.p(
      '{"token":"' || l_token ||
      '","role":"' || l_role ||
      '","email":"' || l_email || '"' ||
      CASE
        WHEN l_cid IS NOT NULL
        THEN ',"consultor_id":"' || l_cid || '"'
        ELSE ''
      END ||
      '}'
    );

  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      :status_code := 401;
      htp.p('{"error":"Email o contrasena incorrectos"}');

    WHEN OTHERS THEN
      :status_code := 500;
      htp.p('{"error":"' || replace(sqlerrm, '"', '''') || '"}');
  END;
END;
]'
  );

  -- ---------------------------------------------------
  -- POST /auth/signup   body: { "email": "...", "password": "..." }
  -- Crea la cuenta con rol 'pending' hasta que un admin la vincule.
  -- ---------------------------------------------------
  ords.define_template(p_module_name => 'app.auth', p_pattern => 'signup');

  ords.define_handler(
    p_module_name => 'app.auth',
    p_pattern     => 'signup',
    p_method      => 'POST',
    p_source_type => ords.source_type_plsql,
    p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_count number;
  l_id    varchar2(32);
begin
  select count(*) into l_count from profiles where lower(email) = lower(:email);
  if l_count > 0 then
    :status_code := 409;
    owa_util.mime_header('application/json', false);
    htp.p('{"error":"Ya existe una cuenta con ese email"}');
    return;
  end if;

  if :password is null or length(:password) < 6 then
    :status_code := 400;
    owa_util.mime_header('application/json', false);
    htp.p('{"error":"La contrasena debe tener al menos 6 caracteres"}');
    return;
  end if;

  insert into profiles (email, password_hash, role)
  values (:email, app_security.hash_password(:password), 'pending')
  returning id into l_id;
  commit;

  :status_code := 201;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p('{"message":"Cuenta creada. Un administrador debe activarla."}');
end;
]'
  );

  -- ---------------------------------------------------
  -- GET /auth/me   header: Authorization: Bearer <token>
  -- ---------------------------------------------------
  ords.define_template(p_module_name => 'app.auth', p_pattern => 'me');

  ords.define_handler(
    p_module_name => 'app.auth',
    p_pattern     => 'me',
    p_method      => 'GET',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_id      varchar2(32) := l_profile.get_string('sub');
  l_role    varchar2(20);
  l_email   varchar2(255);
  l_cid     varchar2(32);
  l_nombre  varchar2(200);
  l_resp    json_object_t := json_object_t();
begin
  select role, email, consultor_id into l_role, l_email, l_cid
    from profiles where id = l_id;

  l_resp.put('id', l_id);
  l_resp.put('email', l_email);
  l_resp.put('role', l_role);
  if l_cid is not null then
    l_resp.put('consultor_id', l_cid);
    select nombre into l_nombre from consultores where id = l_cid;
    l_resp.put('nombre', l_nombre);
  end if;

  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p(l_resp.to_string);
exception
  when others then
    :status_code := 401;
    owa_util.mime_header('application/json', false);
    owa_util.http_header_close;
    htp.p('{"error":"No autorizado"}');
end;
]'
  );

  ords.define_parameter(
    p_module_name => 'app.auth', p_pattern => 'me', p_method => 'GET',
    p_name => 'Authorization', p_bind_variable_name => 'authorization',
    p_source_type => 'HEADER', p_access_method => 'IN'
  );

  commit;
end;
/
