import { Injectable, inject, signal, ApplicationRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginModel, RegisterModel } from '../models/auth.model';
import { IUser } from '../models/user.model';
import { ApiResponse } from '../models/api.model';

// Auth response types
type AuthResponse = ApiResponse<{ user: IUser; token: { type: string; token: string } }>;
type MeResponse = ApiResponse<IUser>;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private appRef = inject(ApplicationRef);
  
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'blackjack_token';
  
  // State management
  private currentUserSubject = new BehaviorSubject<IUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Signals for reactive UI
  isAuthenticated = signal(false);
  currentUser = signal<IUser | null>(null);
  isInitializing = signal(false);

  constructor() {
    this.initializeAuth();

    // Cerrar sesión si el token cambia/elimina desde otra pestaña o la consola
    window.addEventListener('storage', (e) => {
      if (e.key === this.TOKEN_KEY) {
        const newToken = e.newValue;
        const oldToken = e.oldValue;
        if (!newToken || newToken !== oldToken) {
          console.log('🔒 Cambio en token detectado via storage event. Cerrando sesión.');
          this.clearAuthData();
        }
      }
    });

    // Verificación periódica local por si el token cambia en la misma pestaña sin emitir storage
    setInterval(() => {
      const token = this.getToken();
      if (!token && this.isAuthenticated()) {
        console.log('🔒 Token ausente detectado por verificación periódica. Cerrando sesión.');
        this.clearAuthData();
      }
    }, 2000);
  }

  private initializeAuth(): void {
    const token = this.getToken();
    console.log('🔍 Inicializando Auth - Token encontrado:', !!token);
    
    if (token) {
      console.log('🔑 Token:', token.substring(0, 20) + '...');
      this.isInitializing.set(true);
      
      this.validateToken().subscribe({
        next: (response) => {
          if (response.data) {
            console.log('✅ Token válido, usuario:', response.data.email);
            this.setCurrentUser(response.data);
          }
          this.isInitializing.set(false);
          queueMicrotask(() => this.appRef.tick());
        },
        error: (error) => {
          console.log('❌ Error validando token:', error);
          console.log('🔒 Token inválido, limpiando datos de auth');
          this.clearAuthData();
          this.isInitializing.set(false);
          queueMicrotask(() => this.appRef.tick());
        }
      });
    } else {
      console.log('🚫 No hay token, estado limpio');
      // Si no hay token, asegurarse de que el estado esté limpio
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      this.currentUserSubject.next(null);
      this.isInitializing.set(false);
      queueMicrotask(() => this.appRef.tick());
    }
  }

  login(credentials: LoginModel): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        if (response.data) {
          console.log('🚀 Login exitoso para:', response.data.user.email);
          console.log('🔑 Guardando token:', response.data.token.token.substring(0, 20) + '...');
          this.setToken(response.data.token.token);
          this.setCurrentUser(response.data.user);
          console.log('💾 Token guardado en localStorage');
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterModel): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData).pipe(
      catchError(error => {
        console.error('Register error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    if (this.getToken()) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        complete: () => {
          this.clearAuthData();
        },
        error: () => {
          this.clearAuthData();
        }
      });
    } else {
      this.clearAuthData();
    }
  }

  validateToken(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.API_URL}/me`).pipe(
      catchError(error => {
        console.error('Token validation error:', error);
        
        // Check if token was already cleared by interceptor
        const currentToken = this.getToken();
        if (!currentToken) {
          console.log('🗑️ Token ya fue limpiado por interceptor');
          // Just update internal state, don't redirect again
          this.currentUserSubject.next(null);
          this.currentUser.set(null);
          this.isAuthenticated.set(false);
          this.isInitializing.set(false);
          queueMicrotask(() => this.appRef.tick());
        } else {
          // Token still exists but validation failed, clear everything
          this.clearAuthData();
        }
        
        return throwError(() => error);
      })
    );
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setCurrentUser(user: IUser): void {
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    
    // Schedule tick for next cycle to avoid ExpressionChangedAfterItHasBeenCheckedError
    queueMicrotask(() => this.appRef.tick());
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.isInitializing.set(false);
    
    // Schedule tick for next cycle to avoid ExpressionChangedAfterItHasBeenCheckedError
    queueMicrotask(() => this.appRef.tick());
    
    // Solo redirigir si no estamos en páginas públicas y no estamos inicializando
    setTimeout(() => {
      const currentUrl = this.router.url;
      if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
        console.log('🔄 Redirigiendo a login desde clearAuthData');
        this.router.navigate(['/login']);
      }
    }, 100); // Small delay to avoid routing conflicts
  }

  getCurrentUser(): IUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
