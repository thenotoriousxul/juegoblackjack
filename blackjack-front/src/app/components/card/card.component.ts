import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICard } from '../../models/card.model';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="card relative w-16 h-24 md:w-20 md:h-32 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-lg"
      [class]="cardClasses()"
      [title]="cardTitle()"
    >
      @if (showBack()) {
        <!-- Card Back -->
        <div class="w-full h-full bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg border-2 border-blue-600 flex items-center justify-center">
          <div class="text-white text-2xl md:text-4xl opacity-30">♠</div>
        </div>
      } @else {
        <!-- Card Front -->
        <div class="w-full h-full bg-white rounded-lg flex flex-col justify-between p-1 md:p-2" [class]="textColorClass()">
          <!-- Top Left -->
          <div class="flex flex-col items-start text-xs md:text-sm font-bold">
            <span>{{ card().rank }}</span>
            <span class="text-lg md:text-xl">{{ getSuitSymbol() }}</span>
          </div>
          
          <!-- Center Symbol -->
          <div class="flex-1 flex items-center justify-center">
            <span class="text-2xl md:text-4xl">{{ getSuitSymbol() }}</span>
          </div>
          
          <!-- Bottom Right (rotated) -->
          <div class="flex flex-col items-end text-xs md:text-sm font-bold transform rotate-180">
            <span>{{ card().rank }}</span>
            <span class="text-lg md:text-xl">{{ getSuitSymbol() }}</span>
          </div>
        </div>
      }
      
      <!-- Card Value Badge (only in development/debug mode) -->
      @if (showValue() && !showBack()) {
        <div class="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {{ card().value }}
        </div>
      }
    </div>
  `
})
export class CardComponent {
  // Inputs
  card = input.required<ICard>();
  showBack = input<boolean>(false);
  showValue = input<boolean>(false);
  size = input<'small' | 'medium' | 'large'>('medium');
  
  // Computed properties
  cardClasses = computed(() => {
    const classes = [];
    const sizeClass = this.getSizeClass();
    classes.push(sizeClass);
    
    if (this.isRed()) {
      classes.push('border-red-200');
    } else {
      classes.push('border-gray-200');
    }
    
    return classes.join(' ');
  });
  
  cardTitle = computed(() => {
    return `${this.card().rank} de ${this.getSuitName()}`;
  });
  
  textColorClass = computed(() => {
    return this.isRed() ? 'text-red-600' : 'text-black';
  });

  getSuitSymbol(): string {
    const symbols: Record<string, string> = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[this.card().suit.toLowerCase()] || '?';
  }
  
  getSuitName(): string {
    const names: Record<string, string> = {
      'hearts': 'Corazones',
      'diamonds': 'Diamantes',
      'clubs': 'Tréboles',
      'spades': 'Picas'
    };
    return names[this.card().suit.toLowerCase()] || this.card().suit;
  }
  
  isRed(): boolean {
    const suit = this.card().suit.toLowerCase();
    return suit === 'hearts' || suit === 'diamonds';
  }
  
  getSizeClass(): string {
    const sizeClasses = {
      small: 'w-12 h-16',
      medium: 'w-16 h-24 md:w-20 md:h-32',
      large: 'w-20 h-32 md:w-24 md:h-36'
    };
    return sizeClasses[this.size()];
  }
}
