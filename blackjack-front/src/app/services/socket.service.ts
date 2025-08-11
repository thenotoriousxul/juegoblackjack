import { Injectable, inject, ApplicationRef } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { SocketNotification } from '../models/api.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private authService = inject(AuthService);
  private appRef = inject(ApplicationRef);
  
  private socket: Socket | null = null;
  private connected = new BehaviorSubject<boolean>(false);
  private gameNotifications = new BehaviorSubject<SocketNotification | null>(null);
  private pendingRoomJoins: string[] = []; // Queue for rooms to join when connected
  private joinedRooms = new Set<string>(); // Rooms to keep joined across reconnects

  public isConnected$ = this.connected.asObservable();
  public gameNotifications$ = this.gameNotifications.asObservable();

  constructor() {
    // Auto-connect when authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    console.log('🔌 Conectando a WebSocket...');

    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket?.id);
      this.connected.next(true);
      // Siempre hacer join a todas las salas activas con userId
      const user = this.authService.currentUser();
      const userId = user?.id;
      const rooms = Array.from(this.joinedRooms);
      if (rooms.length && userId) {
        console.log('🔁 Reuniéndose a salas previas tras reconexión:', rooms, 'como user', userId);
        rooms.forEach((gameId) => {
          this.socket?.emit('join', gameId, userId);
        });
      }
      if (this.pendingRoomJoins.length && userId) {
        console.log('🔄 Procesando salas pendientes:', this.pendingRoomJoins, 'como user', userId);
        this.pendingRoomJoins.forEach(gameId => {
          this.socket?.emit('join', gameId, userId);
          this.joinedRooms.add(gameId);
        });
        this.pendingRoomJoins = [];
      }
      queueMicrotask(() => this.appRef.tick());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.connected.next(false);
      queueMicrotask(() => this.appRef.tick()); // Schedule tick for next cycle
    });

    this.socket.on('connect_error', (error) => {
      console.error('💥 Error de conexión WebSocket:', error);
      this.connected.next(false);
      queueMicrotask(() => this.appRef.tick()); // Schedule tick for next cycle
    });

    // Game-specific events
    this.socket.on('gameNotify', (data: SocketNotification) => {
      console.log('🎮 Notificación de juego recibida:', data);
      this.gameNotifications.next(data);
      queueMicrotask(() => this.appRef.tick()); // Schedule tick for next cycle
    });

    // Evento personalizado para forzar a todos al lobby
    this.socket.on('forceLobby', (data: any) => {
      console.log('🚪 Evento forceLobby recibido:', data);
      // Notificamos a los listeners
      this.forceLobbySubject.next(data);
      queueMicrotask(() => this.appRef.tick());
    });
  }

  // Observable para el evento forceLobby
  private forceLobbySubject = new BehaviorSubject<any | null>(null);
  public forceLobby$ = this.forceLobbySubject.asObservable();

  public joinGameRoom(gameId: string): void {
    // Always track room to auto-rejoin on reconnects
    this.joinedRooms.add(gameId);

    const user = this.authService.currentUser();
    const userId = user?.id;
    if (!userId) {
      console.warn('No se puede unir a la sala: userId no disponible');
      return;
    }
    if (this.socket?.connected) {
      console.log(`🎯 Uniéndose a la sala del juego: ${gameId} como user ${userId}`);
      this.socket.emit('join', gameId, userId);
    } else {
      console.log(`⏳ Socket no conectado, encolando sala: ${gameId}`);
      if (!this.pendingRoomJoins.includes(gameId)) {
        this.pendingRoomJoins.push(gameId);
      }
    }
  }

  leaveGameRoom(gameId: string): void {
    if (this.socket?.connected) {
      console.log(`🚪 Saliendo de la sala del juego: ${gameId}`);
      this.socket.emit('leave', gameId);
    }
    this.joinedRooms.delete(gameId);
    const index = this.pendingRoomJoins.indexOf(gameId);
    if (index > -1) {
      this.pendingRoomJoins.splice(index, 1);
      console.log(`🗑️ Removido de la cola pendiente: ${gameId}`);
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Desconectando WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.connected.next(false);
      this.pendingRoomJoins = []; // Clear pending rooms
      // Mantenemos joinedRooms para re-unir tras login reconectado si aplica
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Custom event emitters if needed
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`⚠️ Intentando emitir '${event}' pero socket no está conectado`);
    }
  }

  // Custom event listeners
  on(event: string): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket no está inicializado');
        return;
      }

      this.socket.on(event, (data: any) => {
        observer.next(data);
        queueMicrotask(() => this.appRef.tick()); // Schedule tick for next cycle
      });

      // Cleanup on unsubscribe
      return () => {
        this.socket?.off(event);
      };
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
