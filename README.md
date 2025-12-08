# Totem Polo52

Aplicación integral (Angular + FastAPI + PostgreSQL) para operar el tótem interactivo del Parque Industrial Polo 52. El sistema ofrece login JWT y Google OAuth, paneles separados para administradores del polo y de empresas, chatbot con voz (Gemini + Google Speech) y workflows de recuperación/rotación de contraseñas.

## Arquitectura

- **Frontend**: Angular 19, componentes standalone, interceptores para adjuntar tokens, servicios especializados para panel público, admin polo, admin empresa, chat y flujos de password reset.
- **Backend**: FastAPI, SQLAlchemy ORM y modelos normalizados (empresa, usuario, roles, servicios). Los módulos `routes/`, `schemas/` y `services.py` encapsulan login JWT, recuperación por email, cache de tokens usados y chatbot de voz.
- **Base de datos**: PostgreSQL. SQLAlchemy gestiona relaciones, cascadas y sesiones (`SessionLocal`).
- **Testing**: Pytest con 15 módulos unitarios (≈70 tests) y 2 suites de integración (`backend/tests/integration`). El frontend conserva 6 specs de Angular (pieza a reforzar).

## Estructura del repositorio

```
backend/
  app/        # Código FastAPI
  tests/      # Unit & integration tests (pytest)
  docs/       # Historias de usuario y reportes actuales
frontend/
  src/        # Angular 19 standalone app
  tests/      # (Futuros e2e)
docs/         # Documentación operativa del proyecto (se llena en este plan)
pytest.ini    # Configuración global de pytest
```

## Despliegues en la nube

| Ambiente | Backend | Frontend | Configuración |
| -------- | ------- | -------- | ------------- |
| QA | `https://final-ing-3-api-qa-quelas-rivero-…run.app` | `https://final-ing-3-web-qa-quelas-rivero-…run.app` | 1 vCPU / 512 MiB, instancias mínimas 0, variables `*_QA`. Pipeline ejecuta health check + `pytest -m integration` tras cada deploy. |
| PROD | `https://final-ing-3-api-prod-quelas-rivero-…run.app` | `https://final-ing-3-web-prod-quelas-rivero-…run.app` | 1 vCPU / 1 GiB, min instances 1, secretos `*_PROD`. Promoción solo tras aprobación manual (`environment: production`). |

- **Registry**: Artifact Registry `final-ing-3-repo` (us-central1). Las imágenes se taggean con el `GITHUB_SHA`.
- **Rollback**: Cloud Run permite enrutar tráfico a revisiones previas (`gcloud run services update-traffic …`).

Más detalles en `docs/decisiones.md`.

## Variables de entorno

Todos los servicios leen variables desde `.env`. Use `.env.example` (crear en este plan) para replicar localmente y rellenar secretos en GitHub Actions.

Backend principales:

- `DATABASE_URL` (`postgresql+psycopg2://user:pass@host:5432/db`)
- `SECRET_KEY`, `SESSION_SECRET_KEY`, `ENVIRONMENT`
- `EMAIL_USER`, `EMAIL_PASS`, `SMTP_SERVER`, `SMTP_PORT`
- `GOOGLE_API_KEY`, `GEMINI_MODEL`, `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

Frontend:

- `environment.ts` define `apiUrl`. En CI/CD se sobreescribirá con `API_URL` antes de compilar.

## Levantar localmente

1. Clonar el repo y crear `.env` a partir de `.env.example`.
2. Backend:
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run start
   ```
4. Navegar a `http://localhost:4200` (frontend) y API en `http://localhost:8000/docs`.

### Con Docker / Docker Compose

- Construir imágenes individuales:
  ```bash
  make build-backend
  make build-frontend
  ```
- Levantar entorno local con PostgreSQL usando Docker Compose:
  ```bash
  make compose-up
  # o directamente
  docker compose -f docker-compose.dev.yml up --build
  ```
  Esto levanta `db` (Postgres) y `api` (FastAPI con Uvicorn). Recuerda actualizar `DATABASE_URL` si cambias credenciales.

## Estrategia de testing

| Tipo | Herramienta | Detalle |
| ---- | ----------- | ------- |
| Unitarias backend | Pytest + Sqlite in-memory | Ejecuta `pytest -m "not integration"` con `--cov=app --cov-fail-under=70`. Reporte `backend/coverage.xml`. |
| Integración backend | Pytest (`-m integration`) | Corre contra Cloud Run QA tras el deploy. Artefacto `pytest-integration.xml`. |
| Unitarias frontend | Angular CLI / Karma | `npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage`. Sube carpeta `frontend/coverage`. |
| Estático | SonarCloud | Job `sonarcloud` consume los reportes de coverage y valida bugs/vulnerabilidades. |
| E2E | Cypress 15 | `npm run e2e:ci` sobre Docker Compose. Flujos: registro público, catálogo de tipos, login inválido. Screenshots almacenados en `frontend/cypress/screenshots`. |

Resultados y casos detallados en `docs/tests.md`.

## CI/CD

- **`ci.yml`** (PR / push / `workflow_call`):
  1. `frontend-tests`: Node 20 + `npm ci` + Karma con coverage.
  2. `backend-tests`: Python 3.11 + `pytest -m "not integration"` (coverage ≥70).
  3. `sonarcloud`: descarga artefactos de coverage y ejecuta análisis en el proyecto `mquelas_final-ing-soft-3`.
  4. `e2e-tests`: levanta stack con `docker-compose.dev.yml`, inyecta `.env` efímero y ejecuta Cypress.
- **`deploy.yml`** (push a `main`):
  1. `tests`: reutiliza `ci.yml` (bloquea si algo falla).
  2. `build-backend` / `build-frontend-qa`: construyen imágenes y las envían a Artifact Registry.
  3. `deploy-backend-qa` / `deploy-frontend-qa`: Cloud Run QA con secretos QA.
  4. `qa-healthcheck`: espera a que `${QA_API_URL}/health` responda 200.
  5. `integration-tests`: `pytest -m integration --no-cov`.
  6. `approval-prod`: gate manual (`environment: production`).
  7. `deploy-backend-prod` / `deploy-frontend-prod`: Cloud Run PROD con secretos PROD.

Cada etapa publica artefactos (reportes, coverage, screenshots) para la defensa. El pipeline completo se describe en `docs/pipelines.md` y las decisiones de infraestructura en `docs/decisiones.md`.

## Documentación adicional

El directorio `docs/` contendrá:

1. `setup.md`: variables, dependencias, cómo cargar secretos (GitHub + GCP).
2. `tests.md`: inventario de casos unitarios/integración y cómo interpretarlos.
3. `pipelines.md`: detalle de los workflows, ambientes y manual approval.
4. `validation.md`: guías para los escenarios de validación que pedirá el profesor (cambios en código/test y cómo afectan el pipeline).

Con esto el proyecto queda listo para los siguientes pasos: contenerizar, automatizar pipelines y preparar despliegues QA/Prod enteramente sobre Google Cloud Run.
