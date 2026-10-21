# LAEL Nexus

**Unifica. Automatiza. Evoluciona.**

Base inicial full-stack para la plataforma empresarial LAEL Nexus.

## Estructura

- `frontend/`: React + Vite + TypeScript + TailwindCSS + PWA.
- `backend/LaelNexus.Api/`: API REST en ASP.NET Core .NET 8.
- `docs/`: documentación técnica y funcional.

## Inicio rápido

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

El frontend intenta conectar con `http://localhost:5080` para cargar las métricas del dashboard. Puedes cambiar esa dirección creando `frontend/.env` a partir de `frontend/.env.example`:

```ini
VITE_API_URL=http://localhost:5080
```

Si la API no está disponible, el dashboard muestra automáticamente datos de demostración.

### Backend

```powershell
dotnet run --project backend/LaelNexus.Api
```

La API estará disponible en `http://localhost:5080` y el frontend en la URL mostrada por Vite.

Para probarlo visualmente abre `http://localhost:5173/`. El enlace `/demo.html` redirige a la aplicación compartida; no abras el archivo HTML directamente, porque el navegador impide que una página `file://` se conecte al servidor local.

Los módulos conectados actualmente son el dashboard, inventario y CRM. Inventario y CRM permiten consultar, buscar, filtrar, crear, editar y eliminar datos en SQL Server. Facturación, nómina, automatización y configuración permanecen deshabilitados hasta que tengan endpoints e integraciones reales.

## Acceso de demostración

La aplicación muestra primero la pantalla de login:

- Correo: `admin@laelnexus.com`
- Contraseña: `LAEL2026`

La sesión se conserva en el navegador durante la demostración. Para cerrar sesión, pulsa el avatar `LC` situado en la esquina superior derecha.

Este acceso es provisional y solo sirve para visualizar el proyecto. La autenticación real con OAuth2/JWT, MFA y roles se añadirá antes de producción.

En Windows con SQL Express instalado, la API utiliza la instancia local `.\SQLEXPRESS`. En Docker Compose se utiliza automáticamente el SQL Server del servicio `sqlserver`.

## Endpoints iniciales

- `GET /api/health`: estado operativo de la API.
- `GET /api/dashboard/summary`: métricas de demostración para el dashboard.
- `/api/inventory`: operaciones `GET`, `POST`, `PUT /{id}` y `DELETE /{id}` para productos.
- `/api/crm/customers`: operaciones `GET`, `POST`, `PUT /{id}` y `DELETE /{id}` para clientes.

## Docker

Para iniciar ambos servicios con Docker:

```powershell
docker compose up --build
```

- Frontend: `http://localhost:8080`
- API: `http://localhost:5080`

Docker Compose incluye SQL Server 2022 con un volumen persistente para el inventario. La API crea la base `LaelNexus` y la tabla de productos automáticamente durante el arranque inicial.

```powershell
docker compose up --build
```

La contraseña incluida es únicamente para desarrollo local. Antes de desplegar en producción debe sustituirse mediante secretos y deben utilizarse migraciones versionadas de Entity Framework Core.

El API permite por defecto los orígenes locales de Vite, Vite Preview y Docker. Para otros despliegues, configura `Cors:FrontendOrigins` con los orígenes exactos del frontend.

## Alcance actual

El dashboard usa métricas de demostración; inventario y CRM guardan sus cambios en SQL Server. El login es provisional y solo para la demo: no autentica usuarios en el API. Facturación electrónica/Hacienda, nómina, automatizaciones, reportes, IA, GraphQL y MFA aún no tienen servicios conectados.

## Roadmap

1. Persistencia SQL Server y gestión de usuarios.
2. Autenticación OAuth2/JWT, MFA y permisos granulares.
3. Inventarios, clientes, facturación electrónica y nómina.
4. Flujos de aprobación, notificaciones y exportación PDF/Excel.
5. Integraciones GraphQL, modelos de predicción y recomendaciones IA.
