'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  fetchLikers,
  postComment,
  toggleLike,
  useComments,
  type Liker,
} from '@/hooks/useComments';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import { formatDisplayName } from '@/lib/formatName';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { Avatar } from './Avatar';

const MAX_CHARS = 500;

function LikersPopover({
  likes,
  onClose,
}: {
  likes: string[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLikers(likes).then((r) => {
      if (!cancelled) setLikers(r);
    });
    return () => {
      cancelled = true;
    };
  }, [likes]);

  // Cierra al tocar fuera o con Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-0 top-6 z-20 w-56 rounded-lg border border-white/10 bg-carbon p-2 shadow-xl"
    >
      <p className="mb-1 px-1 font-display text-xs font-semibold text-oro">
        {t('likedByTitle')}
      </p>
      {likers === null ? (
        <p className="px-1 py-1 text-xs text-suave">{t('loadingLikers')}</p>
      ) : (
        <ul className="max-h-48 space-y-0.5 overflow-y-auto">
          {likers.map((u) => (
            <li key={u.id}>
              <Link
                href={`/perfil/${u.id}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white/5"
              >
                <Avatar src={u.photoURL} name={u.displayName} size={24} />
                <span className="truncate font-noto text-xs text-white/90">
                  {formatDisplayName(u.displayName)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function LikeButton({
  commentId,
  likes,
  uid,
}: {
  commentId: string;
  likes: string[];
  uid: string;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const liked = likes.includes(uid);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // El contador se actualiza solo via el snapshot del listener.
      await toggleLike(commentId, uid, liked);
    } catch {
      // Reglas o red: se ignora, el boton queda como estaba.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mt-1 flex items-center gap-2 text-xs">
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={liked ? t('unlikeButton') : t('likeButton')}
        aria-pressed={liked}
        className={`transition ${
          liked ? 'text-oro' : 'text-suave hover:text-oro'
        }`}
      >
        <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      </button>
      {likes.length > 0 && (
        <button
          onClick={() => setShowLikers((v) => !v)}
          aria-expanded={showLikers}
          aria-label={t('likedByTitle')}
          className={`font-semibold transition ${
            showLikers ? 'text-oro' : 'text-suave hover:text-oro'
          }`}
        >
          {likes.length}
        </button>
      )}
      {showLikers && likes.length > 0 && (
        <LikersPopover likes={likes} onClose={() => setShowLikers(false)} />
      )}
    </div>
  );
}

export function CommentSection({ matchId = null }: { matchId?: string | null }) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { comments, loading } = useComments(matchId);
  const { markRead } = useUnreadComments();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // La seccion solo se renderiza cuando esta visible (pagina del foro o
  // toggle abierto en la tarjeta), asi que montada + comentarios cargados
  // = leidos. Se re-marca cuando llega uno nuevo con la seccion abierta.
  const latestMs = comments[0]?.createdAt?.getTime() ?? 0;
  useEffect(() => {
    if (user && !loading) markRead(matchId);
  }, [user, loading, matchId, latestMs, markRead]);

  const tooLong = text.length > MAX_CHARS;
  const canSend = !!user && !sending && !tooLong && text.trim().length > 0;

  const send = async () => {
    if (!user || !canSend) return;
    setSending(true);
    setError('');
    try {
      await postComment(
        user.uid,
        user.displayName ?? 'Jugador',
        user.photoURL ?? '',
        text,
        matchId
      );
      setText('');
    } catch {
      setError(t('commentError'));
    } finally {
      setSending(false);
    }
  };

  // Foro y comentarios solo para usuarios con sesion (las reglas de
  // Firestore tambien lo exigen; sin sesion ni siquiera se suscribe).
  if (!user) {
    return (
      <section className="rounded-xl border border-white/10 bg-negro p-4">
        <h2 className="mb-3 font-display text-lg font-bold text-oro">
          💬 {matchId ? t('matchComments') : t('forumTitle')}
        </h2>
        <p className="rounded-md bg-carbon px-3 py-2 text-sm text-suave">
          🔒 {t('signInToSeeComments')}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-negro p-4">
      <h2 className="mb-3 font-display text-lg font-bold text-oro">
        💬 {matchId ? t('matchComments') : t('forumTitle')}
      </h2>

      <div className="mb-1 flex items-start gap-3">
        <Avatar src={user.photoURL} name={user.displayName} size={32} />
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={t('commentPlaceholder')}
            className="w-full resize-none rounded-md bg-carbon px-3 py-2 font-noto text-sm outline-none ring-1 ring-white/15 placeholder:text-suave focus:ring-2 focus:ring-oro"
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className={tooLong ? 'text-rojo' : 'text-suave'}>
              {text.length} / {MAX_CHARS}
            </span>
            {error && <span className="text-rojo">{error}</span>}
          </div>
        </div>
        <button
          onClick={send}
          disabled={!canSend}
          className="rounded-md bg-oro px-4 py-2 text-sm font-semibold text-negro transition hover:bg-oro/90 disabled:opacity-40"
        >
          {sending ? '...' : t('send')}
        </button>
      </div>

      <div className="divide-y divide-white/10">
        {loading ? (
          <p className="py-3 text-sm text-suave">{t('loadingComments')}</p>
        ) : comments.length === 0 ? (
          <p className="py-3 text-sm text-suave">{t('noComments')}</p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 py-3"
              >
                <Link href={`/perfil/${c.userId}`} className="shrink-0">
                  <Avatar src={c.photoURL} name={c.displayName} size={32} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/perfil/${c.userId}`}
                      className="truncate font-display font-bold hover:text-oro"
                    >
                      {formatDisplayName(c.displayName)}
                    </Link>
                    <span className="shrink-0 text-xs text-suave">
                      {formatRelativeTime(c.createdAt, lang)}
                    </span>
                  </div>
                  <p className="break-words font-noto text-sm text-white/90">
                    {c.text}
                  </p>
                  <LikeButton
                    commentId={c.id}
                    likes={c.likes}
                    uid={user.uid}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
