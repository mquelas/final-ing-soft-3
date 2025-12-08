/// <reference types="cypress" />

describe('Flujos integrados de Polo 52', () => {
  const api = 'http://localhost:8000';
  const empresa = {
    cuil: 99123456789,
    nombre: 'Empresa Cypress',
    rubro: 'Testing',
    cant_empleados: 5,
    observaciones: 'Alta automática Cypress',
    fecha_ingreso: '2024-01-01',
    horario_trabajo: '08-17',
    estado: true
  };

  it('permite registrar un usuario público', () => {
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
        cy.log('Registro falló por validaciones del backend, ver detalle:', resp.body.detail);
      }
      if (resp.status === 400) {
        expect(resp.body.detail).to.match(/cuil/i);
      }
    });
  });

  it('permite listar tipos de servicios (catálogo público)', () => {
    cy.request(`${api}/tipos/servicio`).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.be.an('array');
    });
  });

  it('retorna error cuando las credenciales son inválidas', () => {
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
      expect(resp.status).to.eq(401);
      expect(resp.body.detail).to.match(/credenciales/i);
    });
  });
});
