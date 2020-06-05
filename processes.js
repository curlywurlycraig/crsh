class ProcessManager {
  constructor() {
    this.processes = [];
    this.resetPromise();
    this.expectCommands = 0;
  }

  resetPromise() {
    // This basically sets up a listener for sub process signals
    this.processPromise = new Promise((resolve, reject) => {
      Deno.signal(Deno.Signal.SIGCHLD).then(() => {
        console.log("triggor");
        let finishedProcessCount = 0;
        this.processes.forEach((p) => {
          if (p.computedStatus !== undefined) {
            finishedProcessCount++;
          }

          if (p.hasClosed === undefined) {
            p.close();
            p.hasClosed = true;
          }
        });

        console.log("finished", finishedProcessCount);
        console.log("expect", this.expectCommands);
        if (finishedProcessCount === this.expectCommands) {
          this.processes = [];
          resolve();
        }
      });

      Deno.signal(Deno.Signal.SIGTSTP).then(async () => {
        resolve();
      });
    });
  }

  addProcess(process) {
    this.processes.push(process);

    process.status().then((computedStatus) => {
      process.computedStatus = computedStatus;
    });
  }
}

const instance = new ProcessManager();
export default instance;
