// Reads a PG's name (and address, when Google includes it) from a shared Google Maps link.
// Short links (maps.app.goo.gl) redirect to a full Maps URL that carries the place name.
// The phone's native HTTP is used because a web page can't follow Google's redirects itself.
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const clean = s => String(s || '').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
const dec = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };

function fromUrl(u) {
  const out = {};
  const place = u.match(/\/maps\/place\/([^/@?]+)/);
  if (place) out.name = clean(dec(place[1]));
  const q = u.match(/[?&](?:q|query)=([^&]+)/);
  if (q) {
    const parts = clean(dec(q[1])).split(',').map(x => x.trim()).filter(Boolean);
    if (parts.length && !/^-?\d+(\.\d+)?$/.test(parts[0])) {
      if (!out.name) out.name = parts[0];
      if (parts.length > 1) out.address = parts.slice(1).join(', ');
    }
  }
  return out;
}

function fromHtml(html) {
  const m = String(html || '').match(/<meta[^>]+(?:property|itemprop)=["'](?:og:title|name)["'][^>]+content=["']([^"']+)["']/i)
    || String(html || '').match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|itemprop)=["'](?:og:title|name)["']/i);
  if (!m) return {};
  const t = m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const [name, ...rest] = t.split(' · ');
  if (!name || /^google maps$/i.test(name.trim())) return {};
  return { name: clean(name), address: clean(rest.join(', ')) };
}

export async function resolveMapsLink(url) {
  if (!url || !Capacitor.isNativePlatform()) return {};
  const direct = fromUrl(url);
  if (direct.name && direct.address) return direct;
  try {
    const r = await CapacitorHttp.get({ url, connectTimeout: 10000, readTimeout: 10000, headers: { 'Accept-Language': 'en-IN,en' } });
    const finalUrl = r.url || '';
    const a = fromUrl(finalUrl), b = typeof r.data === 'string' ? fromHtml(r.data) : {};
    return { name: direct.name || a.name || b.name || '', address: direct.address || a.address || b.address || '' };
  } catch (e) {
    return direct;
  }
}
