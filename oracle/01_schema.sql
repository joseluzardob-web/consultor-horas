-- =========================================================
-- Libro de horas — esquema para Oracle Autonomous Database
-- =========================================================
-- Ejecutar en el SQL Worksheet de Database Actions, conectado
-- con el usuario/schema de la aplicación (no como ADMIN).
-- =========================================================

create table clientes (
  id          varchar2(32) default rawtohex(sys_guid()) primary key,
  nombre      varchar2(200) not null,
  created_at  timestamp default systimestamp
);

create table consultores (
  id           varchar2(32) default rawtohex(sys_guid()) primary key,
  nombre       varchar2(200) not null,
  tarifa_hora  number(12,2) default 0 not null,
  created_at   timestamp default systimestamp
);

create table proyectos (
  id          varchar2(32) default rawtohex(sys_guid()) primary key,
  nombre      varchar2(200) not null,
  cliente_id  varchar2(32) not null references clientes(id) on delete cascade,
  created_at  timestamp default systimestamp
);

create table registros (
  id            varchar2(32) default rawtohex(sys_guid()) primary key,
  consultor_id  varchar2(32) not null references consultores(id) on delete cascade,
  proyecto_id   varchar2(32) not null references proyectos(id) on delete cascade,
  fecha         date not null,
  horas         number(6,2) not null,
  descripcion   varchar2(1000),
  created_at    timestamp default systimestamp,
  constraint chk_horas_positivas check (horas > 0)
);

create table pagos (
  id            varchar2(32) default rawtohex(sys_guid()) primary key,
  consultor_id  varchar2(32) not null references consultores(id) on delete cascade,
  fecha         date not null,
  monto         number(12,2) not null,
  descripcion   varchar2(1000),
  created_at    timestamp default systimestamp,
  constraint chk_pago_positivo check (monto > 0)
);

-- Una fila por usuario que puede iniciar sesión.
-- role: 'admin' | 'consultor' | 'pending' (recien registrado, sin vincular)
create table profiles (
  id             varchar2(32) default rawtohex(sys_guid()) primary key,
  email          varchar2(255) not null unique,
  password_hash  varchar2(200) not null,
  role           varchar2(20) default 'pending' not null,
  consultor_id   varchar2(32) references consultores(id) on delete set null,
  created_at     timestamp default systimestamp,
  constraint chk_role check (role in ('admin','consultor','pending'))
);

-- Configuración interna de la aplicación (guarda el secreto para firmar tokens).
create table app_config (
  cfg_key    varchar2(100) primary key,
  cfg_value  varchar2(4000)
);

-- Genera un secreto aleatorio único la primera vez que se instala.
insert into app_config (cfg_key, cfg_value)
values ('jwt_secret', rawtohex(dbms_crypto.randombytes(32)));

create index idx_proyectos_cliente on proyectos(cliente_id);
create index idx_registros_consultor on registros(consultor_id);
create index idx_registros_proyecto on registros(proyecto_id);
create index idx_registros_fecha on registros(fecha);
create index idx_pagos_consultor on pagos(consultor_id);
create index idx_pagos_fecha on pagos(fecha);
create index idx_profiles_consultor on profiles(consultor_id);

commit;
