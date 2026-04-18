const BaseGame = require('./BaseGame');
const PhaseManager = require('../PhaseManager');
const wordLists = require('../data/chameleonWords.json');

class Chameleon extends BaseGame {
  constructor(roomCode, players, theme) {
    super(roomCode, players);

    this.theme = theme || 'Movies';
    this.chameleonId = players[Math.floor(Math.random() * players.length)].id;

    const words = wordLists[this.theme] || wordLists['Movies'];
    this.keyword = words[Math.floor(Math.random() * words.length)];
    this.wordList = words;

    this.turnOrder = this._shuffle(players.map((p) => p.id));
    this.currentTurnIndex = 0;
    this.currentRound = 1;
    this.totalRounds = 3;
    this.hints = [];
    this.votes = {};
    this.redemptionGuess = null;
    this.outcome = null;
    this.betweenRounds = false;
    this.betweenRoundsTimer = null;
    this.completedRound = null;

    this.phases = new PhaseManager(['clues', 'voting', 'redemption', 'reveal']);
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _dispatch(playerId, action, payload) {
    switch (action) {
      case 'submitHint':
        return this._handleSubmitHint(playerId, payload);
      case 'submitVote':
        return this._handleSubmitVote(playerId, payload);
      case 'submitRedemption':
        return this._handleSubmitRedemption(playerId, payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  _handleSubmitHint(playerId, payload) {
    if (!this.phases.is('clues')) return { error: 'Not in clues phase' };
    if (this.betweenRounds) return { error: 'Waiting for next round' };

    const activePlayerId = this.turnOrder[this.currentTurnIndex];
    if (playerId !== activePlayerId) return { error: 'Not your turn' };

    this.hints.push({
      playerId,
      round: this.currentRound,
      hint: payload.hint,
    });

    this.currentTurnIndex++;

    if (this.currentTurnIndex >= this.turnOrder.length) {
      if (this.currentRound >= this.totalRounds) {
        // Final round done — go straight to voting
        this.phases.next();
      } else {
        // Pause between rounds for 5 seconds
        this.betweenRounds = true;
        this.completedRound = this.currentRound;
        return { success: true, delayAdvance: 5 };
      }
    }

    return { success: true };
  }

  advanceFromBetweenRounds() {
    if (!this.betweenRounds) return;
    this.betweenRounds = false;
    this.completedRound = null;
    this.currentTurnIndex = 0;
    this.currentRound++;
  }

  _handleSubmitVote(playerId, payload) {
    if (!this.phases.is('voting')) return { error: 'Not in voting phase' };
    if (payload.votedFor === playerId) return { error: 'Cannot vote for yourself' };

    this.votes[playerId] = payload.votedFor;

    const allVoted = this.players.every((p) => this.votes[p.id] !== undefined);

    if (allVoted) {
      const tally = {};
      for (const votedFor of Object.values(this.votes)) {
        tally[votedFor] = (tally[votedFor] || 0) + 1;
      }

      const maxVotes = Math.max(...Object.values(tally));
      const totalVoters = this.players.length;
      const chameleonVotes = tally[this.chameleonId] || 0;

      if (chameleonVotes === maxVotes && chameleonVotes > totalVoters / 2) {
        this.phases.next();
      } else {
        this.outcome = 'chameleon_wins';
        this.phases.set('reveal');
      }
    }

    return { success: true };
  }

  _handleSubmitRedemption(playerId, payload) {
    if (!this.phases.is('redemption')) return { error: 'Not in redemption phase' };
    if (playerId !== this.chameleonId) return { error: 'Only the chameleon can guess' };

    this.redemptionGuess = payload.guess;

    const guessNorm = payload.guess.trim().toLowerCase();
    const keywordNorm = this.keyword.trim().toLowerCase();

    if (guessNorm === keywordNorm) {
      this.outcome = 'draw';
    } else {
      this.outcome = 'players_win';
    }

    this.phases.next();
    return { success: true };
  }

  getStateFor(playerId) {
    const phase = this.phases.current();
    const isChameleon = playerId === this.chameleonId;

    const playerList = this.players.map((p) => ({ id: p.id, name: p.name }));

    const state = {
      phase,
      theme: this.theme,
      turnOrder: this.turnOrder,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      hints: this.hints,
      players: playerList,
      isChameleon,
      betweenRounds: this.betweenRounds,
      completedRound: this.completedRound,
    };

    if (phase === 'clues' && !this.betweenRounds) {
      state.activePlayerId = this.turnOrder[this.currentTurnIndex];
    } else if (phase === 'clues' && this.betweenRounds) {
      state.activePlayerId = null;
    }

    if (phase === 'clues' || phase === 'voting' || phase === 'redemption') {
      state.keyword = isChameleon ? null : this.keyword;
      state.chameleonId = null;
    } else {
      // reveal
      state.keyword = this.keyword;
      state.chameleonId = this.chameleonId;
      state.chameleonName = this.players.find((p) => p.id === this.chameleonId)?.name || 'Unknown';
      state.redemptionGuess = this.redemptionGuess;
      state.outcome = this.outcome;

      const chameleonVotes = Object.values(this.votes).filter((v) => v === this.chameleonId).length;
      state.chameleonCaught = chameleonVotes > this.players.length / 2;
      state.chameleonGuessedCorrectly = this.outcome === 'draw';

      state.votes = Object.entries(this.votes).map(([voterId, targetId]) => ({
        voterName: this.players.find((p) => p.id === voterId)?.name || voterId,
        targetName: this.players.find((p) => p.id === targetId)?.name || targetId,
      }));
    }

    return state;
  }

  isComplete() {
    return this.phases.is('reveal') && this.outcome !== null;
  }
}

module.exports = Chameleon;
