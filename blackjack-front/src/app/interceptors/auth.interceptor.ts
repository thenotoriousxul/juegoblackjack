import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);
  
  // Get token directly from localStorage to avoid circular dependency
  const token = localStorage.getItem('blackjack_token');
  
  const authReq = token ? req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }) : req;

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401) {
        // Token inválido: limpiar y redirigir inmediatamente
        localStorage.removeItem('blackjack_token');
        notificationService.showError('Sesión inválida', 'Tu sesión ha expirado o el token es inválido');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        notificationService.showError('Acceso Denegado', 'No tienes permisos para realizar esta acción');
      } else if (error.status >= 500) {
        notificationService.showError('Error del Servidor', 'Intenta nuevamente más tarde');
      }
      return throwError(() => error);
    })
  );
};
