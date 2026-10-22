// Fetches PGs from Google (Places API, Text Search) for a locality.
// Results are shown live and are not stored; only the place ID and your call status are saved.
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.shortFormattedAddress',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.rating', 'places.userRatingCount',
  'places.googleMapsUri', 'places.businessStatus', 'nextPageToken',
].join(',');
// The API key is locked to this Android app (package + signing certificate) in Google Cloud.
const ANDROID_PACKAGE = 'com.sukoon.pgnetwork';
const ANDROID_CERT = '558832A53FF39889B64E043EF7BFF4835D3ED96F';

export const PLACES_SETUP = { pkg: ANDROID_PACKAGE, sha1: '55:88:32:A5:3F:F3:98:89:B6:4E:04:3E:F7:BF:F4:83:5D:3E:D9:6F' };

async function post(key, body) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
    'X-Goog-FieldMask': FIELDS,
    'X-Android-Package': ANDROID_PACKAGE,
    'X-Android-Cert': ANDROID_CERT,
  };
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.post({ url: URL, headers, data: body, connectTimeout: 15000, readTimeout: 20000 });
    const data = typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {});
    return { status: r.status, data };
  }
  const r = await fetch(URL, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

function explain(status, data) {
  const m = (data && data.error && (data.error.message || data.error.status)) || '';
  if (status === 403 && /billing/i.test(m)) return 'Google says billing is not turned on for this project. Add a billing account in Google Cloud.';
  if (status === 403 && /not been used|disabled|SERVICE_DISABLED/i.test(m)) return 'Places API (New) is not turned on. Enable it in Google Cloud → APIs & Services.';
  if (status === 403) return 'Google blocked this key. Check the key restrictions (Android app + Places API (New)). ' + m;
  if (status === 400 && /API key/i.test(m)) return 'The API key looks wrong. Copy it again from Google Cloud.';
  if (status === 429) return 'Too many searches right now. Wait a minute and try again.';
  return m || `Google returned an error (${status}).`;
}

// One search; returns { places, next }.
export async function searchPlaces(key, textQuery, pageToken) {
  const body = { textQuery, pageSize: 20, languageCode: 'en', regionCode: 'IN' };
  if (pageToken) body.pageToken = pageToken;
  const { status, data } = await post(key, body);
  if (status < 200 || status >= 300) throw new Error(explain(status, data));
  const places = (data.places || []).filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY').map(p => ({
    placeId: p.id,
    name: (p.displayName && p.displayName.text) || '',
    address: p.formattedAddress || p.shortFormattedAddress || '',
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
    rating: p.rating || null,
    reviews: p.userRatingCount || 0,
    mapUrl: p.googleMapsUri || '',
  }));
  return { places, next: data.nextPageToken || '' };
}

// Several searches for one locality, merged without duplicates.
export async function fetchLocality(key, area, kinds, onProgress) {
  const seen = new Map();
  const queries = kinds.map(k => `${k} in ${area}, Delhi NCR`);
  for (const q of queries) {
    let token = '', pages = 0;
    do {
      const { places, next } = await searchPlaces(key, q, token);
      places.forEach(p => { if (!seen.has(p.placeId)) seen.set(p.placeId, p); });
      onProgress && onProgress(seen.size, q);
      token = next; pages++;
      if (token) await new Promise(r => setTimeout(r, 1200)); // Google needs a short pause before the next page
    } while (token && pages < 3);
  }
  return [...seen.values()];
}
