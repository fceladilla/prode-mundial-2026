'use client';

import { CommentSection } from '@/components/CommentSection';

export default function ForoPage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Foro</h1>
      <p className="mb-6 text-sm text-suave">
        Charla general del prode. Para comentar un partido puntual, abri los
        comentarios desde su tarjeta en el fixture.
      </p>
      <CommentSection />
    </div>
  );
}
