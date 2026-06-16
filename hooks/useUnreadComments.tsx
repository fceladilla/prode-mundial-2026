'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Badges de comentarios no leidos: **DESACTIVADOS** para ahorrar cuota.
 *
 * Antes este provider abria un listener `onSnapshot` sobre los ultimos 150
 * comentarios de toda la coleccion, en TODAS las paginas y por cada usuario
 * logueado (150 lecturas por carga + 1 lectura por cada comentario nuevo
 * durante un chat en vivo). Era el mayor consumidor fijo de la cuota gratuita
 * de Firestore. Los comentarios se siguen escribiendo y leyendo normalmente al
 * abrir cada hilo; lo unico que se quita es la notificacion de "no leidos".
 *
 * Se mantiene la API (`unreadCount`/`markRead`) como no-op para no tener que
 * tocar los consumidores (Navbar, MatchCard, CommentSection): los badges
 * renderizan solo cuando el contador es > 0, asi que con `() => 0` desaparecen
 * sin cambios adicionales.
 */

interface UnreadCommentsContextValue {
  /** threadKey: matchId, o null para el foro global. */
  unreadCount: (threadKey: string | null) => number;
  markRead: (threadKey: string | null) => void;
}

const UnreadCommentsContext = createContext<UnreadCommentsContextValue>({
  unreadCount: () => 0,
  markRead: () => {},
});

export function UnreadCommentsProvider({ children }: { children: ReactNode }) {
  return (
    <UnreadCommentsContext.Provider
      value={{ unreadCount: () => 0, markRead: () => {} }}
    >
      {children}
    </UnreadCommentsContext.Provider>
  );
}

export function useUnreadComments() {
  return useContext(UnreadCommentsContext);
}
