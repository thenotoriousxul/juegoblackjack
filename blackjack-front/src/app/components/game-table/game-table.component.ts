import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerHandComponent } from '../player-hand/player-hand.component';
import { IGame } from '../../models/game.model';
import { IPlayerDeckWithPlayer } from '../../models/playerDeck.model';
import { IUser } from '../../models/user.model';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule, PlayerHandComponent],
  template: `
    <div class="game-table min-h-screen bg-gradient-to-b from-green-700 via-green-800 to-green-900 p-4">
      
      <!-- Table Header -->
      <div class="text-center mb-6">
        <h1 class="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
          🃏 Mesa de Blackjack
        </h1>
        <div class="text-white text-opacity-80">
          <span class="text-lg">Código: </span>
          <span class="font-mono text-xl bg-black bg-opacity-30 px-3 py-1 rounded">
            {{ game().joinCode }}
          </span>
        </div>
      </div>

      <!-- Game Status -->
      <div class="text-center mb-6">
        @if (!game().is_active && !game().isFinished) {
          <div class="text-yellow-400 text-xl font-semibold">
            🕐 Esperando que todos los jugadores estén listos...
          </div>
        } @else if (game().is_active && !game().winner) {
          <div class="text-green-400 text-xl font-semibold">
            🎮 Juego en curso - Turno: {{ getCurrentPlayerName() }}
          </div>
        } @else if (game().winner) {
          <div class="text-yellow-400 text-2xl font-bold animate-pulse">
            🏆 {{ getWinnerName() }} ha ganado!
          </div>
        } @else if (game().isFinished && !game().winner) {
          <div class="text-yellow-300 text-xl font-semibold">
            🏁 La partida terminó sin ganador
          </div>
        }
      </div>

      <!-- Action Buttons Area -->
      <div class="flex justify-center mb-6">
        @if (showOwnerActions()) {
          <div class="space-x-4">
            @if (!game().is_active && !game().winner && !game().isFinished && allPlayersReady()) {
              <button 
                (click)="startGame.emit()"
                class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                🚀 Iniciar Juego
              </button>
            }
            @if ((game().winner || game().isFinished) && !game().is_active) {
              <button 
                (click)="restartGame.emit()"
                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                🔄 Reiniciar Juego
              </button>
            }
          </div>
        }
      </div>

      <!-- Players Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
        @for (playerDeck of playerDecks(); track playerDeck.player.id) {
          <app-player-hand
            [playerDeck]="playerDeck"
            [currentPlayerId]="currentUser()?.id || null"
            [isTurn]="isPlayerTurn(playerDeck.player.id)"
            [gameStarted]="game().is_active"
            [showAllValues]="shouldShowAllValues()"
            [showCardValues]="false">
          </app-player-hand>
        }
      </div>

      <!-- Player Actions (Bottom) -->
      @if (showPlayerActions()) {
        <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 rounded-xl p-4">
          <div class="flex space-x-3">
            
            @if (!game().is_active && !currentPlayerDeck()?.isReady) {
              <button 
                (click)="readyUp.emit()"
                class="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                ✋ Estar Listo
              </button>
            }

            @if (canAct()) {
              <!-- Game Actions -->
              @if (canCheckBlackjack()) {
                <button 
                  (click)="checkBlackjack.emit()"
                  class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  ⭐ Blackjack!
                </button>
              }
              
              <button 
                (click)="drawCard.emit()"
                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                [disabled]="currentPlayerDeck()?.totalValue === -1 || currentPlayerDeck()?.isStand === true">
                🃏 Pedir Carta
              </button>
              
              <button 
                (click)="finishTurn.emit()"
                class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                🛑 Terminar Turno
              </button>
            }
            
            <!-- Debug info -->
            <div class="text-white text-xs bg-red-800 p-2 rounded max-w-xs">
              <div>Game Active: {{ game().is_active ? 'YES' : 'NO' }}</div>
              <div>Is My Turn: {{ isMyTurn() ? 'YES' : 'NO' }}</div>
              <div>Current User: {{ currentUser()?.fullName || 'NONE' }}</div>
              <div>Ready: {{ currentPlayerDeck()?.isReady ? 'YES' : 'NO' }}</div>
              <div>Stand: {{ currentPlayerDeck()?.isStand ? 'YES' : 'NO' }}</div>
              <div>Busted: {{ currentPlayerDeck()?.totalValue === -1 ? 'YES' : 'NO' }}</div>
            </div>
          </div>
        </div>
      }

      <!-- Game Info Panel -->
      <div class="fixed top-4 right-4 bg-black bg-opacity-60 rounded-lg p-4 text-white text-sm max-w-xs">
        <div class="space-y-1">
          <div>Jugadores: {{ game().players.length }}/7</div>
          <div>Estado: {{ getGameStatus() }}</div>
          @if (game().is_active) {
            <div>Cartas restantes: {{ remainingCards() }}</div>
          }
        </div>
      </div>
    </div>
  `
})
export class GameTableComponent {
  // Inputs
  game = input.required<IGame>();
  playerDecks = input.required<IPlayerDeckWithPlayer[]>();
  currentUser = input<IUser | null>(null);
  isOwner = input<boolean>(false);
  isMyTurn = input<boolean>(false);

