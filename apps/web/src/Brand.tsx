// Orgsmith mark: a 3x3 grid of module cells; the full cells draw a check.
const ON: [number, number][] = [[33, 3], [3, 18], [33, 18], [18, 33]];
const HALF: [number, number][] = [[18, 3], [33, 33]];
const OFF: [number, number][] = [[3, 3], [18, 18], [3, 33]];

export function Brand() {
  return (
    <div className="brand">
      <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
        {ON.map(([x, y]) => <rect key={`${x}-${y}`} className="on" x={x} y={y} width="12" height="12" rx="3" />)}
        {HALF.map(([x, y]) => <rect key={`${x}-${y}`} className="half" x={x} y={y} width="12" height="12" rx="3" />)}
        {OFF.map(([x, y]) => <rect key={`${x}-${y}`} className="off" x={x + .75} y={y + .75} width="10.5" height="10.5" rx="2.5" />)}
      </svg>
      <span>org<b>smith</b></span>
    </div>
  );
}
