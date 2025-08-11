import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container flex items-center justify-center" [class]="containerClass()">
      <div class="flex flex-col items-center space-y-4">
        
        <!-- Casino-themed spinner -->
        <div class="relative">
          <div class="w-16 h-16 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl">🎰</span>
          </div>
        </div>

        <!-- Loading text -->
        @if (text()) {
          <div class="text-center">
            <p class="text-white text-lg font-semibold animate-pulse">
              {{ text() }}
            </p>
            @if (subText()) {
              <p class="text-white text-opacity-70 text-sm mt-1">
                {{ subText() }}
              </p>
            }
          </div>
        }

        <!-- Loading dots animation -->
        <div class="flex space-x-1">
          <div class="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    </div>
  `
})
export class LoadingSpinnerComponent {
  text = input<string>('Cargando...');
  subText = input<string>('');
  fullScreen = input<boolean>(false);
  overlay = input<boolean>(false);

  containerClass() {
    const classes = [];
    
    if (this.fullScreen()) {
      classes.push('fixed inset-0 z-50');
    }
    
    if (this.overlay()) {
      classes.push('bg-black bg-opacity-50');
    } else if (this.fullScreen()) {
      classes.push('bg-gradient-to-b from-green-800 to-green-900');
    }
    
    if (!this.fullScreen()) {
      classes.push('w-full h-full min-h-[200px]');
    }
    
    return classes.join(' ');
  }
}
