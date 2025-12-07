import { of, throwError } from 'rxjs';
import { PasswordResetComponent } from './password-reset.component';
import { AuthenticationService } from '../../auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

describe('PasswordResetComponent', () => {
  let component: PasswordResetComponent;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: jasmine.SpyObj<Router>;

  const routeStub = {
    snapshot: {
      queryParamMap: {
        get: (key: string) => (key === 'token' ? 'token-123' : null),
      },
    },
  } as unknown as ActivatedRoute;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthenticationService>(
      'AuthenticationService',
      ['verifyResetToken', 'resetPasswordForgotten']
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    component = new PasswordResetComponent(routeStub, authService, router);
    component.token = 'token-123';
  });

  it('no envía reset si las contraseñas no coinciden', () => {
    const form = { invalid: false } as any;
    component.tokenValid = true;
    component.newPassword = 'Abcdefg1';
    component.confirmPassword = 'distinta';

    component.onResetPassword(form);

    expect(component.passwordsMismatch).toBeTrue();
    expect(authService.resetPasswordForgotten).not.toHaveBeenCalled();
  });

  it('dispara reset cuando el formulario es válido y el token está vigente', () => {
    const form = { invalid: false } as any;
    component.tokenValid = true;
    component.tokenExpired = false;
    component.tokenUsed = false;
    component.newPassword = 'Abcdefg1';
    component.confirmPassword = 'Abcdefg1';

    spyOn(window, 'setTimeout').and.callFake((cb: TimerHandler) => {
      typeof cb === 'function' && cb();
      return 0 as any;
    });

    authService.resetPasswordForgotten.and.returnValue(
      of({ success: true, message: 'ok' })
    );

    component.onResetPassword(form);

    expect(authService.resetPasswordForgotten).toHaveBeenCalledWith({
      token: 'token-123',
      new_password: 'Abcdefg1',
      confirm_password: 'Abcdefg1',
    });
    expect(component.resetCompleted).toBeTrue();
    expect(component.tokenUsed).toBeTrue();
    expect(component.successMessage).toContain('ok');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { message: 'password-reset-success' },
    });
  });

  it('handleResetError marca passwordReused y mantiene token válido', () => {
    const errorResponse = { password_reused: true, error: 'contraseña ya fue utilizada' };
    component.tokenValid = true;

    component.handleResetError(errorResponse);

    expect(component.passwordReused).toBeTrue();
    expect(component.tokenValid).toBeTrue();
    expect(component.error).toContain('contrase');
  });

  it('validatePassword falla para contraseñas cortas y pasa para una fuerte', () => {
    const short = component.validatePassword('abc');
    const strong = component.validatePassword('Abcdefg1');

    expect(short.isValid).toBeFalse();
    expect(strong.isValid).toBeTrue();
  });

  it('marca token usado cuando backend responde used sin password_reused', () => {
    const errorResponse = { used: true, error: 'Este enlace de recuperacion ya fue utilizado.' };

    component.handleResetError(errorResponse);

    expect(component.tokenUsed).toBeTrue();
    expect(component.tokenValid).toBeFalse();
    expect(component.error).toContain('utilizado');
  });
});
