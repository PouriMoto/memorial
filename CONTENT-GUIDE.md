# راهنمای محتوا

همهٔ مسیرها نسبت به `src/content/memorials/<slug>/` هستند. پس از هر تغییر `npm test` را اجرا کنید.

**قاعدهٔ طلایی:** هیچ تاریخ، نقل‌قول، منبع، مجوز یا نشانی ویدیویی را از خودتان نسازید. اگر مطمئن نیستید، نیاورید یا `"status": "needs-verification"` بگذارید.

## افزودن فصل روایت

دو فایل با نام یکسان بسازید: `story/fa/08-name.md` و (اختیاری) `story/en/08-name.md`.

```markdown
---
title: "عنوان فصل"
order: 8
kicker: "فصل هشتم"
dateLabel: "۲۰۰۰"
sourceIds: [source-id-1]
imageId: image-id      # اختیاری؛ شناسهٔ تصویر در gallery.json
---

متن فصل…
```

اگر نسخهٔ انگلیسی نباشد، فصل در صفحهٔ انگلیسی نمایش داده نمی‌شود (اعتبارسنج هشدار می‌دهد). نام فایل (`08-name`) همان `storyId` است که رویدادهای خط زمانی می‌توانند به آن لینک بدهند.

## افزودن رویداد خط زمانی

یک آبجکت به `timeline.json` اضافه کنید:

```json
{
  "id": "event-id",
  "date": "1989-06-04",
  "precision": "exact",
  "title": { "fa": "عنوان", "en": "Title" },
  "description": { "fa": "توضیح", "en": "Description" },
  "milestone": false,
  "storyId": "05-leadership",
  "sourceIds": ["source-id"],
  "status": "single-source"
}
```

- `date`: `YYYY`، `YYYY-MM` یا `YYYY-MM-DD` (میلادی). تاریخ شمسی تولید نمی‌شود؛ فقط اگر منبعی گفته، در متن بیاورید.
- `precision`: `exact | month | year | approximate | uncertain`. تاریخ‌های تقریبی با نقطهٔ خط‌چین نشان داده می‌شوند.
- `status`: `verified` (دست‌کم یک منبع و بازبینی با متن خوانده‌شده)، `single-source`، `needs-verification`.
- `milestone: true` رویداد را در «نقاط عطف» صفحهٔ اصلی می‌آورد؛ برای نمایش در نسخهٔ انگلیسی، `title.en` و `description.en` لازم است.

## افزودن تصویر

۱. فایل بهینه‌شده را (حداکثر حدود ۱۶۰۰ پیکسل عرض، JPEG/WebP، ترجیحاً زیر ۵۰۰ کیلوبایت) در `public/images/<slug>/` بگذارید.
۲. آبجکت را به `gallery.json` اضافه کنید:

```json
{
  "id": "image-id",
  "src": "/images/ali-khamenei/file.jpg",
  "width": 1600,
  "height": 1067,
  "title": { "fa": "عنوان" },
  "caption": { "fa": "شرح" },
  "alt": { "fa": "توضیح متنی برای نابینایان" },
  "date": "1990",
  "datePrecision": "approximate",
  "creator": "نام عکاس",
  "sourceUrl": "https://…",
  "license": "cc-by",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "featured": true,
  "status": "single-source"
}
```

`license`: `public-domain | cc0 | cc-by | cc-by-sa | permission-granted | all-rights-reserved | unknown`. تصویر با مجوز `unknown` یا بدون اجازه منتشر نکنید. اگر `src` نشانی `https://` باشد (میزبانی بیرونی)، `creator` و `sourceUrl` الزامی است. برای تصویر شاخص صفحهٔ اصلی، `heroImageId` را در `memorial.json` بگذارید.

## افزودن ویدیو

```json
{
  "id": "video-id",
  "title": { "fa": "عنوان" },
  "description": { "fa": "توضیح" },
  "provider": "aparat",
  "url": "https://www.aparat.com/v/XXXXX",
  "sourceUrl": "https://…",
  "featured": true,
  "status": "single-source"
}
```

فقط نشانی واقعی و معتبر YouTube یا Aparat. الگوی embed آپارات با نشانی واقعی آزموده نشده؛ پس از افزودن، خروجی را بازبینی کنید. فایل ویدیو در مخزن نگذارید.

## افزودن و تأیید خاطره

