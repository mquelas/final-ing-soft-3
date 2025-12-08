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

  it('getToken prioriza sessionStorage y retorna null si no hay tokens', () => {
    sessionStorage.setItem('sessionToken', 'sess');
    localStorage.setItem('access_token', 'google-token');
    expect(service.getToken()).toBe('sess');

    sessionStorage.clear();
    localStorage.clear();
    expect(service.getToken()).toBeNull();
  });

  it('getUserRole prioriza rol tradicional y retorna null si no hay roles', () => {
    sessionStorage.setItem('rol', 'empresa');
    expect(service.getUserRole()).toBe('empresa');

    sessionStorage.clear();
    localStorage.clear();
    expect(service.getUserRole()).toBeNull();
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

  it('logout con token realiza llamada y limpia sesión', (done) => {
    localStorage.setItem('sessionToken', 'jwt');
    const headersSpy = spyOn<any>(service as any, 'clearSession').and.callThrough();

    service.logout().subscribe((result) => {
      expect(result).toBeTrue();
      expect(headersSpy).toHaveBeenCalled();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/login']);
      expect(localStorage.getItem('sessionToken')).toBeNull();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toContain('Bearer');
    req.flush({ message: 'ok' });
  });

  it('logout con error limpia sesión y retorna false', (done) => {
    localStorage.setItem('sessionToken', 'jwt');

    service.logout().subscribe((ok) => {
      expect(ok).toBeFalse();
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/login']);
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/logout`);
    req.flush(
      { detail: 'fail' },
      { status: 500, statusText: 'Server Error' }
    );
  });

  it('isLoggedIn devuelve true con token válido', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = buildJwt({ exp });
    sessionStorage.setItem('sessionToken', token);

    expect(service.isLoggedIn()).toBeTrue();
  });

  it('isLoggedIn devuelve false si token tiene formato inválido', () => {
    localStorage.setItem('sessionToken', 'token.malformado');

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('sessionToken')).toBeNull();
  });

  it('isLoggedIn devuelve false cuando no hay token', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('verifyResetToken retorna datos en éxito y flags en error', (done) => {
    service.verifyResetToken('abc').subscribe((res) => {
      expect(res.valid).toBeTrue();
      done();
    });
    const ok = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/verify-token?token=abc`
    );
    expect(ok.request.method).toBe('POST');
    ok.flush({ valid: true });

    service.verifyResetToken('bad').subscribe((res) => {
      expect(res.valid).toBeFalse();
      expect(res.error).toContain('Token');
    });
    const err = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/verify-token?token=bad`
    );
    err.flush(
      { detail: 'Token utilizado' },
      { status: 400, statusText: 'Bad Request' }
    );

    service.verifyResetToken('expired').subscribe((res) => {
      expect(res.expired).toBeTrue();
      expect(res.used).toBeTrue();
    });
    const err2 = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/verify-token?token=expired`
    );
    err2.flush(
      { detail: 'Token expirado y ya utilizado' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('resetPassword y resetPasswordForgotten hacen POST al endpoint esperado', () => {
    service.resetPassword('tok', 'newPass').subscribe();
    const req = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/confirm`
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body.token).toBe('tok');
    req.flush({ message: 'ok' });

    service.resetPasswordForgotten({
      token: 't2',
      new_password: 'n',
      confirm_password: 'n',
    }).subscribe();
    const req2 = httpMock.expectOne(
      `${environment.apiUrl}/forgot-password/confirm`
    );
    expect(req2.request.method).toBe('POST');
    expect(req2.request.body.token).toBe('t2');
    req2.flush({ message: 'ok' });
  });

  it('forgotPassword y passwordResetRequest hacen POST', () => {
    service.forgotPassword('mail@test').subscribe();
    const r1 = httpMock.expectOne(`${environment.apiUrl}/forgot-password`);
    expect(r1.request.method).toBe('POST');
    expect(r1.request.body.email).toBe('mail@test');
    r1.flush({ message: 'ok' });

    service.passwordResetRequest('mail@test').subscribe();
    const r2 = httpMock.expectOne(`${environment.apiUrl}/forgot-password`);
    expect(r2.request.method).toBe('POST');
    expect(r2.request.body.email).toBe('mail@test');
    r2.flush({ message: 'ok' });
  });

  it('cleanupResetTokensCache y getCacheStatus usan Authorization', () => {
    localStorage.setItem('sessionToken', 'jwt');

    service.cleanupResetTokensCache().subscribe();
    const r1 = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/cleanup-cache`
    );
    expect(r1.request.headers.get('Authorization')).toContain('Bearer');
    r1.flush({ ok: true });

    service.getCacheStatus().subscribe();
    const r2 = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/cache-status`
    );
    expect(r2.request.headers.get('Authorization')).toContain('Bearer');
    r2.flush({ status: 'ok' });
  });

  it('resetPasswordSecure y resetPasswordSecureLoggedUser hacen POST', () => {
    const data = {
      token: 't',
      current_password: 'old',
      new_password: 'new',
      confirm_password: 'new',
    };

    service.resetPasswordSecure(data).subscribe();
    const r1 = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/confirm-secure`
    );
    expect(r1.request.method).toBe('POST');
    expect(r1.request.body.token).toBe('t');
    r1.flush({ message: 'ok' });

    localStorage.setItem('sessionToken', 'jwt');
    service.resetPasswordSecureLoggedUser(data).subscribe();
    const r2 = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/confirm-secure`
    );
    expect(r2.request.headers.get('Authorization')).toContain('Bearer');
    r2.flush({ message: 'ok' });
  });

  it('changePasswordRequest y changePasswordDirect usan token', () => {
    localStorage.setItem('sessionToken', 'jwt');

    service.changePasswordRequest().subscribe();
    const r1 = httpMock.expectOne(
      `${environment.apiUrl}/password-reset/request-logged-user`
    );
    expect(r1.request.method).toBe('POST');
    r1.flush({ message: 'ok' });

    const data = {
      current_password: 'old',
      new_password: 'new',
      confirm_password: 'new',
    };
    service.changePasswordDirect(data).subscribe();
    const r2 = httpMock.expectOne(
      `${environment.apiUrl}/change-password-direct`
    );
    expect(r2.request.headers.get('Authorization')).toContain('Bearer');
    expect(r2.request.body.current_password).toBe('old');
    r2.flush({ ok: true });
  });
});
