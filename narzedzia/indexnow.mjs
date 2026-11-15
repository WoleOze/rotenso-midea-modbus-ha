// Zgłoszenie adresów z mapy strony do IndexNow (Bing, Yandex, Seznam…). Klucz jest jawny: plik 20761020e2e04bee11f63f8d33098009.txt w katalogu głównym strony.
// Użycie: node narzedzia/indexnow.mjs   (po wypchnięciu nowych stron)
const KEY = '20761020e2e04bee11f63f8d33098009', HOST = 'pompa.woleoze.pl';
const mapa = await (await fetch(`https://${HOST}/sitemap.xml?cb=${Date.now()}`)).text();
const urls = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }) });
console.log('IndexNow', r.status, urls.length, 'adresów');
