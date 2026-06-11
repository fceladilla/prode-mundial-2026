'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './Avatar';
import { SearchBar } from './SearchBar';

export function Navbar() {
  const { user, loading, signIn, logout } = useAuth();
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
          <div className="hidden gap-4 text-sm text-suave sm:flex">
            <Link href="/" className="hover:text-white">
              Fixture
            </Link>
            <Link href="/ranking" className="hover:text-white">
              Ranking
            </Link>
            <Link href="/foro" className="hover:text-white">
              Foro
            </Link>
          </div>
        </div>

        {/* Busqueda en desktop */}
        <div className="hidden w-full max-w-xs sm:block">
          <SearchBar />
        </div>

        {/* Acciones de usuario en desktop */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
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
                Salir
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn()}
              className="rounded-md bg-oro px-4 py-2 text-sm font-semibold text-negro transition hover:bg-oro/90"
            >
              Ingresar con Google
            </button>
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
            aria-label={searchOpen ? 'Cerrar busqueda' : 'Abrir busqueda'}
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
            aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
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
            <Link
              href="/"
              onClick={closeMenu}
              className="rounded-md px-2 py-2 text-suave hover:bg-white/5 hover:text-white"
            >
              Fixture
            </Link>
            <Link
              href="/ranking"
              onClick={closeMenu}
              className="rounded-md px-2 py-2 text-suave hover:bg-white/5 hover:text-white"
            >
              Ranking
            </Link>
            <Link
              href="/foro"
              onClick={closeMenu}
              className="rounded-md px-2 py-2 text-suave hover:bg-white/5 hover:text-white"
            >
              Foro
            </Link>
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
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  closeMenu();
                  signIn();
                }}
                className="w-full rounded-md bg-oro px-4 py-2 text-sm font-semibold text-negro transition hover:bg-oro/90"
              >
                Ingresar con Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
