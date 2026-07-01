export function createWorkerQueue({ idleMs = 0, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const foregroundQueue = [];
  const backgroundQueue = [];
  let busy = false;
  let timer = null;
  let lastForegroundAt = 0;

  function clearDrainTimer() {
    if (!timer) return;
    clearTimer(timer);
    timer = null;
  }

  function runJob(job) {
    busy = true;
    Promise.resolve()
      .then(job.fn)
      .then(job.resolve, job.reject)
      .finally(() => {
        busy = false;
        drain();
      });
  }

  function drain() {
    if (busy) return;
    clearDrainTimer();

    const foreground = foregroundQueue.shift();
    if (foreground) {
      runJob(foreground);
      return;
    }

    if (!backgroundQueue.length) return;
    const waitMs = Math.max(0, idleMs - (now() - lastForegroundAt));
    if (waitMs > 0) {
      timer = setTimer(drain, waitMs);
      return;
    }

    runJob(backgroundQueue.shift());
  }

  function run(fn, { background = false } = {}) {
    return new Promise((resolve, reject) => {
      const job = { fn, resolve, reject };
      if (background) {
        lastForegroundAt = now();
        backgroundQueue.push(job);
      } else {
        lastForegroundAt = now();
        foregroundQueue.push(job);
      }
      drain();
    });
  }

  function touchForeground() {
    lastForegroundAt = now();
    drain();
  }

  return { run, touchForeground };
}
