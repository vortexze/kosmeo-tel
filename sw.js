/* Service worker de Kosméo mobile.
   - La coquille de l'appli (page, manifeste, icônes) est mise en cache pour
     démarrer même sans connexion.
   - Le fichier de données chiffré n'est JAMAIS mis en cache par le SW : c'est la
     page qui garde la dernière version (localStorage). On veut toujours essayer
     d'aller chercher le plus frais quand il y a du réseau. */
const CACHE = 'kosmeo-mobile-v4';
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

/* Notification envoyée par le PC (Web Push) : on l'affiche, même appli fermée. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (_) { d = { titre: 'Kosméo', corps: (e.data && e.data.text()) || '' }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'Kosméo', {
    body: d.corps || '',
    icon: './icone-192.png',
    badge: './icone-192.png',
    tag: d.tag || 'kosmeo',
    renotify: true,
    silent: false,                       // laisse le téléphone jouer le son
    vibrate: [200, 100, 200],            // + vibration pour attirer l'attention
    requireInteraction: true,            // reste affichée tant qu'on ne l'ouvre pas
    data: { url: d.url || './' }
  }));
});

/* Toucher la notification : on ouvre (ou ramène au premier plan) l'appli. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const cible = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(liste => {
    for (const c of liste) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(cible);
  }));
});
