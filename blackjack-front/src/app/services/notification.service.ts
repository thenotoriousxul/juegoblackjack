import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Toast } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toasts = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toasts.asObservable();
  
  // Signal for reactive UI
  toastList = signal<Toast[]>([]);

  constructor() {}

  showSuccess(title: string, message?: string, duration = 5000): void {
    this.addToast({
      type: 'success',
      title,
      message,
      duration
    });
  }

  showError(title: string, message?: string, duration = 8000): void {
    this.addToast({
      type: 'error',
      title,
      message,
      duration
    });
  }

  showWarning(title: string, message?: string, duration = 6000): void {
    this.addToast({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  showInfo(title: string, message?: string, duration = 4000): void {
    this.addToast({
      type: 'info',
      title,
      message,
      duration
    });
  }

  private addToast(toast: Toast): void {
    const id = this.generateId();
    const newToast = { ...toast, id };
    
    const currentToasts = this.toasts.value;
    const updatedToasts = [...currentToasts, newToast];
    
    this.toasts.next(updatedToasts);
    this.toastList.set(updatedToasts);

    // Auto remove after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, toast.duration);
    }
  }

  removeToast(id: string): void {
    const currentToasts = this.toasts.value;
    const updatedToasts = currentToasts.filter(toast => toast.id !== id);
    
    this.toasts.next(updatedToasts);
    this.toastList.set(updatedToasts);
  }

  clearAll(): void {
    this.toasts.next([]);
    this.toastList.set([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Utility methods for common scenarios
  handleApiError(error: any, defaultMessage = 'Ha ocurrido un error'): void {
    let errorMessage = defaultMessage;
    
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    this.showError('Error', errorMessage);
  }

  handleApiSuccess(message: string, details?: string): void {
    this.showSuccess(message, details);
  }
}
