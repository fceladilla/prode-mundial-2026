import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';

export interface DirectoryUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

// La coleccion `users` es chica y de lectura publica, asi que se carga UNA vez
// y se filtra en memoria (igual que el SearchBar). Cache a nivel de modulo para
// compartirla entre todas las cajas de comentarios sin releer Firestore.
let cache: DirectoryUser[] | null = null;
let inflight: Promise<DirectoryUser[]> | null = null;

/** Sin acentos y en minusculas, para comparar "Mario" con "Marío". */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export async function getDirectoryUsers(): Promise<DirectoryUser[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = getDocs(
      query(collection(getDbClient(), 'users'), orderBy('totalPoints', 'desc'))
    )
      .then((snap) => {
        cache = snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName ?? 'Jugador',
          photoURL: d.data().photoURL ?? null,
        }));
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Filtra el directorio por subcadena (sin acentos) para el autocompletado @. */
export function searchDirectory(
  users: DirectoryUser[],
  q: string,
  max = 6
): DirectoryUser[] {
  const nq = normalizeName(q.trim());
  const pool = nq
    ? users.filter((u) => normalizeName(u.displayName).includes(nq))
    : users;
  return pool.slice(0, max);
}
