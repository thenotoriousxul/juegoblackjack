export interface ICard {
    _id: string;
    rank: string;
    suit: string;
    value: number;
}


export interface PedirCartaResponse {
    message: string; 
    data:{
        card: ICard;
        totalValue: number;
        count: number;
    }
}

export interface BlackjackResponse {
    message: string;
    data: {
        winner: number;
        game: any;
    }
}

export interface FinishTurnResponse {
    message: string;
    data: {
        winner?: number;
        game: any;
        playersDecks?: any[];
    }
}