type Point = { x: number; y: number };

/** The drawing mask is a polyline: cache its arc lengths rather than asking SVG every frame. */
export function measurePolyline(d: string) {
  const values = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const points: Point[] = [];
  const distances: number[] = [0];
  for (let i = 0; i < values.length; i += 2) {
    const point = { x: values[i], y: values[i + 1] };
    const previous = points.at(-1);
    if (previous) distances.push(distances.at(-1)! + Math.hypot(point.x - previous.x, point.y - previous.y));
    points.push(point);
  }
  const length = distances.at(-1)!;
  return {
    length,
    at(progress: number): Point {
      const distance = Math.max(0, Math.min(1, progress)) * length;
      let low = 0, high = points.length - 1;
      while (high - low > 1) {
        const middle = (low + high) >>> 1;
        if (distances[middle] < distance) low = middle; else high = middle;
      }
      const t = (distance - distances[low]) / (distances[high] - distances[low] || 1);
      return { x: points[low].x + (points[high].x - points[low].x) * t, y: points[low].y + (points[high].y - points[low].y) * t };
    },
  };
}

/** A monotonic route can be searched by height without querying browser SVG geometry. */
export function indexRoute(sample: (progress: number) => Point, count = 2048) {
  const points = Array.from({ length: count + 1 }, (_, i) => sample(i / count));
  return (y: number) => {
    let low = 0, high = count;
    while (high - low > 1) {
      const middle = (low + high) >>> 1;
      if (points[middle].y < y) low = middle; else high = middle;
    }
    const a = points[low], b = points[high];
    const t = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y || 1)));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, progress: (low + t) / count };
  };
}
