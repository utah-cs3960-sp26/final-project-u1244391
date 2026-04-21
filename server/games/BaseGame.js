class BaseGame {
  constructor(roomCode, players) {
    this.roomCode = roomCode;
    this.players = players;
    this.actionQueue = [];
    this.processing = false;
    this.deadline = null;
  }

  handleAction(playerId, action, payload) {
    return new Promise((resolve) => {
      this.actionQueue.push({ playerId, action, payload, resolve });
      this._processNext();
    });
  }

  _processNext() {
    if (this.processing || !this.actionQueue.length) return;
    this.processing = true;
    const item = this.actionQueue.shift();
    const result = this._dispatch(item.playerId, item.action, item.payload);
    item.resolve(result);
    this.processing = false;
    this._processNext();
  }

  _dispatch(playerId, action, payload) {
    throw new Error('Subclass must implement _dispatch');
  }

  getStateFor(playerId) {
    throw new Error('Subclass must implement getStateFor');
  }

  isComplete() {
    throw new Error('Subclass must implement isComplete');
  }
}

module.exports = BaseGame;
