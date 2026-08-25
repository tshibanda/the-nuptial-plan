import { useEffect, useState } from 'react';
import { ImagePlus, Palette, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageTour } from '@/components/ui/page-tour';
import { PremiumBadge } from '@/components/premium-badge';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';
import { useLanguage } from '@/lib/i18n';

type Board = { id: string; title: string; description: string; imageUrl: string; sourceUrl?: string; accent: string };
type FormData = { title: string; description?: string; imageUrl: string; sourceUrl: string; accent: string };
const key = 'tnp-moodboards';
function linkPreviewUrl(url: string) {
  return `https://image.thum.io/get/width/1200/crop/800/noanimate/${url}`;
}

export default function Moodboards() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const text = (french: string, english: string) => fr ? french : english;
  const schema = z.object({
    title: z.string().min(1, text('Le nom est requis', 'A name is required')),
    description: z.string().optional(),
    imageUrl: z.string().url(text('Ajoutez une URL d’image valide', 'Enter a valid image URL')).or(z.literal('')),
    sourceUrl: z.string().url(text('Ajoutez un lien Pinterest, Instagram ou Canva valide', 'Enter a valid Pinterest, Instagram, or Canva link')).or(z.literal('')),
    accent: z.string(),
  });
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const [boards, setBoards] = useState<Board[]>([]);
  const [open, setOpen] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { title: '', description: '', imageUrl: '', sourceUrl: '', accent: '#C8A96E' } });
  const watchedImageUrl = form.watch('imageUrl');
  const watchedSourceUrl = form.watch('sourceUrl');
  useEffect(() => { try { setBoards(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setBoards([]); } }, []);
  const save = (data: FormData) => {
    const imageUrl = data.imageUrl || (data.sourceUrl ? linkPreviewUrl(data.sourceUrl) : '');
    if (!imageUrl) {
      form.setError('imageUrl', { message: text('Ajoutez une image ou un lien Pinterest, Instagram ou Canva', 'Add an image or a Pinterest, Instagram, or Canva link') });
      return;
    }
    const next: Board[] = [...boards, { ...data, imageUrl, description: data.description ?? '', id: `${Date.now()}` }];
    setBoards(next); localStorage.setItem(key, JSON.stringify(next)); form.reset(); setOpen(false);
  };
  const remove = (id: string) => { const next = boards.filter((board) => board.id !== id); setBoards(next); localStorage.setItem(key, JSON.stringify(next)); };
  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel={text('vos moodboards et inspirations', 'your moodboards and inspiration')} />;
  return <div>
    <PageTour tourKey="moodboards" pageTitle="Moodboards" pageIcon={Palette} steps={[{ icon: Palette, title: text('Donnez une direction', 'Set the direction'), body: text('Rassemblez les images, couleurs et intentions qui guideront chaque mariage.', 'Gather the images, colours, and intentions that will guide every wedding.') }]} />
    <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60">
       <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow mb-2 text-[#a8893e]">{text('Inspiration visuelle', 'Visual inspiration')}</p><div className="flex items-center gap-3"><h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Moodboards</h1><PremiumBadge /></div><p className="mt-3 max-w-xl text-[11px] leading-relaxed text-muted-foreground">{text('Créez des univers visuels réutilisables pour vos propositions, rendez-vous clients et mariages.', 'Create reusable visual worlds for your proposals, client meetings, and weddings.')}</p></div><Button onClick={() => setOpen(true)} className="gap-2 text-[10px] uppercase tracking-[0.12em]"><Plus size={14} /> {text('Nouveau moodboard', 'New moodboard')}</Button></div>
    </div>
       {boards.length === 0 ? <div className="card-depth flex flex-col items-center py-16 text-center"><ImagePlus size={30} className="mb-4 text-primary/35" /><p className="font-serif text-2xl">{text('Votre galerie est prête', 'Your gallery is ready')}</p><p className="mt-2 max-w-sm text-[11px] text-muted-foreground">{text('Ajoutez une première inspiration avec une URL d’image ou un lien Pinterest, Instagram ou Canva.', 'Add your first inspiration with an image URL or Pinterest, Instagram, or Canva link.')}</p></div> :
       <div className="grid gap-5 pb-24 md:grid-cols-2 xl:grid-cols-3">{boards.map((board) => <article key={board.id} className="card-depth overflow-hidden"><div className="relative aspect-[4/3] overflow-hidden bg-muted">{board.imageUrl ? <img src={board.imageUrl} alt={board.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${board.accent}55, #f8f3ee)` }}><Palette size={42} className="text-white/80" /></div>}</div><div className="p-5"><div className="flex justify-between gap-3"><h2 className="font-serif text-2xl">{board.title}</h2><button onClick={() => remove(board.id)} className="text-destructive/65 hover:text-destructive" aria-label={text('Supprimer', 'Delete')}><Trash2 size={15} /></button></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{board.description || text('Aucune note pour le moment.', 'No notes yet.')}</p>{board.sourceUrl && <a href={board.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-[10px] text-primary underline underline-offset-2">{text('Ouvrir l’inspiration originale', 'Open the original inspiration')}</a>}</div></article>)}</div>}
     <Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle className="font-serif text-2xl">{text('Nouveau moodboard', 'New moodboard')}</SheetTitle><SheetDescription>{text('Créez une référence visuelle pour votre activité.', 'Create a visual reference for your business.')}</SheetDescription></SheetHeader><Form {...form}><form onSubmit={form.handleSubmit(save)} className="mt-6 space-y-4">
      <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>{text('Nom', 'Name')}</FormLabel><FormControl><Input {...field} placeholder={text('Romantique botanique', 'Botanical romance')} /></FormControl></FormItem>} />
      <FormField control={form.control} name="imageUrl" render={({ field }) => <FormItem><FormLabel>{text('URL de l’image', 'Image URL')}</FormLabel><FormControl><Input {...field} placeholder="https://…" /></FormControl></FormItem>} />
         <FormField control={form.control} name="sourceUrl" render={({ field }) => <FormItem><FormLabel>{text('Lien Pinterest, Instagram ou Canva', 'Pinterest, Instagram, or Canva link')}</FormLabel><FormControl><Input {...field} placeholder="https://pinterest.com/..., https://instagram.com/... or https://canva.com/..." /></FormControl>{watchedSourceUrl && !watchedImageUrl ? <div className="overflow-hidden rounded-lg border border-border bg-muted"><img src={linkPreviewUrl(watchedSourceUrl)} alt={text('Aperçu du lien', 'Link preview')} className="h-40 w-full object-cover" /><p className="px-3 py-2 text-[10px] text-muted-foreground">{text('L’aperçu du lien sera utilisé automatiquement comme image du moodboard.', 'The link preview will automatically be used as the moodboard image.')}</p></div> : null}</FormItem>} />
      <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>{text('Intention', 'Intent')}</FormLabel><FormControl><Textarea {...field} placeholder={text('Textures, lumière, palette, émotion…', 'Textures, light, palette, emotion…')} /></FormControl></FormItem>} />
      <Button type="submit" className="w-full">{text('Enregistrer le moodboard', 'Save moodboard')}</Button>
    </form></Form></SheetContent></Sheet>
  </div>;
}