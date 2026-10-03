import { workshopDashboard } from '../../lib/workshop/dashboard.ts';
import { getVehicle, loadStore } from '../../lib/workshop/store.ts';
import { nextWorkflowRoute, operationalStatus } from '../../lib/workshop/queue.ts';

export function mountWorkshopDashboard(root: HTMLElement) {
  const render = () => {
    let loaded;
    try { loaded = loadStore(window.localStorage); }
    catch { loaded = loadStore({ getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } }); }
    const { store } = loaded, summary = workshopDashboard(store);
    const notice = root.querySelector<HTMLElement>('#dashboard-status')!;
    notice.textContent = loaded.message; notice.hidden = !loaded.message;
    const counts = { active: summary.active.length, waiting: summary.waiting.length, parts: summary.partsAttention.length, drafts: summary.drafts, unpaid: summary.unpaid, ready: summary.readyToBill, history: summary.history.length };
    for (const [key, count] of Object.entries(counts)) root.querySelector<HTMLElement>(`[data-local-count="${key}"]`)!.textContent = String(count);
    const list = root.querySelector<HTMLElement>('#resume-jobs')!;
    list.replaceChildren();
    if (!summary.active.length) { const p = document.createElement('p'); p.textContent = 'No active local jobs. Start intake to record a new job; completed jobs remain in Service History.'; list.append(p); }
    for (const job of summary.active.slice(0, 6)) {
      const item = document.createElement('li'), link = document.createElement('a');
      link.textContent = `${job.number} · ${getVehicle(store, job)?.plate ?? 'Vehicle'} · ${operationalStatus(job)}`;
      link.href = `${nextWorkflowRoute(job)}?job=${encodeURIComponent(job.id)}`; item.append(link); list.append(item);
    }
    root.querySelector<HTMLElement>('#parts-attention')!.textContent = summary.partsAttention.length ? summary.partsAttention.slice(0, 6).map(part => part.name).join(' · ') : 'No active parts require attention. Add and maintain parts in Parts Inventory.';
  };
  render(); window.addEventListener('storage', render); window.addEventListener('pageshow', render);
}
