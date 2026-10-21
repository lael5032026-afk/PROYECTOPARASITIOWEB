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

## Preparar hosting público en Azure

El despliegue se prepara con Azure Container Apps, Azure Container Registry, Log Analytics y Azure SQL Database Basic. **Azure puede cobrar por estos recursos y por el uso/registro de logs**; revisa los precios de tu región antes de continuar. No se crea ningún recurso hasta que ejecutes el script, confirmes el ID de suscripción y escribas `YES`.

Requisitos:

- Una suscripción de Azure activa.
- Azure CLI instalado y sesión iniciada con `az login`.
- Dockerfiles incluidos en los proyectos; las imágenes se compilan en Azure Container Registry, por lo que Docker no es necesario en tu PC.

Desde PowerShell, en la carpeta raíz del repositorio:

```powershell
.\scripts\deploy-azure.ps1
```

El script pide la región y una contraseña segura para el administrador de SQL. **Guarda esa contraseña en un gestor seguro**: no se imprime ni se guarda en el repositorio. Confirma el ID de suscripción y los cargos antes de que empiece el despliegue. Al terminar muestra los enlaces públicos de la tienda y el catálogo de software; guarda nombres de recursos y enlaces en `.azure\deployment.json`, archivo excluido de Git.

La configuración pública redirige la página principal a `/tienda`, permite la página `/software` y solo reenvía a la API el estado, la lectura del catálogo y los envíos de solicitudes. El API y SQL no tienen ingreso público; el firewall de SQL se limita a las direcciones de salida de Container Apps. El panel administrativo y las rutas de escritura del inventario/CRM no se publican. No se configura dominio propio.

El despliegue es una tienda de demostración, no una plataforma de venta lista para producción: no cobra, no activa suscripciones ni avisa por correo; los pedidos y solicitudes guardan información personal en SQL para seguimiento manual. Los planes no tienen precios fijados. Configura responsablemente privacidad, retención y atención de solicitudes antes de compartirla con clientes. El login administrativo actual sigue siendo de demostración y no debe habilitarse públicamente.

Si necesitas detener y borrar **solo los recursos de esta publicación**, usa el nombre de grupo que mostró el script o el valor `resourceGroup` de `.azure\deployment.json`; verifica que sea el grupo aleatorio creado para este despliegue antes de ejecutar:

```powershell
az group delete --name <grupo-del-despliegue> --yes --no-wait
```

## Alcance actual

El dashboard usa métricas de demostración; inventario, CRM, pedidos de muestra y solicitudes de planes se guardan en SQL Server. Las solicitudes no notifican automáticamente al vendedor. Los planes no tienen precio fijado ni procesamiento de pagos y no activan acceso al software; no deben presentarse como suscripciones ya compradas. Para compartir la tienda públicamente hace falta desplegar frontend y API en un servidor con HTTPS, autenticación y base de datos accesible solo desde la API; Docker Compose local no publica un enlace de Internet. El login administrativo es provisional y no autentica usuarios en el API. Facturación electrónica/Hacienda, nómina, automatizaciones, reportes, IA, GraphQL y MFA aún no tienen servicios conectados.

## Roadmap

1. Persistencia SQL Server y gestión de usuarios.
2. Autenticación OAuth2/JWT, MFA y permisos granulares.
3. Inventarios, clientes, facturación electrónica y nómina.
4. Flujos de aprobación, notificaciones y exportación PDF/Excel.
5. Integraciones GraphQL, modelos de predicción y recomendaciones IA.
