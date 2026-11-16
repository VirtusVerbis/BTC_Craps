import { describe, expect, it } from 'vitest'
import { RingBuffer } from './ringBuffer'

describe('RingBuffer', () => {
  it('drops oldest past capacity', () => {
    const buf = new RingBuffer<number>(3)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    buf.push(4)
    expect(buf.toArray()).toEqual([2, 3, 4])
  })
})