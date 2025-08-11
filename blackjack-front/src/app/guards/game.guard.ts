import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { GameService } from '../services/game.service';
import { NotificationService } from '../services/notification.service';
import { map, catchError, of } from 'rxjs';

export const gameGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const gameService = inject(GameService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  const gameId = route.params['id'];
  
  if (!gameId) {
    notificationService.showError('Error', 'ID del juego no válido');
    router.navigate(['/lobby']);
    return false;
  }

  // Try to load the game
  return gameService.getGame(gameId).pipe(
    map(response => {
      if (response.data.game) {
        return true;
      } else {
        notificationService.showError('Juego No Encontrado', 'El juego no existe o ha finalizado');
        router.navigate(['/lobby']);
        return false;
      }
    }),
    catchError(error => {
      console.error('Game guard error:', error);
      notificationService.showError('Error', 'No se pudo acceder al juego');
      router.navigate(['/lobby']);
      return of(false);
    })
  );
};
