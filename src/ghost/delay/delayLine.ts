interface Scheduled<T> {
  deliverAt: number;
  value: T;
}

/** A stable, timestamped queue. Its caller owns the single application clock. */
export class DelayLine<T> {
  private queue: Scheduled<T>[] = [];

  schedule(value: T, deliverAt: number): void {
    const item = { value, deliverAt };
    const index = this.queue.findIndex((queued) => queued.deliverAt > deliverAt);
    if (index === -1) this.queue.push(item);
    else this.queue.splice(index, 0, item);
  }

  release(now: number): T[] {
    let count = 0;
    while (count < this.queue.length && this.queue[count].deliverAt <= now) count += 1;
    return this.queue.splice(0, count).map((item) => item.value);
  }

  clear(): void {
    this.queue = [];
  }

  get size(): number {
    return this.queue.length;
  }
}
