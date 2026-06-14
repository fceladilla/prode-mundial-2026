'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  deleteComment,
  editComment,
  fetchLikers,
  postComment,
  stripMentionMarkup,
  toggleLike,
  useComments,
  type Comment,
  type Liker,
  type ReplyRef,
} from '@/hooks/useComments';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import {
  getDirectoryUsers,
  searchDirectory,
  type DirectoryUser,
} from '@/lib/userDirectory';
import { formatDisplayName } from '@/lib/formatName';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { Avatar } from './Avatar';

const MAX_CHARS = 500;

/** Resalta brevemente el comentario citado y lo trae a la vista. */
function scrollToComment(id: string) {
  const el = document.getElementById(`comment-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('ring-2', 'ring-oro');
  setTimeout(() => el.classList.remove('ring-2', 'ring-oro'), 1500);
}

/** Renderiza el texto convirtiendo las menciones @[Nombre](uid) en links. */
function CommentBody({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <Link
        key={key++}
        href={`/perfil/${m[2]}`}
        className="font-semibold text-oro hover:underline"
      >
        @{m[1]}
      </Link>
    );
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));

  return (
    <p className="whitespace-pre-wrap break-words font-noto text-sm text-white/90">
      {nodes}
    </p>
  );
}

/** Token @parcial detectado justo antes del cursor (o null). */
function detectMention(
  value: string,
  caret: number
): { query: string; start: number } | null {
  const upto = value.slice(0, caret);
  // @ al inicio o tras un espacio, seguido de hasta 30 chars sin espacio ni @.
  const m = upto.match(/(?:^|\s)@([^\s@]{0,30})$/);
  if (!m) return null;
  return { query: m[1], start: caret - m[1].length - 1 };
}

/**
 * Caja de texto con autocompletado de menciones (@). Reutilizada para escribir
 * un comentario nuevo y para editar uno existente. Maneja su propio texto; el
 * padre solo decide que pasa al enviar (onSubmit) y, en edicion, al cancelar.
 */
function CommentComposer({
  currentUserId,
  initialText = '',
  submitLabel,
  onSubmit,
  onCancel,
  replyingTo,
  onCancelReply,
  autoFocus = false,
}: {
  currentUserId: string;
  initialText?: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
  replyingTo?: ReplyRef | null;
  onCancelReply?: () => void;
  autoFocus?: boolean;
}) {
  const { t } = useLanguage();
  const [text, setText] = useState(initialText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionResults, setMentionResults] = useState<DirectoryUser[]>([]);
  const [mentionActive, setMentionActive] = useState(0);
  const mentionOpen = mentionStart >= 0 && mentionResults.length > 0;

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [autoFocus]);

  const tooLong = text.length > MAX_CHARS;
  const canSend = !sending && !tooLong && text.trim().length > 0;

  const refreshMentions = (value: string, caret: number) => {
    const found = detectMention(value, caret);
    if (!found) {
      setMentionStart(-1);
      setMentionResults([]);
      return;
    }
    setMentionStart(found.start);
    getDirectoryUsers().then((users) => {
      // Descarta al propio usuario: no tiene sentido auto-etiquetarse.
      const hits = searchDirectory(users, found.query).filter(
        (u) => u.uid !== currentUserId
      );
      setMentionResults(hits);
      setMentionActive(0);
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    refreshMentions(value, e.target.selectionStart ?? value.length);
  };

  const insertMention = (u: DirectoryUser) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(caret);
    const token = `@[${formatDisplayName(u.displayName)}](${u.uid}) `;
    const next = before + token + after;
    setText(next);
    setMentionStart(-1);
    setMentionResults([]);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = before.length + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      await onSubmit(text);
      setText('');
    } catch {
      setError(t('commentError'));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Con el dropdown de menciones abierto, las flechas/Enter lo manejan a el.
    if (mentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionActive((a) => (a + 1) % mentionResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionActive(
          (a) => (a - 1 + mentionResults.length) % mentionResults.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionActive]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionStart(-1);
        setMentionResults([]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      {replyingTo && (
        <div className="mb-1 flex items-center gap-2 rounded-md bg-carbon px-2 py-1 text-xs">
          <span className="min-w-0 flex-1 truncate text-suave">
            ↩ {t('replyingTo', { name: formatDisplayName(replyingTo.displayName) })}
          </span>
          <button
            onClick={onCancelReply}
            aria-label={t('cancelReply')}
            className="shrink-0 text-suave hover:text-rojo"
          >
            ✕
          </button>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder={t('commentPlaceholder')}
        className="w-full resize-none rounded-md bg-carbon px-3 py-2 font-noto text-sm outline-none ring-1 ring-white/15 placeholder:text-suave focus:ring-2 focus:ring-oro"
      />
      {mentionOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-white/10 bg-negro shadow-xl">
          {mentionResults.map((u, idx) => (
            <button
              key={u.uid}
              onMouseDown={(e) => {
                // mousedown (no click): no robar el foco del textarea.
                e.preventDefault();
                insertMention(u);
              }}
              onMouseEnter={() => setMentionActive(idx)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                idx === mentionActive ? 'bg-carbon' : ''
              }`}
            >
              <Avatar src={u.photoURL} name={u.displayName} size={22} />
              <span className="min-w-0 flex-1 truncate">
                {formatDisplayName(u.displayName)}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
        <span className={tooLong ? 'text-rojo' : 'text-suave'}>
          {text.length} / {MAX_CHARS}
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-rojo">{error}</span>}
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-suave transition hover:text-white"
            >
              {t('cancelReply')}
            </button>
          )}
          <button
            onClick={submit}
            disabled={!canSend}
            className="rounded-md bg-oro px-4 py-1.5 font-semibold text-negro transition hover:bg-oro/90 disabled:opacity-40"
          >
            {sending ? '...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="relative flex items-center gap-2 text-xs">
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
  const [replyingTo, setReplyingTo] = useState<ReplyRef | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // La seccion solo se renderiza cuando esta visible (pagina del foro o
  // toggle abierto en la tarjeta), asi que montada + comentarios cargados
  // = leidos. Se re-marca cuando llega uno nuevo con la seccion abierta.
  const latestMs = comments[0]?.createdAt?.getTime() ?? 0;
  useEffect(() => {
    if (user && !loading) markRead(matchId);
  }, [user, loading, matchId, latestMs, markRead]);

  const startReply = (c: Comment) => {
    setReplyingTo({
      id: c.id,
      userId: c.userId,
      displayName: c.displayName,
      text: stripMentionMarkup(c.text).slice(0, 140),
    });
  };

  const doDelete = async (id: string) => {
    try {
      await deleteComment(id);
    } catch {
      // Reglas o red: se ignora.
    } finally {
      setConfirmDeleteId(null);
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
        <CommentComposer
          currentUserId={user.uid}
          submitLabel={t('send')}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSubmit={async (txt) => {
            await postComment(
              user.uid,
              user.displayName ?? 'Jugador',
              user.photoURL ?? '',
              txt,
              matchId,
              replyingTo
            );
            setReplyingTo(null);
          }}
        />
      </div>

      <div className="divide-y divide-white/10">
        {loading ? (
          <p className="py-3 text-sm text-suave">{t('loadingComments')}</p>
        ) : comments.length === 0 ? (
          <p className="py-3 text-sm text-suave">{t('noComments')}</p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((c) => {
              const mentionsMe = c.mentions.includes(user.uid);
              const isOwn = c.userId === user.uid;
              const isEditing = editingId === c.id;
              return (
                <motion.div
                  key={c.id}
                  id={`comment-${c.id}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 rounded-md py-3 transition ${
                    mentionsMe ? 'bg-oro/5 ring-1 ring-oro/30' : ''
                  }`}
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
                        {c.edited && ` · ${t('editedLabel')}`}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-1">
                        <CommentComposer
                          currentUserId={user.uid}
                          initialText={c.text}
                          submitLabel={t('save')}
                          autoFocus
                          onCancel={() => setEditingId(null)}
                          onSubmit={async (txt) => {
                            await editComment(c.id, txt);
                            setEditingId(null);
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        {c.replyTo && (
                          <button
                            onClick={() => scrollToComment(c.replyTo!.id)}
                            className="mt-1 block w-full truncate rounded border-l-2 border-oro/50 bg-carbon/60 px-2 py-1 text-left text-xs text-suave hover:text-white/90"
                          >
                            <span className="font-semibold text-oro/80">
                              ↩{' '}
                              {t('inReplyTo', {
                                name: formatDisplayName(c.replyTo.displayName),
                              })}
                            </span>{' '}
                            {c.replyTo.text}
                          </button>
                        )}
                        <CommentBody text={c.text} />
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <LikeButton
                            commentId={c.id}
                            likes={c.likes}
                            uid={user.uid}
                          />
                          <button
                            onClick={() => startReply(c)}
                            className="text-xs text-suave transition hover:text-oro"
                          >
                            {t('replyButton')}
                          </button>
                          {isOwn && confirmDeleteId !== c.id && (
                            <>
                              <button
                                onClick={() => setEditingId(c.id)}
                                className="text-xs text-suave transition hover:text-oro"
                              >
                                {t('editButton')}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(c.id)}
                                className="text-xs text-suave transition hover:text-rojo"
                              >
                                {t('deleteButton')}
                              </button>
                            </>
                          )}
                          {isOwn && confirmDeleteId === c.id && (
                            <span className="flex items-center gap-2 text-xs">
                              <span className="text-suave">
                                {t('confirmDelete')}
                              </span>
                              <button
                                onClick={() => doDelete(c.id)}
                                className="font-semibold text-rojo hover:underline"
                              >
                                {t('confirmDeleteYes')}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-suave transition hover:text-white"
                              >
                                {t('cancelReply')}
                              </button>
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
