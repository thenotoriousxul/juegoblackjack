import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
    rank: String,
    suit: String,
    value: Number,
})

export const Card = mongoose.model("Card", cardSchema);