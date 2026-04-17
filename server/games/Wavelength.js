const BaseGame = require('./BaseGame');
const PhaseManager = require('../PhaseManager');
const prompts = require('../data/wavelengthPrompts.json');

class Wavelength extends BaseGame {
  constructor(roomCode, players) {
    super(roomCode, players);

    this.totalRounds = 4;
    this.currentRound = 1;
    this.usedPrompts = [];

    this.clueGiverId = players[Math.floor(Math.random() * players.length)].id;
    this.targetPosition = this._randomTarget();
    this.question = this._pickPrompt();
    this.clueGiverAnswer = null;
    this.guesses = {};
    this.roundScores = {};
    this.totalScores = {};

    for (const p of players) {
      this.totalScores[p.id] = 0;
    }

    this.phases = new PhaseManager(['giving-clue', 'guessing', 'reveal', 'scores']);
  }

  _randomTarget() {
    return Math.floor(Math.random() * 181);
  }

  _pickPrompt() {
    const available = prompts.filter((p) => !this.usedPrompts.includes(p));
    const pool = available.length > 0 ? available : prompts;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    this.usedPrompts.push(prompt);
    return prompt;
  }

  _scoreGuess(guess) {
    const distance = Math.abs(guess - this.targetPosition);
    if (distance <= 5) return 5;
    if (distance <= 12) return 4;
    if (distance <= 20) return 3;
    if (distance <= 35) return 2;
    if (distance <= 50) return 1;
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
    if (!this.phases.is('reveal')) return { error: 'Not in reveal phase' };

    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.targetPosition = this._randomTarget();
      this.question = this._pickPrompt();
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

    const playerList = this.players.map((p) => ({ id: p.id, name: p.name }));

    const state = {
      phase,
      isClueGiver,
      clueGiverId: this.clueGiverId,
      clueGiverName: this.players.find((p) => p.id === this.clueGiverId)?.name || 'Unknown',
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      question: this.question,
      players: playerList,
    };

    if (phase === 'giving-clue' || phase === 'guessing') {
      state.targetPosition = isClueGiver ? this.targetPosition : null;
    } else {
      state.targetPosition = this.targetPosition;
    }

    if (phase === 'guessing' || phase === 'reveal' || phase === 'scores') {
      state.clueGiverAnswer = this.clueGiverAnswer;
    } else {
      state.clueGiverAnswer = null;
    }

    if (phase === 'guessing' && !isClueGiver) {
      state.myGuess = this.guesses[playerId] !== undefined ? this.guesses[playerId] : null;
      state.hasGuessed = this.guesses[playerId] !== undefined;
      const guessers = this.players.filter((p) => p.id !== this.clueGiverId);
      state.guessCount = Object.keys(this.guesses).length;
      state.totalGuessers = guessers.length;
    }

    if (phase === 'reveal' || phase === 'scores') {
      state.guesses = Object.entries(this.guesses).map(([pid, pos]) => ({
        name: this.players.find((p) => p.id === pid)?.name || pid,
        position: pos,
      }));
      state.roundScores = Object.entries(this.roundScores).map(([pid, pts]) => ({
        name: this.players.find((p) => p.id === pid)?.name || pid,
        points: pts,
      }));
    }

    // totalScores always as sorted array
    state.scores = Object.entries(this.totalScores)
      .map(([pid, total]) => ({
        name: this.players.find((p) => p.id === pid)?.name || pid,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    return state;
  }

  isComplete() {
    return this.phases.is('scores');
  }
}

module.exports = Wavelength;
