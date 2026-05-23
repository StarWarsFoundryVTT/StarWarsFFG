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
// Mirrors ItemSheetFFG.SIZE_TO_INT. Kept inline so the helper has no Foundry
// deps and can resolve `sizeInt` from the persistent `.size` field on raw
// stored data (used by the click-time guard, where `getData`'s pre-pass has
// not run).
const SIZE_TO_INT = { single: 1, double: 2, triple: 3, full: 4 };

function resolveSize(node) {
  if (!node) return 0;
  // Placeholders for the inner cells of a multi-column upgrade are stored
  // by the OGGDUDE importer with `visible: false` AND `size: "single"`
  // (sizeInt=1 after pre-pass). That makes them look like a real single
  // cell if we only consult sizeInt/size — so anchor on `visible` instead.
  // (Specialization talents have no `visible` field, so the check passes.)
  if (node.visible === false) return 0;
  const explicit = Number(node.sizeInt);
  if (Number.isFinite(explicit) && explicit >= 1) return explicit;
  if (Number.isFinite(explicit) && explicit === 0) return 0;
  const fromString = SIZE_TO_INT[node.size];
  return Number.isFinite(fromString) && fromString >= 1 ? fromString : 0;
}

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
  // The candidate is always a real (non-placeholder) renderable node; default
  // to size 1 if neither sizeInt nor a recognised `.size` is set.
  const candidateSize = sizeAware ? resolveSize(node) : 1;
  const size = candidateSize >= 1 ? candidateSize : 1;
  const neighborSize = (n) => (sizeAware ? resolveSize(n) : (n ? 1 : 0));

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

  // Down neighbors: for each column slot in the candidate's span (1..size),
  // walk the row below to find the owning child for that column, then check
  // the child's OWN links-top slot covering that column. The link is stored
  // on the child, indexed by the child's own column offset from its left
  // edge — NOT by the candidate's slot.
  for (let n = 1; n <= size; n++) {
    const targetCol = col + n - 1;
    if (targetCol >= width) break;
    const nextRowStart = (row + 1) * width;
    for (let z = 0; z <= targetCol; z++) {
      const childIndex = nextRowStart + targetCol - z;
      if (childIndex < nextRowStart || childIndex >= total) break;
      const child = tree[`${prefix}${childIndex}`];
      if (child && neighborSize(child) > z) {
        const childSlot = z + 1;
        if (child[`links-top-${childSlot}`] && child.islearned) return true;
        break;
      }
    }
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
