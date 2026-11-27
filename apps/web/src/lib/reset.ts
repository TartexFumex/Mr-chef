import { db } from '../db/db'
import { getMcClient } from './mc'
import { resetVaultCache } from './vault'

/**
 * Déconnexion complète : invalide la session côté Monsieur Cuisine (si possible),
 * puis efface la base locale, les caches de l'application et le stockage local.
 */
export async function logoutAndWipe(): Promise<void> {
  try {
    const client = await getMcClient()
    await Promise.race([client.logout(), new Promise((r) => setTimeout(r, 5000))])
  } catch {
    // hors ligne ou relais absent : on efface quand même tout en local
  }
  db.close()
  await db.delete()
  resetVaultCache()
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    /* stockage indisponible */
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
}

/** Recettes qui seraient perdues : jamais publiées, ou modifiées depuis la dernière publication. */
export async function countUnpublished(): Promise<{ count: number; titles: string[] }> {
  const local = await db.recipes.filter((r) => r.sync.remoteId == null || r.hash !== r.sync.publishedHash).toArray()
  return { count: local.length, titles: local.map((r) => r.title) }
}
