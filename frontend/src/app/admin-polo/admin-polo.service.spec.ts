import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AdminPoloService, UsuarioCreate, UsuarioUpdate, EmpresaCreate, EmpresaUpdate, ServicioPoloCreate, LoteCreate, PoloSelfUpdate } from './admin-polo.service';
import { environment } from '../../environments/environment';

describe('AdminPoloService', () => {
  let service: AdminPoloService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminPoloService],
    });
    service = TestBed.inject(AdminPoloService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('opera sobre perfil de polo y changePasswordRequest', () => {
    const update: PoloSelfUpdate = { cant_empleados: 5, horario_trabajo: '8-17' };

    service.getPoloDetails().subscribe();
    expect(http.expectOne(`${api}/polo/me`).request.method).toBe('GET');

    service.updatePolo(update).subscribe();
    const put = http.expectOne(`${api}/polo/me`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.cant_empleados).toBe(5);

    service.changePasswordRequest().subscribe();
    expect(http.expectOne(`${api}/polo/change-password-request`).request.method).toBe('POST');
  });

  it('gestiona roles y usuarios', () => {
    const usuario: UsuarioCreate = {
      email: 'a@b.com',
      nombre: 'Ana',
      estado: true,
      cuil: 20,
      id_rol: 1,
    };
    const update: UsuarioUpdate = { estado: false };

    service.getRoles().subscribe();
    expect(http.expectOne(`${api}/roles`).request.method).toBe('GET');

    service.getUsers().subscribe();
    expect(http.expectOne(`${api}/usuarios`).request.method).toBe('GET');

    service.getUser('id1').subscribe();
    expect(http.expectOne(`${api}/usuarios/id1`).request.method).toBe('GET');

    service.createUser(usuario).subscribe();
    expect(http.expectOne(`${api}/usuarios`).request.method).toBe('POST');

    service.updateUser('id1', update).subscribe();
    expect(http.expectOne(`${api}/usuarios/id1`).request.method).toBe('PUT');

    service.deleteUser('id1').subscribe();
    expect(http.expectOne(`${api}/usuarios/id1`).request.method).toBe('DELETE');
  });

  it('gestiona empresas', () => {
    const create: EmpresaCreate = {
      cuil: 1,
      nombre: 'ACME',
      rubro: 'tech',
      cant_empleados: 10,
      estado: true,
      horario_trabajo: '8-17',
    };
    const update: EmpresaUpdate = { estado: false };

    service.getEmpresas().subscribe();
    expect(http.expectOne(`${api}/empresas`).request.method).toBe('GET');

    service.createEmpresa(create).subscribe();
    expect(http.expectOne(`${api}/empresas`).request.method).toBe('POST');

    service.updateEmpresa(1, update).subscribe();
    expect(http.expectOne(`${api}/empresas/1`).request.method).toBe('PUT');

    service.deleteEmpresa(1).subscribe();
    expect(http.expectOne(`${api}/empresas/1`).request.method).toBe('DELETE');

    service.activarEmpresa(1).subscribe();
    expect(http.expectOne(`${api}/empresas/1/activar`).request.method).toBe('PUT');

    service.desactivarEmpresa(1).subscribe();
    expect(http.expectOne(`${api}/empresas/1/desactivar`).request.method).toBe('PUT');
  });

  it('gestiona servicios de polo y lotes', () => {
    const svc: ServicioPoloCreate = {
      nombre: 'Luz',
      id_tipo_servicio_polo: 2,
      cuil: 1,
    };
    const lote: LoteCreate = { dueno: 'Ana', lote: 2, manzana: 1, id_servicio_polo: 3 };

    service.getServiciosPolo().subscribe();
    expect(http.expectOne(`${api}/serviciopolo`).request.method).toBe('GET');

    service.createServicioPolo(svc).subscribe();
    expect(http.expectOne(`${api}/serviciopolo`).request.method).toBe('POST');

    service.deleteServicioPolo(5).subscribe();
    expect(http.expectOne(`${api}/serviciopolo/5`).request.method).toBe('DELETE');

    service.getLotes().subscribe();
    expect(http.expectOne(`${api}/lotes`).request.method).toBe('GET');

    service.createLote(lote).subscribe();
    expect(http.expectOne(`${api}/lotes`).request.method).toBe('POST');

    service.deleteLote(7).subscribe();
    expect(http.expectOne(`${api}/lotes/7`).request.method).toBe('DELETE');
  });
});
