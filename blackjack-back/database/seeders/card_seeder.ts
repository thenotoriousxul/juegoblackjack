import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { Card } from '../../app/mongo_models/cards.js'

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
const ranks = [
  { rank: 'A', value: 1 },    // AS = 1
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },   // J = 11
  { rank: 'Q', value: 12 },   // Q = 12
  { rank: 'K', value: 13 },   // K = 13
]

export default class extends BaseSeeder {
  async run() {
    const cards = []
    for (const suit of suits) {
      for (const { rank, value } of ranks) {
        cards.push({ suit, rank, value })
      }
    }
    await Card.deleteMany({}) // Limpia la colección antes de insertar
    await Card.insertMany(cards)
    console.log('52 cartas insertadas en la colección cards')
  }
}