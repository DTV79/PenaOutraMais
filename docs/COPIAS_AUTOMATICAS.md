# Copias automáticas · Peña Outra Máis

## Alcance

- Proyecto Supabase: `djrmbdbtfsgzwwcsatll`.
- Repositorio público: `DTV79/PenaOutraMais`; **no se guarda aquí ninguna copia ni contraseña**.
- Frecuencia: días **1 y 16**, a las **07:30 Europe/Madrid** (GitHub Actions puede retrasar alguna ejecución).
- Destino: Google Drive cifrado a través de rclone, usando el remoto ya configurado para A Mesa Puesta `cofradia_cifrado:`, dentro de la carpeta independiente `PenaOutraMais`.
- Incluye: volcado PostgreSQL 17 (esquemas, funciones y datos accesibles al usuario de la base de datos), objetos físicos de todos los buckets Supabase Storage y manifiesto SHA-256.
- Se verifica la legibilidad del volcado y se compara el número de objetos de Storage. Tras la transferencia se verifica la descarga íntegra con `rclone check --download`.
- Las copias **automáticas** conservan las últimas 8. Las **manuales** generadas desde GitHub Actions no caducan automáticamente.
- Independientemente se mantiene el botón existente de descarga manual en JSON desde Administración.

## Credenciales pendientes (hacer una sola vez)

En [GitHub → Settings → Secrets and variables → Actions](https://github.com/DTV79/PenaOutraMais/settings/secrets/actions), crear **Repository secrets** con estos nombres exactos:

1. `PENA_DB_PASSWORD`: contraseña de PostgreSQL del proyecto Peña Outra Máis (Supabase → Project Settings → Database). No usar la del proyecto Cofradía.
2. `PENA_SUPABASE_SERVICE_ROLE`: clave de servidor `service_role` / secret key del proyecto Peña Outra Máis, necesaria para descargar los documentos de Storage. **Nunca ponerla en el frontend ni en el repositorio**.
3. `PENA_RCLONE_CONFIG_B64`: fichero `rclone.conf` codificado en Base64, con el remoto cifrado `cofradia_cifrado:` de A Mesa Puesta. Es una credencial sensible; la clave `crypt` y el acceso a Drive quedan dentro del secreto. No pegar su valor en chats, archivos del repositorio ni capturas.

Si rclone sigue configurado en el equipo Windows, obtener la cadena Base64 mediante PowerShell (solo en tu propio equipo):

```powershell
$archivo = "$env:APPDATA\rclone\rclone.conf"
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes($archivo))
```

El archivo debe contener los remotos adecuados del sistema anterior. Si está en otra ubicación, consultar primero `rclone config file` y ajustar `$archivo`. Si ese fichero ya no existe, habrá que configurar el remoto de nuevo.

**Importante:** los secretos de `DTV79/AMesaPuesta` no se transfieren automáticamente a `DTV79/PenaOutraMais`. GitHub no permite leer su valor una vez guardados. Las nuevas credenciales hay que introducirlas en el repositorio de la Peña.

## Probar y verificar

1. Abrir [GitHub Actions → Copia cifrada Pena Outra Mais](https://github.com/DTV79/PenaOutraMais/actions/workflows/pena-backup.yml).
2. Pulsar **Run workflow** (ejecución manual).
3. Revisar que termine en verde y muestre `RESPALDO_VERIFICADO`. Debe crear una carpeta bajo `PenaOutraMais/manuales` en el Drive cifrado.
4. Abrir [Prueba restauración](https://github.com/DTV79/PenaOutraMais/actions/workflows/pena-restauracion-test.yml), pulsar **Run workflow** y comprobar `INTEGRIDAD_OK` y `RESTAURACION_TABLA_OK`.
5. En Administración → **Copias y estatutos**, consultar el estado y la fecha del último resultado correcto.

La prueba de restauración abre el volcado y restaura la tabla `socios` en un PostgreSQL **aislado** dentro de GitHub Actions, sin modificar Supabase. No equivale a un ensayo integral de restauración de todas las funciones y servicios Supabase.

## Seguridad y recuperación

Una copia de base de datos **no** incluye por sí sola el contenido físico de Supabase Storage, por eso se descargan también los objetos. Mantener ambos juntos. La restauración completa a otro proyecto requiere revisar extensiones, roles, autenticación y configuración del nuevo Supabase antes de cargar datos o reponer archivos.

Si una copia falla, GitHub Actions mostrará el error y la página de Administración indicará «Revisar ejecución» cuando pueda consultar los resultados. Una configuración de secretos pendiente implica que **todavía no hay copias automáticas verificadas**, aunque el workflow ya esté programado.
