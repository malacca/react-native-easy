
export function getInt(v, def) {
  v = parseInt(v);
  return typeof v === "number" && isFinite(v) && Math.floor(v) === v ? v : def;
}
