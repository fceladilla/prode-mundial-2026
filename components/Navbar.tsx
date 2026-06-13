'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUnreadComments } from '@/hooks/useUnreadComments';
import { LANGS } from '@/lib/i18n';
import { Avatar } from './Avatar';
import { SearchBar } from './SearchBar';

// Badge de comentarios sin leer del foro global, junto al link "Foro".
function ForumBadge() {
  const { unreadCount } = useUnreadComments();
  const { t } = useLanguage();
  const count = unreadCount(null);
  if (count === 0) return null;
  return (
    <span
      title={t('unreadBadge', { count })}
      className="ml-1.5 inline-block rounded-full bg-oro px-1.5 py-0.5 align-middle text-[10px] font-bold leading-none text-negro"
    >
      {count}
    </span>
  );
}

function LangSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-carbon p-0.5 text-xs font-semibold">
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => {
            setLang(l.id);
            onSelect?.();
          }}
          aria-pressed={lang === l.id}
          className={`rounded px-2 py-1 transition ${
            lang === l.id
              ? 'bg-oro text-negro'
              : 'text-suave hover:text-white'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// Link de navegacion que se resalta (oro + negrita) cuando su seccion esta
// activa, segun la ruta actual. `exact` para "/" (si no, matchea con todo).
function NavLink({
  href,
  exact = false,
  onClick,
  baseClassName,
  activeClassName,
  inactiveClassName,
  children,
}: {
  href: string;
  exact?: boolean;
  onClick?: () => void;
  baseClassName: string;
  activeClassName: string;
  inactiveClassName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`${baseClassName} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, loading, signIn, logout } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-negro/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            onClick={closeMenu}
            className="shrink-0 font-display text-xl font-bold tracking-wide text-oro"
          >
            PRODE <span className="text-white">2026</span>
          </Link>
          <div className="hidden gap-4 text-sm sm:flex">
            <NavLink
              href="/"
              exact
              baseClassName="transition-colors"
              activeClassName="font-bold text-oro"
              inactiveClassName="text-suave hover:text-white"
            >
              {t('navFixture')}
            </NavLink>
            <NavLink
              href="/ranking"
              baseClassName="transition-colors"
              activeClassName="font-bold text-oro"
              inactiveClassName="text-suave hover:text-white"
            >
              {t('navRanking')}
            </NavLink>
            <NavLink
              href="/foro"
              baseClassName="transition-colors"
              activeClassName="font-bold text-oro"
              inactiveClassName="text-suave hover:text-white"
            >
              {t('navForum')}
              <ForumBadge />
            </NavLink>
          </div>
        </div>

        {/* Busqueda en desktop */}
        <div className="hidden w-full max-w-xs sm:block">
          <SearchBar />
        </div>

        {/* Acciones de usuario en desktop */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <LangSwitcher />
          {loading ? null : user ? (
            <>
              <Link
                href={`/perfil/${user.uid}`}
                className="flex items-center gap-2 hover:opacity-90"
              >
                <Avatar src={user.photoURL} name={user.displayName} />
                <span className="text-sm">{user.displayName}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="text-sm text-suave hover:text-white"
              >
                {t('signOut')}
              </button>
            </>
          ) : (
            <motion.button
              onClick={() => signIn()}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-md bg-oro px-4 py-2 text-sm font-semibold text-negro transition hover:bg-oro/90"
            >
              {t('signIn')}
            </motion.button>
          )}
        </div>

        {/* Lupa + hamburguesa en mobile */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
            aria-label={searchOpen ? t('closeSearch') : t('openSearch')}
            aria-expanded={searchOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </button>
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={menuOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Busqueda expandida en mobile */}
      {searchOpen && (
        <div className="border-t border-white/10 bg-negro px-4 py-3 sm:hidden">
          <SearchBar autoFocus />
        </div>
      )}

      {/* Panel desplegable mobile */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-negro px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1 text-sm">
            <NavLink
              href="/"
              exact
              onClick={closeMenu}
              baseClassName="rounded-md px-2 py-2 transition-colors"
              activeClassName="bg-oro/10 font-bold text-oro"
              inactiveClassName="text-suave hover:bg-white/5 hover:text-white"
            >
              {t('navFixture')}
            </NavLink>
            <NavLink
              href="/ranking"
              onClick={closeMenu}
              baseClassName="rounded-md px-2 py-2 transition-colors"
              activeClassName="bg-oro/10 font-bold text-oro"
              inactiveClassName="text-suave hover:bg-white/5 hover:text-white"
            >
              {t('navRanking')}
            </NavLink>
            <NavLink
              href="/foro"
              onClick={closeMenu}
              baseClassName="rounded-md px-2 py-2 transition-colors"
              activeClassName="bg-oro/10 font-bold text-oro"
              inactiveClassName="text-suave hover:bg-white/5 hover:text-white"
            >
              {t('navForum')}
              <ForumBadge />
            </NavLink>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <LangSwitcher />
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            {loading ? null : user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/perfil/${user.uid}`}
                  onClick={closeMenu}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar src={user.photoURL} name={user.displayName} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {user.displayName}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="text-sm text-suave hover:text-white"
                >
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <motion.button
                onClick={() => {
                  closeMenu();
                  signIn();
                }}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-md bg-oro px-4 py-2 text-sm font-semibold text-negro transition hover:bg-oro/90"
              >
                {t('signIn')}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
