import React, { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';

interface LoginProps {
  sessionError?: string | null;
}

export const Login: React.FC<LoginProps> = ({ sessionError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      setError('Supabase belum dikonfigurasi. Hubungkan URL project dan publishable/anon key melalui Pengaturan atau environment aplikasi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(`Login gagal: ${signInError.message}`);
        return;
      }
      setPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? `Login gagal: ${loginError.message}` : 'Login gagal karena kesalahan yang tidak diketahui.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D71920] text-white">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900">MyPrintin Admin</h1>
            <p className="text-sm text-neutral-500">Masuk dengan akun Supabase Auth</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-neutral-700">
            Email
            <input autoComplete="username" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none focus:border-[#D71920] focus:ring-2 focus:ring-red-100" placeholder="nama@perusahaan.com" />
          </label>

          <label className="block text-sm font-semibold text-neutral-700">
            Password
            <span className="relative mt-1.5 block">
              <input autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-neutral-300 px-3.5 py-3 pr-12 text-sm outline-none focus:border-[#D71920] focus:ring-2 focus:ring-red-100" placeholder="Password akun" />
              <button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-900">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {(error || sessionError) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error || sessionError}</p>}

          <button type="submit" disabled={isSubmitting || !isSupabaseConfigured()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D71920] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b8141a] disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {isSubmitting ? 'Memeriksa akun...' : 'Login'}
          </button>
          {!isSupabaseConfigured() && <p className="text-xs leading-relaxed text-amber-800">Supabase belum terhubung. Atur URL project dan publishable/anon key sebelum login.</p>}
        </form>

        <p className="mt-6 border-t border-neutral-100 pt-4 text-xs leading-relaxed text-neutral-500">
          Role pengelola data master diperiksa dari klaim server-managed <code>app_metadata.role</code>. Login saja tidak otomatis memberikan akses pengelolaan.
        </p>
      </section>
    </main>
  );
};
