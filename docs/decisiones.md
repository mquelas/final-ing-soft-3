# Decisiones Arquitectónicas y Técnicas

## Stack tecnológico

| Capa    | Tecnología | Justificación |
| ------- | ---------- | -------------- |
| Frontend | Angular 17 + Karma/Jasmine + Cypress | SPA mantenida desde TPs anteriores, tooling maduro para unit/E2E y buen soporte en GitHub Actions. |
| Backend  | FastAPI (Python 3.11) + SQLAlchemy + PostgreSQL | Framework asincrónico liviano, fácil de dockerizar y compatible con Sqlite en memoria para los tests unitarios. |
| Base de datos | PostgreSQL 15 (contenedorizado) | Disponible en Docker y Cloud Run, permite usar el mismo esquema local/QA/Prod. |

## Servicios cloud elegidos

| Categoría | Servicio | Motivo |
| --------- | -------- | ------ |
| Container Registry | **Artifact Registry (GCP)** | Vive en el mismo proyecto `final-ing-3` que Cloud Run, sin costos adicionales dentro del free tier, IAM granular (roles `artifactregistry.writer` y `run.admin` para `github-actions-sa`). |
| Hosting QA/Prod | **Google Cloud Run** (servicios `final-ing-3-api-*` y `final-ing-3-web-*`) | Serverless container nativo, integra con Artifact Registry y soporta variables por entorno sin administrar clusters. Permite auto-escalado y revisiones para rollback. |
| CI/CD | **GitHub Actions** | Reutiliza el mismo repositorio (`final-ing-soft-3`), nos da runners gratuitos, marketplace con acciones oficiales de Google y permite gates manuales (`environment: production`). |

## Registry y versionado

1. Repository `final-ing-3-repo` creado con `gcloud artifacts repositories create final-ing-3-repo --repository-format=docker --location=us-central1`.
2. Service account `github-actions-sa@final-ing-3.iam.gserviceaccount.com` con roles:
   - `roles/artifactregistry.writer`
   - `roles/run.admin` / `roles/storage.admin` (para desplegar en Cloud Run)
3. Pipeline (`deploy.yml`) autentica con `google-github-actions/auth@v2` + `gcloud auth configure-docker` y publica imágenes usando tags `:${GITHUB_SHA}`:
   ```
   us-central1-docker.pkg.dev/final-ing-3/final-ing-3-repo/backend:${GITHUB_SHA}
   us-central1-docker.pkg.dev/final-ing-3/final-ing-3-repo/frontend-qa:${GITHUB_SHA}
   us-central1-docker.pkg.dev/final-ing-3/final-ing-3-repo/frontend-prod:${GITHUB_SHA}
   ```
4. Justificación: compartir proyecto con Cloud Run elimina costos de egress, evita límites de rate y mantiene todo dentro del ecosistema GCP.

## Ambientes QA vs Prod

| Aspecto | QA | PROD | Justificación |
| ------- | -- | ---- | ------------- |
| Servicios | `final-ing-3-api-qa-quelas-rivero`, `final-ing-3-web-qa-quelas-rivero` | `final-ing-3-api-prod-quelas-rivero`, `final-ing-3-web-prod-quelas-rivero` | Servicios separados para aislar releases. |
| Recursos | 1 vCPU, 512 MiB, min instances = 0 | 1 vCPU, 1 GiB, min instances = 1 | QA usa mínimos del free tier, Prod reserva más memoria y al menos una instancia caliente. |
| Variables | `DATABASE_URL_QA`, `QA_API_URL`, claves QA | `DATABASE_URL_PROD`, `PROD_API_URL`, claves PROD | Secciones de Secrets en GitHub Actions + env_vars de Cloud Run. |
| Deploy | Automático en cada push a `main` | Requiere aprobación manual (`environment: production`) | Nos asegura validar QA antes de tocar usuarios reales. |
| Health check | Pipeline llama a `${QA_API_URL}/health` tras el deploy | Cloud Run monitorea `/health`; se puede invocar manualmente antes de aprobar | Garantiza que QA quedó operativo antes de pruebas de integración. |
| Monitoreo/Logs | Cloud Logging (consulta manual) | Cloud Logging + historial de revisiones para rollback | Misma herramienta para simplificar soporte. |

