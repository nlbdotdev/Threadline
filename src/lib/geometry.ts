/** Observe content geometry rather than guessing card heights or gradient stops. */
export function geometry(
  node: HTMLElement,
  options: {
    enabled: boolean;
    onmeasure: (data: { stops: string[]; years: { label: string; y: number }[] }) => void;
  },
) {
  let enabled = options.enabled;
  let onmeasure = options.onmeasure;
  let frame = 0;
  const observed = new Set<Element>();
  const resize = new ResizeObserver(schedule);
  function draw() {
    if (!enabled) return;
    const origin = node.getBoundingClientRect().top;
    const railOrigin = node.querySelector('.rails')?.getBoundingClientRect().top ?? origin;
    const rows = [...node.querySelectorAll<HTMLElement>('[data-threadline-row]')];
    const targets = new Set<Element>(rows);
    for (const el of observed)
      if (!targets.has(el)) {
        resize.unobserve(el);
        observed.delete(el);
      }
    const stops: string[] = [];
    const groups = new Map<string, { first: number; last: number }>();
    for (const row of rows) {
      if (!observed.has(row)) {
        resize.observe(row);
        observed.add(row);
      }
      const dot = row.querySelector<HTMLElement>('[data-threadline-dot]');
      if (!dot) continue;
      const box = dot.getBoundingClientRect();
      const y = box.top + box.height / 2 - origin;
      stops.push(
        `${row.style.getPropertyValue('--event-color')} ${Math.max(0, box.top + box.height / 2 - railOrigin)}px`,
      );
      const label = row.dataset.year!;
      const group = groups.get(label);
      if (group) group.last = y;
      else groups.set(label, { first: y, last: y });
    }
    if (stops.length === 1) stops.push(stops[0]);
    onmeasure({
      stops,
      years: [...groups].map(([label, positions]) => ({
        label,
        y: (positions.first + positions.last) / 2,
      })),
    });
  }
  function schedule() {
    if (!enabled) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }
  const mutation = new MutationObserver((changes) => {
    if (
      changes.some(
        (change) =>
          change.target instanceof HTMLElement &&
          (change.target.matches('[data-threadline-row]') || change.target.closest('.rows')),
      )
    )
      schedule();
  });
  function configure(value: typeof options) {
    const wasEnabled = enabled;
    enabled = value.enabled;
    onmeasure = value.onmeasure;
    if (!enabled) {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      observed.clear();
      window.removeEventListener('resize', schedule);
      return;
    }
    resize.observe(node);
    mutation.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-year', 'style'],
    });
    window.addEventListener('resize', schedule);
    if (!wasEnabled || frame === 0) schedule();
  }
  configure(options);
  return {
    update: configure,
    destroy() {
      enabled = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', schedule);
    },
  };
}
