import { ICard } from '../models/card.model';

export class CardUtils {
  
  static getSuitSymbol(suit: string): string {
    const symbols: Record<string, string> = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit.toLowerCase()] || '?';
  }

  static getSuitName(suit: string): string {
    const names: Record<string, string> = {
      'hearts': 'Corazones',
      'diamonds': 'Diamantes',
      'clubs': 'Tréboles',
      'spades': 'Picas'
    };
    return names[suit.toLowerCase()] || suit;
  }

  static isRed(suit: string): boolean {
    const redSuits = ['hearts', 'diamonds'];
    return redSuits.includes(suit.toLowerCase());
  }

  static getRankDisplayName(rank: string): string {
    const names: Record<string, string> = {
      'A': 'As',
      'J': 'J',
      'Q': 'Q',
      'K': 'K'
    };
    return names[rank] || rank;
  }

  static calculateHandValue(cards: ICard[]): number {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        total += 11;
      } else {
        total += card.value;
      }
    }

    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  static isBlackjack(cards: ICard[]): boolean {
    if (cards.length !== 2) return false;
    
    const hasAce = cards.some(card => card.rank === 'A');
    const hasTen = cards.some(card => ['10', 'J', 'Q', 'K'].includes(card.rank));
    
    return hasAce && hasTen;
  }

  static getHandDescription(cards: ICard[]): string {
    const value = this.calculateHandValue(cards);
    
    if (value > 21) {
      return 'Quemado';
    } else if (this.isBlackjack(cards)) {
      return 'BlackJack!';
    } else if (value === 21) {
      return '21';
    } else {
      return value.toString();
    }
  }
}
