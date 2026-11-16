/** Fixed-capacity FIFO for time-ordered samples. */
export class RingBuffer<T> {
  private readonly items: T[] = []

  constructor(private readonly capacity: number) {}

  push(item: T): void {
    this.items.push(item)
    if (this.items.length > this.capacity) {
      this.items.shift()
    }
  }

  toArray(): readonly T[] {
    return this.items
  }

  clear(): void {
    this.items.length = 0
  }

  get length(): number {
    return this.items.length
  }
}