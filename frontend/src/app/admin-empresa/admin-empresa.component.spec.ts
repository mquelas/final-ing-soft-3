import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmpresaMeComponent } from './admin-empresa.component';
import { AdminEmpresaService } from './admin-empresa.service';
import { AuthenticationService } from '../auth/auth.service';
import { of } from 'rxjs';

describe('AdminEmpresaComponent', () => {
  let component: EmpresaMeComponent;
  let fixture: ComponentFixture<EmpresaMeComponent>;
  let adminService: jasmine.SpyObj<AdminEmpresaService>;

  beforeEach(async () => {
    adminService = jasmine.createSpyObj<AdminEmpresaService>(
      'AdminEmpresaService',
      [
        'getTiposServicioPolo',
        'getTiposVehiculo',
        'getTiposServicio',
        'getTiposContacto',
        'getMyCompanyDetails',
      ]
    );

    adminService.getTiposServicioPolo.and.returnValue(of([]));
    adminService.getTiposVehiculo.and.returnValue(of([]));
    adminService.getTiposServicio.and.returnValue(of([]));
    adminService.getTiposContacto.and.returnValue(of([]));
    adminService.getMyCompanyDetails.and.returnValue(
      of({
        cuil: 1,
        nombre: 'ACME',
        rubro: 'Tech',
        cant_empleados: 10,
        observaciones: '',
        fecha_ingreso: '2020-01-01',
        horario_trabajo: '9-18',
        vehiculos: [],
        contactos: [],
        servicios: [],
        servicios_polo: [],
      })
    );

    await TestBed.configureTestingModule({
      imports: [EmpresaMeComponent],
      providers: [
        { provide: AdminEmpresaService, useValue: adminService },
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['getToken']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpresaMeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('formatBoolean devuelve Si/No y fallback', () => {
    expect(component.formatBoolean(true)).toBe('Si');
    expect(component.formatBoolean('yes')).toBe('Si');
    expect(component.formatBoolean(false)).toBe('No');
    expect(component.formatBoolean('no')).toBe('No');
    expect(component.formatBoolean('otro')).toBe('otro');
  });

  it('setActiveTab cambia pestaña y limpia formularios visibles', () => {
    component.showVehiculoForm = true;
    component.showServicioForm = true;
    component.setActiveTab('vehiculos');

    expect(component.activeTab).toBe('vehiculos');
    expect(component.showVehiculoForm).toBeFalse();
    expect(component.showServicioForm).toBeFalse();
  });

  it('getTipoVehiculoName devuelve tipo segun catálogo', () => {
    component.tiposVehiculo = [{ id_tipo_vehiculo: 2, tipo: 'Personal' }];

    const name = component.getTipoVehiculoName(2);

    expect(name).toBe('Personal');
  });

  it('getTipoServicioName devuelve "-" cuando no encuentra', () => {
    component.tiposServicio = [];
    expect(component.getTipoServicioName(9)).toBe('-');
  });

  it('onTipoServicioChange asigna estructura de datos según tipo', () => {
    component.servicioForm.id_tipo_servicio = 2;
    component.servicioForm.datos = {};

    component.onTipoServicioChange();

    expect(component.servicioForm.datos).toEqual({
      abierto: '',
      m2: null,
    });
  });

  it('onVehiculoTipoChange setea campos según tipo corporativo', () => {
    component.vehiculoForm.id_tipo_vehiculo = 1;
    component.vehiculoForm.datos = {};

    component.onVehiculoTipoChange();

    expect(component.vehiculoForm.datos).toEqual({
      cantidad: null,
      patente: '',
      carga: null,
    });
  });

  it('esTipoComercial retorna true solo para id_tipo_contacto 1', () => {
    component.contactoForm.id_tipo_contacto = 1;
    expect(component.esTipoComercial()).toBeTrue();
    component.contactoForm.id_tipo_contacto = 2;
    expect(component.esTipoComercial()).toBeFalse();
  });

  it('getTotalErrors suma los errores de formularios', () => {
    component.formErrors = {
      contacto: [{ field: 'direccion', message: 'req', type: 'required' }],
      general: [
        { field: 'otro', message: 'err', type: 'server' },
        { field: 'otro2', message: 'err', type: 'server' },
      ],
    };

    expect(component.getTotalErrors()).toBe(3);
  });

  it('getErrorsByType filtra por tipo', () => {
    component.formErrors = {
      a: [
        { field: 'f1', message: 'm1', type: 'required' },
        { field: 'f2', message: 'm2', type: 'server' },
      ],
      b: [{ field: 'f3', message: 'm3', type: 'required' }],
    };

    const required = component.getErrorsByType('required');
    expect(required.length).toBe(2);
    expect(required.every((e) => e.type === 'required')).toBeTrue();
  });

  it('displayUrl quita protocolo http/https', () => {
    expect(component.displayUrl('https://example.com')).toBe('example.com');
    expect(component.displayUrl('http://example.com')).toBe('example.com');
    expect(component.displayUrl('example.com')).toBe('example.com');
  });

  it('externalHref agrega https cuando falta', () => {
    expect(component.externalHref('example.com')).toBe('https://example.com');
    expect(component.externalHref('https://secure.com')).toBe(
      'https://secure.com'
    );
  });

  it('formatDatos devuelve texto recortado y maneja vacíos', () => {
    expect(component.formatDatos(undefined)).toBe('Sin datos adicionales');
    expect(component.formatDatos({ a: 1 })).toContain('a');
    const long = component.formatDatos({ text: 'x'.repeat(100) });
    expect(long.endsWith('...')).toBeTrue();
  });

  it('formatMonthYear devuelve "-" en entradas inválidas', () => {
    expect(component.formatMonthYear(undefined)).toBe('-');
    expect(component.formatMonthYear('not-date')).toBe('-');
  });
});
