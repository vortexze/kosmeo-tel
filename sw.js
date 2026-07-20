/* Service worker de Kosméo mobile.
   - La coquille de l'appli (page, manifeste, icônes) est mise en cache pour
     démarrer même sans connexion.
   - Le fichier de données chiffré n'est JAMAIS mis en cache par le SW : c'est la
     page qui garde la dernière version (localStorage). On veut toujours essayer
     d'aller chercher le plus frais quand il y a du réseau. */
const CACHE = 'kosmeo-mobile-v2';
const COQUILLE = ['./', './index.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(cles =>
    Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('kosmeo-sync.dat')) return;   // données : toujours réseau, jamais le SW
  // coquille : réseau si possible, sinon cache (pour rester à jour tout en marchant hors-ligne)
  e.respondWith(
    fetch(e.request).then(rep => {
      const copie = rep.clone();
      caches.open(CACHE).then(c => c.put(e.request, copie)).catch(()=>{});
      return rep;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
