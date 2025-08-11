import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { IUser } from '../../models/user.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-yellow-900">
      
      <!-- Header -->
      <header class="bg-black bg-opacity-50 backdrop-blur-sm border-b border-yellow-400 border-opacity-30">
        <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="text-4xl">🎰</div>
            <div>
              <h1 class="text-2xl font-bold text-yellow-400">BlackJack Casino</h1>
              <p class="text-white text-opacity-70 text-sm">Lobby Principal</p>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            @if (currentUser()) {
              <div class="text-white text-right">
                <p class="font-semibold">{{ currentUser()!.fullName }}</p>
                <p class="text-sm text-opacity-70">{{ currentUser()!.email }}</p>
              </div>
              <button 
                (click)="logout()"
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                🚪 Salir
              </button>
            }
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-6xl mx-auto px-4 py-8">
        
        <!-- Welcome Section -->
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-white mb-4">
            ¡Bienvenido al Casino! 🎲
          </h2>
          <p class="text-xl text-white text-opacity-80">
            Crea una nueva mesa o únete a una partida existente
          </p>
        </div>

        <!-- Actions Grid -->
        <div class="grid md:grid-cols-2 gap-8 mb-12">
          
          <!-- Create Game Card -->
          <div class="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-green-400 border-opacity-30 shadow-2xl">
            <div class="text-center mb-6">
              <div class="text-6xl mb-4">🃏</div>
              <h3 class="text-2xl font-bold text-green-400 mb-2">Crear Nueva Mesa</h3>
              <p class="text-white text-opacity-70">
                Crea tu propia mesa de BlackJack e invita a tus amigos
              </p>
            </div>
            
            <button
              (click)="createGame()"
              [disabled]="isCreatingGame()"
              class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              @if (isCreatingGame()) {
                <div class="flex items-center justify-center space-x-2">
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creando mesa...</span>
                </div>
              } @else {
                🎯 Crear Mesa
              }
            </button>
          </div>

          <!-- Join Game Card -->
          <div class="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-blue-400 border-opacity-30 shadow-2xl">
            <div class="text-center mb-6">
              <div class="text-6xl mb-4">🎪</div>
              <h3 class="text-2xl font-bold text-blue-400 mb-2">Unirse a Mesa</h3>
              <p class="text-white text-opacity-70">
                Ingresa el código de una mesa para unirte a la partida
              </p>
            </div>
            
            <form [formGroup]="joinGameForm" (ngSubmit)="joinGame()" class="space-y-4">
              <div>
                <input
                  type="text"
                  formControlName="gameCode"
                  placeholder="Código de la mesa (ej: ABC123)"
                  maxlength="6"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-colors uppercase tracking-wider text-center text-xl font-mono"
                  [class.border-red-500]="isFieldInvalid('gameCode')"
                  (input)="onGameCodeInput($event)"
                />
                @if (isFieldInvalid('gameCode')) {
                  <p class="text-red-400 text-sm mt-2 text-center">
                    @if (joinGameForm.get('gameCode')?.errors?.['required']) {
                      El código es requerido
                    } @else if (joinGameForm.get('gameCode')?.errors?.['minlength']) {
                      El código debe tener 6 caracteres
                    }
                  </p>
                }
              </div>
              
              <button
                type="submit"
                [disabled]="joinGameForm.invalid || isJoiningGame()"
                class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                @if (isJoiningGame()) {
                  <div class="flex items-center justify-center space-x-2">
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uniéndose...</span>
                  </div>
                } @else {
                  🚀 Unirse a Mesa
                }
              </button>
            </form>
          </div>
        </div>

        <!-- Game Rules Section -->
        <div class="bg-black bg-opacity-40 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400 border-opacity-20">
          <h3 class="text-2xl font-bold text-yellow-400 mb-4 text-center">
            📋 Reglas del BlackJack
          </h3>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-white text-opacity-90">
            <div class="space-y-2">
              <h4 class="font-semibold text-yellow-300">🎯 Objetivo</h4>
              <p class="text-sm">Llegar lo más cerca posible a 21 sin pasarse</p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-yellow-300">🃏 Valores</h4>
              <p class="text-sm">As = 1 o 11, Figuras = 10, Números = valor facial</p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-yellow-300">⭐ BlackJack</h4>
              <p class="text-sm">As + carta de 10 en las primeras 2 cartas</p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-yellow-300">🔥 Quemado</h4>
              <p class="text-sm">Si sumas más de 21 pierdes automáticamente</p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-yellow-300">👥 Multijugador</h4>
              <p class="text-sm">Hasta 7 jugadores por mesa</p>
            </div>
            <div class="space-y-2">
              <h4 class="font-semibold text-yellow-300">🏆 Victoria</h4>
              <p class="text-sm">Gana quien tenga el valor más alto sin pasarse</p>
            </div>
          </div>
        </div>
      </main>

      <!-- Background Effects -->
      <div class="fixed inset-0 pointer-events-none opacity-5">
        <div class="w-full h-full bg-repeat" style="background-image: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 100&quot;><text y=&quot;.9em&quot; font-size=&quot;90&quot;>🎰</text></svg>')"></div>
      </div>

      <!-- Loading Overlay -->
      @if (isCreatingGame() || isJoiningGame()) {
        <app-loading-spinner 
          [fullScreen]="true" 
          [overlay]="true" 
          [text]="isCreatingGame() ? 'Creando mesa...' : 'Uniéndose a la mesa...'"
          [subText]="isCreatingGame() ? 'Configurando la partida' : 'Verificando código'">
        </app-loading-spinner>
      }
    </div>
  `
})
export class LobbyComponent implements OnInit {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Signals
  currentUser = signal<IUser | null>(null);
  isCreatingGame = signal(false);
  isJoiningGame = signal(false);

  // Form
  joinGameForm: FormGroup = this.fb.group({
    gameCode: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    // Get current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
    });
  }

  createGame(): void {
    if (this.isCreatingGame()) return;
    
    this.isCreatingGame.set(true);
    
    this.gameService.createGame().subscribe({
      next: (response) => {
        this.notificationService.showSuccess(
          '¡Mesa creada!',
          `Código: ${response.data.game.joinCode}`
        );
        this.router.navigate(['/game', response.data.game._id]);
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al crear la mesa');
        this.isCreatingGame.set(false);
      }
    });
  }

  joinGame(): void {
    if (this.joinGameForm.invalid || this.isJoiningGame()) return;
    
    this.isJoiningGame.set(true);
    
    const gameCode = this.joinGameForm.get('gameCode')?.value.toUpperCase();
    
    this.gameService.joinGame(gameCode).subscribe({
      next: (response) => {
        this.notificationService.showSuccess(
          '¡Te has unido a la mesa!',
          `Mesa creada con ${response.data.game.players.length} jugador(es)`
        );
        this.router.navigate(['/game', response.data.game._id]);
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al unirse a la mesa');
        this.isJoiningGame.set(false);
      }
    });
  }

  onGameCodeInput(event: any): void {
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.joinGameForm.patchValue({ gameCode: value });
  }

  logout(): void {
    this.authService.logout();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.joinGameForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
