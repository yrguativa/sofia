# Finanzas

App de finanzas personales, mobile-first y instalable como PWA.
Stack: React + Vite + TypeScript + Tailwind, con Supabase (Postgres, Auth, API PostgREST).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completa las variables
npm run dev
```

## Configuración de Supabase (una sola vez)

1. **Crear proyecto** en supabase.com (plan gratis).
2. **Aplicar las migraciones, en orden,** en *SQL Editor* (o con `supabase db push`):
   1. `supabase/migrations/20261102000000_init.sql`
   2. `supabase/migrations/20261102010000_transferencias_y_politicas.sql`
3. **Authentication > Sign In / Providers > Email**
   - Activar *Confirm email*.
   - Activar *Password* con longitud mínima de 12.
4. **Authentication > Multi-Factor**
   - Activar *TOTP* (Time-based one-time password).
5. **Authentication > URL Configuration**
   - *Site URL* y *Redirect URLs*: la URL de la app (local y de producción).
6. **Project Settings > API**: copia la URL y la clave publicable (anon) a `.env.local`.

## Login con KeePass

La app usa email + contraseña con autocompletado estándar, y MFA TOTP obligatorio.

- En KeePass (KeePassXC, KeePassDX, Strongbox o KeePassium), crea una entrada *Finanzas* con:
  - **Usuario**: tu correo.
  - **Contraseña**: la contraseña de la app.
  - **TOTP**: el código que muestra la app al activar MFA (escanear QR o pegar la clave).
- Al entrar, KeePass rellena usuario y contraseña. Luego copia el código TOTP.

## GitHub Actions (plan gratis sin pausas ni pérdida de datos)

Agrega estos secretos en *Settings > Secrets and variables > Actions*:

| Secreto | Uso |
|---|---|
| `SUPABASE_URL` | Workflow `keepalive` |
| `SUPABASE_ANON_KEY` | Workflow `keepalive` |
| `SUPABASE_DB_URL` | Workflow `backup` (cadena de conexión directa de Postgres, solo en secretos) |

- `keepalive.yml` evita que el proyecto se pause por inactividad (cada 3 días).
- `backup.yml` hace un `pg_dump` semanal y lo guarda como artefacto durante 30 días.
  Contiene datos personales: no lo publiques.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verifica tipos y genera la PWA en `dist/` |
| `npm run test` | Pruebas de la lógica financiera (saldos, resúmenes, fechas) |
| `node scripts/generate-icons.mjs` | Regenera los iconos PNG de la PWA |

## Funciones

- **Inicio:** saldo total, ingresos y gastos del mes, cuentas y últimos movimientos.
- **Movimientos:** ingresos, gastos y transferencias por mes, con edición y eliminación.
- **Cuentas:** efectivo, banco, tarjeta o ahorro, con saldo calculado.
- **Presupuestos:** límite mensual por categoría de gasto, con barra de progreso.
- **Metas:** objetivos de ahorro, con aportes y retiros.
- **Más:** categorías propias, perfil y moneda, y cierre de sesión.
- **Simulador:** pantalla preparada, pendiente de integrar.

Sin conexión la app abre desde caché, pero los datos requieren internet. No se guardan datos financieros en el dispositivo.

## Estructura

```
src/
  auth/        AuthContext (estado de sesión y MFA) y Guard (rutas protegidas)
  lib/         cliente de Supabase
  pages/       Login, configuración y verificación MFA, Dashboard
supabase/
  migrations/  esquema, RLS y categorías predefinidas
```