**Rollback**: Cloud Run conserva revisiones anteriores; si QA o Prod fallan se puede ejecutar:
```
gcloud run services update-traffic final-ing-3-api-prod-quelas-rivero \
  --region=us-central1 --to-revisions <revision-id>=100
```

## Pipeline CI/CD

1. **`ci.yml`** (trigger `pull_request`, `workflow_call`):
   - `frontend-tests`: `npm ci` + `ng test --code-coverage`, sube `frontend/coverage`.
   - `backend-tests`: `pytest -m "not integration"` con `--cov=app --cov-fail-under=70` usando Sqlite in-memory.
   - `sonarcloud`: descarga coverage, ejecuta análisis en proyecto `mquelas_final-ing-soft-3`.
   - `e2e-tests`: levanta stack con `docker compose -f docker-compose.dev.yml up`, genera `.env` efímero con secrets y ejecuta `npm run e2e:ci` (Cypress con tres flujos).

2. **`deploy.yml`** (trigger `push` a `main`):
   - `tests`: reutiliza `ci.yml` (bloquea si fallan unit tests, coverage, Sonar o E2E).
   - Build & push de imágenes backend/frontend a Artifact Registry.
   - `deploy-backend-qa` / `deploy-frontend-qa`: Cloud Run QA con env vars alusivas a QA.
   - `qa-healthcheck`: poll a `${QA_API_URL}/health`.
   - `integration-tests`: `pytest -m integration --no-cov`.
   - `approval-prod`: gate manual (`environment: production`).
   - `deploy-backend-prod` / `deploy-frontend-prod`: Cloud Run Prod con variables PROD.

3. **Quality gates**:
   - Coverage ≥ 70 % (en Pytest) y reporte de Karma.
   - SonarCloud quality gate en verde.
   - Cypress E2E + pruebas de integración exitosas.
   - Aprobación manual antes de Prod.

## Pruebas

| Tipo | Descripción | Evidencia |
| ---- | ----------- | --------- |
| Unitarias Front | `ng test --watch=false --browsers=ChromeHeadless --code-coverage` | Artefacto `frontend-coverage`, screenshot en README. |
| Unitarias Back | `pytest -m "not integration"` con fixtures Sqlite | Artefacto `backend-unit-tests` + `coverage.xml`. |
| Coverage | `pytest` con `--cov` y Karma `lcov.info` → utilizado en SonarCloud | Quality gate `fail-under=70`. |
| Estático | SonarCloud (bugs, vulnerabilities, code smells) | Dashboard `https://sonarcloud.io/project/overview?id=mquelas_final-ing-soft-3`. |
| E2E | Cypress `crud.cy.ts` (registro público, catálogo, login inválido) | `frontend/cypress/screenshots` y artefacto `cypress-results`. |
| Integración | `pytest -m integration` contra Cloud Run QA | Reporte `backend/pytest-integration.xml`. |

## Estrategia de costos y escalabilidad

- **Costos**: Cloud Run y Artifact Registry están dentro del free tier usando créditos estudiantiles. El pipeline usa runners gratuitos de GitHub.
- **Escalabilidad**: si el tráfico crece, se puede aumentar `max-instances` en Cloud Run o migrar a GKE. La arquitectura ya está containerizada; bastaría con mover las imágenes a un clúster Kubernetes y reemplazar Cloud Run por GKE/Autopilot.
- **Alternativas evaluadas**:
  - Render/Railway para hosting (descartados por límites de cold start y menor integración con GCP Identity).
  - Docker Hub como registry (descartado para evitar rate limits).
  - Azure DevOps Pipelines (descartado para simplificar la operatoria y aprovechar Actions).

## Próximos pasos

1. Capturar pantallas de Artifact Registry, Cloud Run QA/Prod y runs de GitHub Actions para adjuntarlas en la defensa.
2. Completar README con URLs (`QA_API_URL`, `PROD_API_URL`) y pasos de despliegue.
3. Mantener desactivado el “Automatic Analysis” en SonarCloud para que el job `sonarcloud` sea la única fuente de verdad.
