-- =========================================================
-- Módulo ORDS: /api/  (consultores, clientes, proyectos, registros, cuentas)
-- =========================================================
-- Ejecutar después de 03_ords_auth_api.sql.
-- Todos los endpoints (salvo login/signup) exigen el header
-- "Authorization: Bearer <token>" obtenido en /auth/login.
-- =========================================================

begin
  ords.define_module(
    p_module_name    => 'app.api',
    p_base_path      => 'api/',
    p_items_per_page => 0,
    p_status         => 'PUBLISHED',
    p_comments       => 'Consultores, clientes, proyectos, registros y cuentas'
  );

  ords.set_module_origins_allowed(
    p_module_name => 'app.api',
    p_origins_allowed => 'https://consultor-horas-oracle.vercel.app'
  );

  -- =========================================================
  -- CONSULTORES
  -- =========================================================
  ords.define_template(p_module_name => 'app.api', p_pattern => 'consultores');
  ords.define_template(p_module_name => 'app.api', p_pattern => 'consultores/:id');

  -- GET /api/consultores
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'consultores', p_method => 'GET',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_arr json_array_t := json_array_t();
  l_obj json_object_t;
begin
  for r in (select id, nombre, tarifa_hora from consultores order by nombre) loop
    l_obj := json_object_t();
    l_obj.put('id', r.id);
    l_obj.put('nombre', r.nombre);
    l_obj.put('tarifa_hora', r.tarifa_hora);
    l_arr.append(l_obj);
  end loop;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p(l_arr.to_string);
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'consultores', p_method=>'GET',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- POST /api/consultores  body: { "nombre": "...", "tarifa_hora": 0 }  (solo admin)
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'consultores', p_method => 'POST',
    p_source_type => ords.source_type_plsql, p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_id varchar2(32);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  insert into consultores (nombre, tarifa_hora)
  values (:nombre, nvl(:tarifa_hora, 0))
  returning id into l_id;
  commit;
  :status_code := 201;
  owa_util.mime_header('application/json', false);
  htp.p('{"id":"'||l_id||'"}');
