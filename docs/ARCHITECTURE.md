<!-- @format -->

# ARCHITECTURE — PT-AI Learning Management System

## 1. Gambaran Umum

PT-AI LMS dibangun dengan **Next.js App Router** dan pola **server-first**:

```
Browser
    ↓
Next.js Server Components          (baca data, render awal)
    ↓
Server Actions / Route Handlers    (mutasi, endpoint khusus)
    ↓
Supabase client dengan user session (@supabase/ssr, cookie)
    ↓
PostgreSQL + Row Level Security    (perlindungan data terakhir)
```

Alur AI (server-only):

```
Browser
    ↓
Route Handler atau Server Action
    ↓
Server-only AI service
    ↓
AI provider adapter
    ↓
OpenAI API
    ↓
Schema validation (Zod)
    ↓
Audit log
    ↓
Feedback formatif ke mahasiswa
```

## 2. Aturan Arsitektur (LOCKED)

1. Server Component boleh membaca data langsung menggunakan server client.
2. Client Component tidak boleh menggunakan service role.
3. Client Component tidak boleh memanggil OpenAI.
4. Authorization diperiksa kembali pada server (Server Component, Server Action, Route Handler).
5. RLS tetap menjadi perlindungan data terakhir.
6. Data sensitif tidak dikirim ke browser tanpa kebutuhan.
7. Props Client Component seminimal mungkin.
8. Tidak mengirim seluruh profile/object database jika hanya perlu beberapa field.
9. Gunakan DTO atau mapper untuk data yang dikirim ke client.
10. Semua kode rahasia berada pada server-only module.

## 3. Rendering Strategy

- **Server Components (default):** semua layout, page, dan wrapper data.
- **Client Components (hanya bila perlu):** browser API, event handler, interactive state, drag-and-drop, rich text editor, modal interaktif, local form state, live client updates.
- **Server Actions:** seluruh mutasi dari UI (create/update/delete/publish/enroll/assessment/override/reflection) dengan validasi Zod di server.
- **Route Handlers:** AI streaming, integrasi eksternal, webhook, callback, file export, laporan CSV, upload khusus, health check.
- **Proxy (proxy.ts):** refresh cookie sesi Supabase, redirect awal, proteksi route ringan. **Bukan** authorization layer utama.

## 4. Struktur Supabase Client (Terencana)

