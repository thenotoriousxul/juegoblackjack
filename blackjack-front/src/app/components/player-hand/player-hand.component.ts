import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { IPlayerDeckWithPlayer } from '../../models/playerDeck.model';

@Component({
  selector: 'app-player-hand',
  standalone: true,
  imports: [CommonModule, CardComponent],
  template: `
    <div class="player-hand bg-gradient-to-r from-green-800 to-green-900 rounded-xl p-4 border-2 shadow-lg" 
         [class]="containerClasses()">
      
      <!-- Player Info Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center">
            <span class="text-white font-bold text-sm">{{ getPlayerInitials() }}</span>
          </div>
          <span class="text-white font-semibold">{{ playerDeck().player.fullName }}</span>
          @if (isCurrentPlayer()) {
            <span class="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-bold">TÚ</span>
          }
        </div>
        
        <!-- Status Indicators -->
        <div class="flex space-x-2">
          @if (playerDeck().isReady && !gameStarted()) {
            <span class="text-xs bg-green-500 text-white px-2 py-1 rounded-full">LISTO</span>
          }
          @if (isTurn()) {
            <span class="text-xs bg-blue-500 text-white px-2 py-1 rounded-full animate-pulse">TURNO</span>
          }
          @if (isBusted()) {
            <span class="text-xs bg-red-500 text-white px-2 py-1 rounded-full">QUEMADO</span>
          }
        </div>
      </div>

      <!-- Cards Container -->
      <div class="flex flex-wrap gap-1 md:gap-2 justify-center min-h-[100px] items-center">
        @if (playerDeck().deck && playerDeck().deck.length > 0) {
          @for (card of playerDeck().deck; track card._id) {
            <app-card 
              [card]="card" 
              [showBack]="shouldShowCardBack()"
              [size]="'small'"
              [showValue]="showCardValues()">
            </app-card>
          }
        } @else {
          <div class="text-white text-opacity-60 italic text-center">
            Sin cartas
          </div>
        }
      </div>

      <!-- Hand Value and Info -->
      <div class="mt-3 text-center">
        @if ((gameStarted() || showAllValues()) && (isCurrentPlayer() || showAllValues())) {
          <div class="flex justify-center space-x-4 text-white">
            <span class="text-sm">
              Cartas: <span class="font-bold">{{ playerDeck().count || 0 }}</span>
            </span>
            <span class="text-sm">
              Valor: <span class="font-bold" [class]="getValueColorClass()">
                {{ getDisplayValue() }}
              </span>
            </span>
          </div>
        }
      </div>
    </div>
  `
})
export class PlayerHandComponent {
  // Inputs
  playerDeck = input.required<IPlayerDeckWithPlayer>();
  currentPlayerId = input<number | null>(null);
  isTurn = input<boolean>(false);
  gameStarted = input<boolean>(false);
  showAllValues = input<boolean>(false);  // For game owner or finished games
  showCardValues = input<boolean>(false); // Debug mode

  // Computed properties
  isCurrentPlayer = computed(() => {
    return this.currentPlayerId() === this.playerDeck().player.id;
  });

  containerClasses = computed(() => {
    const classes = ['border-green-600'];
    
    if (this.isTurn()) {
      classes.push('border-blue-400', 'shadow-blue-400/50', 'shadow-2xl');
    } else if (this.isCurrentPlayer()) {
      classes.push('border-yellow-400', 'shadow-yellow-400/30');
    } else if (this.isBusted()) {
      classes.push('border-red-400', 'bg-gradient-to-r', 'from-red-900', 'to-red-800');
    }
    
    return classes.join(' ');
  });

  shouldShowCardBack = computed(() => {
    // Si el juego terminó o se permite ver todo, siempre mostrar frente
    if (this.showAllValues()) return false;
    // Antes de iniciar, mostrar dorso para todos excepto el dueño de la mano
    if (!this.gameStarted()) return !this.isCurrentPlayer();
    // Durante el juego: otros jugadores ven dorso
    return !this.isCurrentPlayer();
  });

  isBusted = computed(() => {
    return this.playerDeck().totalValue === -1;
  });

  getPlayerInitials(): string {
    const name = this.playerDeck().player.fullName;
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getDisplayValue(): string {
    const value = this.playerDeck().totalValue;
    
    if (value === -1) {
      return 'QUEMADO';
    }
    
    if (value === 0 && !this.gameStarted()) {
      return '--';
    }
    
    return value.toString();
  }

  getValueColorClass(): string {
    const value = this.playerDeck().totalValue;
    
    if (value === -1) {
      return 'text-red-400';
    } else if (value === 21) {
      return 'text-yellow-400';
    } else if (value > 17) {
      return 'text-green-400';
    }
    
    return 'text-white';
  }
}
