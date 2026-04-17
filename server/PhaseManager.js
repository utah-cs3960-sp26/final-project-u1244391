class PhaseManager {
  constructor(phases) {
    this.phases = phases;
    this.index = 0;
    this.timers = [];
  }
  current() { return this.phases[this.index]; }
  next() {
    if (this.index < this.phases.length - 1) {
      this.index++;
    }
    return this.current();
  }
  is(phase) { return this.current() === phase; }
  set(phase) {
    const idx = this.phases.indexOf(phase);
    if (idx !== -1) this.index = idx;
    return this.current();
  }
  autoAdvance(secs, cb) {
    const timer = setTimeout(() => { this.next(); cb(this.current()); }, secs * 1000);
    this.timers.push(timer);
    return timer;
  }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
}

module.exports = PhaseManager;
