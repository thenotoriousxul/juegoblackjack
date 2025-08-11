import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    owner: Number,
    deck: [{ type: mongoose.Schema.Types.ObjectId, ref: "Card" }],
    players: [Number],
    is_active: Boolean,
    turn: Number,
    winner: Number,
    joinCode: String,
    isFinished: { type: Boolean, default: false },
})

export const Game = mongoose.model("Game", gameSchema);