# یادبود دیجیتال (Memorial)

وب‌سایت ایستای روایت زندگی افراد، ساخته‌شده با Astro 7 + TypeScript، فارسی و راست‌به‌چپ. صفحهٔ اسکرولی روایت دو زبانه است (فارسی و انگلیسی). اهداف و دامنه در [PROJECT.md](PROJECT.md)، وضعیت واقعی در [ROADMAP.md](ROADMAP.md).

## پیش‌نیازها

Node.js 22 یا جدیدتر (آزموده‌شده با 22.22) و npm. Git برای انتشار.

## نصب

```bash
npm install
```

## توسعهٔ محلی

```bash
npm run dev        # http://localhost:4321
```

## ساخت و پیش‌نمایش

```bash
npm run build      # خروجی در dist/
npm run preview    # پیش‌نمایش خروجی ساخته‌شده
```

## آزمون‌ها

```bash
npm run validate     # اعتبارسنجی محتوا (تاریخ‌ها، مسیر تصویر، alt، منبع، ویدیو، خاطرهٔ تأییدنشده)
npm run check        # astro check (TypeScript)
npm run check:links  # لینک‌های داخلی و #anchorها در dist/ (پس از build)
npm test             # همهٔ موارد بالا به‌ترتیب
npm run slots        # راهنمای HTML اسلات تصاویر → docs/image-slots/
npm run memories     # ورود خاطره از CSV شیت (docs/memory-workflow.md)
```

اگر با `BASE_PATH` ساخته‌اید، همان را به `check:links` بدهید: `BASE_PATH=/repo npm run check:links`.

در هنگام ساخت ممکن است هشدار «collection "gallery"/"videos"/"memories" does not exist or is empty» ببینید؛ تا وقتی محتوایی ندارند بی‌ضرر است.

## استقرار روی GitHub Pages

1. مخزن را در GitHub بسازید و کد را به شاخهٔ `main` بفرستید.
2. در مخزن: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. workflow در `.github/workflows/deploy.yml` با هر push روی `main` اجرا می‌شود: اعتبارسنجی، بررسی نوع، ساخت، بررسی لینک، استقرار.
4. نشانی سایت و مسیر پایه از نام مالک و مخزن خودکار ساخته می‌شود: `https://<owner>.github.io/<repo>/`. برای دامنهٔ اختصاصی یا مخزن `<owner>.github.io`، در workflow مقدار `SITE_URL` را به نشانی واقعی و `BASE_PATH` را به `/` تغییر دهید و `productionUrl` را در `settings.json` بگذارید.

> این workflow هنوز روی مخزن واقعی اجرا نشده است؛ پس از اولین استقرار، نتیجه را در `ROADMAP.md` ثبت کنید. تا زمانی که نشانی واقعی تنظیم نشده، canonical و OG تولید نمی‌شوند و sitemap از نشانی جایگزین `username.github.io` استفاده می‌کند.

## ویرایش محتوا

همهٔ محتوا در `src/content/` است؛ بدون دست‌زدن به کد. راهنمای گام‌به‌گام: [CONTENT-GUIDE.md](CONTENT-GUIDE.md). تنظیمات سایت (فرم گوگل، راه‌های تماس، CTA): `src/content/site/settings.json`. چرخهٔ بررسی خاطره‌ها: [docs/publishing-workflow.md](docs/publishing-workflow.md). معماری: [docs/architecture.md](docs/architecture.md).

## قالب و مجوزها

از استارتر رسمی Astro (MIT) استفاده شده؛ قالب ثالث استفاده نشده است. فونت Vazirmatn (مجوز SIL OFL 1.1) از بستهٔ `@fontsource-variable/vazirmatn` به‌صورت محلی میزبانی می‌شود. مجوز محتوا و تصویرها جداگانه در فراداده‌ها ثبت می‌شود.
