import { ICard } from "./card.model";
import type { IUser } from "./user.model";

export interface IPlayerDeck {
    playerId: number;
    gameId: string; // ObjectId as string
    deck: ICard[]; // Array of Card objects
    count: number; // Optional, default 0
    totalValue: number; // Optional, default 0
    isReady: boolean; // Optional, default false
    isStand?: boolean; // Jugador se plantó
    isBusted?: boolean; // Jugador se quemó (también reflejado por totalValue === -1)
}

export interface IPlayerDeckWithPlayer extends IPlayerDeck {
    player: IUser; // User object associated with the playerId
}

export interface ReadyPlayerResponse {
    message: string;
    data: {
        playerDeck: IPlayerDeck;
    }
}