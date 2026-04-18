const BaseGame = require('./BaseGame');
const PhaseManager = require('../PhaseManager');
const scales = require('../data/wavelengthScales.json');

class Wavelength extends BaseGame {
  constructor(roomCode, players) {
    super(roomCode, players);

    this.totalRounds = 4;
    this.currentRound = 1;
    this.usedScaleIndices = [];

    this.clueGiverId = players[Math.floor(Math.random() * players.length)].id;
    this.targetPosition = this._randomTarget();
    this.scale = this._pickScale();
    this.clueGiverAnswer = null;
    this.guesses = {};
    this.roundScores = {};
    this.totalScores = {};

    for (const p of players) {
      this.totalScores[p.id] = 0;
    }

    this.phases = new PhaseManager(['giving-clue', 'guessing', 'round-reveal', 'scores']);
  }

  _randomTarget() {
    return Math.floor(Math.random() * 181);
  }

  _pickScale() {
    const available = scales
      .map((s, i) => ({ ...s, idx: i }))
      .filter((s) => !this.usedScaleIndices.includes(s.idx));
    const pool = available.length > 0 ? available : scales.map((s, i) => ({ ...s, idx: i }));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.usedScaleIndices.push(pick.idx);
    return { left: pick.left, right: pick.right };
  }

  _scoreGuess(guess) {
    const distance = Math.abs(guess - this.targetPosition);
    if (distance === 0) return 7;
    if (distance <= 9) return 5;
    if (distance <= 18) return 4;
    if (distance <= 36) return 3;
    if (distance <= 54) return 2;
    if (distance <= 72) return 1;
    return 0;
  }

  _dispatch(playerId, action, payload) {
    switch (action) {
      case 'submitAnswer':
        return this._handleSubmitAnswer(playerId, payload);
      case 'submitGuess':
        return this._handleSubmitGuess(playerId, payload);
      case 'nextRound':
        return this._handleNextRound(playerId);
      default:
        return { error: 'Unknown action' };
    }
  }

  _handleSubmitAnswer(playerId, payload) {
    if (!this.phases.is('giving-clue')) return { error: 'Not in giving-clue phase' };
    if (playerId !== this.clueGiverId) return { error: 'Only the clue giver can submit an answer' };

    this.clueGiverAnswer = payload.answer;
    this.phases.next();
    return { success: true };
  }

  _handleSubmitGuess(playerId, payload) {
    if (!this.phases.is('guessing')) return { error: 'Not in guessing phase' };
    if (playerId === this.clueGiverId) return { error: 'Clue giver cannot guess' };

    this.guesses[playerId] = payload.guess;

    const guessers = this.players.filter((p) => p.id !== this.clueGiverId);
    const allGuessed = guessers.every((p) => this.guesses[p.id] !== undefined);

    if (allGuessed) {
      this.roundScores = {};
      for (const p of guessers) {
        const score = this._scoreGuess(this.guesses[p.id]);
        this.roundScores[p.id] = score;
        this.totalScores[p.id] += score;
      }
      this.phases.next();
    }

    return { success: true };
  }

  _handleNextRound(playerId) {
    if (!this.phases.is('round-reveal')) return { error: 'Not in round-reveal phase' };

    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.targetPosition = this._randomTarget();
      this.scale = this._pickScale();
      this.clueGiverAnswer = null;
      this.guesses = {};
      this.roundScores = {};

      this.phases.set('giving-clue');
    } else {
      this.phases.set('scores');
    }

    return { success: true };
  }

  getStateFor(playerId) {
    const phase = this.phases.current();
    const isClueGiver = playerId === this.clueGiverId;

    const playerList = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color || null,
    }));

    const state = {
      phase,
      isClueGiver,
      clueGiverId: this.clueGiverId,
      clueGiverName: this.players.find((p) => p.id === this.clueGiverId)?.name || 'Unknown',
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      scale: this.scale,
      players: playerList,
    };

    // Target: only clue giver sees it before round-reveal
    if (phase === 'giving-clue' || phase === 'guessing') {
      state.targetPosition = isClueGiver ? this.targetPosition : null;
    } else {
      state.targetPosition = this.targetPosition;
    }

    // Clue giver answer: hidden until guessing
    if (phase === 'guessing' || phase === 'round-reveal' || phase === 'scores') {
      state.clueGiverAnswer = this.clueGiverAnswer;
    } else {
      state.clueGiverAnswer = null;
    }

    // Guessing phase: show own guess status
    if (phase === 'guessing' && !isClueGiver) {
      state.myGuess = this.guesses[playerId] !== undefined ? this.guesses[playerId] : null;
      state.hasGuessed = this.guesses[playerId] !== undefined;
      const guessers = this.players.filter((p) => p.id !== this.clueGiverId);
      state.guessCount = Object.keys(this.guesses).length;
      state.totalGuessers = guessers.length;
    }

    // Round-reveal and scores: show all guesses with player info, and scores
    if (phase === 'round-reveal' || phase === 'scores') {
      state.guesses = Object.entries(this.guesses).map(([pid, pos]) => {
        const p = this.players.find((pl) => pl.id === pid);
        return {
          playerId: pid,
          name: p?.name || pid,
          color: p?.color || null,
          position: pos,
        };
      });
      state.roundScores = Object.entries(this.roundScores)
        .map(([pid, pts]) => {
          const p = this.players.find((pl) => pl.id === pid);
          return {
            playerId: pid,
            name: p?.name || pid,
            color: p?.color || null,
            points: pts,
            total: this.totalScores[pid] || 0,
          };
        })
        .sort((a, b) => b.points - a.points);
    }

    // Total scores as sorted array — exclude clue giver (they don't guess)
    state.scores = Object.entries(this.totalScores)
      .filter(([pid]) => pid !== this.clueGiverId)
      .map(([pid, total]) => {
        const p = this.players.find((pl) => pl.id === pid);
        return {
          name: p?.name || pid,
          color: p?.color || null,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);

    return state;
  }

  isComplete() {
    return this.phases.is('scores');
  }
}

module.exports = Wavelength;
