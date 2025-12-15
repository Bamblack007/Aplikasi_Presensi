Deployment guide — Vercel + Supabase (recommended)

1) Why Supabase?
- SQLite is not suitable for Vercel serverless deployments. Use Postgres (Supabase/Neon/PlanetScale).

2) Create a Supabase project
- Go to https://app.supabase.com and create a new project.
- Note the `DATABASE_URL` (connection string) and `SHADOW_DATABASE_URL` (can be another DB for migrations or same with caution).

3) Update `prisma/schema.prisma`
- Change `datasource db` provider from `sqlite` to `postgresql` and set `url = env("DATABASE_URL")`.
- Example:

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

4) Locally: set `.env` with Supabase connection and other vars

  DATABASE_URL="postgresql://..."
  SHADOW_DATABASE_URL="postgresql://..."
  NEXTAUTH_URL="http://localhost:3000"
  JWT_SECRET="a-very-secure-random-string"

5) Run migrations and seed locally

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

6) Push code to GitHub
- Initialize git, commit, push to a repo.

```bash
git init
git add .
git commit -m "Initial app"
git branch -M main
# create remote and push
```

7) Deploy with Vercel
- Option A (recommended): Connect GitHub repo to Vercel via https://vercel.com/new — Vercel will build automatically.
- Option B: Use Vercel CLI:

```bash
npm i -g vercel
vercel login
vercel --prod
```

8) Set Vercel Environment Variables
- In Vercel dashboard > Project > Settings > Environment Variables, add:
  - `DATABASE_URL` = your Supabase DB URL
  - `SHADOW_DATABASE_URL` = (for prisma migrate) if used
  - `NEXTAUTH_URL` = `https://your-app.vercel.app`
  - `JWT_SECRET` = same as used locally

9) Run migrations on Vercel (if using migrations)
- Use Vercel CLI or CI step to run `npx prisma migrate deploy` during build OR run migrations from CI.

10) Notes
- Keep secrets out of repo. Do not commit `.env`.
- After deploy, run `node prisma/seed.js` once (via protections) or include seed as one-off job.

If you want, saya bisa:
- A: Bantuan otomatisasi: saya dapat membuat a GitHub repo (lokal -> remote) and attempt `vercel` deploy from this machine (but membutuhkan Vercel login and GitHub remote credentials).
- B: Hanya kirimkan langkah yang perlu Anda jalankan (manual).

Pilih A atau B.

Automated helper scripts
------------------------

Saya menambahkan dua skrip PowerShell di `scripts/` untuk membantu otomatisasi:

- `scripts/prepare-git-and-github.ps1` — menginisialisasi `git`, commit, dan (jika tersedia) membuat repo GitHub via `gh` lalu push.
- `scripts/deploy-vercel.ps1` — melakukan `vercel login` lalu `vercel --prod` untuk deploy interaktif.

Cara pakai (PowerShell):

```powershell
# 1) Inisialisasi repo & push ke GitHub (gunakan gh CLI untuk otomatis)
.\scripts\prepare-git-and-github.ps1 -RepoName "aplikasi-presensi"

# 2) Setelah repo ada dan environment variables diset di Vercel, deploy:
.\scripts\deploy-vercel.ps1
```

Catatan:
- Pastikan `gh` (GitHub CLI) terinstall dan Anda sudah `gh auth login` agar pembuatan repo otomatis bekerja.
- Pastikan `vercel` CLI terinstall dan Anda sudah `vercel login` sebelum `deploy-vercel.ps1`.
- Saya tidak dapat melakukan login ke akun Anda dari sini; jalankan skrip di mesin Anda atau berikan akses yang aman jika ingin saya bantu penuh.