exception
  when others then
    :status_code := 400; owa_util.mime_header('application/json', false);
    htp.p('{"error":"'||replace(sqlerrm,'"','''')||'"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'consultores', p_method=>'POST',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- PATCH /api/consultores/:id  body: { "nombre": "...", "tarifa_hora": 0 }  (solo admin)
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'consultores/:id', p_method => 'PATCH',
    p_source_type => ords.source_type_plsql, p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  update consultores set nombre = :nombre, tarifa_hora = :tarifa_hora where id = :id;
  commit;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  htp.p('{"ok":true}');
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'consultores/:id', p_method=>'PATCH',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- DELETE /api/consultores/:id  (solo admin)
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'consultores/:id', p_method => 'DELETE',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  delete from consultores where id = :id;
  commit;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  htp.p('{"ok":true}');
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'consultores/:id', p_method=>'DELETE',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- =========================================================
  -- CLIENTES
  -- =========================================================
  ords.define_template(p_module_name => 'app.api', p_pattern => 'clientes');
  ords.define_template(p_module_name => 'app.api', p_pattern => 'clientes/:id');

  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'clientes', p_method => 'GET',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_arr json_array_t := json_array_t();
  l_obj json_object_t;
begin
  for r in (select id, nombre from clientes order by nombre) loop
    l_obj := json_object_t();
    l_obj.put('id', r.id);
    l_obj.put('nombre', r.nombre);
    l_arr.append(l_obj);
  end loop;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p(l_arr.to_string);
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'clientes', p_method=>'GET',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'clientes', p_method => 'POST',
    p_source_type => ords.source_type_plsql, p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_id varchar2(32);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  insert into clientes (nombre) values (:nombre) returning id into l_id;
  commit;
  :status_code := 201;
  owa_util.mime_header('application/json', false);
  htp.p('{"id":"'||l_id||'"}');
exception
  when others then
    :status_code := 400; owa_util.mime_header('application/json', false);
    htp.p('{"error":"'||replace(sqlerrm,'"','''')||'"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'clientes', p_method=>'POST',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'clientes/:id', p_method => 'DELETE',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  delete from clientes where id = :id;
  commit;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  htp.p('{"ok":true}');
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'clientes/:id', p_method=>'DELETE',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- =========================================================
  -- PROYECTOS
  -- =========================================================
  ords.define_template(p_module_name => 'app.api', p_pattern => 'proyectos');
  ords.define_template(p_module_name => 'app.api', p_pattern => 'proyectos/:id');

  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'proyectos', p_method => 'GET',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_arr json_array_t := json_array_t();
  l_obj json_object_t;
begin
  for r in (select id, nombre, cliente_id from proyectos order by nombre) loop
    l_obj := json_object_t();
    l_obj.put('id', r.id);
    l_obj.put('nombre', r.nombre);
    l_obj.put('cliente_id', r.cliente_id);
    l_arr.append(l_obj);
  end loop;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p(l_arr.to_string);
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'proyectos', p_method=>'GET',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'proyectos', p_method => 'POST',
    p_source_type => ords.source_type_plsql, p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_id varchar2(32);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  insert into proyectos (nombre, cliente_id) values (:nombre, :cliente_id) returning id into l_id;
  commit;
  :status_code := 201;
  owa_util.mime_header('application/json', false);
  htp.p('{"id":"'||l_id||'"}');
exception
  when others then
    :status_code := 400; owa_util.mime_header('application/json', false);
    htp.p('{"error":"'||replace(sqlerrm,'"','''')||'"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'proyectos', p_method=>'POST',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'proyectos/:id', p_method => 'DELETE',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  delete from proyectos where id = :id;
  commit;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  htp.p('{"ok":true}');
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'proyectos/:id', p_method=>'DELETE',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- =========================================================
  -- REGISTROS  (acá vive la lógica de "cada consultor ve lo suyo")
  -- =========================================================
  ords.define_template(p_module_name => 'app.api', p_pattern => 'registros');
  ords.define_template(p_module_name => 'app.api', p_pattern => 'registros/:id');

  -- GET /api/registros?mes=YYYY-MM   (mes es opcional)
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'registros', p_method => 'GET',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_role varchar2(20) := l_profile.get_string('role');
  l_cid  varchar2(32) := l_profile.get_string('consultor_id');
  l_arr json_array_t := json_array_t();
  l_obj json_object_t;
begin
  for r in (
    select id, consultor_id, proyecto_id, to_char(fecha,'YYYY-MM-DD') fecha, horas, descripcion
      from registros
     where (l_role = 'admin' or consultor_id = l_cid)
       and (:mes is null or to_char(fecha,'YYYY-MM') = :mes)
     order by fecha desc
  ) loop
    l_obj := json_object_t();
    l_obj.put('id', r.id);
    l_obj.put('consultor_id', r.consultor_id);
    l_obj.put('proyecto_id', r.proyecto_id);
    l_obj.put('fecha', r.fecha);
    l_obj.put('horas', r.horas);
    l_obj.put('descripcion', r.descripcion);
    l_arr.append(l_obj);
  end loop;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p(l_arr.to_string);
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'registros', p_method=>'GET',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- POST /api/registros
  -- body: { "proyecto_id","fecha" (YYYY-MM-DD), "horas", "descripcion", "consultor_id" (solo admin, opcional) }
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'registros', p_method => 'POST',
    p_source_type => ords.source_type_plsql, p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_role varchar2(20) := l_profile.get_string('role');
  l_my_cid varchar2(32) := l_profile.get_string('consultor_id');
  l_target varchar2(32);
  l_id varchar2(32);
begin
  if l_role = 'admin' then
    l_target := nvl(:consultor_id, l_my_cid);
  else
    l_target := l_my_cid;
  end if;

  if l_target is null then
    :status_code := 400; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Falta el consultor"}'); return;
  end if;

  insert into registros (consultor_id, proyecto_id, fecha, horas, descripcion)
  values (l_target, :proyecto_id, to_date(:fecha,'YYYY-MM-DD'), :horas, :descripcion)
  returning id into l_id;
  commit;

  :status_code := 201;
  owa_util.mime_header('application/json', false);
  htp.p('{"id":"'||l_id||'"}');
exception
  when others then
    :status_code := 400; owa_util.mime_header('application/json', false);
    htp.p('{"error":"'||replace(sqlerrm,'"','''')||'"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'registros', p_method=>'POST',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- DELETE /api/registros/:id  (admin borra cualquiera, consultor solo lo suyo)
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'registros/:id', p_method => 'DELETE',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_role varchar2(20) := l_profile.get_string('role');
  l_my_cid varchar2(32) := l_profile.get_string('consultor_id');
begin
  if l_role = 'admin' then
    delete from registros where id = :id;
  else
    delete from registros where id = :id and consultor_id = l_my_cid;
  end if;
  commit;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  htp.p('{"ok":true}');
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'registros/:id', p_method=>'DELETE',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- =========================================================
  -- CUENTAS (profiles) — solo administrador
  -- =========================================================
  ords.define_template(p_module_name => 'app.api', p_pattern => 'profiles');
  ords.define_template(p_module_name => 'app.api', p_pattern => 'profiles/:id');

  -- GET /api/profiles
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'profiles', p_method => 'GET',
    p_source_type => ords.source_type_plsql,
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
  l_arr json_array_t := json_array_t();
  l_obj json_object_t;
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  for r in (select id, email, role, consultor_id from profiles order by email) loop
    l_obj := json_object_t();
    l_obj.put('id', r.id);
    l_obj.put('email', r.email);
    l_obj.put('role', r.role);
    if r.consultor_id is not null then l_obj.put('consultor_id', r.consultor_id); end if;
    l_arr.append(l_obj);
  end loop;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p(l_arr.to_string);
exception
  when others then
    :status_code := 401; owa_util.mime_header('application/json', false);
    htp.p('{"error":"No autorizado"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'profiles', p_method=>'GET',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  -- PATCH /api/profiles/:id  body: { "role": "admin|consultor|pending", "consultor_id": "..." o "" }
  ords.define_handler(
    p_module_name => 'app.api', p_pattern => 'profiles/:id', p_method => 'PATCH',
    p_source_type => ords.source_type_plsql, p_mimes_allowed => 'application/json',
    p_source      => q'[
declare
  l_profile json_object_t := app_security.current_profile(:authorization);
begin
  if l_profile.get_string('role') != 'admin' then
    :status_code := 403; owa_util.mime_header('application/json', false);
    htp.p('{"error":"Solo un administrador puede hacer esto"}'); return;
  end if;
  update profiles
     set role = :role,
         consultor_id = nullif(:consultor_id, '')
   where id = :id;
  commit;
  :status_code := 200;
  owa_util.mime_header('application/json', false);
  owa_util.http_header_close;
  htp.p('{"ok":true}');
exception
  when others then
    :status_code := 400; owa_util.mime_header('application/json', false);
    owa_util.http_header_close;
    htp.p('{"error":"'||replace(sqlerrm,'"','''')||'"}');
end;
]'
  );
  ords.define_parameter(p_module_name=>'app.api', p_pattern=>'profiles/:id', p_method=>'PATCH',
    p_name=>'Authorization', p_bind_variable_name=>'authorization', p_source_type=>'HEADER', p_access_method=>'IN');

  commit;
end;
/
