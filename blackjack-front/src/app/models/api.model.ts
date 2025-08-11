export interface ApiResponse<T = any> {
    message: string;
    data?: T;
}

export interface ApiError {
    message: string;
    code?: number;
    errors?: any;
}

export interface SocketNotification {
    game: string;
}

export interface GameNotification {
    type: 'game_update' | 'player_joined' | 'game_started' | 'turn_changed' | 'game_finished';
    gameId: string;
    data?: any;
}

export interface Toast {
    id?: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}
