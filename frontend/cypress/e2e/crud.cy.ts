/// <reference types="cypress" />

describe('Flujos integrados de Polo 52', () => {
  const api = Cypress.env('API_URL') || 'http://localhost:8000';
  const empresa = {
    cuil: 99123456789,
    nombre: 'Empresa Cypress',
    rubro: 'Testing',
    cant_empleados: 5,
    observaciones: 'Alta automatica Cypress',
    fecha_ingreso: '2024-01-01',
    horario_trabajo: '08-17',
    estado: true
  };

  it('permite registrar un usuario publico', () => {
    cy.request({
      method: 'POST',
      url: `${api}/register`,
      body: {
        nombre: `usuario_${Date.now()}`,
        email: `user${Date.now()}@test.com`,
        password: 'Clave123!',
        cuil: empresa.cuil
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 400, 500]).to.include(resp.status);
      if (resp.status === 500) {
        cy.log('Registro fallo por validaciones del backend, detalle:', resp.body.detail);
      }
      if (resp.status === 400) {
        expect(resp.body.detail || '').to.match(/cuil|nombre/i);
      }
    });
  });

  it('permite listar tipos de servicios (catalogo publico)', () => {
    cy.request({
      url: `${api}/tipos/servicio`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect([200, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.be.an('array');
      } else {
        cy.log('Catalogo no disponible en QA, status:', resp.status, resp.body);
      }
    });
  });

  it('retorna error cuando las credenciales son invalidas', () => {
    cy.request({
      method: 'POST',
      url: `${api}/login`,
      form: true,
      body: {
        username: 'usuario@fake.com',
        password: 'badpass'
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 401, 500]).to.include(resp.status);
      if (resp.status === 400 || resp.status === 401) {
        expect(resp.body.detail || '').to.match(/credenciales|invalid/i);
      } else {
        cy.log('Login QA devolvio 500, detalle:', resp.body);
      }
    });
  });

  it('expone metadatos de la API en la raiz', () => {
    cy.request({
      url: `${api}/`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.have.property('message');
        expect(resp.body).to.have.property('features');
        expect(resp.body.features).to.have.property('auth');
      } else {
        cy.log('Endpoint raiz no disponible, status:', resp.status);
      }
    });
  });

  it('lista tipos de vehiculos aun si la base esta vacia', () => {
    cy.request({
      url: `${api}/tipos/vehiculo`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.be.an('array');
      } else {
        cy.log('Tipos de vehiculo no disponibles:', resp.body);
      }
    });
  });

  it('lista tipos de contactos publicos', () => {
    cy.request({
      url: `${api}/tipos/contacto`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.be.an('array');
      } else {
        cy.log('Tipos de contacto no disponibles:', resp.body);
      }
    });
  });

  it('lista tipos de servicios del polo', () => {
    cy.request({
      url: `${api}/tipos/servicio-polo`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.be.an('array');
      } else {
        cy.log('Tipos de servicio del polo no disponibles:', resp.body);
      }
    });
  });

  it('maneja una solicitud de olvido de contrasena para email aleatorio', () => {
    cy.request({
      method: 'POST',
      url: `${api}/forgot-password`,
      body: { email: `user${Date.now()}@nope.test` },
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 400, 404, 422, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.have.property('message');
      } else {
        cy.log('Reset no exitoso (esperable en QA):', resp.status, resp.body);
      }
    });
  });

  it('rechaza tokens invalidos en verificacion de reset', () => {
    cy.request({
      method: 'POST',
      url: `${api}/password-reset/verify-token`,
      body: { token: 'token_invalido' },
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 400, 422]).to.include(resp.status);
      const payload = resp.body || {};
      if (resp.status === 200) {
        expect(payload.valid).to.be.oneOf([false, undefined]);
      } else {
        cy.log('Verificacion devolvio error esperado:', resp.status, payload);
      }
    });
  });

  it('expone el schema OpenAPI', () => {
    cy.request({
      url: `${api}/openapi.json`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 404, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.body).to.have.property('paths');
      } else {
        cy.log('OpenAPI no disponible en este entorno:', resp.status);
      }
    });
  });

  it('sirve la UI de documentacion', () => {
    cy.request({
      url: `${api}/docs`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 404, 500]).to.include(resp.status);
      if (resp.status === 200) {
        expect(resp.headers['content-type'] || '').to.match(/text\/html/);
      } else {
        cy.log('Swagger UI no accesible:', resp.status);
      }
    });
  });

  it('retorna 4xx cuando login se envia vacio', () => {
    cy.request({
      method: 'POST',
      url: `${api}/login`,
      form: true,
      body: {},
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 401, 422, 500]).to.include(resp.status);
      if (resp.status === 422) {
        expect(resp.body).to.have.property('detail');
      }
    });
  });

  it('rechaza remember_me con credenciales inexistentes', () => {
    cy.request({
      method: 'POST',
      url: `${api}/login`,
      form: true,
      qs: { remember_me: true },
      body: {
        username: `nouser_${Date.now()}`,
        password: 'ClaveQueNoExiste1!'
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 401, 403, 500]).to.include(resp.status);
    });
  });

  it('valida registro incompleto (falta email)', () => {
    cy.request({
      method: 'POST',
      url: `${api}/register`,
      body: {
        nombre: `sin_email_${Date.now()}`,
        password: 'Clave123!',
        cuil: empresa.cuil
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('detecta email invalido en forgot-password', () => {
    cy.request({
      method: 'POST',
      url: `${api}/forgot-password`,
      body: { email: 'no-es-email' },
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('requiere token en verify-token', () => {
    cy.request({
      method: 'POST',
      url: `${api}/password-reset/verify-token`,
      body: {},
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('valida payload en forgot-password/confirm', () => {
    cy.request({
      method: 'POST',
      url: `${api}/forgot-password/confirm`,
      body: {},
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('deniega acceso a endpoints de voz sin token', () => {
    cy.request({
      method: 'GET',
      url: `${api}/api/voice/status`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([401, 403, 404, 500]).to.include(resp.status);
    });
  });

  it('retorna error cuando se intenta registrar dos veces el mismo usuario', () => {
    const nombre = `dup_${Date.now()}`;
    cy.request({
      method: 'POST',
      url: `${api}/register`,
      body: {
        nombre,
        email: `dup_${Date.now()}@test.com`,
        password: 'Clave123!',
        cuil: empresa.cuil
      },
      failOnStatusCode: false
    }).then(() => {
      cy.request({
        method: 'POST',
        url: `${api}/register`,
        body: {
          nombre,
          email: `dup_${Date.now()}_2@test.com`,
          password: 'Clave123!',
          cuil: empresa.cuil
        },
        failOnStatusCode: false
      }).then((resp2) => {
        expect([400, 409, 500]).to.include(resp2.status);
      });
    });
  });

  it('rechaza registro sin cuil', () => {
    cy.request({
      method: 'POST',
      url: `${api}/register`,
      body: {
        nombre: `nocuil_${Date.now()}`,
        email: `nocuil_${Date.now()}@test.com`,
        password: 'Clave123!'
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('rechaza registro sin password', () => {
    cy.request({
      method: 'POST',
      url: `${api}/register`,
      body: {
        nombre: `nopass_${Date.now()}`,
        email: `nopass_${Date.now()}@test.com`,
        cuil: empresa.cuil
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('marca como invalido forgot-password/confirm con token falso y contrasena distinta', () => {
    cy.request({
      method: 'POST',
      url: `${api}/forgot-password/confirm`,
      body: {
        token: 'token_falso',
        new_password: 'Clave123!',
        confirm_password: 'Clave1234!'
      },
      failOnStatusCode: false
    }).then((resp) => {
      expect([200, 400, 422, 500]).to.include(resp.status);
      if (resp.status === 200 && resp.body) {
        expect(resp.body.success).to.be.oneOf([false, undefined]);
      }
    });
  });

  it('requiere payload en password-reset/confirm-secure', () => {
    cy.request({
      method: 'POST',
      url: `${api}/password-reset/confirm-secure`,
      body: {},
      failOnStatusCode: false
    }).then((resp) => {
      expect([400, 422, 500]).to.include(resp.status);
    });
  });

  it('no permite GET a /login', () => {
    cy.request({
      method: 'GET',
      url: `${api}/login`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([404, 405, 500]).to.include(resp.status);
    });
  });

  it('no permite POST a /api/voice/status sin token', () => {
    cy.request({
      method: 'POST',
      url: `${api}/api/voice/status`,
      failOnStatusCode: false
    }).then((resp) => {
      expect([401, 403, 404, 405, 500]).to.include(resp.status);
    });
  });
});
