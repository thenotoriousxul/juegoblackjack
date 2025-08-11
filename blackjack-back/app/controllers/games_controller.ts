import type { HttpContext } from '@adonisjs/core/http'
import { Game } from '../mongo_models/game.js'
import { Card } from '../mongo_models/cards.js'
import { PlayerDeck } from '../mongo_models/player_deck.js'
import User from '#models/user'
import mongoose from 'mongoose';
import { io } from '#start/socket'


interface ICard {
  _id: mongoose.Types.ObjectId;
  suit: string;
  rank: string;
}

const shuffleDeck = async(): Promise<ICard[]> => {
  const cards = await Card.find({});
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards as ICard[];
}

const generateJoinCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let joinCode = '';
  for (let i = 0; i < 6; i++) {
    joinCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return joinCode;
}

interface IGame {
  _id: mongoose.Types.ObjectId;
  owner: number;
  deck: mongoose.Types.ObjectId[];
  players: number[];
  is_active: boolean;
  turn: number;
  winner: number | null;
  joinCode: string;
  isFinished: boolean;
}

const startGame = async (gameId: string): Promise<IGame> => {
  const game = await Game.findById(gameId);
  if (!game) {
    throw new Error('Game not found');
  }

  const suffleCards = await shuffleDeck();
  if (suffleCards.length < 52) {
    throw new Error('Deck must contain exactly 52 cards');
  }

  game.deck = suffleCards.map(card => card._id);

  const playerDecks = await PlayerDeck.find({ gameId: game._id });
  for (const playerDeck of playerDecks) {
    playerDeck.deck = [];
    playerDeck.count = 0;
    playerDeck.totalValue = 0;
    await playerDeck.save();
  }
  game.is_active = true;
  game.turn = 0;
  game.winner = null;

  for (const playerDeck of playerDecks) {
    const cardsToGive = [];
    for (let i = 0; i < 2; i++) {
      const card = game.deck.pop();
      if (card) {
        cardsToGive.push(card);
      }
    }
    if (cardsToGive.length === 0) {
      throw new Error('Not enough cards in the deck to start the game');
    }
    const cards = await Card.find({ _id: { $in: cardsToGive } });
    playerDeck.deck = cardsToGive;
    playerDeck.count = cardsToGive.length;
    // Mapear valor por rank para cumplir regla: A=1, J=11, Q=12, K=13
    const rankValue = (rank: string | undefined | null) => {
      if (!rank) return 0;
      if (rank === 'A') return 1;
      if (rank === 'J') return 11;
      if (rank === 'Q') return 12;
      if (rank === 'K') return 13;
      const parsed = Number(rank);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    playerDeck.totalValue = cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
    // Si con las dos primeras cartas supera 21, pierde automáticamente
    if (playerDeck.totalValue > 21) {
      playerDeck.totalValue = -1;
      playerDeck.isStand = true;
    }

    await playerDeck.save();
  }

  // Ganador instantáneo por 21 con dos cartas: tomar el primero según orden de unión (excluyendo anfitrión)
  const playingPlayersOrder = game.players.filter((playerId: number) => Number(playerId) !== Number(game.owner));
  const playersDecksAfterDeal = await PlayerDeck.find({ gameId: game._id, playerId: { $ne: game.owner } });
  const blackjackCandidatesList = playersDecksAfterDeal
    .filter((d) => d.totalValue === 21 && d.deck.length === 2)
    .map((d) => Number(d.playerId));
  const blackjackCandidates = new Set(blackjackCandidatesList);
  let instantWinner: number | null = null;
  const orderedWinners: number[] = [];
  for (const pid of playingPlayersOrder) {
    if (blackjackCandidates.has(Number(pid))) {
      orderedWinners.push(Number(pid));
      if (instantWinner === null) instantWinner = Number(pid);
    }
  }

  if (orderedWinners.length > 0) {
    // Si hay más de uno, es empate; si hay uno, único ganador
    if (orderedWinners.length === 1) {
      game.winner = instantWinner;
    } else {
      game.winner = null;
    }
    game.is_active = false;
    game.isFinished = true;
    await game.save();

    // Emitir fin de juego con nombres de ganadores
    const winnerUsers = await User.query().whereIn('id', orderedWinners);
    const winnerNames = orderedWinners
      .map((id) => winnerUsers.find((u) => u.id === id)?.fullName)
      .filter((n): n is string => !!n);
    io.to(`game:${game._id}`).emit('gameNotify', {
      game: game._id,
      type: 'game_finished',
      winner: game.winner,
      winners: orderedWinners,
      winnerNames
    });

    // Devolver el juego como antes
    return game as IGame;
  }

  // Ajustar el turno inicial al primer jugador válido (no plantado ni quemado)
  const playingPlayers = game.players.filter((playerId: number) => Number(playerId) !== Number(game.owner));
  let nextTurn = 0;
  let found = false;
  for (let i = 0; i < playingPlayers.length; i++) {
    const playerId = playingPlayers[i];
    const deck = await PlayerDeck.findOne({ playerId, gameId: game._id });
    if (deck && !deck.isStand && deck.totalValue !== -1) {
      nextTurn = i;
      found = true;
      break;
    }
  }

  if (found) {
    game.turn = nextTurn;
  } else {
    // Nadie queda activo: determinar ganador si aplica y finalizar
    const playersDecks = await PlayerDeck.find({ gameId: game._id, playerId: { $ne: game.owner } });
    const validDecks = playersDecks.filter((deck) => deck.totalValue <= 21 && deck.totalValue > 0);
    if (validDecks.length > 0) {
      const maxValue = Math.max(...validDecks.map((deck) => deck.totalValue));
      const winnersIds = validDecks.filter((deck) => deck.totalValue === maxValue).map((d) => Number(d.playerId));
      if (winnersIds.length === 1) {
        game.winner = winnersIds[0];
      } else {
        game.winner = null;
      }
      game.is_active = false;
      game.isFinished = true;

      const winnerUsers = await User.query().whereIn('id', winnersIds);
      const winnerNames = winnersIds
        .map((id) => winnerUsers.find((u) => u.id === id)?.fullName)
        .filter((n): n is string => !!n);
      io.to(`game:${game._id}`).emit('gameNotify', {
        game: game._id,
        type: 'game_finished',
        winner: game.winner,
        winners: winnersIds,
        winnerNames
      });

      await game.save();
      return game as IGame;
    } else {
      game.winner = null;
      game.is_active = false;
      game.isFinished = true;
    }
  }

  await game.save();
  return game as IGame;
}




export default class GamesController {


  async getGame({params, auth, response}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const gameId = params.id;

    const game = await Game.findById(gameId).populate('deck');




    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }

    // Solo obtener los mazos de jugadores (no del anfitrión)
    const playersDecks = await PlayerDeck.find({ 
      gameId: game._id,
      playerId: { $ne: game.owner }
    }).populate('deck');
    if (!playersDecks) {
      return response.notFound({
        message: 'No player decks found for this game'
      });
    }

    if (!game.players.includes(user.id)) {
      return response.forbidden({
        message: 'You are not part of this game'
      });
    }


    const playersData = await User.query().whereIn('id', game.players)
    
    // Mantener el orden exacto de game.players para que el índice de turno coincida
    const orderedPlayersData = game.players
      .map((pid: number) => playersData.find((u) => u.id === pid))
      .filter((u): u is NonNullable<typeof u> => !!u)

    const playersDecksWithData = [];

    for (const playerDeck of playersDecks) {
      const user = await User.findBy('id', playerDeck.playerId);
      const playerDeckData = {
        ...playerDeck.toObject(),
        player: user
      }
      playersDecksWithData.push(playerDeckData);
    }


    // El anfitrión no juega, solo los demás jugadores
    const playingPlayers = game.players.filter(playerId => playerId !== game.owner);
    const isPlayerTurn = game.turn === playingPlayers.indexOf(user.id);

    const winnerData = game.winner ? await User.findBy('id', game.winner) : null;



    if (game.owner === user.id) {
      const gameObject = game.toObject();
      const gameWithData = {
        ...gameObject,
        players: orderedPlayersData,
        winner: winnerData
      };

      return response.ok({
        message: 'Game retrieved successfully',
        data: {
          isOwner: game.owner === user.id,
          game: gameWithData,
          playersDecks: playersDecksWithData,
          isYourTurn: isPlayerTurn
        }
      });
    }else {
      const playerDeck = playersDecks.find(deck => deck.playerId === user.id);
      if (!playerDeck) {
        return response.notFound({
          message: 'Player deck not found for this user'
        });
      }

      const gameObject = game.toObject();
      const gameWithoutDeck = {
        ...gameObject,
        deck: undefined, // Exclude the deck from the response
        players: orderedPlayersData,
        winner: winnerData
      }
      return response.ok({
        message: 'Game retrieved successfully',
        data: {
          isOwner: game.owner === user.id,
          game: gameWithoutDeck,
          playersDecks: playersDecksWithData, // Mostrar todos los oponentes; el front ya oculta valores
          isYourTurn: isPlayerTurn,
        }
      });
    }
  }
  
  async createGame({auth, response}: HttpContext) {
    const user = await auth.use('api').authenticate()
    const cards = await shuffleDeck();

    if (cards.length !== 52) {
      return response.badRequest({
        message: 'Deck must contain exactly 52 cards'
      });
    }


    const game = new Game({
      owner: user.id,
      deck: cards.map(card => card._id),
      players: [user.id],
      is_active: false,
      turn: 0,
      winner: null,
      joinCode: generateJoinCode()
    })
    await game.save();
    

    const playerDeck = new PlayerDeck({
      playerId: user.id,
      gameId: game._id,
      deck: [],
      count: 0,
      totalValue: 0,
      isReady: false
    })

    await playerDeck.save();

    const gameCreated = await Game.findById(game._id).populate('deck');

    if (!gameCreated) {
      return response.internalServerError({
        message: 'Error creating game'
      });
    }


    const playersData = await User.query().whereIn('id', gameCreated.players);
    const gameWithData = {
      ...gameCreated.toObject(),
      players: playersData
    }

    return response.created({
      message: 'Game created successfully',
      data: {
        game: gameWithData
      }
    })
  }

  async viewDeck({params, response}: HttpContext) {
    const gameId = params.id;
    const game = await Game.findById(gameId).populate('deck');

    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }

    return response.ok({
      message: 'Deck retrieved successfully',
      data: {
        deck: game.deck,
        count: game.deck.length
      }
    });
  }

  async joinGame({params, auth, response}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const gameCode = params.code;

    const game = await Game.findOne({ joinCode: gameCode });
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    if (game.players.includes(user.id)) {
      return response.badRequest({
        message: 'You are already in this game'
      });
    }
    if (game.players.length >= 7) {
      return response.badRequest({
        message: 'Game is full'
      });
    }
    if (game.is_active) {
      return response.badRequest({
        message: 'Game is already active'
      });
    }
    if (game.isFinished) {
      return response.badRequest({
        message: 'Game has already finished'
      });
    }

    game.players.push(user.id);
    const playerDeck = new PlayerDeck({
      playerId: user.id,
      gameId: game._id,
      deck: [],
      count: 0
    });
    await playerDeck.save();

    await game.save();

    const gameUpdated = await Game.findById(game._id);
    if (!gameUpdated) {
      return response.internalServerError({
        message: 'Error updating game'
      });
    }
    const playersData = await User.query().whereIn('id', gameUpdated.players);

    const gameWithoutDeck = {
      ...gameUpdated.toObject(),
      deck: undefined, // Exclude the deck from the response
      players: playersData
    }

    // Notify all sockets in the game room
    io.to(`game:${game._id}`).emit('gameNotify', { game: game._id });

    return response.ok({
      message: 'Joined game successfully',
      data: {
        game: gameWithoutDeck
      }
    });
  }

  async startGame({params, response, auth}: HttpContext) {
    const gameId = params.id;
    const game = await Game.findById(gameId);
    const user = await auth.use('api').authenticate();
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    if (game.is_active) {
      return response.badRequest({
        message: 'Game is already active'
      });
    }
    // El anfitrión no juega, necesitamos mínimo 4 jugadores además del anfitrión
    const playingPlayersCount = game.players.filter(playerId => playerId !== game.owner).length;
    if (playingPlayersCount < 4) {
      return response.badRequest({
        message: 'Se necesitan mínimo 4 jugadores para iniciar el juego (el anfitrión actúa como dealer)'
      });
    }
    if (playingPlayersCount > 7) {
      return response.badRequest({
        message: 'Máximo 7 jugadores permitidos por partida'
      });
    }
    if (game.owner !== user.id) {
      return response.forbidden({
        message: 'Only the game owner can start the game'
      });
    }

    // Solo verificar que los jugadores (no el anfitrión) estén listos
    const playerDecks = await PlayerDeck.find({ 
      gameId: game._id, 
      playerId: { $ne: game.owner } 
    }).populate('deck');
    for (const playerDeck of playerDecks) {
      if (!playerDeck.isReady) {
        return response.badRequest({
          message: 'All players must be ready to start the game'
        });
      }
    }
    game.is_active = true;
    game.turn = 0;

    for (const playerDeck of playerDecks) {
      const cardsToGive = [];
      for (let i = 0; i < 2; i++) {
        const card = game.deck.pop();
        if (card) {
          cardsToGive.push(card);
        }
      }
      if (cardsToGive.length === 0) {
        return response.badRequest({
          message: 'Not enough cards in the deck to start the game'
        });
      }
      const cards = await Card.find({ _id: { $in: cardsToGive } });
      playerDeck.deck = cardsToGive;
      playerDeck.count = cardsToGive.length;
      // Mapear valor por rank para cumplir regla: A=1, J=11, Q=12, K=13
      const rankValue = (rank: string | undefined | null) => {
        if (!rank) return 0;
        if (rank === 'A') return 1;
        if (rank === 'J') return 11;
        if (rank === 'Q') return 12;
        if (rank === 'K') return 13;
        const parsed = Number(rank);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      playerDeck.totalValue = cards.reduce((sum, card) => sum + rankValue(card.rank), 0);

      await playerDeck.save();
    }

    await game.save();

    const gameStarted = await Game.findById(game._id).populate('deck');
    if (!gameStarted) {
      return response.internalServerError({
        message: 'Error starting game'
      });
    }

    const playersData = await User.query().whereIn('id', gameStarted.players);
    const gameWithData = {
      ...gameStarted.toObject(),
      players: playersData
    }
    io.to(`game:${game._id}`).emit('gameNotify', { game: game._id });


    return response.ok({
      message: 'Game started successfully',
      data: {
        game: gameWithData,
      }
    });
  }

  async leaveGame({params, auth, response}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const gameId = params.id;

    const game = await Game.findById(gameId);
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }

    if (!game.is_active) {
      return response.badRequest({
        message: 'Game is not active'
      });
    }

    if (!game.players.includes(user.id)) {
      return response.badRequest({
        message: 'You are not in this game'
      });
    }

    const playerIsOwner = game.owner === user.id;
    if (playerIsOwner) {
      //delete the game if the owner leaves
      game.set({ isFinished: true });
      await game.save();
    }


    game.players = game.players.filter(playerId => playerId !== user.id);
    game.is_active = false;
    await game.save();

    io.to(`game:${game._id}`).emit('gameNotify', { game: game._id });

    await PlayerDeck.deleteMany({ playerId: user.id, gameId: game._id });
    return response.ok({
      message: 'Left game successfully',
      data: game
    });

  }

  async restartGame({params, auth, response}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const gameId = params.id;

    const game = await Game.findById(gameId);
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    // Permitir reinicio si el juego ya terminó (con o sin ganador) o no está activo
    if (!game.isFinished && game.is_active) {
      return response.badRequest({
        message: 'Game is not finished yet'
      });
    }

    // Permitir que cualquier jugador reinicie la partida si ya terminó y todos están listos

    if (game.players.length < 2) {
      return response.badRequest({
        message: 'Not enough players to restart the game'
      });
    }

    // Reinicio suave: dejar la partida en estado de pre-juego, barajar nuevo mazo,
    // limpiar mazos de jugadores y esperar a que marquen "Listo".
    try {
      // Nuevo mazo barajado
      const freshDeck = await shuffleDeck();
      if (!freshDeck || freshDeck.length !== 52) {
        return response.internalServerError({ message: 'Error shuffling deck for restart' });
      }

      game.deck = freshDeck.map((c) => c._id);
      game.is_active = false;
      game.isFinished = false;
      game.winner = null;
      game.turn = 0;

      // Resetear estados de todos los jugadores (incluye flags de stand/bust)
      const playerDecks = await PlayerDeck.find({ gameId: game._id });
      for (const playerDeck of playerDecks) {
        playerDeck.deck = [];
        playerDeck.count = 0;
        playerDeck.totalValue = 0;
        playerDeck.isReady = false;
        (playerDeck as any).isStand = false;
        (playerDeck as any).isBusted = false;
        await playerDeck.save();
      }

      await game.save();

      // Notificar a todos para que la UI vuelva a estado inicial (sin ganador ni botón "Jugar de nuevo")
      io.to(`game:${game._id}`).emit('gameNotify', { 
        game: game._id,
        type: 'game_reset'
      });

      return response.ok({
        message: 'Game reset. Waiting for players to be ready.',
        data: { game }
      });
    } catch (error) {
      return response.internalServerError({
        message: 'Error resetting game',
        error: (error as Error).message
      });
    }
  }
}