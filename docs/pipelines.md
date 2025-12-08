# Pipelines (GitHub Actions)

Este documento describe los workflows que se implementarán para cumplir con los requisitos de build, tests, despliegue en QA, pruebas de integración y aprobación manual previa a producción usando únicamente Google Cloud Run y GitHub Actions.

## Workflow `ci.yml`
**Disparadores**: `pull_request` hacia `main` y `push` a cualquier rama.

**Jobs**
1. `frontend-tests`
   - Node 20 con cache de npm.
   - `npm ci` + `npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage`.
   - Artefactos: `frontend-coverage/`.
2. `backend-tests`
   - Python 3.11 cacheado.
   - `pytest -m "not integration" --junitxml=pytest-unit.xml --cov=app --cov-fail-under=70`.
   - Artefactos: `backend-coverage.xml` y reporte JUnit.
3. `sonarcloud`
   - Descarga coverage (front/back) y ejecuta `SonarSource/sonarqube-scan-action@v5`.
4. `e2e-tests`
   - `docker compose -f docker-compose.dev.yml up db api` (backend FastAPI + Postgres).
   - Genera `.env` temporal con secrets para CI.
   - Ejecuta `npm run e2e:ci` (Cypress) y sube screenshots.

**Resultado**: si cualquiera falla, el PR queda en rojo y `deploy.yml` no se dispara.

## Workflow `deploy.yml`
**Disparadores**: `push` a `main` o `workflow_dispatch`.

**Jobs**
1. `tests`
   - Invoca `ci.yml` vía `workflow_call`. Si falla, el pipeline termina.
2. `build-backend`
   - `docker build -f backend/Dockerfile` → `us-central1-docker.pkg.dev/final-ing-3/final-ing-3-repo/backend:${GITHUB_SHA}`.
3. `build-frontend-qa`
   - `docker build -f frontend/Dockerfile --build-arg API_URL=$QA_API_URL`.
4. `deploy-backend-qa`
   - `google-github-actions/deploy-cloudrun@v2` con `env_vars` (`DATABASE_URL_QA`, `SECRET_KEY`, etc.).
5. `deploy-frontend-qa`
   - Cloud Run `final-ing-3-web-qa-quelas-rivero`.
6. `qa-healthcheck`
   - Poll `${QA_API_URL}/health` hasta recibir 200 (máx 20 intentos).
7. `integration-tests`
   - `pytest -m integration --no-cov --junitxml=pytest-integration.xml` apuntando a QA.
8. `approval-prod`
   - `environment: production`, requiere aprobación en la UI.
9. `deploy-backend-prod`
   - Mismo proceso que QA pero con `DATABASE_URL_PROD`, `SECRET_KEY`, `SESSION_SECRET_KEY` PROD.
10. `deploy-frontend-prod`
    - Cloud Run `final-ing-3-web-prod-quelas-rivero` con `API_URL=$PROD_API_URL`.

## Artefactos y notificaciones
- `frontend-coverage`, `backend-coverage`, `pytest-unit.xml`, `pytest-integration.xml`, screenshots de Cypress.
- Los logs de aprobación quedan en `Settings → Environments → production`.

## Estrategia de rollback
- Cloud Run conserva revisiones; para revertir:
  ```
  gcloud run services update-traffic final-ing-3-api-prod-quelas-rivero \
    --region us-central1 --to-revisions REVISION-ID=100
  ```
- También puede revertirse via UI (`Revisions` → `Deploy revision`).
