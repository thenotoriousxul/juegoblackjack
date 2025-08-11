import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingSpinnerComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900 flex items-center justify-center p-4">
      
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="w-full h-full bg-repeat" style="background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 100&quot;><text y=&quot;.9em&quot; font-size=&quot;90&quot;>🃏</text></svg>')"></div>
      </div>

      <div class="relative z-10 w-full max-w-md">
        
        <!-- Casino Header -->
        <div class="text-center mb-8">
          <div class="text-6xl mb-4">🎰</div>
          <h1 class="text-4xl font-bold text-yellow-400 mb-2">BlackJack Casino</h1>
          <p class="text-white text-opacity-80">Bienvenido al mejor casino online</p>
        </div>

        <!-- Login Form Card -->
        <div class="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-yellow-400 border-opacity-30">
          
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <div class="text-center mb-6">
              <h2 class="text-2xl font-semibold text-white">Iniciar Sesión</h2>
              <p class="text-gray-300 text-sm mt-1">Ingresa tus credenciales</p>
            </div>

            <!-- Email Field -->
            <div class="space-y-2">
              <label for="email" class="block text-sm font-medium text-white">
                📧 Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="tu@email.com"
                class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors"
                [class.border-red-500]="isFieldInvalid('email')"
              />
              @if (isFieldInvalid('email')) {
                <p class="text-red-400 text-sm">
                  @if (loginForm.get('email')?.errors?.['required']) {
                    El correo es requerido
                  } @else if (loginForm.get('email')?.errors?.['email']) {
                    Ingresa un correo válido
                  }
                </p>
              }
            </div>

            <!-- Password Field -->
            <div class="space-y-2">
              <label for="password" class="block text-sm font-medium text-white">
                🔒 Contraseña
              </label>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="Tu contraseña"
                class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors"
                [class.border-red-500]="isFieldInvalid('password')"
              />
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                style="position: absolute; right: 12px; margin-top: 20px;">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
              @if (isFieldInvalid('password')) {
                <p class="text-red-400 text-sm">
                  @if (loginForm.get('password')?.errors?.['required']) {
                    La contraseña es requerida
                  } @else if (loginForm.get('password')?.errors?.['minlength']) {
                    La contraseña debe tener al menos 6 caracteres
                  }
                </p>
              }
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading()"
              class="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              @if (isLoading()) {
                <div class="flex items-center justify-center space-x-2">
                  <div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              } @else {
                🚀 Iniciar Sesión
              }
            </button>

            <!-- Register Link -->
            <div class="text-center">
              <p class="text-gray-300 text-sm">
                ¿No tienes una cuenta?
                <a routerLink="/register" class="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                  Regístrate aquí
                </a>
              </p>
            </div>

          </form>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 text-white text-opacity-60 text-sm">
          <p>🎲 Juega responsablemente • 🔞 Solo para mayores de edad</p>
        </div>

      </div>

      <!-- Loading Overlay -->
      @if (isLoading()) {
        <app-loading-spinner 
          [fullScreen]="true" 
          [overlay]="true" 
          text="Iniciando sesión..." 
          subText="Verificando credenciales">
        </app-loading-spinner>
      }
    </div>
  `,
  styles: [`
    .relative {
      position: relative;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Signals
  isLoading = signal(false);
  showPassword = signal(false);

  // Form
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    
    const credentials = this.loginForm.value;
    
    this.authService.login(credentials).subscribe({
      next: (response) => {
        if (response.data) {
          this.notificationService.showSuccess(
            '¡Bienvenido!',
            `Hola ${response.data.user.fullName}`
          );
        }
        this.router.navigate(['/lobby']);
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al iniciar sesión');
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
