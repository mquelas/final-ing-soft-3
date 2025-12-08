# Inventario de Tests

Resumen de los casos unitarios e integración existentes y plan para alcanzar/mostrar los ≥40 tests requeridos.

## Backend (pytest)
Actualmente hay 15 módulos unitarios bajo `backend/tests/` y 2 suites marcadas como integración.

| Archivo | Tipo | Cobertura principal |
|---------|------|--------------------|
| `test_app_endpoints.py` | Unit | `/` y `/health`, estado del servicio |
| `test_auth_endpoints.py` | Unit | Login, registro, refresh, validación de tokens |
| `test_auth_change_password.py` | Unit | Reglas de cambio seguro con throttling |
| `test_auth_password_reset_endpoints.py` | Unit | Flujo de password reset con links mágicos |
| `test_services_password_reset.py` | Unit | Utilidades de tokens, historial de contraseñas y validadores |
| `test_services_utils.py` | Unit | Helpers genéricos (hashing, validaciones, cache) |
| `test_admin_users.py` | Unit | Lógica de límites y creación de admins |
| `test_admin_users_routes.py` | Unit | Endpoints REST admin polo |
| `test_company_user_endpoints.py` | Unit | APIs para admins de empresa/usuarios finales |
| `test_tipos_routes.py` | Unit | Catálogos del tótem |
| `test_chat_routes.py` | Unit | Chatbot texto (Gemini) |
| `test_voice_routes.py` | Unit | Speech-to-Text/Text-to-Speech y validaciones |
| `test_google_auth_routes.py` | Unit | OAuth con Google |
| `test_services_utils.py` | Unit | Funciones utilitarias compartidas |
| `test_admin_users.py` | Unit | Validaciones de negocio admin |
| `test_services_password_reset.py` | Unit | Gestión de tokens y correo |
| `integration/test_google_speech.py` | Integration | Inicialización de `google-cloud-speech` con credenciales reales |
| `integration/test_db_metadata.py` | Integration | Consultas reales a PostgreSQL (metadata y conteo) |

> Nota: `rg` muestra 73 definiciones `def test_*`. Mantener o incrementar este número al refactorizar.

### Cómo ejecutar
- Unitarios: `cd backend && pytest -m "not integration" --maxfail=1 --disable-warnings`
- Integración: `cd backend && pytest -m integration --base-url=$QA_BASE_URL`

Los reportes en CI se exportarán en formato JUnit (`pytest --junitxml=report.xml`).

## Frontend (Angular)
Suite actual y planes de mejora:

| Archivo | Tipo | Cobertura principal |
|---------|------|--------------------|
| `app/app.component.spec.ts` | Unit | Render básico y título |
| `auth/services/auth.service.spec.ts` | Unit | `login`, `logout`, expiración de tokens (mock de `HttpClient` y `localStorage`) |
| `auth/components/logout-button/logout-button.component.spec.ts` | Unit | Botón logout con `AuthenticationService` mockeado |
| `chat/services/chat.service.spec.ts` | Unit | Llamadas a `/api/voice/chat` y `/api/voice/synthesize-base64` usando `HttpTestingController` |
| `reset-password/password-reset.component.spec.ts` | Unit | Validaciones de formulario y flujo completo de reset |
| `app/interceptors/auth.interceptor.spec.ts` | Unit | Inyección de header `Authorization` y manejo de 401 |
| `cypress/e2e/crud.cy.ts` | E2E | Flujos integrados (registro público, listado de servicios, manejo de login inválido) |

- **Mocks**: se usa `HttpClientTestingModule`, `provideHttpClientTesting`, `RouterTestingModule` y un mock de `localStorage` para desacoplar servicios reales.
- **Comando**: `cd frontend && npm run test -- --watch=false --code-coverage`.
- **Necesidades**: sumar specs para componentes de admin (formularios) y pipes personalizados.

### E2E (Cypress)
- Archivo `frontend/cypress/e2e/crud.cy.ts`.
- Flujos cubiertos:
  1. Registro de usuario público (tolerando 200/400/500 según respuesta).
  2. Listado de tipos de servicio (`/tipos/servicio`).
  3. Login inválido devuelve 401 con mensaje.
- Comando local/CI: `npm run e2e:ci` (inicia Angular con `start-server-and-test` y ejecuta `cypress run --browser chrome`).
- Artefactos: screenshots automáticos en `frontend/cypress/screenshots`.

## Reportes y trazabilidad
- GitHub Actions guardará los artefactos `backend-unit-tests.xml`, `backend-integration-tests.xml`, `frontend-unit-tests.xml` y los reportes de cobertura.
- `docs/tests.md` se actualizará para listar nuevos módulos o escenarios especiales (por ejemplo, pruebas de fallos solicitadas por el profesor).
- Documentar en cada PR qué pruebas se añadieron o tocaron.

### Cobertura de código
- Pytest se ejecuta con `pytest --cov=app` y genera `backend/coverage.xml`. El archivo está gobernado por `backend/.coveragerc`, que exige `fail_under = 70` y muestra las líneas faltantes. El pipeline sube este reporte como artefacto (`backend-coverage`).
- Angular Karma genera `frontend/coverage/lcov.info`. Este archivo también se publica como artefacto (`frontend-coverage`) y sirve para SonarCloud.
- Para revisar localmente:
  ```bash
  cd backend && coverage html  # abre backend/htmlcov/index.html
  cd frontend && npm run test -- --watch=false --code-coverage && npx http-server coverage
  ```
- Los módulos con menor cobertura (según los últimos reportes) son los servicios de administración (`admin_polo`, `admin_empresa`) y componentes de login. Se añadieron tareas en el backlog para cubrir estos flujos con Cypress/end-to-end.

## Próximos pasos de testing
1. Reforzar specs de Angular para cubrir servicios `auth.service.ts`, `chat.service.ts` y componentes de formularios.
2. Añadir pruebas de integración HTTP que apunten al Cloud Run de QA (`/health`, `/api/voice/status`, `/auth/login`).
3. Configurar pruebas e2e en CI para ejecutarse tras el deploy QA, antes de la aprobación manual.
4. Preparar scripts/documentación para el escenario “el profesor pide cambio y falla un test”: se documentará en `docs/validation.md`.
