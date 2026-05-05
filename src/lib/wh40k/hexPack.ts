export function hexPackPositions(
  cx: number,
  cy: number,
  count: number,
  spacingInches = 1.5,
): { x: number; y: number }[] {
  if (count === 1) return [{ x: cx, y: cy }];
  const positions: { x: number; y: number }[] = [];
  positions.push({ x: cx, y: cy }); // center model
  const rings = Math.ceil((count - 1) / 6);
  let added = 1;
  for (let ring = 1; ring <= rings && added < count; ring++) {
    const modelsInRing = Math.min(6 * ring, count - added);
    for (let i = 0; i < modelsInRing && added < count; i++) {
      const angle = (i / (6 * ring)) * 2 * Math.PI;
      positions.push({
        x: cx + Math.cos(angle) * ring * spacingInches,
        y: cy + Math.sin(angle) * ring * spacingInches,
      });
      added++;
    }
  }
  return positions;
}
