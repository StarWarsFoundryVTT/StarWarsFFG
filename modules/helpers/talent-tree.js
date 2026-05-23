/**
 * Connected-to-root talent tree purchase rule.
 *
 * A node (talent or upgrade) is purchasable iff:
 *   - it is unlearned, AND
 *   - it is in the root row (index < width), OR
 *   - at least one of its four neighbors is learned AND connected by an
 *     active link in the direction of that neighbor.
 *
 * `sizeAware = true` (force power / signature ability) means nodes may span
 * multiple columns via `sizeInt`. Neighbor indexing accounts for that:
 *   - right neighbor is at `index + sizeInt`
 *   - the up-neighbor for slot N walks left across the previous row until it
 *     finds a node whose own `sizeInt` covers the target column
 *   - the left neighbor walks left across the current row until it finds a
 *     node whose right edge sits at `col - 1`
 *
 * @param {object} tree
 *   Tree dict keyed `<prefix>0..total-1` (e.g. `talents` or `upgrades`).
 * @param {string} key
 *   Key of the candidate node (e.g. "talent5", "upgrade2").
 * @param {object} opts
 * @param {string} opts.prefix       Key prefix ("talent" or "upgrade").
 * @param {number} opts.width        Grid width (4 today).
 * @param {number} opts.total        Total node count.
 * @param {boolean} opts.sizeAware   True if nodes may span multiple columns.
 * @returns {boolean}
 */
export function canPurchaseNode(tree, key, opts) {
  if (!tree || !key || !opts) return false;
  const { prefix, width, total, sizeAware } = opts;

  const node = tree[key];
  if (!node) return false;
  if (node.islearned) return false;

  const index = parseInt(key.slice(prefix.length), 10);
  if (Number.isNaN(index) || index < 0 || index >= total) return false;

  if (index < width) return true; // root row

  const col = index % width;
  const row = Math.floor(index / width);
  const size = sizeAware ? (Number(node.sizeInt) >= 1 ? node.sizeInt : 1) : 1;
  const neighborSize = (n) => {
    if (!sizeAware) return n ? 1 : 0;
    const s = Number(n?.sizeInt);
    return Number.isFinite(s) && s >= 1 ? s : 0;
  };

  // Up neighbors: for each top-link slot n in 1..size
  for (let n = 1; n <= size; n++) {
    if (!node[`links-top-${n}`]) continue;
    const targetCol = col + n - 1;
    const prevRowStart = (row - 1) * width;
    for (let z = 0; z <= targetCol; z++) {
      const parentIndex = prevRowStart + targetCol - z;
      if (parentIndex < prevRowStart) break;
      const parent = tree[`${prefix}${parentIndex}`];
      if (parent && neighborSize(parent) > z) {
        if (parent.islearned) return true;
        break;
      }
    }
  }

  // Down neighbors: child slot n at row+1, col + n - 1
  for (let n = 1; n <= size; n++) {
    const childCol = col + n - 1;
    if (childCol >= width) break;
    const childIndex = (row + 1) * width + childCol;
    if (childIndex >= total) continue;
    const child = tree[`${prefix}${childIndex}`];
    if (child && child[`links-top-${n}`] && child.islearned) return true;
  }

  // Right neighbor: at column (col + size), same row
  if (col + size < width) {
    const rightIndex = index + size;
    if (rightIndex < total) {
      const right = tree[`${prefix}${rightIndex}`];
      if (right && node[`links-right`] && right.islearned) return true;
    }
  }

  // Left neighbor: walk leftward; first node whose right edge is at col-1
  if (col > 0) {
    const rowStart = row * width;
    for (let z = 1; z <= col; z++) {
      const leftIndex = index - z;
      if (leftIndex < rowStart) break;
      const left = tree[`${prefix}${leftIndex}`];
      if (left && neighborSize(left) === z) {
        if (left[`links-right`] && left.islearned) return true;
        break;
      }
    }
  }

  return false;
}
