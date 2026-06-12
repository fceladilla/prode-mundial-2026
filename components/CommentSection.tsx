'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { postComment, useComments } from '@/hooks/useComments';
import { formatDisplayName } from '@/lib/formatName';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { Avatar } from './Avatar';

const MAX_CHARS = 500;

export function CommentSection({ matchId = null }: { matchId?: string | null }) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { comments, loading } = useComments(matchId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <section className="rounded-xl border border-white/10 bg-negro p-4">
      <h2 className="mb-3 font-display text-lg font-bold text-oro">
        💬 {matchId ? t('matchComments') : t('forumTitle')}
      </h2>

      {user ? (
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
      ) : (
        <p className="mb-3 rounded-md bg-carbon px-3 py-2 text-sm text-suave">
          {t('signInToComment')}
        </p>
      )}

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
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
