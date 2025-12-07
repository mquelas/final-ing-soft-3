import { AuthGuard } from './auth.guard';
import { AuthenticationService } from './auth/auth.service';
import { Router, ActivatedRouteSnapshot } from '@angular/router';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: jasmine.SpyObj<Router>;

  const routeWithRole = (role?: string) => {
    const route = new ActivatedRouteSnapshot();
    (route as any).data = role ? { role } : {};
    return route;
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthenticationService>(
      'AuthenticationService',
      ['isLoggedIn', 'getUserRole']
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    guard = new AuthGuard(authService, router);
  });

  it('redirige a login si no está logueado', () => {
    authService.isLoggedIn.and.returnValue(false);
    const route = routeWithRole();

    const allowed = guard.canActivate(route);

    expect(allowed).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('permite acceso cuando no hay rol requerido', () => {
    authService.isLoggedIn.and.returnValue(true);
    const route = routeWithRole();

    const allowed = guard.canActivate(route);

    expect(allowed).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('bloquea y redirige por rol distinto (admin_polo)', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getUserRole.and.returnValue('admin_polo');
    const route = routeWithRole('admin_empresa');

    const allowed = guard.canActivate(route);

    expect(allowed).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/empresas']);
  });

  it('bloquea y redirige por rol distinto (admin_empresa)', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getUserRole.and.returnValue('admin_empresa');
    const route = routeWithRole('admin_polo');

    const allowed = guard.canActivate(route);

    expect(allowed).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/me']);
  });

  it('envía a /chat si rol público y rol requerido distinto', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getUserRole.and.returnValue('publico');
    const route = routeWithRole('admin_empresa');

    const allowed = guard.canActivate(route);

    expect(allowed).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/chat']);
  });
});
