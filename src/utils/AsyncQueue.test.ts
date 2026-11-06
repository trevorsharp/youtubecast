import { describe, expect, test } from 'bun:test';
import AsyncQueue from './AsyncQueue';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AsyncQueue', () => {
  test('runs tasks one at a time in order', async () => {
    const queue = new AsyncQueue();
    const order: string[] = [];
    let activeTasks = 0;
    let maxActiveTasks = 0;

    const makeTask = (name: string) => async () => {
      activeTasks += 1;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
      await delay(5);
      order.push(name);
      activeTasks -= 1;
    };

    queue.push(makeTask('a'));
    queue.push(makeTask('b'));
    queue.push(makeTask('c'));

    await delay(100);

    expect(order).toEqual(['a', 'b', 'c']);
    expect(maxActiveTasks).toBe(1);
  });

  test('addToFrontOfQueue runs the task next', async () => {
    const queue = new AsyncQueue();
    const order: string[] = [];

    const makeTask = (name: string) => async () => {
      await delay(5);
      order.push(name);
    };

    queue.push(makeTask('a'));
    queue.push(makeTask('c'));
    queue.push(makeTask('b'), { addToFrontOfQueue: true });

    await delay(100);

    expect(order).toEqual(['a', 'b', 'c']);
  });

  test('keeps draining the queue after a task rejects', async () => {
    const queue = new AsyncQueue();
    const order: string[] = [];

    queue.push(async () => {
      throw new Error('boom');
    });
    queue.push(async () => {
      order.push('after');
    });

    await delay(20);

    expect(order).toEqual(['after']);
  });
});
