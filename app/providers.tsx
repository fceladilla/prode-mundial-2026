'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider } from '@/hooks/useLanguage';
import { UnreadCommentsProvider } from '@/hooks/useUnreadComments';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UnreadCommentsProvider>{children}</UnreadCommentsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
