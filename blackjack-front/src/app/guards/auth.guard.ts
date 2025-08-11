import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, filter, timeout, catchError, of, switchMap, tap, delay } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ AuthGuard ejecutándose para:', state.url);
  
  const token = authService.getToken();
  console.log('🔍 Token en guard:', !!token);
  
  // Si no hay token, redirigir inmediatamente
  if (!token) {
    console.log('🔒 No token found, redirecting to login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  console.log('⏳ Token encontrado, esperando validación...');

  // Wait a bit for initialization to complete, then check user state
  return of(null).pipe(
    delay(200), // Small delay to let initialization complete
    switchMap(() => {
      const currentToken = authService.getToken();
      const user = authService.getCurrentUser();
      
      console.log('🔍 Guard check after delay - Token:', !!currentToken, 'User:', !!user);
      
      // If token was cleared during initialization, redirect
      if (!currentToken) {
        console.log('🗑️ Token cleared, redirecting to login');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      }
      
      // If user is already set, allow access
      if (user && user.email) {
        console.log('✅ Guard approved for user:', user.email);
        return of(true);
      }
      
      // Otherwise wait for user to be set or fail
      return authService.currentUser$.pipe(
        filter(currentUser => currentUser !== null), // Wait for non-null value
        take(1),
        timeout(5000),
        map(validatedUser => {
          if (validatedUser && validatedUser.email) {
            console.log('✅ Guard approved after validation:', validatedUser.email);
            return true;
          } else {
            console.log('🔒 Invalid user after validation, redirecting');
            router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
          }
        }),
        catchError((error) => {
          console.log('🔒 Guard timeout/error:', error.name || error);
          router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return of(false);
        })
      );
    })
  );
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        return true;
      } else {
        console.log('👤 Usuario ya autenticado, redirigiendo al lobby');
        router.navigate(['/lobby']);
        return false;
      }
    })
  );
};