| File                         | Peran                             | Batasan                                                                                                 |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/lib/supabase/client.ts` | createBrowserClient               | Hanya anon/publishable key; hanya bila Client Component memerlukan Supabase browser API                 |
| `src/lib/supabase/server.ts` | createServerClient                | Baca/tulis cookie; dipakai Server Component, Server Action, Route Handler                               |
| `src/lib/supabase/admin.ts`  | Service role client               | `import "server-only"`; hanya operasi administratif khusus; setiap operasi tercatat                     |
| `src/lib/supabase/types.ts`  | Generated database types          | Dihasilkan dari schema                                                                                  |
| `src/lib/supabase/auth.ts`   | Helper authorization              | getCurrentUser, requireUser, requireRole, requireClassAccess, requireLecturerAccess, requireAdminAccess |
| `src/proxy.ts`               | Session refresh + redirect ringan | Matcher tepat; mengecualikan asset statis                                                               |

Catatan: `getSession` saja tidak cukup untuk keputusan authorization — gunakan mekanisme validasi user sesuai Supabase SSR.

## 5. Proposed Folder Tree (Target Penuh)

Struktur di bawah adalah target akhir; dibangun bertahap sesuai fase. PHASE 1 hanya membuat fondasi minimum.

```
PT-AI/
├── docs/
│   ├── DECISIONS.md
│   ├── MASTER_PLAN.md
│   ├── PROGRESS.md
│   ├── CHANGELOG.md          (mulai PHASE 1)
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md           (mulai PHASE 4)
│   ├── SECURITY.md           (mulai PHASE 1)
│   ├── DESIGN_SYSTEM.md      (mulai PHASE 2)
│   ├── TESTING.md            (mulai PHASE 1)
│   ├── ENVIRONMENT.md
│   └── ROUTES.md             (mulai PHASE 1)
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   │
│   │   ├── (public)/
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (protected)/
│   │   │   └── app/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── student/
│   │   │       │   ├── dashboard/{page,loading,error}.tsx
│   │   │       │   ├── classes/page.tsx
│   │   │       │   ├── classes/[classId]/page.tsx
│   │   │       │   ├── learn/[unitId]/page.tsx
│   │   │       │   ├── learn/[unitId]/stage/[stageKey]/page.tsx
│   │   │       │   ├── sources/[sourceId]/page.tsx
│   │   │       │   ├── revisions/[activityId]/page.tsx
│   │   │       │   ├── progress/page.tsx
│   │   │       │   └── reflections/page.tsx
│   │   │       ├── lecturer/
│   │   │       │   ├── dashboard/page.tsx
│   │   │       │   ├── classes/page.tsx
│   │   │       │   ├── classes/[classId]/page.tsx
│   │   │       │   ├── classes/[classId]/builder/page.tsx
│   │   │       │   ├── classes/[classId]/students/page.tsx
│   │   │       │   ├── review/page.tsx
│   │   │       │   ├── analytics/page.tsx
│   │   │       │   ├── incidents/page.tsx
│   │   │       │   ├── rubrics/page.tsx
│   │   │       │   └── sources/page.tsx
│   │   │       └── admin/
│   │   │           ├── dashboard/page.tsx
│   │   │           ├── users/page.tsx
│   │   │           ├── organizations/page.tsx
│   │   │           ├── academic-periods/page.tsx
│   │   │           ├── courses/page.tsx
│   │   │           ├── classes/page.tsx
│   │   │           ├── audit/page.tsx
│   │   │           └── settings/page.tsx
│   │   │
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── feedback/route.ts
│   │       │   ├── hint/route.ts
│   │       │   ├── counter-argument/route.ts
│   │       │   └── report/route.ts
│   │       ├── exports/research/route.ts
│   │       └── health/route.ts
│   │
│   ├── actions/
│   │   ├── auth/
│   │   ├── academics/
│   │   ├── courses/
│   │   ├── learning/
│   │   ├── assessment/
│   │   └── administration/
│   │
│   ├── components/
│   │   ├── ui/          (shadcn/ui terkustomisasi)
│   │   ├── shared/      (states, badge, dsb.)
│   │   └── layout/      (AppShell, Sidebar, Topbar, dsb.)
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── academics/
│   │   ├── courses/
│   │   ├── course-builder/
│   │   ├── learning-workspace/
│   │   ├── attempts/
│   │   ├── ai-coach/
│   │   ├── sources/
│   │   ├── verification/
│   │   ├── mastery/
│   │   ├── branching/
│   │   ├── revisions/
│   │   ├── reflections/
│   │   ├── assessment/
│   │   ├── analytics/
│   │   ├── incidents/
│   │   └── administration/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── admin.ts      (server-only)
│   │   │   ├── auth.ts
│   │   │   └── types.ts
│   │   ├── validation/
│   │   ├── permissions/
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── dates/
│   │   └── constants/
│   │
│   ├── server/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── ai/
│   │   │   ├── providers/
│   │   │   ├── prompts/
│   │   │   ├── schemas/
│   │   │   └── safety/
│   │   ├── audit/
│   │   ├── storage/
│   │   └── analytics/
│   │
│   ├── stores/          (Zustand — UI state lintas komponen saja)
│   ├── styles/
│   ├── types/
│   ├── test/
│   ├── mocks/           (mock data berlabel MOCK)
│   └── proxy.ts
│
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── tests/
│
├── e2e/                 (Playwright)
├── .env.example
├── next.config.ts
├── tsconfig.json
├── package.json
└── ...
```

## 6. Aturan Struktur Source Code

1. Jangan mengakses database secara acak dari semua komponen — gunakan server repository/service yang tipis dan konsisten.
2. Business rule harus dapat diuji.
3. Jangan membuat abstraction tanpa kebutuhan.
4. Hindari circular dependency.
5. Jangan membuat file sangat besar.
6. Jangan menggunakan barrel export berlebihan.
7. Tandai server-only modules dengan `import "server-only"`.
8. Jangan mengimpor server-only module ke Client Component.
9. Mock data harus diberi label MOCK dan tidak masuk fitur final.

## 7. Error Handling (Terencana)

Error domain: ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, RateLimitError, StorageError, AIProviderError, DatabaseError, UnexpectedError.

Disediakan: app-level `error.tsx`, route-level `error.tsx`, `not-found.tsx`, form errors, Server Action result type, Route Handler error response schema, retry aman, toast terbatas, audit untuk error sensitif.

Tidak boleh ditampilkan ke pengguna: raw database error, service role, SQL, internal path, stack trace, raw AI provider response sensitif.

## 8. AI Server Architecture (Terencana — PHASE 10)

```typescript
interface AIProvider {
  generateGuidingQuestions(
    input: GuidingQuestionInput,
  ): Promise<GuidingQuestionOutput>;
  evaluateWithRubric(input: RubricFeedbackInput): Promise<RubricFeedbackOutput>;
  generateHint(input: HintInput): Promise<HintOutput>;
  generateCounterArgument(
    input: CounterArgumentInput,
  ): Promise<CounterArgumentOutput>;
  classifyReasoningError(
    input: ErrorClassificationInput,
  ): Promise<ErrorClassificationOutput>;
  recommendLearningPath(input: LearningPathInput): Promise<LearningPathOutput>;
}
```

Semua input/output divalidasi Zod. Pre-call guard: autentikasi, akses kelas, attempt tersimpan, activity mengizinkan fungsi AI, source scope, rate limit, minimalisasi data pribadi, pencatatan purpose. Post-call guard: validasi structured output, safety boundary, non-answering enforcement, audit, citation, limitation notice, aksi Accept/Ignore/Report.
