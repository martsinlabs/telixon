// Every field here is a direct measurement, not a derived estimate. No assumed refresh rate, no rounded dropped-frame count.
export interface FreezeReport {
  // Wall-clock duration of the init call: performance.now() bracketing the call.
  totalMs: number;
  // Frames painted while the call ran. A synchronous call is atomic, so it paints exactly 0; an async load keeps painting.
  framesPainted: number;
  // Longest stretch with no paint during the call. For sync this is the block (totalMs); for async it is the worst on-thread stall, which stays near the normal frame interval.
  longestGapMs: number;
  // Long Tasks (over 50 ms) whose time overlaps the call itself, not unrelated page-load or interaction tasks.
  longTaskCount: number;
  longestTaskMs: number;
}

export interface FreezeMonitor {
  measureSync(operation: () => void): Promise<FreezeReport>;
  measureAsync(operation: () => Promise<void>): Promise<FreezeReport>;
}

interface TaskWindow {
  start: number;
  duration: number;
}

// Drives a spinner from requestAnimationFrame and measures, in exact terms, how an init call affects rendering.
export function createFreezeMonitor(spinner: HTMLElement, fpsReadout: HTMLElement): FreezeMonitor {
  let previousFrame = performance.now();
  let tracking = false;
  let framesPainted = 0;
  let lastPaint = 0;
  let longestGapMs = 0;

  function tick(now: number): void {
    const frameMs = now - previousFrame;
    previousFrame = now;
    fpsReadout.textContent = `${frameMs.toFixed(1)} ms/frame`;
    spinner.style.transform = `rotate(${(now * 0.2) % 360}deg)`;
    if (tracking) {
      framesPainted++;
      const gapMs = now - lastPaint;
      if (gapMs > longestGapMs) longestGapMs = gapMs;
      lastPaint = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Collect every long task with its real start and duration; attribution to a call happens by time overlap.
  const longTasks: TaskWindow[] = [];
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push({ start: entry.startTime, duration: entry.duration });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask is not observable here; framesPainted still shows whether the UI kept rendering.
    }
  }

  // Long tasks running during [start, end]: a task counts only if its own span overlaps the call.
  function longTasksDuring(start: number, end: number): { count: number; longestMs: number } {
    let count = 0;
    let longestMs = 0;
    for (const task of longTasks) {
      if (task.start < end && task.start + task.duration > start) {
        count++;
        if (task.duration > longestMs) longestMs = task.duration;
      }
    }
    return { count, longestMs };
  }

  // Yield two task turns so the Long Tasks entry for the call (if it crossed 50 ms) is delivered before reading.
  async function settle(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return {
    async measureSync(operation: () => void): Promise<FreezeReport> {
      const start = performance.now();
      operation();
      const end = performance.now();
      await settle();
      const tasks = longTasksDuring(start, end);
      // A synchronous call cannot be interrupted by a frame: framesPainted is exactly 0 and the block is exactly the total.
      return {
        totalMs: end - start,
        framesPainted: 0,
        longestGapMs: end - start,
        longTaskCount: tasks.count,
        longestTaskMs: tasks.longestMs,
      };
    },
    async measureAsync(operation: () => Promise<void>): Promise<FreezeReport> {
      framesPainted = 0;
      longestGapMs = 0;
      const start = performance.now();
      lastPaint = start;
      tracking = true;
      await operation();
      const end = performance.now();
      tracking = false;
      await settle();
      const tasks = longTasksDuring(start, end);
      return {
        totalMs: end - start,
        framesPainted,
        longestGapMs,
        longTaskCount: tasks.count,
        longestTaskMs: tasks.longestMs,
      };
    },
  };
}
