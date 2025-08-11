import { Injectable, inject, signal, ApplicationRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { IGame, CreateGameResponse, JoinGameResponse, GetGameResponse } from '../models/game.model';
import { ICard, PedirCartaResponse, BlackjackResponse, FinishTurnResponse } from '../models/card.model';
import { IPlayerDeckWithPlayer, ReadyPlayerResponse } from '../models/playerDeck.model';
import { ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private http = inject(HttpClient);
  private appRef = inject(ApplicationRef);
  private readonly API_URL = environment.apiUrl;

  // Current game state
  private currentGameSubject = new BehaviorSubject<IGame | null>(null);
  public currentGame$ = this.currentGameSubject.asObservable();
  
  private playerDecksSubject = new BehaviorSubject<IPlayerDeckWithPlayer[]>([]);
  public playerDecks$ = this.playerDecksSubject.asObservable();

  // Signals for reactive UI
  currentGame = signal<IGame | null>(null);
  playerDecks = signal<IPlayerDeckWithPlayer[]>([]);
  isOwner = signal(false);
  isMyTurn = signal(false);
  isLoading = signal(false);

  constructor() {}

  // Game Management
  createGame(): Observable<CreateGameResponse> {
    this.isLoading.set(true);
    return this.http.post<CreateGameResponse>(`${this.API_URL}/games`, {}).pipe(
      tap(response => {
        this.setCurrentGame(response.data.game, [], true, false);
      }),
      catchError(error => {
        console.error('Create game error:', error);
        return throwError(() => error);
      }),
      tap(() => this.isLoading.set(false))
    );
  }

  joinGame(code: string): Observable<JoinGameResponse> {
    this.isLoading.set(true);
    return this.http.post<JoinGameResponse>(`${this.API_URL}/games/join/${code}`, {}).pipe(
      tap(response => {
        this.setCurrentGame(response.data.game, [], false, false);
      }),
      catchError(error => {
        console.error('Join game error:', error);
        return throwError(() => error);
      }),
      tap(() => this.isLoading.set(false))
    );
  }

  getGame(gameId: string): Observable<GetGameResponse> {
    this.isLoading.set(true);
    return this.http.get<GetGameResponse>(`${this.API_URL}/games/${gameId}`).pipe(
      tap(response => {
        console.log('🎮 GameService received data:', {
          game: response.data.game,
          turn: response.data.game.turn,
          players: response.data.game.players,
          isOwner: response.data.isOwner,
          isYourTurn: response.data.isYourTurn,
          playerDecks: response.data.playersDecks
        });
        
        this.setCurrentGame(
          response.data.game, 
          response.data.playersDecks, 
          response.data.isOwner, 
          response.data.isYourTurn
        );
      }),
      catchError(error => {
        console.error('Get game error:', error);
        return throwError(() => error);
      }),
      tap(() => this.isLoading.set(false))
    );
  }

  startGame(gameId: string): Observable<ApiResponse> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse>(`${this.API_URL}/games/start/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Start game error:', error);
        return throwError(() => error);
      }),
      tap(() => this.isLoading.set(false))
    );
  }

  restartGame(gameId: string): Observable<ApiResponse> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse>(`${this.API_URL}/games/restart/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Restart game error:', error);
        return throwError(() => error);
      }),
      tap(() => this.isLoading.set(false))
    );
  }

  // Player Deck Actions
  pedirCarta(gameId: string): Observable<PedirCartaResponse> {
    return this.http.post<PedirCartaResponse>(`${this.API_URL}/player-decks/pedir-carta/${gameId}`, {}).pipe(
      tap(response => {
        // Update local state if needed
        console.log('Card drawn:', response.data.card);
      }),
      catchError(error => {
        console.error('Draw card error:', error);
        return throwError(() => error);
      })
    );
  }

  estarListo(gameId: string): Observable<ReadyPlayerResponse> {
    return this.http.post<ReadyPlayerResponse>(`${this.API_URL}/player-decks/ready/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Ready player error:', error);
        return throwError(() => error);
      })
    );
  }

  terminarTurno(gameId: string): Observable<FinishTurnResponse> {
    return this.http.post<FinishTurnResponse>(`${this.API_URL}/player-decks/finish/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Finish turn error:', error);
        return throwError(() => error);
      })
    );
  }

  checkBlackjack(gameId: string): Observable<BlackjackResponse> {
    return this.http.post<BlackjackResponse>(`${this.API_URL}/player-decks/blackjack/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Blackjack error:', error);
        return throwError(() => error);
      })
    );
  }

  // Nuevo método para solicitar destape cuando se tiene 21
  requestReveal(gameId: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/player-decks/reveal/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Request reveal error:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para verificar revelado automático (solo para anfitrión)
  checkAutoReveal(gameId: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/player-decks/auto-reveal/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Auto reveal error:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para abandonar la partida
  leaveGame(gameId: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/player-decks/leave/${gameId}`, {}).pipe(
      catchError(error => {
        console.error('Leave game error:', error);
        return throwError(() => error);
      })
    );
  }

  getMyDeck(gameId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/player-decks/my-deck/${gameId}`).pipe(
      catchError(error => {
        console.error('Get my deck error:', error);
        return throwError(() => error);
      })
    );
  }

  viewDeck(gameId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/games/deck/${gameId}`).pipe(
      catchError(error => {
        console.error('View deck error:', error);
        return throwError(() => error);
      })
    );
  }

  // State Management
  private setCurrentGame(
    game: IGame, 
    playerDecks: IPlayerDeckWithPlayer[], 
    isOwner: boolean, 
    isMyTurn: boolean
  ): void {
    this.currentGame.set(game);
    this.currentGameSubject.next(game);
    
    this.playerDecks.set(playerDecks);
    this.playerDecksSubject.next(playerDecks);
    
    this.isOwner.set(isOwner);
    this.isMyTurn.set(isMyTurn);
    
    // Schedule tick for next cycle to avoid ExpressionChangedAfterItHasBeenCheckedError
    queueMicrotask(() => this.appRef.tick());
  }

  clearGame(): void {
    this.currentGame.set(null);
    this.currentGameSubject.next(null);
    this.playerDecks.set([]);
    this.playerDecksSubject.next([]);
    this.isOwner.set(false);
    this.isMyTurn.set(false);
    
    // Schedule tick for next cycle to avoid ExpressionChangedAfterItHasBeenCheckedError
    queueMicrotask(() => this.appRef.tick());
  }

  getCurrentGame(): IGame | null {
    return this.currentGame();
  }

  getPlayerDecks(): IPlayerDeckWithPlayer[] {
    return this.playerDecks();
  }

  // Debug method to get current turn info
  getCurrentTurnInfo(): {playerIndex: number, playerId?: number, playerName?: string} {
    const game = this.currentGame();
    const playerDecks = this.playerDecks();
    
    if (!game) return {playerIndex: -1};
    
    const currentPlayerIndex = game.turn;
    // El anfitrión no juega, solo los demás jugadores
    const playingPlayers = game.players.filter(id => id !== game.owner);
    const currentPlayerId = playingPlayers[currentPlayerIndex];
    const currentPlayer = playerDecks.find(deck => 
      deck.player.id === currentPlayerId
    );
    
    return {
      playerIndex: currentPlayerIndex,
      playerId: currentPlayerId,
      playerName: currentPlayer?.player.fullName
    };
  }
}
