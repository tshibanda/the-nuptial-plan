import { useEffect, useState } from 'react';
import { Check, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LegalFooter } from '@/components/legal-footer';

type RsvpData = {
  guest: { id: number; name: string; rsvpStatus: string };
  wedding: { names: string; weddingDate: string; venue: string };
};

export default function PublicRsvp() {
  const token = window.location.pathname.split('/').pop() ?? '';
  const [data, setData] = useState<RsvpData | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/rsvp/${encodeURIComponent(token)}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('invalid')))
      .then(setData)
      .catch(() => setError('Ce lien RSVP est invalide ou a expiré.'))
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (rsvpStatus: 'confirmed' | 'declined') => {
    setSaving(true);
    try {
      const response = await fetch(`/api/public/rsvp/${encodeURIComponent(token)}/respond`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rsvpStatus }),
      });
      if (!response.ok) throw new Error('save');
      const result = await response.json();
      setData((current) => current ? { ...current, guest: result.guest } : current);
      setAnswer(rsvpStatus);
    } catch {
      setError('Votre réponse n’a pas pu être enregistrée. Réessayez.');
    } finally { setSaving(false); }
  };

  if (loading) return <RsvpFrame><p className="text-sm text-[#716471]">Préparation de votre réponse…</p></RsvpFrame>;
  if (error || !data) return <RsvpFrame><p className="text-sm text-[#8c3f3f]">{error}</p></RsvpFrame>;

  const answered = answer ?? (data.guest.rsvpStatus === 'confirmed' || data.guest.rsvpStatus === 'declined' ? data.guest.rsvpStatus : null);
  return (
    <RsvpFrame>
      <Heart className="mx-auto mb-5 fill-[#C8A96E] text-[#C8A96E]" size={27} />
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#A8893E]">Invitation</p>
      <h1 className="font-serif text-4xl text-[#3C1A3C]">{data.wedding.names}</h1>
      <p className="mt-4 text-base text-[#5c5260]">Bonjour {data.guest.name},</p>
      <p className="mt-2 text-sm leading-6 text-[#716471]">Nous serions ravis de savoir si vous pourrez partager ce moment avec nous.</p>
      <div className="my-7 rounded-2xl bg-white/70 px-5 py-4 text-sm text-[#5c5260]">
        <p className="font-semibold">{new Date(data.wedding.weddingDate).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>
        <p className="mt-1 text-[#85808a]">{data.wedding.venue}</p>
      </div>
      {answered ? (
        <div className="rounded-2xl border border-[#D7CDD7] bg-white/70 p-5">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F0E5] text-[#507653]">
            {answered === 'confirmed' ? <Check size={20} /> : <X size={20} />}
          </div>
          <p className="font-serif text-xl text-[#3C1A3C]">{answered === 'confirmed' ? 'Présence confirmée' : 'Réponse enregistrée'}</p>
          <p className="mt-2 text-xs text-[#716471]">Merci pour votre réponse.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button disabled={saving} onClick={() => respond('confirmed')} className="h-12 bg-[#5D2D5D] text-xs uppercase tracking-[0.12em] hover:bg-[#3C1A3C]"><Check size={15} /> Oui, je serai présent(e)</Button>
          <Button disabled={saving} onClick={() => respond('declined')} variant="outline" className="h-12 border-[#D7CDD7] text-xs uppercase tracking-[0.12em] text-[#5D2D5D]"><X size={15} /> Non, avec regret</Button>
        </div>
      )}
      <p className="mt-9 text-[10px] uppercase tracking-[0.15em] text-[#A89DAA]">The Nuptial Plan</p>
    </RsvpFrame>
  );
}

function RsvpFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8F3EE] px-5 py-10 pb-20 text-center">
      <div className="w-full max-w-xl rounded-[28px] border border-[#E5DDE5] bg-[#FDF9FD] px-6 py-10 shadow-[0_18px_60px_rgba(93,45,93,0.12)] sm:px-12">
        {children}
      </div>
      <LegalFooter className="absolute bottom-6 left-4 right-4" />
    </main>
  );
}