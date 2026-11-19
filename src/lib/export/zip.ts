import { deflateRawSync } from "node:zlib";

/** A small, dependency-free ZIP writer (deflate, CRC-32, UTF-8 names). */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Entry names must be relative, forward-slash paths without "..", empty segments or control characters. */
export function safeEntryName(name: string): string {
  if (typeof name !== "string" || !name || name.length > 400 || /[\u0000-\u001f\u007f\\]/.test(name)) throw new Error(`unsafe entry name: ${JSON.stringify(name)}`);
  if (name.startsWith("/") || /^[A-Za-z]:/.test(name)) throw new Error(`absolute entry name: ${name}`);
  if (name.split("/").some((s) => s === "" || s === "." || s === "..")) throw new Error(`entry name has '..' or empty segments: ${name}`);
  return name;
}

function dosTime(d: Date): { time: number; date: number } {
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

export function createZip(entries: { name: string; data: Buffer | string }[], when = new Date()): Buffer {
  const parts: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  const { time, date } = dosTime(when);
  const names = new Set<string>();
  for (const e of entries) {
    const name = safeEntryName(e.name);
    if (names.has(name)) throw new Error(`duplicate entry ${name}`);
    names.add(name);
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, "utf8");
    const deflated = deflateRawSync(raw, { level: 6 });
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const crc = crc32(raw);
    const nameBuf = Buffer.from(name, "utf8");
    if (offset > 0xfffffff0 || raw.length > 0xfffffff0) throw new Error("archive too large");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8); local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(0x0314, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(useDeflate ? 8 : 0, 10); cd.writeUInt16LE(time, 12); cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt32LE((0o100644 << 16) >>> 0, 38); cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}
