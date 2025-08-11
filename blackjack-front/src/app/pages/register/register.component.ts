import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-register',
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
          <p class="text-white text-opacity-80">Únete al mejor casino online</p>
        </div>

        <!-- Register Form Card -->
        <div class="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-yellow-400 border-opacity-30">
          
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <div class="text-center mb-6">
              <h2 class="text-2xl font-semibold text-white">Crear Cuenta</h2>
              <p class="text-gray-300 text-sm mt-1">Regístrate para empezar a jugar</p>
            </div>

            <!-- Full Name Field -->
            <div class="space-y-2">
              <label for="fullName" class="block text-sm font-medium text-white">
                👤 Nombre Completo
              </label>
              <input
                id="fullName"
                type="text"
                formControlName="fullName"
                placeholder="Tu nombre completo"
                class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors"
                [class.border-red-500]="isFieldInvalid('fullName')"
              />
              @if (isFieldInvalid('fullName')) {
                <p class="text-red-400 text-sm">
                  @if (registerForm.get('fullName')?.errors?.['required']) {
                    El nombre es requerido
                  } @else if (registerForm.get('fullName')?.errors?.['minlength']) {
                    El nombre debe tener al menos 3 caracteres
                  }
                </p>
              }
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
                  @if (registerForm.get('email')?.errors?.['required']) {
                    El correo es requerido
                  } @else if (registerForm.get('email')?.errors?.['email']) {
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
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors pr-12"
                  [class.border-red-500]="isFieldInvalid('password')"
                />
                <button
                  type="button"
                  (click)="togglePasswordVisibility()"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
              @if (isFieldInvalid('password')) {
                <p class="text-red-400 text-sm">
                  @if (registerForm.get('password')?.errors?.['required']) {
                    La contraseña es requerida
                  } @else if (registerForm.get('password')?.errors?.['minlength']) {
                    La contraseña debe tener al menos 6 caracteres
                  }
                </p>
              }
            </div>

            <!-- Confirm Password Field -->
            <div class="space-y-2">
              <label for="confirmPassword" class="block text-sm font-medium text-white">
                🔒 Confirmar Contraseña
              </label>
              <div class="relative">
                <input
                  id="confirmPassword"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="Repite tu contraseña"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-colors pr-12"
                  [class.border-red-500]="isFieldInvalid('confirmPassword') || passwordMismatch()"
                />
                <button
                  type="button"
                  (click)="toggleConfirmPasswordVisibility()"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  {{ showConfirmPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
              @if (isFieldInvalid('confirmPassword')) {
                <p class="text-red-400 text-sm">
                  La confirmación de contraseña es requerida
                </p>
              } @else if (passwordMismatch()) {
                <p class="text-red-400 text-sm">
                  Las contraseñas no coinciden
                </p>
              }
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="registerForm.invalid || passwordMismatch() || isLoading()"
              class="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              @if (isLoading()) {
                <div class="flex items-center justify-center space-x-2">
                  <div class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Creando cuenta...</span>
                </div>
              } @else {
                🎯 Crear Cuenta
              }
            </button>

            <!-- Login Link -->
            <div class="text-center">
              <p class="text-gray-300 text-sm">
                ¿Ya tienes una cuenta?
                <a routerLink="/login" class="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
                  Inicia sesión aquí
                </a>
              </p>
            </div>

          </form>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 text-white text-opacity-60 text-sm">
          <p>🎲 Al registrarte aceptas nuestros términos • 🔞 Solo para mayores de edad</p>
        </div>

      </div>

      <!-- Loading Overlay -->
      @if (isLoading()) {
        <app-loading-spinner 
          [fullScreen]="true" 
          [overlay]="true" 
          text="Creando cuenta..." 
          subText="Configurando tu perfil">
        </app-loading-spinner>
      }
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Signals
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Form
  registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  onSubmit(): void {
    if (this.registerForm.invalid || this.passwordMismatch()) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    
    const { confirmPassword, ...userData } = this.registerForm.value;
    
    this.authService.register(userData).subscribe({
      next: (response) => {
        this.notificationService.showSuccess(
          '¡Cuenta creada exitosamente!',
          'Ahora puedes iniciar sesión'
        );
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al crear la cuenta');
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  passwordMismatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    
    return password !== confirmPassword && 
           this.registerForm.get('confirmPassword')?.touched === true;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
