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

## Endpoints iniciales

- `GET /api/health`: estado operativo de la API.
- `GET /api/dashboard/summary`: métricas de demostración para el dashboard.

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

## Alcance actual

Esta entrega contiene la base visual, un dashboard inicial y endpoints de demostración. Las integraciones con Hacienda, autenticación multifactor, SQL Server, GraphQL, IA y módulos empresariales se incorporarán por fases.

## Roadmap

1. Persistencia SQL Server y gestión de usuarios.
2. Autenticación OAuth2/JWT, MFA y permisos granulares.
3. Inventarios, clientes, facturación electrónica y nómina.
4. Flujos de aprobación, notificaciones y exportación PDF/Excel.
5. Integraciones GraphQL, modelos de predicción y recomendaciones IA.
