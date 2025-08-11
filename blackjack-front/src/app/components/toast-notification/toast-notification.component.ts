import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Toast } from '../../models/api.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      @for (toast of toasts; track toast.id) {
        <div 
          class="toast-notification bg-white rounded-lg shadow-lg border-l-4 p-4 transform transition-all duration-300"
          [class]="getToastClasses(toast)"
          [attr.data-id]="toast.id">
          
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <span class="text-xl">{{ getToastIcon(toast.type) }}</span>
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-gray-900 text-sm">
                  {{ toast.title }}
                </h4>
                @if (toast.message) {
                  <p class="text-gray-700 text-sm mt-1">
                    {{ toast.message }}
                  </p>
                }
              </div>
            </div>
            
            <button 
              (click)="removeToast(toast.id!)"
              class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <span class="text-lg">×</span>
            </button>
          </div>
          
          <!-- Progress bar for auto-dismiss -->
          @if (toast.duration && toast.duration > 0) {
            <div class="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div 
                class="h-1 rounded-full transition-all ease-linear"
                [class]="getProgressBarColor(toast.type)"
                [style.width.%]="0"
                [style.animation]="'shrink ' + toast.duration + 'ms linear'">
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      @keyframes shrink {
        from { width: 100%; }
        to { width: 0%; }
      }
      
      .toast-notification {
        animation: slideInRight 0.3s ease-out;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .toast-notification.removing {
        animation: slideOutRight 0.3s ease-in forwards;
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    </style>
  `
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private subscription?: Subscription;
  
  toasts: Toast[] = [];

  ngOnInit(): void {
    this.subscription = this.notificationService.toasts$.subscribe(
      toasts => {
        this.toasts = toasts;
        // Use detectChanges to avoid ExpressionChangedAfterItHasBeenCheckedError
        this.cdr.detectChanges();
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  removeToast(id: string): void {
    // Add removing animation class
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('removing');
      setTimeout(() => {
        this.notificationService.removeToast(id);
      }, 300);
    } else {
      this.notificationService.removeToast(id);
    }
  }

  getToastClasses(toast: Toast): string {
    const baseClasses = 'border-l-4';
    const typeClasses = {
      success: 'border-green-500 bg-green-50',
      error: 'border-red-500 bg-red-50',
      warning: 'border-yellow-500 bg-yellow-50',
      info: 'border-blue-500 bg-blue-50'
    };
    
    return `${baseClasses} ${typeClasses[toast.type]}`;
  }

  getToastIcon(type: string): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  getProgressBarColor(type: string): string {
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  }
}
