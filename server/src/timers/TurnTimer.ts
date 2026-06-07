export class TurnTimer {
  private timeout: ReturnType<typeof setTimeout> | null = null;

  start(durationMs: number, onTimeout: () => void): number {
    this.stop();
    const deadlineAt = Date.now() + durationMs;
    this.timeout = setTimeout(onTimeout, durationMs);
    return deadlineAt;
  }

  stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
