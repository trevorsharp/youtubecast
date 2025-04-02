type Task = () => Promise<void>;

class AsyncQueue {
  #currentTasksRunning: number;
  #taskQueue: Task[] = [];

  constructor() {
    this.#currentTasksRunning = 0;
  }

  push(task: Task, options?: { addToFrontOfQueue?: boolean }) {
    if (options?.addToFrontOfQueue) this.#taskQueue.unshift(task);
    else this.#taskQueue.push(task);

    this.#startNextTask();
  }

  #startNextTask() {
    if (this.#currentTasksRunning === 0) {
      const task = this.#taskQueue.shift();

      if (task === undefined) {
        return;
      }

      this.#currentTasksRunning += 1;

      task()
        .catch(() => {})
        .finally(() => this.#onTaskComplete());
    }
  }

  #onTaskComplete() {
    this.#currentTasksRunning -= 1;

    if (this.#taskQueue.length > 0) {
      this.#startNextTask();
    }
  }
}

export default AsyncQueue;
