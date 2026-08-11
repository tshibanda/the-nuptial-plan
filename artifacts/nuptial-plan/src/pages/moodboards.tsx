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

type Board = { id: string; title: string; description: string; imageUrl: string; sourceUrl?: string; accent: string };
const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url('Ajoutez une URL d’image valide').or(z.literal('')),
  sourceUrl: z.string().url('Ajoutez un lien Pinterest ou Instagram valide').or(z.literal('')),
  accent: z.string(),
});
type FormData = z.infer<typeof schema>;
const key = 'tnp-moodboards';
function linkPreviewUrl(url: string) {
  return `https://image.thum.io/get/width/1200/crop/800/noanimate/${url}`;
}

export default function Moodboards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [open, setOpen] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { title: '', description: '', imageUrl: '', sourceUrl: '', accent: '#C8A96E' } });
  useEffect(() => { try { setBoards(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setBoards([]); } }, []);
  const save = (data: FormData) => {
    const imageUrl = data.imageUrl || (data.sourceUrl ? linkPreviewUrl(data.sourceUrl) : '');
    if (!imageUrl) {
      form.setError('imageUrl', { message: 'Ajoutez une image ou un lien Pinterest/Instagram' });
      return;
    }
    const next: Board[] = [...boards, { ...data, imageUrl, description: data.description ?? '', id: `${Date.now()}` }];
    setBoards(next); localStorage.setItem(key, JSON.stringify(next)); form.reset(); setOpen(false);
  };
  const remove = (id: string) => { const next = boards.filter((board) => board.id !== id); setBoards(next); localStorage.setItem(key, JSON.stringify(next)); };
  return <div>
    <PageTour tourKey="moodboards" pageTitle="Moodboards" pageIcon={Palette} steps={[{ icon: Palette, title: 'Donnez une direction', body: 'Rassemblez les images, couleurs et intentions qui guideront chaque mariage.' }]} />
    <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow mb-2 text-[#a8893e]">Inspiration visuelle</p><h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Moodboards</h1><p className="mt-3 max-w-xl text-[11px] leading-relaxed text-muted-foreground">Créez des univers visuels réutilisables pour vos propositions, rendez-vous clients et mariages.</p></div><Button onClick={() => setOpen(true)} className="gap-2 text-[10px] uppercase tracking-[0.12em]"><Plus size={14} /> Nouveau moodboard</Button></div>
    </div>
     {boards.length === 0 ? <div className="card-depth flex flex-col items-center py-16 text-center"><ImagePlus size={30} className="mb-4 text-primary/35" /><p className="font-serif text-2xl">Votre galerie est prête</p><p className="mt-2 max-w-sm text-[11px] text-muted-foreground">Ajoutez une première inspiration avec une URL d’image ou un lien Pinterest/Instagram.</p></div> :
       <div className="grid gap-5 pb-24 md:grid-cols-2 xl:grid-cols-3">{boards.map((board) => <article key={board.id} className="card-depth overflow-hidden"><div className="relative aspect-[4/3] overflow-hidden bg-muted">{board.imageUrl ? <img src={board.imageUrl} alt={board.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${board.accent}55, #f8f3ee)` }}><Palette size={42} className="text-white/80" /></div>}</div><div className="p-5"><div className="flex justify-between gap-3"><h2 className="font-serif text-2xl">{board.title}</h2><button onClick={() => remove(board.id)} className="text-destructive/65 hover:text-destructive" aria-label="Supprimer"><Trash2 size={15} /></button></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{board.description || 'Aucune note pour le moment.'}</p>{board.sourceUrl && <a href={board.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block truncate text-[10px] text-primary underline underline-offset-2">Ouvrir l’inspiration originale</a>}</div></article>)}</div>}
     <Sheet open={open} onOpenChange={setOpen}><SheetContent><SheetHeader><SheetTitle className="font-serif text-2xl">Nouveau moodboard</SheetTitle><SheetDescription>Créez une référence visuelle pour votre activité.</SheetDescription></SheetHeader><Form {...form}><form onSubmit={form.handleSubmit(save)} className="mt-6 space-y-4">
      <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} placeholder="Romantique botanique" /></FormControl></FormItem>} />
      <FormField control={form.control} name="imageUrl" render={({ field }) => <FormItem><FormLabel>URL de l’image</FormLabel><FormControl><Input {...field} placeholder="https://…" /></FormControl></FormItem>} />
       <FormField control={form.control} name="sourceUrl" render={({ field }) => <FormItem><FormLabel>Lien Pinterest ou Instagram</FormLabel><FormControl><Input {...field} placeholder="https://pinterest.com/... ou https://instagram.com/..." /></FormControl></FormItem>} />
      <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Intention</FormLabel><FormControl><Textarea {...field} placeholder="Textures, lumière, palette, émotion…" /></FormControl></FormItem>} />
      <Button type="submit" className="w-full">Enregistrer le moodboard</Button>
    </form></Form></SheetContent></Sheet>
  </div>;
}