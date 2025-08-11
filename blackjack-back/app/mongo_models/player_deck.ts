import mongoose from "mongoose";

const playerDeckSchema = new mongoose.Schema({
    playerId: { type: Number, required: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
    deck: [{ type: mongoose.Schema.Types.ObjectId, ref: "Card" }],
    count: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    isReady: { type: Boolean, default: false },
    // Persistir si el jugador se plantó o se quemó
    isStand: { type: Boolean, default: false },
    isBusted: { type: Boolean, default: false }
});

export const PlayerDeck = mongoose.model("PlayerDeck", playerDeckSchema);
