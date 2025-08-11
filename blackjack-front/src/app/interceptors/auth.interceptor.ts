import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  
  // Get token directly from localStorage to avoid circular dependency
  const token = localStorage.getItem('blackjack_token');
  
  // Debug logs
  if (req.url.includes('/me')) {
    console.log('🔍 Interceptor /me request - Token:', !!token);
    if (token) {
      console.log('🔑 Enviando token:', token.substring(0, 20) + '...');
    }
  }
  
  // Clone the request and add auth header if token exists
  const authReq = token ? req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }) : req;

  return next(authReq).pipe(
    catchError(error => {
      // Debug log for /me errors
      if (req.url.includes('/me')) {
        console.log('❌ Error en /me:', error.status, error.statusText, error.error);
      }
      
      // Handle authentication errors
      if (error.status === 401) {
        console.log('🔒 Token inválido o expirado');
        
        // Clear localStorage for any 401 error
        localStorage.removeItem('blackjack_token');
        
        // Only show notification for non-/me requests to avoid spam
        if (!req.url.includes('/me')) {
          notificationService.showError('Sesión Expirada', 'Por favor, inicia sesión nuevamente');
        }
      } else if (error.status === 403) {
        notificationService.showError('Acceso Denegado', 'No tienes permisos para realizar esta acción');
      } else if (error.status >= 500) {
        notificationService.showError('Error del Servidor', 'Intenta nuevamente más tarde');
      }
      
      return throwError(() => error);
    })
  );
};
