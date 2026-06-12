'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { postComment, toggleLike, useComments } from '@/hooks/useComments';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import { formatDisplayName } from '@/lib/formatName';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { Avatar } from './Avatar';

const MAX_CHARS = 500;

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
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={liked ? t('unlikeButton') : t('likeButton')}
      aria-pressed={liked}
      className={`mt-1 flex items-center gap-1 text-xs transition ${
        liked ? 'text-oro' : 'text-suave hover:text-oro'
      }`}
    >
      <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      {likes.length > 0 && (
        <span className="font-semibold">{likes.length}</span>
      )}
    </button>
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
