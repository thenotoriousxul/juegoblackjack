import type { HttpContext } from '@adonisjs/core/http'
import { Game } from '../mongo_models/game.js'
import { PlayerDeck } from '../mongo_models/player_deck.js'
import { Card } from '../mongo_models/cards.js';
import User from '#models/user';
import { io } from '#start/socket';

export default class PlayerDecksController {

  async myDeck({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate()
    const playerDeck = await PlayerDeck.findOne({ playerId: user.id, gameId: params.id }).populate('deck');
    if (!playerDeck) {
      return response.notFound({
        message: 'Player deck not found'
      });
    }

    const playerDeckWithData = {
      ...playerDeck.toObject(),
      player: user,
      isStand: playerDeck.isStand
    }

    return response.ok({
      message: 'Player deck retrieved successfully',
      data: {
        playerDeck: playerDeckWithData,
      }
    });
  }
  
  async pedirCarta({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate()
    const game = await Game.findById(params.id)
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    const playerDeck = await PlayerDeck.findOne({ playerId: user.id, gameId: game._id });
    if (!playerDeck) {
      return response.notFound({
        message: 'Player deck not found or already ready'
      });
    }
    if (!game.is_active) {
      return response.badRequest({
        message: 'Game is not active'
      });
    }
    if (game.winner !== null) {
      return response.badRequest({
        message: 'Game is already finished'
      });
    }
    if (playerDeck.isStand) {
      return response.badRequest({
        message: 'Ya te has plantado, no puedes pedir más cartas'
      });
    }
    if (playerDeck.totalValue === -1) {
      return response.badRequest({
        message: 'Ya te has pasado de 21, no puedes pedir más cartas'
      });
    }

    // El anfitrión no juega, solo los demás jugadores
    const gamePlayers = game.players.filter(playerId => playerId.toString() !== String(game.owner ?? ''));
    const currentPlayerIndex = gamePlayers.findIndex(pid => pid.toString() === user.id.toString());
    if (game.turn !== currentPlayerIndex) {
      return response.badRequest({
        message: 'It is not your turn',
        debug: {
          currentTurn: game.turn,
          playerIndex: currentPlayerIndex,
          playerId: user.id,
          players: gamePlayers
        }
      });
    }
    // hacer un pop de cartas del mazo del juego y agregarlo al jugador
    const card = game.deck.pop();
    if (!card) {
      return response.badRequest({
        message: 'No more cards in the deck'
      });
    }
    playerDeck.deck.push(card);
    playerDeck.count += 1;
    const cardData = await Card.findById(card);
    if (!cardData) {
      return response.notFound({
        message: 'Card not found'
      });
    }
    playerDeck.totalValue += cardData.value ?? 0;
    
    // Solo si el jugador obtiene 21 con las primeras dos cartas (Blackjack real), gana automáticamente
    if (playerDeck.totalValue === 21 && playerDeck.deck.length === 2) {
      game.winner = user.id;
      await playerDeck.save();
      await game.save();
      io.to(`game:${game._id}`).emit('gameNotify', {
        game: game._id,
        type: 'game_finished',
        winner: user.id,
        winnerName: user.fullName
      });
      return response.ok({
        message: '¡Has ganado automáticamente con Blackjack (21 con dos cartas)!',
        data: {
          card: cardData,
          totalValue: playerDeck.totalValue,
          count: playerDeck.count,
          isWinner: true
        }
      });
    }
    
    if (playerDeck.totalValue > 21) {
      playerDeck.totalValue = -1; // Marca como fuera del juego
      playerDeck.isStand = true; // Se planta automáticamente
      // Nuevo flag explícito por claridad en el front
      // y para facilitar respuestas idempotentes
      ;(playerDeck as any).isBusted = true;
      await playerDeck.save();

      // Avanzar turno al siguiente jugador válido
      const gamePlayers = game.players.filter(playerId => Number(playerId) !== Number(game.owner));
      let nextTurn = game.turn;
      let found = false;
      for (let i = 1; i <= gamePlayers.length; i++) {
        const idx = (game.turn + i) % gamePlayers.length;
        const nextPlayerId = gamePlayers[idx];
        const nextDeck = await PlayerDeck.findOne({ playerId: nextPlayerId, gameId: game._id });
        if (nextDeck && !nextDeck.isStand && nextDeck.totalValue !== -1) {
          nextTurn = idx;
          found = true;
          break;
        }
      }
      if (found) {
        game.turn = nextTurn;
      } else {
        // Todos se plantaron o quemaron, determinar ganador
        const playersDecks = await PlayerDeck.find({ gameId: game._id, playerId: { $ne: game.owner } });
        const validDecks = playersDecks.filter(deck => deck.totalValue <= 21 && deck.totalValue > 0);
        if (validDecks.length > 0) {
          const maxValue = Math.max(...validDecks.map(deck => deck.totalValue));
          game.winner = validDecks.find(deck => deck.totalValue === maxValue)?.playerId ?? null;
        } else {
          // Sin ganador
          game.winner = null;
          game.is_active = false;
          game.isFinished = true as any;
        }
      }
      await game.save();
      io.to(`game:${game._id}`).emit('gameNotify', {
        game: game._id,
        type: 'player_busted',
        playerId: user.id,
        playerName: user.fullName,
        message: `${user.fullName} se pasó de 21 y ha perdido.`,
        turnIndex: game.turn,
        currentPlayerId: game.winner === null ? (game.players.filter(p => p.toString() !== String(game.owner ?? '')))[game.turn] : null
      });

      // Si ya hay fin de partida (con o sin ganador), anunciar
      if (!game.is_active) {
        let winnerName: string | null = null;
        if (game.winner !== null && game.winner !== undefined) {
          const winnerUser = await User.findBy('id', Number(game.winner));
          winnerName = winnerUser?.fullName ?? null;
        }
        io.to(`game:${game._id}`).emit('gameNotify', {
          game: game._id,
          type: 'game_finished',
          winner: game.winner,
          winnerName: winnerName,
          noWinner: game.winner === null
        });
      }
      return response.ok({
        message: 'Te has pasado de 21. Has perdido automáticamente.',
        data: {
          card: cardData,
          totalValue: -1,
          count: playerDeck.count,
          isBusted: true,
          isStand: true
        }
      });
    }
    await playerDeck.save();
    await game.save();
    io.to(`game:${game._id}`).emit('gameNotify', {
      game: game._id,
      type: 'card_drawn',
      playerId: user.id,
      card: cardData,
      totalValue: playerDeck.totalValue,
      count: playerDeck.count,
      isStand: playerDeck.isStand
    });
    return response.ok({
      message: 'Card drawn successfully',
      data: {
        card: cardData,
        totalValue: playerDeck.totalValue,
        count: playerDeck.count,
        isStand: playerDeck.isStand
      }
    });
  }

  async estarListo({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const game = await Game.findById(params.id);
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    if (game.isFinished) {
      return response.badRequest({
        message: 'Game is already finished'
      });
    }
    const playerDeck = await PlayerDeck.findOne({ playerId: user.id, gameId: game._id });
    if (!playerDeck) {
      return response.notFound({
        message: 'Player deck not found'
      });
    }
    if (playerDeck.isReady) {
      return response.badRequest({
        message: 'Player is already ready'
      });
    }
    playerDeck.isReady = true;
    await playerDeck.save();
    io.to(`game:${game._id}`).emit('gameNotify', { game: game._id });
    
    return response.ok({
      message: 'Player is now ready',
      data: {playerDeck: {...playerDeck.toObject(), isStand: playerDeck.isStand}}
    });
  }


  async terminarTurno({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const game = await Game.findById(params.id);
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
  const gamePlayers = game.players.filter(playerId => playerId.toString() !== String(game.owner ?? ''));
  const currentPlayerIndex = gamePlayers.findIndex(pid => pid.toString() === user.id.toString());
    
    // Debug logs
    console.log('🎮 terminarTurno Debug:', {
      gameId: game._id,
      userId: user.id,
      gameTurn: game.turn,
      gamePlayers: gamePlayers,
      currentPlayerIndex: currentPlayerIndex,
      isPlayerTurn: game.turn === currentPlayerIndex
    });
    
    // Consultar el mazo del jugador primero para poder
    // responder idempotentemente si ya terminó su participación
    const playerDeck = await PlayerDeck.findOne({ playerId: user.id, gameId: game._id });
    if (!playerDeck) {
      return response.notFound({ message: 'Player deck not found' });
    }

    // Si el jugador ya se quemó o ya se plantó, responder OK
    // para que el front pueda cerrar sus controles sin error.
    if (playerDeck.totalValue === -1 || playerDeck.isStand || (playerDeck as any).isBusted) {
      return response.ok({
        message: 'Tu turno ya terminó',
        data: {
          alreadyEnded: true,
          isStand: true,
          isYourTurn: false
        }
      });
    }

    if (game.turn !== currentPlayerIndex) {
      return response.badRequest({
        message: 'It is not your turn',
        debug: {
          currentTurn: game.turn,
          playerIndex: currentPlayerIndex,
          playerId: user.id,
          players: gamePlayers
        }
      });
    }

    // Marcar que el jugador se plantó
    
    playerDeck.isStand = true;
    await playerDeck.save();

    // Avanzar turno solo si quedan jugadores que no se han plantado ni quemado
    let nextTurn = game.turn;
    let found = false;
    for (let i = 1; i <= gamePlayers.length; i++) {
      const idx = (game.turn + i) % gamePlayers.length;
      const nextPlayerId = gamePlayers[idx];
      const nextDeck = await PlayerDeck.findOne({ playerId: nextPlayerId, gameId: game._id });
      if (nextDeck && !nextDeck.isStand && nextDeck.totalValue !== -1) {
        nextTurn = idx;
        found = true;
        break;
      }
    }
    if (found) {
      game.turn = nextTurn;
    } else {
      // Todos se plantaron o quemaron, determinar ganador
      const playersDecks = await PlayerDeck.find({ gameId: game._id, playerId: { $ne: game.owner } });
      const validDecks = playersDecks.filter(deck => deck.totalValue <= 21 && deck.totalValue > 0);
      if (validDecks.length > 0) {
        const maxValue = Math.max(...validDecks.map(deck => deck.totalValue));
        game.winner = validDecks.find(deck => deck.totalValue === maxValue)?.playerId ?? null;
      } else {
        // Sin ganador
        game.winner = null;
        game.is_active = false;
        game.isFinished = true as any;
      }
    }
    await game.save();
    io.to(`game:${game._id}`).emit('gameNotify', {
      game: game._id,
      type: 'turn_changed',
      turnIndex: game.turn,
      currentPlayerId: game.winner === null ? (game.players.filter(p => p.toString() !== String(game.owner ?? '')))[game.turn] : null
    });
    if (game.winner !== null || !game.is_active) {
      // Buscar el nombre real del ganador si existe
      let winnerName: string | null = null;
      if (game.winner !== null && game.winner !== undefined) {
        const winnerUser = await User.findBy('id', Number(game.winner));
        winnerName = winnerUser?.fullName ?? null;
      }
      io.to(`game:${game._id}`).emit('gameNotify', {
        game: game._id,
        type: 'game_finished',
        winner: game.winner,
        winnerName: winnerName,
        noWinner: game.winner === null
      });
      return response.ok({
        message: 'Game finished',
        data: {
          winner: game.winner,
          winnerName: winnerName,
          game: game
        }
      });
    } else {
      return response.ok({
        message: 'Turn ended successfully',
        data: {
          isStand: true,
          isYourTurn: false,
          turnIndex: game.turn,
          currentPlayerId: (game.players.filter(p => p.toString() !== String(game.owner ?? '')))[game.turn]
        }
      });
    }
  }


  async blackJack({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const game = await Game.findById(params.id);
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

    const playersDecks = await PlayerDeck.find({ gameId: game._id });

    const allHaveTwoCards = playersDecks.every(deck => deck.deck.length === 2);

    console.log('allHaveTwoCards:', allHaveTwoCards);
    console.log('game.turn:', game.turn);

    if (game.turn !== 0 || allHaveTwoCards === false) {
      return response.badRequest({
        message: 'Only can check the blackjack before the game starts'
      })
    }

    const playerDeck = await PlayerDeck.findOne({ playerId: user.id, gameId: game._id });
    if (!playerDeck) {
      return response.notFound({
        message: 'Player deck not found'
      });
    }

    if (playerDeck.totalValue === 21) {
      game.winner = user.id;
      game.isFinished = true;
      await game.save();
      io.to(`game:${game._id}`).emit('gameNotify', { game: game._id });
      return response.ok({
        message: 'Blackjack! You win!',
        data: {
          winner: user.id,
          game: game
        }
      });
    }
    return response.badRequest({
      message: 'You do not have a blackjack'
    });
  }

  // Nuevo método para destape cuando alguien tiene 21
  async requestReveal({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const game = await Game.findById(params.id);
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    
    const playerDeck = await PlayerDeck.findOne({gameId: game._id, playerId: user.id});
    if (!playerDeck) {
      return response.notFound({
        message: 'Player deck not found'
      });
    }
    
    if (playerDeck.totalValue !== 21) {
      return response.badRequest({
        message: 'Solo puedes pedir destape si tienes exactamente 21'
      });
    }
    
    // Revelar todas las cartas y determinar ganador
    const playersDecks = await PlayerDeck.find({ 
      gameId: game._id, 
      playerId: { $ne: game.owner } 
    });
    
    const validDecks = playersDecks.filter(deck => deck.totalValue > 0 && deck.totalValue <= 21);
    const maxValue = Math.max(...validDecks.map(deck => deck.totalValue));
    game.winner = validDecks.find(deck => deck.totalValue === maxValue)?.playerId ?? null;
    game.is_active = false;
    
    await game.save();
    io.to(`game:${game._id}`).emit('gameNotify', { 
      game: game._id,
      type: 'game_revealed',
      winner: game.winner
    });
    
    return response.ok({
      message: 'Destape solicitado - ¡Cartas reveladas!',
      data: {
        winner: game.winner,
        game: game,
        playersDecks: playersDecks.map(deck => ({
          playerId: deck.playerId,
          totalValue: deck.totalValue
        }))
      }
    });
  }

  // Método para revelado automático cuando todos han terminado
  async checkAutoReveal({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const game = await Game.findById(params.id);
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    
    if (game.owner !== user.id) {
      return response.forbidden({
        message: 'Solo el anfitrión puede verificar el revelado automático'
      });
    }
    
    // Verificar si todos los jugadores han terminado de pedir cartas
    const playersDecks = await PlayerDeck.find({ 
      gameId: game._id, 
      playerId: { $ne: game.owner } 
    });
    
    // Un jugador ha "terminado" si se pasó de 21 (totalValue = -1) o si no es su turno
    const playingPlayers = game.players.filter(playerId => playerId !== game.owner);
    let allFinished = true;
    
    for (let i = 0; i < playingPlayers.length; i++) {
      const playerDeck = playersDecks.find(deck => deck.playerId === playingPlayers[i]);
      if (playerDeck && playerDeck.totalValue > 0 && playerDeck.totalValue < 21) {
        // Este jugador aún puede querer más cartas
        allFinished = false;
        break;
      }
    }
    
    if (allFinished) {
      // Revelar automáticamente
      const validDecks = playersDecks.filter(deck => deck.totalValue > 0 && deck.totalValue <= 21);
      if (validDecks.length > 0) {
        const maxValue = Math.max(...validDecks.map(deck => deck.totalValue));
        game.winner = validDecks.find(deck => deck.totalValue === maxValue)?.playerId ?? null;
      } else {
        game.winner = null; // Todos se pasaron
      }
      
      game.is_active = false;
      await game.save();
      
      io.to(`game:${game._id}`).emit('gameNotify', { 
        game: game._id,
        type: 'auto_reveal',
        winner: game.winner
      });
      
      return response.ok({
        message: 'Cartas reveladas automáticamente',
        data: {
          winner: game.winner,
          game: game,
          playersDecks: playersDecks.map(deck => ({
            playerId: deck.playerId,
            totalValue: deck.totalValue
          }))
        }
      });
    }
    
    return response.ok({
      message: 'Aún hay jugadores activos',
      data: { allFinished: false }
    });
  }

  // Método para abandonar la partida
  async leaveGame({auth, response, params}: HttpContext) {
    const user = await auth.use('api').authenticate();
    const game = await Game.findById(params.id);
    if (!game) {
      return response.notFound({
        message: 'Game not found'
      });
    }
    
    if (!game.players.includes(user.id)) {
      return response.badRequest({
        message: 'No estás en esta partida'
      });
    }
    
    // Si el anfitrión abandona, la partida se termina para todos
    if (game.owner === user.id) {
      game.is_active = false;
      game.isFinished = true;
      await game.save();
      
      // Eliminar todos los player decks
      await PlayerDeck.deleteMany({ gameId: game._id });
      
      // Emitir evento de finalización de partida igual que cuando alguien gana
      let winnerName: string | null = null;
      if (game.winner !== null && game.winner !== undefined) {
        const winnerUser = await User.findBy('id', Number(game.winner));
        winnerName = winnerUser?.fullName ?? null;
      }
      io.to(`game:${game._id}`).emit('gameNotify', {
        game: game._id,
        type: 'game_finished',
        winner: game.winner,
        winnerName: winnerName
      });
      return response.ok({
        message: 'Has abandonado la partida. Juego terminado para todos.',
        data: { gameEnded: true }
      });
    }
    
    // Si un jugador abandona, la partida se termina para todos
    game.is_active = false;
    game.isFinished = true;
    await game.save();
    
    // Eliminar todos los player decks
    await PlayerDeck.deleteMany({ gameId: game._id });
    
    // Emitir evento de finalización de partida igual que cuando alguien gana
    let winnerName: string | null = null;
    if (game.winner !== null && game.winner !== undefined) {
      const winnerUser = await User.findBy('id', Number(game.winner));
      winnerName = winnerUser?.fullName ?? null;
    }
    io.to(`game:${game._id}`).emit('gameNotify', {
      game: game._id,
      type: 'game_finished',
      winner: game.winner,
      winnerName: winnerName
    });
    return response.ok({
      message: 'Has abandonado la partida. Juego terminado para todos.',
      data: { gameEnded: true }
    });
  }
}