-- Ejecutar solo si la base ya tenía instalado 01_schema.sql antes de agregar pagos.
-- Si se instala desde cero, la tabla e índices ya quedan creados por 01_schema.sql.

begin
  execute immediate q'[
    create table pagos (
      id            varchar2(32) default rawtohex(sys_guid()) primary key,
      consultor_id  varchar2(32) not null references consultores(id) on delete cascade,
      fecha         date not null,
      monto         number(12,2) not null,
      descripcion   varchar2(1000),
      created_at    timestamp default systimestamp,
      constraint chk_pago_positivo check (monto > 0)
    )
  ]';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

begin
  execute immediate 'create index idx_pagos_consultor on pagos(consultor_id)';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

begin
  execute immediate 'create index idx_pagos_fecha on pagos(fecha)';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

commit;