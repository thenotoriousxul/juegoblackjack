import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  // Signal for reactive UI
  isLoading = signal(false);
  
  private activeRequests = 0;

  show(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.loadingSubject.next(true);
      this.isLoading.set(true);
    }
  }

  hide(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
    
    if (this.activeRequests === 0) {
      this.loadingSubject.next(false);
      this.isLoading.set(false);
    }
  }

  forceHide(): void {
    this.activeRequests = 0;
    this.loadingSubject.next(false);
    this.isLoading.set(false);
  }
}
