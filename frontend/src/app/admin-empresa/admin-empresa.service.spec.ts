import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AdminEmpresaService, VehiculoCreate, ServicioCreate, ServicioUpdate, ContactoCreate, EmpresaSelfUpdate } from './admin-empresa.service';
import { environment } from '../../environments/environment';

describe('AdminEmpresaService', () => {
  let service: AdminEmpresaService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminEmpresaService],
    });
    service = TestBed.inject(AdminEmpresaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtiene catálogos de tipos', () => {
    service.getTiposVehiculo().subscribe();
    expect(http.expectOne(`${api}/tipos/vehiculo`).request.method).toBe('GET');

    service.getTiposServicio().subscribe();
    expect(http.expectOne(`${api}/tipos/servicio`).request.method).toBe('GET');

    service.getTiposContacto().subscribe();
    expect(http.expectOne(`${api}/tipos/contacto`).request.method).toBe('GET');

    service.getTiposServicioPolo().subscribe();
    expect(http.expectOne(`${api}/tipos/servicio-polo`).request.method).toBe('GET');
  });

  it('gestiona vehículos (create/update/delete)', () => {
    const vehiculo: VehiculoCreate = { id_tipo_vehiculo: 1, horarios: '8-18', frecuencia: 'diaria', datos: {} };

    service.createVehiculo(vehiculo).subscribe();
    expect(http.expectOne(`${api}/vehiculos`).request.method).toBe('POST');

    service.updateVehiculo(5, vehiculo).subscribe();
    const putReq = http.expectOne(`${api}/vehiculos/5`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.id_tipo_vehiculo).toBe(1);

    service.deleteVehiculo(5).subscribe();
    expect(http.expectOne(`${api}/vehiculos/5`).request.method).toBe('DELETE');
  });

  it('gestiona servicios (create/update/delete)', () => {
    const svc: ServicioCreate = { datos: { a: 1 }, id_tipo_servicio: 2 };
    const svcUpdate: ServicioUpdate = { datos: { b: 2 } };

    service.createServicio(svc).subscribe();
    expect(http.expectOne(`${api}/servicios`).request.method).toBe('POST');

    service.updateServicio(9, svcUpdate).subscribe();
    expect(http.expectOne(`${api}/servicios/9`).request.method).toBe('PUT');

    service.deleteServicio(9).subscribe();
    expect(http.expectOne(`${api}/servicios/9`).request.method).toBe('DELETE');
  });

  it('gestiona contactos (create/update/delete)', () => {
    const contacto: ContactoCreate = {
      id_tipo_contacto: 1,
      nombre: 'Juan',
      telefono: '123',
      id_servicio_polo: 3,
    };

    service.createContacto(contacto).subscribe();
    expect(http.expectOne(`${api}/contactos`).request.method).toBe('POST');

    service.updateContacto(7, contacto).subscribe();
    expect(http.expectOne(`${api}/contactos/7`).request.method).toBe('PUT');

    service.deleteContacto(7).subscribe();
    expect(http.expectOne(`${api}/contactos/7`).request.method).toBe('DELETE');
  });

  it('actualiza y obtiene datos de empresa', () => {
    const update: EmpresaSelfUpdate = { cant_empleados: 10 };

    service.updateMyCompany(update).subscribe();
    expect(http.expectOne(`${api}/companies/me`).request.method).toBe('PUT');

    service.getMyCompanyDetails().subscribe();
    expect(http.expectOne(`${api}/me`).request.method).toBe('GET');
  });

  it('gestiona servicios polo y password request', () => {
    service.changePasswordRequest().subscribe();
    expect(
      http.expectOne(`${api}/password-reset/request-logged-user`).request.method
    ).toBe('POST');

    service.updatePassword('123').subscribe();
    const put = http.expectOne(`${api}/update_password`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.password).toBe('123');
  });
});
