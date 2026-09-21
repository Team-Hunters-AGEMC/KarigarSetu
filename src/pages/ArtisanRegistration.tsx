import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Image, LogIn, ShieldCheck, Video } from 'lucide-react';
import { setCurrentArtisan } from '../data/seedData';
import { ArtisanProfile, CraftCategory } from '../types';

const API = '';
const field = 'w-full rounded-xl border border-[#cfe0d5] px-4 py-3 text-sm outline-none focus:border-[#0c5b3b]';

export const ArtisanRegistration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryMode = new URLSearchParams(location.search).get('mode');
  const [mode, setMode] = useState<'register' | 'login'>(
    queryMode === 'login' || location.state?.from ? 'login' : 'register'
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(
    location.state?.message ? { text: location.state.message, ok: false } : null
  );
  const [files, setFiles] = useState<{ one?: File; two?: File; video?: File }>({});
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', password: '', language: 'Bengali', craftType: 'Pottery' as CraftCategory, location: '', experience: '1' });
  const [login, setLogin] = useState({ phone: '', password: '' });

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!files.one || !files.two || !files.video) return setNotice({ text: 'দুটি ছবি ও একটি ভিডিও অবশ্যই দিতে হবে।', ok: false });
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, String(v)));
    data.append('proofImage1', files.one);
    data.append('proofImage2', files.two);
    data.append('proofVideo', files.video);
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/artisans`, { method: 'POST', body: data, credentials: 'include' });
      const d = await r.json();
      setNotice({ text: d.message, ok: r.ok });
    } catch {
      setNotice({ text: 'Backend-এর সঙ্গে সংযোগ করা যায়নি।', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/api/artisans/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(login) });
      const d = await r.json();
      if (!r.ok) return setNotice({ text: d.message, ok: false });
      setCurrentArtisan(d.artisan as ArtisanProfile);
      const returnTo = location.state?.from;
      navigate(typeof returnTo === 'string' && returnTo.startsWith('/artisan/') && returnTo !== '/artisan/register'
        ? returnTo : '/artisan/dashboard', { replace: true });
    } catch {
      setNotice({ text: 'Backend-এর সঙ্গে সংযোগ করা যায়নি।', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const pick = (label: string, kind: 'one' | 'two' | 'video', video = false) => (
    <label className="cursor-pointer rounded-xl border-2 border-dashed border-[#b8d6c3] p-4 text-center text-xs font-bold text-[#0c4b31]">
      {video ? <Video className="mx-auto mb-2" /> : <Image className="mx-auto mb-2" />}
      {label}
      <input hidden required type="file" accept={video ? 'video/mp4,video/webm,video/quicktime' : 'image/*'} onChange={e => setFiles({ ...files, [kind]: e.target.files?.[0] })} />
      <span className="mt-2 block truncate font-normal text-gray-500">{files[kind]?.name || 'Choose file'}</span>
    </label>
  );

  return <main className="min-h-screen bg-[#fbf9f5] px-4 py-8"><div className="mx-auto max-w-5xl">
    <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#0c4b31]"><ArrowLeft size={17} /> Home</Link>
    <div className="grid overflow-hidden rounded-3xl border bg-white shadow-xl lg:grid-cols-[.8fr_1.2fr]">
      <section className="bg-[#083d29] p-8 text-white"><ShieldCheck className="mb-5 text-emerald-300" size={38} /><h1 className="text-3xl font-black">Verified Artisan Access</h1><p className="mt-3 text-sm text-emerald-100">প্রতিটি নতুন Artisan-কে Admin যাচাই করবেন।</p><div className="mt-8 space-y-4 text-sm"><p className="flex gap-3"><Image size={19} />২টি কাজের ছবি ও ১টি কাজ করার ভিডিও দিন।</p><p className="flex gap-3"><Clock size={19} />Pending অবস্থায় login ও product upload বন্ধ থাকবে।</p><p className="flex gap-3"><CheckCircle2 size={19} />Admin approve করলে account চালু হবে।</p></div></section>
      <section className="p-6 sm:p-9"><div className="mb-6 grid grid-cols-2 rounded-xl bg-[#edf6f0] p-1"><button onClick={() => setMode('register')} className={`rounded-lg py-3 text-sm font-bold ${mode === 'register' ? 'bg-white shadow' : ''}`}>New Application</button><button onClick={() => setMode('login')} className={`rounded-lg py-3 text-sm font-bold ${mode === 'login' ? 'bg-white shadow' : ''}`}>Approved Login</button></div>
      {notice && <div className={`mb-4 rounded-xl border p-4 text-sm font-semibold ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</div>}
      {mode === 'register' ? <form onSubmit={apply} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
        <input className={field} required placeholder="পুরো নাম" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><input className={field} required pattern="[0-9]{10}" placeholder="১০ সংখ্যার Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
        <input className={field} required type="email" placeholder="Gmail / Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><input className={field} required type="password" minLength={8} placeholder="Password (কমপক্ষে ৮ অক্ষর)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <input className={field} required placeholder="গ্রাম/শহর, জেলা" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /><input className={field} required type="number" min="0" placeholder="অভিজ্ঞতা" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
        <select className={field} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}><option>Bengali</option><option>Hindi</option><option>English</option></select><select className={field} value={form.craftType} onChange={e => setForm({ ...form, craftType: e.target.value as CraftCategory })}>{['Pottery', 'Handloom', 'Jewellery', 'Painting', 'Woodcraft', 'Metalcraft', 'Other'].map(x => <option key={x}>{x}</option>)}</select>
      </div><textarea className={field} required rows={2} placeholder="সম্পূর্ণ ঠিকানা" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /><div className="grid gap-3 sm:grid-cols-3">{pick('কাজের ছবি ১', 'one')}{pick('কাজের ছবি ২', 'two')}{pick('কাজ করার ভিডিও', 'video', true)}</div><button disabled={busy} className="w-full rounded-xl bg-[#0c5b3b] py-4 font-extrabold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Send Application to Admin'}</button></form>
      : <form onSubmit={signIn} className="space-y-4"><div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">শুধু Admin-approved Artisan login করতে পারবেন।</div><input className={field} required pattern="[0-9]{10}" placeholder="Phone number" value={login.phone} onChange={e => setLogin({ ...login, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /><input className={field} required type="password" placeholder="Password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c5b3b] py-4 font-extrabold text-white"><LogIn size={18} />{busy ? 'Checking…' : 'Login to Artisan Studio'}</button></form>}
      </section></div></div></main>;
};
