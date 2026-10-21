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

Para probarlo visualmente abre `http://localhost:5173/`. No abras archivos HTML directamente desde el explorador (`file://`), porque el navegador impide que se conecten a los servicios locales.

Los módulos conectados actualmente son el dashboard, inventario, CRM y la tienda de muestra. La tienda pública está en `http://localhost:5173/tienda`; lee el inventario real y permite enviar solicitudes de pedido sin cobro. En `http://localhost:5173/software` el cliente puede solicitar una cotización mensual o anual de LAEL Nexus. Las solicitudes se guardan en SQL Server, pero no crean una suscripción activa, no cobran, no envían correos y todavía no existe un panel administrativo para gestionarlas. Los precios se confirman con el equipo, pues aún no están configurados. Facturación, nómina, automatización y configuración permanecen deshabilitados hasta que tengan endpoints e integraciones reales.

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
- `POST /api/store/orders`: guarda una solicitud de pedido de demostración sin procesar pagos.
- `POST /api/store/software-requests`: guarda una solicitud de cotización para el plan mensual o anual de LAEL Nexus.

## Docker

Para iniciar ambos servicios con Docker:

```powershell
docker compose up --build
```

- Frontend, tienda y planes: `http://localhost:8080`, `http://localhost:8080/tienda` y `http://localhost:8080/software`
- API: `http://localhost:5080`

Docker Compose incluye SQL Server 2022 con un volumen persistente. Nginx sirve la aplicación y reenvía `/api` a la API en la red interna de Docker. La base de datos no expone su puerto al equipo ni a Internet; el frontend y el puerto de API para desarrollo solo se enlazan a `127.0.0.1`.

```powershell
docker compose up --build
```

La contraseña incluida es únicamente para desarrollo local. Antes de desplegar en producción debe sustituirse mediante secretos y deben utilizarse migraciones versionadas de Entity Framework Core.

El API permite por defecto los orígenes locales de Vite, Vite Preview y Docker. Para otros despliegues, configura `Cors:FrontendOrigins` con los orígenes exactos del frontend.

## Publicación gratuita y protegida en Cloudflare

La publicación recomendada usa Cloudflare Pages, Pages Functions y D1 en sus planes gratuitos. El sitio está limitado a la tienda y a los planes de software: el build público no incluye el panel administrativo ni las credenciales demo. La API pública solo permite consultar el catálogo y crear solicitudes; no permite CRM, administrar inventario, leer pedidos ni consultar cotizaciones.

La protección incluye HTTPS, cabeceras de seguridad (CSP, HSTS y anti-iframe), validación del mismo origen, validación de datos en servidor, límite de 16 KB por envío y máximo de 5 solicitudes por IP y endpoint cada 10 minutos. Se conservan solo hashes rotativos para el control de frecuencia, no las IP sin procesar. Estas medidas reducen abuso habitual, pero no sustituyen autenticación para un panel privado; por eso no se publica el panel.

### Requisitos y enlace

- Crea una cuenta Cloudflare y mantenla en el plan Workers Free; no selecciones un plan de pago ni agregues un dominio para esta publicación.
- Instala Node.js LTS y, desde PowerShell, en la carpeta raíz del proyecto ejecuta:

```powershell
.\scripts\deploy-cloudflare.ps1
```

- Inicia sesión en Cloudflare en la ventana del navegador y confirma el despliegue gratuito. El script crea la base D1, aplica el esquema y publica la app.
- Al finalizar verás el enlace `https://<nombre-del-proyecto>.pages.dev/tienda`; compártelo para abrir la tienda. Los planes están en `/software`.

**Todavía no existe un enlace público:** se genera solamente después de ejecutar el script con una cuenta Cloudflare. Desde esta sesión no tengo acceso a tu cuenta y no puedo crear una URL real por ti. Cloudflare ofrece límites gratuitos (actualmente 100,000 ejecuciones de Functions al día; D1 incluye 5 millones de filas leídas y 100,000 escritas al día, hasta 500 MB por base y 5 GB en total por cuenta). Si se alcanzan, algunas operaciones pueden quedar limitadas hasta el reinicio de cuota; no actualices a un plan de pago si no quieres cargos. Revisa los [límites de Functions](https://developers.cloudflare.com/pages/functions/pricing/), [precios/límites D1](https://developers.cloudflare.com/d1/platform/pricing/) y el plan de tu cuenta antes de desplegar.

Los pedidos y solicitudes guardan nombre, correo y los datos del pedido en D1 para seguimiento manual; no se envían correos ni se procesan pagos. No hay un panel público para ver esos datos; solo la persona con acceso a la cuenta Cloudflare puede consultarlos en D1. Comparte la tienda solo después de decidir quién tendrá acceso a la cuenta que los almacena.

## Alcance actual

En el uso local, el dashboard emplea métricas de demostración y el inventario, CRM, pedidos y solicitudes se guardan en SQL Server. En la publicación gratuita, la tienda y las solicitudes usan D1. En ambos casos las solicitudes no notifican automáticamente al vendedor. Los planes no tienen precio fijado ni procesamiento de pagos y no activan acceso al software; no deben presentarse como suscripciones ya compradas. Docker Compose local no crea un enlace público. El login administrativo local es provisional y no autentica usuarios en el API; por eso el panel no se incluye en el build público. Facturación electrónica/Hacienda, nómina, automatizaciones, reportes, IA, GraphQL y MFA aún no tienen servicios conectados.

## Roadmap

1. Persistencia SQL Server y gestión de usuarios.
2. Autenticación OAuth2/JWT, MFA y permisos granulares.
3. Inventarios, clientes, facturación electrónica y nómina.
4. Flujos de aprobación, notificaciones y exportación PDF/Excel.
5. Integraciones GraphQL, modelos de predicción y recomendaciones IA.
