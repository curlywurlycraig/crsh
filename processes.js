class ProcessManager {
  constructor() {
    this.processes = [];
    this.resolver = null;
    this.resetPromise();
  }

  resetPromise() {
    // This basically sets up a listener for sub process signals
    this.processPromise = new Promise((resolve, reject) => {
      this.resolver = resolve;

      Deno.signal(Deno.Signal.SIGTSTP).then(async () => {
        resolve();
      });
    });
  }

  addProcess(process) {
    this.processes.push(process);

    process.status().then((computedStatus) => {
      process.computedStatus = computedStatus;

      let finishedProcessCount = 0;
      this.processes.forEach((p) => {
        if (p.computedStatus !== undefined) {
          finishedProcessCount++;
        }
      });

      if (finishedProcessCount === this.processes.length) {
        this.processes.forEach((p) => p.close());

        this.processes = [];
        this.resolver();
      }
    });
  }
}

const instance = new ProcessManager();
export default instance;
