import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { SocketService } from '../../services/socket.service';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { GameTableComponent } from '../../components/game-table/game-table.component';
import { IGame } from '../../models/game.model';
import { IPlayerDeckWithPlayer } from '../../models/playerDeck.model';
import { IUser } from '../../models/user.model';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, GameTableComponent],
  template: `
    <div class="min-h-screen">
      @if (isLoading()) {
        <app-loading-spinner 
          [fullScreen]="true"
          text="Cargando mesa..." 
          subText="Obteniendo información del juego">
        </app-loading-spinner>
      } @else if (currentGame()) {
        <app-game-table
          [game]="currentGame()!"
          [playerDecks]="playerDecks()"
          [currentUser]="currentUser()"
          [isOwner]="isOwner()"
          [isMyTurn]="effectiveIsMyTurn()"
          (startGame)="handleStartGame()"
          (restartGame)="handleRestartGame()"
          (readyUp)="handleReadyUp()"
          (drawCard)="handleDrawCard()"
          (finishTurn)="handleFinishTurn()"
          (checkBlackjack)="handleCheckBlackjack()">
        </app-game-table>
      } @else {
        <!-- Error state -->
        <div class="min-h-screen bg-gradient-to-br from-green-900 to-red-900 flex items-center justify-center">
          <div class="text-center text-white">
            <div class="text-6xl mb-4">😵</div>
            <h2 class="text-2xl font-bold mb-4">Mesa no encontrada</h2>
            <p class="mb-6">La mesa que buscas no existe o ha sido eliminada.</p>
            <button 
              (click)="goToLobby()"
              class="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors">
              🏠 Volver al Lobby
            </button>
          </div>
        </div>
      }

      <!-- Exit Game Button (Fixed) -->
      @if (currentGame() && !isLoading()) {
        <button 
          (click)="exitGame()"
          class="fixed top-4 left-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors z-50 flex items-center space-x-2">
          <span>🚪</span>
          <span>Salir</span>
        </button>
      }
    </div>
  `
})
export class GameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private socketService = inject(SocketService);

  // Signals
  currentGame = signal<IGame | null>(null);
  playerDecks = signal<IPlayerDeckWithPlayer[]>([]);
  currentUser = signal<IUser | null>(null);
  isOwner = signal(false);
  isMyTurn = signal(false);
  isLoading = signal(true);
  suppressActions = signal(false);

  // Subscriptions
  private gameSubscription?: Subscription;
  private socketSubscription?: Subscription;
  private authSubscription?: Subscription;
  private socketConnSubscription?: Subscription;
  private forceLobbySubscription?: Subscription;
  
  private gameId: string = '';

  private getSuppressKey(): string {
    const uid = this.currentUser()?.id ?? 'anon';
    return `bj:suppress:${this.gameId}:${uid}`;
  }

  ngOnInit(): void {
    // Get game ID from route
    this.gameId = this.route.snapshot.params['id'];
    
    if (!this.gameId) {
      this.notificationService.showError('Error', 'ID del juego inválido');
      this.router.navigate(['/lobby']);
      return;
    }

    // Subscribe to auth changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      // Cargar supresión persistida cuando tengamos usuario
      const key = this.getSuppressKey();
      const persisted = sessionStorage.getItem(key);
      this.suppressActions.set(persisted === '1');
    });

    // Subscribe to game service state
    this.gameSubscription = this.gameService.currentGame$.subscribe(game => {
      this.currentGame.set(game);
      const isOwnerValue = this.gameService.isOwner();
      
      // Calcular localmente si es mi turno con base en game.turn/players
      const myId = this.currentUser()?.id ?? null;
      const currentTurnPlayerId = this.getCurrentTurnPlayerId(game || undefined);
      const computedIsMyTurn = !!(
        game && game.is_active && myId != null && currentTurnPlayerId != null && Number(myId) === Number(currentTurnPlayerId)
      );

      console.log('🎮 GameComponent Debug:', {
        game,
        isOwner: isOwnerValue,
        isMyTurn_computed: computedIsMyTurn,
        currentUser: this.currentUser(),
        gameTurn: game?.turn,
        gameActive: game?.is_active,
        currentTurnPlayerId
      });
      
      this.isOwner.set(isOwnerValue);
      this.isMyTurn.set(computedIsMyTurn);

      // Si vuelve a ser mi turno, levantar supresión y limpiar persistencia
      if (computedIsMyTurn) {
        this.suppressActions.set(false);
        sessionStorage.removeItem(this.getSuppressKey());
      }
    });

    this.gameService.playerDecks$.subscribe(decks => {
      this.playerDecks.set(decks);
    });

    // Subscribe to socket notifications
    this.socketSubscription = this.socketService.gameNotifications$.subscribe(notification => {
      if (notification && String((notification as any).game) === this.gameId) {
        // Actualización local inmediata de turno si viene en la notificación
        const type = (notification as any).type as string | undefined;
        if (type === 'turn_changed') {
          const currentPlayerId = (notification as any).currentPlayerId as number | null | undefined;
          const myId = this.currentUser()?.id;
          if (currentPlayerId != null && myId != null) {
            this.isMyTurn.set(Number(currentPlayerId) === Number(myId));
            // Si vuelve a ser mi turno, levantar supresión y limpiar persistencia
            if (Number(currentPlayerId) === Number(myId)) {
              this.suppressActions.set(false);
              sessionStorage.removeItem(this.getSuppressKey());
            }
          }
        }
        this.refreshGameData();
      }
    });

    // Suscribirse al evento forceLobby para redirigir a todos al lobby
    this.forceLobbySubscription = this.socketService.forceLobby$.subscribe((data) => {
      if (data) {
        console.warn('⚡ Evento forceLobby recibido en frontend:', data);
        alert('Un jugador ha salido. Todos han sido enviados al lobby.');
        this.notificationService.showWarning('Un jugador ha salido', 'Todos han sido enviados al lobby.');
        window.location.href = '/lobby';
      }
    });

    // Refresh state on reconnect to avoid missing events during brief disconnects
    this.socketConnSubscription = this.socketService.isConnected$.subscribe((connected) => {
      if (connected) {
        this.refreshGameData();
      }
    });

    // Join socket room and load initial data
    this.socketService.joinGameRoom(this.gameId);
    this.loadGameData();
  }

  ngOnDestroy(): void {
    this.gameSubscription?.unsubscribe();
    this.socketSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
    this.socketConnSubscription?.unsubscribe();
    this.forceLobbySubscription?.unsubscribe();
    if (this.gameId) {
      this.socketService.leaveGameRoom(this.gameId);
  }
    }


  private loadGameData(): void {
    this.isLoading.set(true);
    
    this.gameService.getGame(this.gameId).subscribe({
      next: (response) => {
        // Game data is automatically set through the service subscription
        this.isLoading.set(false);
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al cargar el juego');
        this.isLoading.set(false);
        this.router.navigate(['/lobby']);
      }
    });
  }

  private refreshGameData(): void {
    // Refresh without loading spinner for socket updates
    this.gameService.getGame(this.gameId).subscribe({
      error: (error) => {
        console.error('Error refreshing game data:', error);
      }
    });
  }

  // Game Actions
  handleStartGame(): void {
    this.gameService.startGame(this.gameId).subscribe({
      next: () => {
        this.notificationService.showSuccess('¡Juego iniciado!', 'La partida ha comenzado');
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al iniciar el juego');
      }
    });
  }

  handleRestartGame(): void {
    this.gameService.restartGame(this.gameId).subscribe({
      next: () => {
        this.notificationService.showSuccess('¡Juego reiniciado!', 'Nueva partida iniciada');
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al reiniciar el juego');
      }
    });
  }

  handleReadyUp(): void {
    this.gameService.estarListo(this.gameId).subscribe({
      next: () => {
        this.notificationService.showSuccess('¡Listo!', 'Esperando a los demás jugadores');
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al marcar como listo');
      }
    });
  }

  handleDrawCard(): void {
    this.gameService.pedirCarta(this.gameId).subscribe({
      next: (response) => {
        const card = response.data.card;
        const value = response.data.totalValue;
        
        if (value === -1) {
          this.notificationService.showWarning('¡Te quemaste!', 'Te pasaste de 21');
        } else {
          this.notificationService.showInfo(
            `Carta: ${card.rank} de ${this.getSuitName(card.suit)}`, 
            `Valor total: ${value}`
          );
        }
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al pedir carta');
      }
    });
  }

  handleFinishTurn(): void {
    this.gameService.terminarTurno(this.gameId).subscribe({
      next: (response) => {
        // Ocultar acciones inmediatamente y suprimir reaparición hasta confirmación del backend
        this.isMyTurn.set(false);
        this.suppressActions.set(true);
        sessionStorage.setItem(this.getSuppressKey(), '1');

        if (response.data.winner) {
          this.notificationService.showSuccess('¡Juego terminado!', 'Se ha determinado el ganador');
        } else {
          this.notificationService.showInfo('Turno terminado', 'Esperando al siguiente jugador');
        }

        // No forzar refresh inmediato; esperar notificación por socket
      },
      error: (error) => {
        this.notificationService.handleApiError(error, 'Error al terminar turno');
      }
    });
  }

  handleCheckBlackjack(): void {
    this.gameService.checkBlackjack(this.gameId).subscribe({
      next: (response) => {
        this.notificationService.showSuccess('¡BLACKJACK!', '¡Has ganado con BlackJack!');
        // Refrescar estado del juego para reflejar cambios de inmediato
        this.refreshGameData();
      },
      error: (error) => {
        if (error.status === 400) {
          this.notificationService.showWarning('No es BlackJack', 'No tienes BlackJack en esta mano');
        } else {
          this.notificationService.handleApiError(error, 'Error al verificar BlackJack');
        }
      }
    });
  }

  exitGame(): void {
    if (confirm('¿Estás seguro de que quieres salir del juego?')) {
      // Emitir leave solo al salir desde el botón
      const user = this.authService.currentUser();
      const userId = user?.id;
      if (this.gameId && userId && this.socketService['socket']?.connected) {
        this.socketService['socket'].emit('leave', this.gameId, userId);
      }
      this.goToLobby();
    }
  }

  goToLobby(): void {
    this.gameService.clearGame();
    this.router.navigate(['/lobby']);
  }

  // Utility methods
  private getSuitName(suit: string): string {
    const names: Record<string, string> = {
      'hearts': 'Corazones',
      'diamonds': 'Diamantes',
      'clubs': 'Tréboles',
      'spades': 'Picas'
    };
    return names[suit.toLowerCase()] || suit;
  }

  effectiveIsMyTurn(): boolean {
    return this.isMyTurn() && !this.suppressActions();
  }

  private getCurrentTurnPlayerId(game?: IGame | null): number | null {
    if (!game) return null;
    // game.players puede venir como números o como objetos usuario
    const playersArray: any[] = (game as any).players || [];
    const ownerId = (game as any).owner;
    const playingPlayers = playersArray
      .map((p: any) => (typeof p === 'number' ? p : p?.id))
      .filter((id: any) => id != null && Number(id) !== Number(ownerId));
    const index = game.turn ?? 0;
    return playingPlayers[index] ?? null;
  }
}