به `memories.json` اضافه کنید و فقط پس از بررسی و کسب اجازه `reviewStatus: "approved"` و `publicationPermission: "granted"` بگذارید. فقط نام نمایشی؛ ایمیل، شماره و نشانی هرگز. جزئیات: [docs/publishing-workflow.md](docs/publishing-workflow.md).

## ویژگی‌ها، یادگارها و کانال‌ها

- **خاموش/روشن:** کلیدهای `features` در `settings.json` (همهٔ سایت) و `enabledSections` در `memorial.json` (هر یادبود). بخش بدون محتوا خودکار ساخته نمی‌شود.
- **تاریخ شمسی:** `"calendar": "persian"` در `memorial.json`؛ تاریخ‌ها میلادی ذخیره می‌شوند و فقط تاریخ‌های کامل (روز-ماه-سال) به شمسی تبدیل می‌شوند.
- **نمونه:** `"sample": true` نوار «نمونهٔ ساختگی» را نشان می‌دهد.
- **خاطره:** فیلدهای `topics`، `imageIds` (شناسهٔ گالری)، `videoId` (شناسهٔ `videos.json`)، `featured`. متن بلند خودکار «ادامه» می‌گیرد.
- **یادگارها** (`keepsakes.json`): `kind` یکی از `audio|music|letter|handwriting|object`، `audioSrc` (فایل کوچک در `public/`)، `imageIds`، `text` (بندها با خط خالی).
- **حالت مزار و QR:** `features.grave` و `features.qr`؛ راهنما در [docs/qr-nfc-guide.md](docs/qr-nfc-guide.md) و [docs/custom-domain.md](docs/custom-domain.md). slugهای رزروشده: `about`، `order`، `submit-memory`، `en`، `g`.
- **ورود خاطره از شیت:** [docs/memory-workflow.md](docs/memory-workflow.md) (`npm run memories`).
- **راهنمای تصاویر:** `npm run slots` فایل‌های `docs/image-slots/<slug>.html` را با اندازهٔ دقیق هر تصویر می‌سازد. در فایل فصل، `imageId` یا `imageIds: [..]` تصویر فصل است.
- **کانال‌های خاطره:** `googleFormsUrl` و `memoryChannels[].url` در `settings.json`؛ هر کدام خالی باشد نمایش داده نمی‌شود.
- **انتقال از شیت:** ردیف تأییدشده را به `memories.json` ببرید؛ ایمیل و شماره هرگز.

## ارجاع به منبع

۱. منبع را به `sources.json` بیفزایید (`id`, `title`, `publisher`, `url`, `type`, `relevance`, `status`، و در صورت وجود `publishedAt`/`accessedAt`).
۲. شناسه را در `sourceIds` رویداد، فصل، زندگی‌نامه یا خود `memorial.json` بگذارید.
۳. `type`: `primary | secondary | personal-recollection | unverified`. `status`: `verified | partially-verified | link-only | unverified`.
۴. متن را با کلمات خودتان بنویسید؛ نقل مستقیم بلند نیاورید و ادعای مناقشه‌برانگیز را به منبعش نسبت دهید.

### افزودن متن از khamenei.ir

این پایگاه به‌عنوان منبع اولیه با وضعیت `link-only` ثبت شده است. متن را دستی از سایت بخوانید، با کلمات خودتان خلاصه کنید یا نقل کوتاه بیاورید، نشانی دقیق همان صفحه را به‌عنوان یک منبع جدید در `sources.json` بگذارید (با `accessedAt`)، و وضعیت را فقط پس از خواندن متن به `partially-verified` تغییر دهید. سپس شناسه را در `sourceIds` فصل مربوط بیاورید.

## پیکربندی یادبود جدید

۱. پوشهٔ `src/content/memorials/<slug>/` را بسازید (`slug` فقط حروف کوچک لاتین و خط‌تیره؛ نه `about`، `order`، `submit-memory`، `en` یا `g`).
۲. فایل‌های `memorial.json`، `sources.json`، `timeline.json`، `gallery.json`، `videos.json`، `memories.json`، `biography.md` (اختیاری) و `story/fa/*.md` را بسازید. فایل‌های JSON می‌توانند `[]` باشند.
۳. در `memorial.json` مقدار `featured: true` فقط برای یادبودی که صفحهٔ اصلی است.
۴. بخش‌های اختیاری را با `enabledSections` خاموش کنید، مثلاً `"videos": false`.
۵. `npm run validate` را اجرا کنید؛ صفحه‌ها به‌طور خودکار در `/<slug>/` ساخته می‌شوند.
