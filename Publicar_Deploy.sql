Para que otro consultor use la aplicación desde cualquier lugar necesitas publicar el frontend en internet. Oracle ORDS ya está accesible públicamente; lo que falta es alojar la aplicación React.

Opción recomendada: Vercel
1. Crear el archivo de producción
En la raíz del proyecto crea .env.production:

La URL no debe terminar en /.


2. Subir el proyecto a GitHub
Desde PowerShell, en la carpeta del proyecto:
git init
git add .
git commit -m "Aplicacion de registro de horas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main

No subas contraseñas, tokens ni el archivo .env local. El .env.production contiene solamente la URL pública de ORDS.


3. Publicar en Vercel
Ingresa a vercel.com.
Inicia sesión con GitHub.
Selecciona Add New Project.
Selecciona el repositorio.
Usa estos valores:

En Environment Variables, agrega:

Presiona Deploy.
Vercel te entregará una dirección parecida a:


Esa será la dirección que podrá abrir cualquier consultor desde su navegador.

4. Actualizar CORS en Oracle
Debes permitir el dominio real de Vercel. Conéctate como HORAS_APP y ejecuta:


Reemplaza consultor-horas-oracle.vercel.app por el dominio exacto que te entregue Vercel.

Si también vas a probar desde local, puedes usar temporalmente:


Pero para producción conviene usar únicamente el dominio publicado.

5. Crear las cuentas de los consultores
El flujo sería:

Compartes la URL de Vercel.
El consultor entra desde cualquier navegador.
Selecciona Crear cuenta.
Ingresa su email y contraseña.
La cuenta queda como pending.
Tú ingresas como administrador.
En la pestaña Cuentas:
Cambias el rol a consultor.
Lo vinculas con el consultor correspondiente.
El consultor vuelve a iniciar sesión y ya puede cargar sus horas.
Importante
La aplicación queda disponible desde cualquier lugar, pero Oracle ORDS y la base de datos siguen siendo el backend central. No necesitas instalar Node.js ni ejecutar Vite en la computadora de cada consultor.

Cada vez que hagas cambios:


Vercel volverá a construir y publicar automáticamente la nueva versión.

Para una versión más profesional, después puedes agregar un dominio propio como:


y cambiar CORS en Oracle para ese dominio HTTPS.