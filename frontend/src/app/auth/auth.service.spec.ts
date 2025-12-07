import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthenticationService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let httpMock: HttpTestingController;
  let routerNavigateSpy: jasmine.Spy;

  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
  };

  beforeEach(() => {
    clearStorage();

    const routerStub = {
      navigate: jasmine.createSpy('navigate'),
    } as unknown as Router;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: routerStub }],
    });

    service = TestBed.inject(AuthenticationService);
    httpMock = TestBed.inject(HttpTestingController);
    routerNavigateSpy = TestBed.inject(Router).navigate as jasmine.Spy;
  });

  afterEach(() => {
    httpMock.verify();
    clearStorage();
  });

  const buildJwt = (payload: Record<string, unknown>) => {
    const base64 = (obj: Record<string, unknown>) =>
      btoa(JSON.stringify(obj));
    return `${base64({ alg: 'none', typ: 'JWT' })}.${base64(payload)}.signature`;
  };

  it('guarda token en localStorage cuando keepLoggedIn es true', (done) => {
    service.login('alice', 'secret', true).subscribe((result) => {
      expect(result).toBeTrue();
      expect(localStorage.getItem('sessionToken')).toBe('token123');
      expect(localStorage.getItem('rol')).toBe('admin');
      expect(sessionStorage.getItem('sessionToken')).toBeNull();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toContain(
      'application/x-www-form-urlencoded'
    );
    expect(req.request.body).toContain('username=alice');
    expect(req.request.body).toContain('password=secret');

    req.flush({ access_token: 'token123', token_type: 'bearer', tipo_rol: 'admin' });
  });

  it('retorna false y no persiste token cuando el login falla', (done) => {
    service.login('bob', 'bad', false).subscribe((result) => {
      expect(result).toBeFalse();
      expect(localStorage.getItem('sessionToken')).toBeNull();
      expect(sessionStorage.getItem('sessionToken')).toBeNull();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush({ detail: 'invalid' }, { status: 400, statusText: 'Bad Request' });
  });

  it('isLoggedIn devuelve false y limpia token expirado', () => {
    const expired = Math.floor(Date.now() / 1000) - 60;
    const token = buildJwt({ exp: expired });
    localStorage.setItem('sessionToken', token);

    const logged = service.isLoggedIn();

    expect(logged).toBeFalse();
    expect(localStorage.getItem('sessionToken')).toBeNull();
  });

  it('getToken usa token de Google si no hay token tradicional', () => {
    localStorage.setItem('access_token', 'google-token');

    const token = service.getToken();

    expect(token).toBe('google-token');
  });

  it('getUserRole devuelve rol de Google cuando no hay tradicional', () => {
    localStorage.setItem('tipo_rol', 'publico');

    const role = service.getUserRole();

    expect(role).toBe('publico');
  });

  it('register devuelve true en Éxito y false en error', (done) => {
    service.register('john', 'john@mail', '123', '20-111').subscribe((ok) => {
      expect(ok).toBeTrue();

      service
        .register('john', 'john@mail', '123', '20-111')
        .subscribe((fail) => {
          expect(fail).toBeFalse();
          done();
        });

      const reqErr = httpMock.expectOne(`${environment.apiUrl}/register`);
      reqErr.flush(
        { detail: 'fail' },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    const reqOk = httpMock.expectOne(`${environment.apiUrl}/register`);
    expect(reqOk.request.method).toBe('POST');
    reqOk.flush({ message: 'ok' });
  });

  it('logout sin token limpia sesión y navega a /login', (done) => {
    service.logout().subscribe((result) => {
      expect(result).toBeTrue();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/login']);
      expect(localStorage.getItem('rol')).toBeNull();
      expect(sessionStorage.getItem('sessionToken')).toBeNull();
      done();
    });
  });
});
