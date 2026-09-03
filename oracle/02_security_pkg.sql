-- =========================================================
-- app_security — hashing de contraseñas y tokens JWT
-- =========================================================
-- Reemplaza lo que en Supabase hacía "Auth" de forma automática.
-- Nada de esto sale de la base de datos: los endpoints de ORDS
-- llaman a estas funciones para validar login y firmar/verificar
-- los tokens que después usa el frontend.
-- =========================================================

create or replace package app_security as

  function hash_password(p_password in varchar2) return varchar2;
  function verify_password(p_password in varchar2, p_stored in varchar2) return boolean;

  function generate_token(
    p_sub           in varchar2,
    p_email         in varchar2,
    p_role          in varchar2,
    p_consultor_id  in varchar2,
    p_ttl_seconds   in number default 43200 -- 12 horas
  ) return varchar2;

  function verify_token(p_token in varchar2) return json_object_t;

  -- Extrae y valida el token de X-Auth-Token o Authorization: Bearer ...
  function current_profile(p_auth_header in varchar2) return json_object_t;

end app_security;
/

create or replace package body app_security as

  c_iterations constant pls_integer := 5000; -- rondas de hashing (defensa ante fuerza bruta)

  ---------------------------------------------------------
  -- Helpers base64url (JWT usa base64 "url-safe", sin = de relleno)
  ---------------------------------------------------------
  function base64url_encode(p_raw in raw) return varchar2 is
    l_b64 varchar2(4000);
  begin
    l_b64 := utl_raw.cast_to_varchar2(utl_encode.base64_encode(p_raw));
    l_b64 := replace(replace(l_b64, chr(10), ''), chr(13), '');
    l_b64 := replace(replace(l_b64, '+', '-'), '/', '_');
    while substr(l_b64, -1) = '=' loop
      l_b64 := substr(l_b64, 1, length(l_b64) - 1);
    end loop;
    return l_b64;
  end;

  function base64url_decode(p_str in varchar2) return raw is
    l_str varchar2(4000) := replace(replace(p_str, '-', '+'), '_', '/');
    l_pad pls_integer;
  begin
    l_pad := mod(4 - mod(length(l_str), 4), 4);
    l_str := l_str || rpad('=', l_pad, '=');
    return utl_encode.base64_decode(utl_raw.cast_to_raw(l_str));
  end;

  function jwt_secret return raw is
    l_val varchar2(4000);
  begin
    select cfg_value into l_val from app_config where cfg_key = 'jwt_secret';
    return utl_raw.cast_to_raw(l_val);
  end;

  ---------------------------------------------------------
  -- Contraseñas: salt aleatorio + SHA-512 iterado (guardado como "salt$hash" en hex)
  ---------------------------------------------------------
  function hash_password(p_password in varchar2) return varchar2 is
    l_salt raw(16) := dbms_crypto.randombytes(16);
    l_hash raw(64);
  begin
    l_hash := utl_raw.concat(l_salt, utl_raw.cast_to_raw(p_password));
    for i in 1..c_iterations loop
      l_hash := dbms_crypto.hash(utl_raw.concat(l_hash, l_salt), dbms_crypto.hash_sh512);
    end loop;
    return rawtohex(l_salt) || '$' || rawtohex(l_hash);
  end;

  function verify_password(p_password in varchar2, p_stored in varchar2) return boolean is
    l_salt raw(16);
    l_hash raw(64);
    l_computed raw(64);
  begin
    l_salt := hextoraw(substr(p_stored, 1, instr(p_stored, '$') - 1));
    l_hash := hextoraw(substr(p_stored, instr(p_stored, '$') + 1));
    l_computed := utl_raw.concat(l_salt, utl_raw.cast_to_raw(p_password));
    for i in 1..c_iterations loop
      l_computed := dbms_crypto.hash(utl_raw.concat(l_computed, l_salt), dbms_crypto.hash_sh512);
    end loop;
    return l_computed = l_hash;
  exception
    when others then
      return false;
  end;

  ---------------------------------------------------------
  -- JWT: header.payload.firma, firmado con HMAC-SHA256
  ---------------------------------------------------------
  function generate_token(
    p_sub in varchar2, p_email in varchar2, p_role in varchar2,
    p_consultor_id in varchar2, p_ttl_seconds in number default 43200
  ) return varchar2 is
    l_header  varchar2(200) := '{"alg":"HS256","typ":"JWT"}';
    l_iat     number := round((sysdate - date '1970-01-01') * 86400);
    l_exp     number := l_iat + p_ttl_seconds;
    l_payload json_object_t := json_object_t();
    l_h64     varchar2(2000);
    l_p64     varchar2(2000);
    l_signing_input varchar2(4000);
    l_sig     raw(64);
  begin
    l_payload.put('sub', p_sub);
    l_payload.put('email', p_email);
    l_payload.put('role', p_role);
    if p_consultor_id is not null then
      l_payload.put('consultor_id', p_consultor_id);
    end if;
    l_payload.put('iat', l_iat);
    l_payload.put('exp', l_exp);

    l_h64 := base64url_encode(utl_raw.cast_to_raw(l_header));
    l_p64 := base64url_encode(utl_raw.cast_to_raw(l_payload.to_string));
    l_signing_input := l_h64 || '.' || l_p64;

    l_sig := dbms_crypto.mac(
      src => utl_raw.cast_to_raw(l_signing_input),
      typ => dbms_crypto.hmac_sh256,
      key => jwt_secret
    );

    return l_signing_input || '.' || base64url_encode(l_sig);
  end;

  function verify_token(p_token in varchar2) return json_object_t is
    l_dot1 pls_integer := instr(p_token, '.');
    l_dot2 pls_integer := instr(p_token, '.', 1, 2);
    l_h64 varchar2(2000);
    l_p64 varchar2(2000);
    l_sig64 varchar2(200);
    l_signing_input varchar2(4000);
    l_expected_sig raw(64);
    l_payload json_object_t;
    l_exp number;
    l_now number;
  begin
    if l_dot1 = 0 or l_dot2 = 0 then
      raise_application_error(-20401, 'Token invalido');
    end if;

    l_h64 := substr(p_token, 1, l_dot1 - 1);
    l_p64 := substr(p_token, l_dot1 + 1, l_dot2 - l_dot1 - 1);
    l_sig64 := substr(p_token, l_dot2 + 1);
    l_signing_input := l_h64 || '.' || l_p64;

    l_expected_sig := dbms_crypto.mac(
      src => utl_raw.cast_to_raw(l_signing_input),
      typ => dbms_crypto.hmac_sh256,
      key => jwt_secret
    );

    if base64url_encode(l_expected_sig) != l_sig64 then
      raise_application_error(-20401, 'Firma invalida');
    end if;

    l_payload := json_object_t(utl_raw.cast_to_varchar2(base64url_decode(l_p64)));

    l_exp := l_payload.get_number('exp');
    l_now := round((sysdate - date '1970-01-01') * 86400);
    if l_now > l_exp then
      raise_application_error(-20401, 'Token expirado');
    end if;

    return l_payload;
  end;

  function current_profile(p_auth_header in varchar2) return json_object_t is
    l_token varchar2(2000);
    l_auth_header varchar2(4000) := p_auth_header;
  begin
    -- X-Auth-Token evita que ORDS descarte el header Authorization reservado.
    if l_auth_header is null then
      l_auth_header := owa_util.get_cgi_env('HTTP_X_AUTH_TOKEN');
    end if;
    if l_auth_header is null then
      l_auth_header := owa_util.get_cgi_env('HTTP_AUTHORIZATION');
    end if;
    if l_auth_header is null then
      raise_application_error(-20401, 'Falta el header Authorization');
    end if;
    l_token := trim(regexp_replace(l_auth_header, '^[Bb]earer', ''));
    return verify_token(l_token);
  end;

end app_security;
/