  // Outputs
  startGame = output<void>();
  restartGame = output<void>();
  readyUp = output<void>();
  drawCard = output<void>();
  finishTurn = output<void>();
  checkBlackjack = output<void>();

  // Computed properties
  currentPlayerDeck = computed(() => {
    return this.playerDecks().find(deck => 
      deck.player.id === this.currentUser()?.id
    );
  });

  allPlayersReady = computed(() => {
    // Solo considerar jugadores que no son el anfitrión
    const playingPlayerDecks = this.playerDecks().filter(deck => 
      deck.player.id !== this.game().owner
    );
    return playingPlayerDecks.every(deck => deck.isReady);
  });

  shouldShowAllValues = computed(() => {
    // Show all values if you're the owner or game is finished
    return this.isOwner() || !!this.game().winner;
  });

  remainingCards = computed(() => {
    const totalCards = 52;
    const usedCards = this.playerDecks().reduce((sum, deck) => sum + deck.count, 0);
    return totalCards - usedCards;
  });

  showOwnerActions = computed(() => {
    return this.isOwner();
  });

  showPlayerActions = computed(() => {
    const result = this.currentUser() && !this.game().isFinished;
    
    console.log('🎮 showPlayerActions Debug:', {
      currentUser: !!this.currentUser(),
      userName: this.currentUser()?.fullName,
      gameFinished: this.game().isFinished,
      result
    });
    
    return result;
  });

  canCheckBlackjack = computed(() => {
    const myDeck = this.currentPlayerDeck();
    return myDeck && myDeck.count === 2 && this.game().turn === 0;
  });

  canAct = computed(() => {
    const myDeck = this.currentPlayerDeck();
    const can = !!(this.game().is_active && this.isMyTurn() && myDeck && myDeck.totalValue !== -1 && !myDeck.isStand);
    return can;
  });

  // Methods
  isPlayerTurn(playerId: number): boolean {
    // El anfitrión no juega, solo los demás jugadores
    const playersArray: any[] = (this.game() as any).players || [];
    const ownerId = (this.game() as any).owner;
    const playingPlayers = playersArray
      .map((p: any) => (typeof p === 'number' ? p : p?.id))
      .filter((id: any) => id != null && Number(id) !== Number(ownerId));
    const playerIndex = playingPlayers.indexOf(playerId);
    return this.game().turn === playerIndex && this.game().is_active;
  }

  getCurrentPlayerName(): string {
    const currentPlayerIndex = this.game().turn;
    // El anfitrión no juega, solo los demás jugadores
    const playersArray: any[] = (this.game() as any).players || [];
    const ownerId = (this.game() as any).owner;
    const playingPlayers = playersArray
      .map((p: any) => (typeof p === 'number' ? p : p?.id))
      .filter((id: any) => id != null && Number(id) !== Number(ownerId));
    const currentPlayerId = playingPlayers[currentPlayerIndex];
    const currentPlayer = this.playerDecks().find(deck => 
      deck.player.id === currentPlayerId
    );
    
    // Debug logs
    console.log('🎮 Turn Debug:', {
      currentPlayerIndex,
      playingPlayers,
      allPlayers: (this.game() as any).players,
      owner: (this.game() as any).owner,
      currentPlayerId,
      playerDecks: this.playerDecks().map(d => ({ id: d.player.id, name: d.player.fullName })),
      currentPlayer: currentPlayer?.player.fullName
    });
    
    return currentPlayer?.player.fullName || 'Desconocido';
  }

  getWinnerName(): string {
    if (!this.game().winner) return '';
    const winnerField: any = (this.game() as any).winner;
    const winnerId: number | null = typeof winnerField === 'object' ? Number(winnerField.id) : Number(winnerField);

    if (winnerId == null || Number.isNaN(winnerId)) return 'Desconocido';

    // Intentar encontrar primero en los mazos (puede que en vista no-owner solo venga mi propio mazo)
    let name = this.playerDecks().find(deck => deck.player.id === winnerId)?.player.fullName;

    // Si no está en mazos, buscar en game.players (puede ser array de IDs o de objetos usuario)
    if (!name) {
      const playersArray: any[] = (this.game() as any).players || [];
      const winnerUser = playersArray
        .map((p: any) => (typeof p === 'number' ? { id: p, fullName: undefined } : p))
        .find((u: any) => Number(u?.id) === winnerId);
      name = winnerUser?.fullName;
    }

    // Debug logs
    console.log('🎮 Winner Debug:', {
      winnerId,
      players: (this.game() as any).players,
      playerDecks: this.playerDecks().map(d => ({ id: d.player.id, name: d.player.fullName })),
      resolvedName: name
    });

    return name || 'Desconocido';
  }

  getGameStatus(): string {
    if (this.game().isFinished) return 'Finalizado';
    if (this.game().winner) return 'Terminado';
    if (this.game().is_active) return 'Activo';
    return 'Esperando';
  }
}
