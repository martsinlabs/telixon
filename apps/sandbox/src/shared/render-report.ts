import type { FreezeReport } from './freeze-monitor';
import { mustGet } from './must-get';

function setText(selector: string, text: string): void {
  mustGet(selector, HTMLElement).textContent = text;
}

// Fills the shared metrics block; both init pages use the same ids so the readouts line up for comparison.
export function renderReport(report: FreezeReport): void {
  setText('#total', `${report.totalMs.toFixed(2)} ms`);
  setText('#frames', `${report.framesPainted}`);
  setText('#gap', `${report.longestGapMs.toFixed(1)} ms`);
  setText(
    '#long-tasks',
    report.longTaskCount === 0 ? 'none' : `${report.longTaskCount}, up to ${report.longestTaskMs.toFixed(0)} ms`,
  );

  const blocked = report.framesPainted === 0 || report.longTaskCount > 0;
  const verdict = mustGet('#verdict', HTMLElement);
  verdict.textContent =
    report.framesPainted === 0
      ? `Main thread blocked the whole call: 0 frames painted in ${report.totalMs.toFixed(1)} ms`
      : `UI stayed live: ${report.framesPainted} frames painted during ${report.totalMs.toFixed(1)} ms`;
  verdict.className = blocked ? 'verdict verdict--warn' : 'verdict verdict--ok';
}
