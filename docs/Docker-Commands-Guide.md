# دليل أوامر Docker للمشروع

هذا الملف مكتوب خصيصاً لهذا المشروع حتى يكون مرجعاً آمناً عند التعامل مع Docker بدون تخمين وبدون تجربة أوامر قد تؤثر على الاستضافة أو SSL.

الهدف من هذا الدليل:

- شرح أوامر Docker و Docker Compose المستخدمة فعلياً داخل المشروع.
- توضيح الفرق بين أوامر التطوير المحلي وأوامر الإنتاج.
- توضيح الأوامر الآمنة أولاً.
- التحذير من الأوامر التي قد تمس الشهادات أو البيانات أو الـ volumes.

## 1) قاعدة مهمة قبل أي أمر

في هذا المشروع يوجد ملفان أساسيان:

- `docker-compose.yml`: للتطوير المحلي.
- `docker-compose.prod.yml`: للإنتاج على السيرفر.

هذا يعني:

- إذا كنت تعمل على جهازك المحلي للتطوير، استخدم أوامر ملف التطوير.
- إذا كنت تعمل على الاستضافة أو السيرفر، استخدم أوامر ملف الإنتاج فقط.
- لا تخلط بين الملفين على نفس البيئة بدون فهم واضح لما تفعله.

صيغة الأوامر:

```bash
# تطوير محلي
docker compose -f docker-compose.yml COMMAND

# إنتاج / استضافة
docker compose -f docker-compose.prod.yml COMMAND
```

إذا كان جهازك القديم لا يدعم `docker compose` فيمكن أن تجد بعض البيئات تستخدم:

```bash
docker-compose -f docker-compose.prod.yml COMMAND
```

لكن الأفضل في المشاريع الحديثة هو استخدام:

```bash
docker compose
```

## 2) ما الذي يعمل داخل Docker في هذا المشروع؟

### في التطوير المحلي

الخدمات الأساسية في `docker-compose.yml`:

- `redis`
- `backend`
- `celery_worker`
- `celery_beat`
- `frontend`
- `nginx`
- `certbot`

### في الإنتاج

الخدمات الأساسية في `docker-compose.prod.yml`:

- `postgres`
- `redis`
- `backend`
- `celery_worker`
- `celery_beat`
- `nginx`
- `frontend_build_step`

مجلدات وبيانات مهمة يجب الحذر منها:

- `./certbot/conf`: شهادات Let's Encrypt وملفات SSL.
- `./certbot/www`: ملفات التحقق الخاصة بـ Certbot.
- `upload_data`, `output_data`, `db_data`, `postgres_data`, `redis_data`: volumes تحتوي بيانات تشغيلية مهمة.

## 3) أوامر آمنة يجب أن تبدأ بها دائماً

هذه الأوامر لا تغيّر الإعدادات، بل تساعدك على معرفة الوضع الحالي.

### معرفة حالة الحاويات

```bash
docker compose -f docker-compose.prod.yml ps
```

الشرح:

- يعرض لك كل الخدمات الجارية أو المتوقفة.
- أول أمر يجب تشغيله قبل أي تعديل على السيرفر.
- يساعدك تعرف هل المشكلة في `nginx` أو `backend` أو `celery_worker` أو غيرها.

### مشاهدة الحاويات الجارية على الجهاز كله

```bash
docker ps
```

الشرح:

- يعرض كل الحاويات العاملة حالياً على السيرفر.
- مفيد إذا كنت تريد التأكد أن الحاويات الخاصة بالمشروع شغالة فعلاً.

### مشاهدة جميع الحاويات حتى المتوقفة

```bash
docker ps -a
```

الشرح:

- يعرض الحاويات التي توقفت أيضاً.
- مفيد عند تتبع خدمة فشلت أثناء الإقلاع.

### عرض الـ logs للمشروع بالكامل

```bash
docker compose -f docker-compose.prod.yml logs
```

الشرح:

- يعرض سجلات جميع الخدمات.
- مفيد لفهم الخطأ قبل أن تعيد التشغيل أو تعيد البناء.

### متابعة السجلات بشكل مباشر

```bash
docker compose -f docker-compose.prod.yml logs -f
```

الشرح:

- `-f` تعني متابعة حية للسجلات.
- ممتاز عند اختبار إصلاح أو عند مراقبة الإقلاع.

### متابعة سجلات خدمة واحدة فقط

```bash
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery_worker
```

الشرح:

- استخدم هذا عندما تعرف تقريباً مكان المشكلة.
- مثال: إذا المشكلة SSL أو reverse proxy فابدأ بـ `nginx`.
- مثال: إذا المشكلة API فابدأ بـ `backend`.

### رؤية الإعداد النهائي بعد دمج المتغيرات

```bash
docker compose -f docker-compose.prod.yml config
```

الشرح:

- يعرض لك شكل الإعداد النهائي بعد قراءة ملف Compose وملف `.env`.
- مفيد جداً لاكتشاف متغير ناقص أو مسار غير صحيح.

## 4) أوامر الإقلاع والتشغيل

### تشغيل المشروع محلياً للتطوير

```bash
docker compose -f docker-compose.yml up --build
```

الشرح:

- `up` يعني تشغيل الخدمات.
- `--build` يعني إعادة بناء الصور قبل التشغيل.
- مناسب عندما تعدّل في Dockerfile أو dependencies أو إعدادات البناء.

ملاحظة:

- هذا الأمر يبقي الطرفية مفتوحة ويعرض السجلات.

### تشغيل المشروع في الخلفية

```bash
docker compose -f docker-compose.yml up -d --build
```

الشرح:

- `-d` تعني التشغيل في الخلفية.
- مناسب إذا أردت أن تترك الخدمات تعمل وتكمل عملك في الطرفية.

### تشغيل الإنتاج على السيرفر

```bash
docker compose -f docker-compose.prod.yml up -d
```

الشرح:

- يشغّل خدمات الإنتاج في الخلفية.
- استخدمه إذا كانت الصور مبنية بالفعل ولا تحتاج إعادة بناء.

### تشغيل الإنتاج مع إعادة البناء

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

الشرح:

- يشغّل خدمات الإنتاج ويعيد بناء الصور أولاً.
- مناسب بعد تعديل الكود أو Dockerfile أو متغيرات البناء.

مهم:

- لا تستخدم إعادة البناء على السيرفر بدون سبب واضح.
- ابدأ دائماً بـ `ps` و `logs` قبل أي إعادة بناء.

## 5) أوامر الإيقاف وإعادة التشغيل

### إيقاف الخدمات بدون حذفها

```bash
docker compose -f docker-compose.prod.yml stop
```

الشرح:

- يوقف الحاويات فقط.
- لا يحذف الحاويات ولا الشبكات ولا الـ volumes.
- هذا أكثر أماناً من `down` إذا كنت فقط تريد إيقافاً مؤقتاً.

### تشغيل الخدمات بعد الإيقاف

```bash
docker compose -f docker-compose.prod.yml start
```

الشرح:

- يعيد تشغيل الحاويات التي كانت موجودة ومتوقفة.
- مناسب عند الإيقاف المؤقت.

### إعادة تشغيل خدمة واحدة

```bash
docker compose -f docker-compose.prod.yml restart nginx
docker compose -f docker-compose.prod.yml restart backend
```

الشرح:

- مفيد إذا عدلت إعداداً معيناً وتريد إعادة تشغيل خدمة محددة فقط.
- أفضل من إعادة تشغيل المشروع كله عندما تكون المشكلة محصورة.

### حذف الحاويات والشبكة الخاصة بالمشروع

```bash
docker compose -f docker-compose.prod.yml down
```

الشرح:

- يوقف ويزيل الحاويات والشبكة الخاصة بالـ Compose.
- غالباً لا يحذف الـ volumes إلا إذا أضفت `-v`.
- يمكن استخدامه عند الحاجة إلى إعادة إقلاع نظيفة نسبياً.

تحذير:

- على السيرفر لا تستخدم `down` إلا إذا كنت تعرف أثره وكنت مستعداً لانقطاع الخدمة أثناء إعادة الإقلاع.

## 6) أخطر أمر يجب الحذر منه

```bash
docker compose -f docker-compose.prod.yml down -v
```

الشرح:

- `-v` يعني حذف الـ volumes المرتبطة بالمشروع.
- هذا قد يؤدي إلى حذف بيانات مهمة مثل:
  - بيانات PostgreSQL
  - بيانات Redis
  - ملفات البيانات المؤقتة
  - أي بيانات أخرى محفوظة داخل volumes

قرار واضح:

- لا تشغّل هذا الأمر على الاستضافة إلا إذا كنت متأكداً 100% أن لديك نسخة احتياطية وأنك تريد فعلاً حذف البيانات.

## 7) أوامر البناء وإعادة البناء

### بناء جميع الصور

```bash
docker compose -f docker-compose.prod.yml build
```

الشرح:

- يبني الصور بدون تشغيلها.
- مفيد عندما تريد التأكد من نجاح البناء أولاً.

### بناء خدمة واحدة فقط

```bash
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml build nginx
```

الشرح:

- أسرع من بناء المشروع كله.
- استخدمه عندما يكون التعديل محصوراً في خدمة واحدة.

### إعادة بناء بدون cache

```bash
docker compose -f docker-compose.prod.yml build --no-cache
```

الشرح:

- يجبر Docker على إعادة البناء من الصفر.
- مفيد إذا شككت أن الـ cache يعطيك نسخة قديمة.

تحذير:

- هذا أبطأ.
- لا تستخدمه مباشرة على السيرفر إلا عند وجود سبب واضح.

## 8) الدخول إلى داخل الحاوية لفحص المشكلة

### الدخول إلى shell داخل backend

```bash
docker compose -f docker-compose.prod.yml exec backend sh
```

الشرح:

- يفتح shell داخل الحاوية العاملة.
- مفيد لفحص الملفات أو البيئة أو التأكد من وجود dependencies.

### الدخول إلى nginx

```bash
docker compose -f docker-compose.prod.yml exec nginx sh
```

الشرح:

- مفيد عندما تريد فحص ملفات إعداد Nginx أو مسارات الشهادات.

### تنفيذ أمر واحد فقط داخل الحاوية

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

الشرح:

- هذا أفضل من الدخول اليدوي أحياناً.
- يفحص صحة إعداد Nginx بدون تشغيل shell تفاعلي.

## 9) أوامر مهمة خاصة بـ Nginx و SSL

هذه أهم منطقة يجب التعامل معها بحذر على السيرفر.

في هذا المشروع:

- Nginx يقرأ الشهادات من `./certbot/conf`.
- ملفات التحقق الخاصة بـ Let's Encrypt تأتي من `./certbot/www`.
- ملف إعداد Nginx في الإنتاج هو `nginx/nginx.prod.conf`.

### فحص إعداد Nginx قبل أي reload

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

الشرح:

- يفحص صياغة إعداد Nginx.
- هذا من أهم الأوامر الآمنة قبل إعادة تحميل Nginx.
- إذا كان هناك خطأ في المسارات أو الشهادات سيظهر هنا غالباً.

### إعادة تحميل Nginx بدون إطفاء الحاوية

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

الشرح:

- يعيد تحميل الإعدادات بعد نجاح `nginx -t`.
- أفضل من restart في الحالات التي غيّرت فيها الإعداد فقط.

### التأكد من وجود ملفات الشهادة

```bash
docker compose -f docker-compose.prod.yml exec nginx ls /etc/letsencrypt/live/dociva.io
```

الشرح:

- يساعدك تتأكد أن الشهادة مركبة داخل الحاوية في المسار المتوقع.
- مهم جداً عند تشخيص مشاكل SSL.

### مراقبة سجلات Nginx أثناء مشكلة SSL

```bash
docker compose -f docker-compose.prod.yml logs -f nginx
```

الشرح:

- إذا كان هناك خطأ في الشهادة أو في config أو في ربط المسارات ستراه هنا غالباً.

## 10) أوامر Certbot والشهادات

معلومة مهمة في هذا المشروع:

- خدمة `certbot` موجودة داخل `docker-compose.yml`.
- ملف `docker-compose.prod.yml` لا يحتوي خدمة `certbot` مستقلة.
- لذلك أي أمر مباشر خاص بـ Certbot يجب مراجعته جيداً قبل تشغيله على الاستضافة.

### ملاحظة شديدة الأهمية

إذا كان SSL يعمل حالياً على الاستضافة فلا تبدأ بتجربة أوامر Certbot عشوائياً.

قبل أي عمل متعلق بالشهادات:

1. خذ نسخة احتياطية من مجلد `certbot` بالكامل.
2. افحص Nginx أولاً.
3. افحص وجود ملفات الشهادات الحالية.
4. لا تحذف أي ملف داخل `certbot/conf` يدوياً.

مثال نسخة احتياطية سريعة:

```bash
cp -r certbot certbot-backup-$(date +%Y%m%d-%H%M%S)
```

### الحصول على شهادة لأول مرة

يوجد سكربت مخصص في المشروع:

```bash
bash scripts/init-letsencrypt.sh
```

الشرح:

- هذا السكربت مخصص لتهيئة SSL لأول مرة.
- يقوم بإنشاء شهادة مؤقتة ثم تشغيل Nginx ثم طلب شهادة حقيقية من Let's Encrypt ثم إعادة تحميل Nginx.

تحذير مهم جداً:

- لا تشغّل هذا السكربت على سيرفر إنتاج يعمل بشكل سليم إلا إذا كنت متأكداً أنك تحتاج فعلاً إلى إعادة تهيئة SSL.
- السبب: هذا السكربت يتدخل مباشرة في دورة إنشاء الشهادة وقد يسبب ارتباكاً إذا شغّلته بدون داعٍ.
- أيضاً السكربت يعتمد على Compose الافتراضي الموجود في المشروع، لذلك يجب قراءة محتواه وفهمه قبل تشغيله على سيرفر حي.

### تجديد الشهادة يدوياً

```bash
docker compose -f docker-compose.yml run --rm certbot renew --webroot -w /var/www/certbot
```

الشرح:

- يطلب من Certbot محاولة تجديد الشهادات القابلة للتجديد.
- لا يصدر شهادة جديدة دائماً، بل يجدد عند الحاجة.
- تم استخدام `docker-compose.yml` هنا لأن خدمة `certbot` معرفة فيه.

بعد التجديد:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

الشرح:

- حتى يقرأ Nginx الشهادة المجددة.

ملاحظة عملية:

- إذا كان لديك SSL يعمل جيداً الآن، لا تنفذ أمر التجديد اليدوي إلا عند وجود سبب حقيقي أو ضمن صيانة محسوبة.

## 11) أوامر النشر الآمن للمشروع

### الطريقة الآمنة قبل أي نشر

نفّذ هذه الأوامر بالترتيب:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100
docker compose -f docker-compose.prod.yml config
```

الشرح:

- الأولى لفهم الحالة الحالية.
- الثانية لفهم آخر الأخطاء.
- الثالثة لفحص الإعداد النهائي.

### نشر تحديث بطريقة مباشرة

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

الشرح:

- بناء ثم تشغيل في الخلفية.
- هذه طريقة مناسبة إذا أردت تحديثاً واضحاً بدون حذف بيانات.

### السكربت الموجود في المشروع للنشر

```bash
bash scripts/deploy.sh
```

الشرح:

- هذا السكربت يقوم تقريباً بالتالي:
  - سحب آخر كود
  - بناء الصور بدون cache
  - إيقاف الحاويات القديمة
  - تشغيل الخدمات
  - فحص health check

تحذير:

- السكربت مناسب عندما تريد نشر كامل وواضح.
- لكنه أكثر قوة من الأوامر اليدوية البسيطة لأنه يبني من جديد ثم يعمل `down` ثم `up`.
- لذلك لا تشغّله إذا كان المطلوب مجرد فحص أو reload بسيط لـ Nginx.

## 12) أوامر الفحص والتنظيف

### معرفة استهلاك Docker للمساحة

```bash
docker system df
```

الشرح:

- يعرض كم مساحة مستهلكة في الصور والحاويات والـ volumes.
- آمن ومفيد قبل أي تنظيف.

### حذف الصور غير المستخدمة فقط

```bash
docker image prune
```

الشرح:

- يحذف الصور غير المستخدمة.
- أقل خطورة من الأوامر الشاملة.

### حذف الموارد غير المستخدمة بحذر

```bash
docker system prune
```

الشرح:

- يحذف الموارد غير المستخدمة مثل الحاويات المتوقفة وبعض الشبكات والـ cache.
- قد يكون مفيداً إذا امتلأت المساحة.

تحذير:

- لا تستخدمه على السيرفر بدون فهم ما سيتم حذفه.

### أوامر يجب تجنبها على الاستضافة إلا في حالة طوارئ مدروسة

```bash
docker system prune -a --volumes
docker volume prune
docker compose -f docker-compose.prod.yml down -v
```

الشرح:

- هذه أوامر قد تحذف بيانات أو volumes أو ملفات تشغيل مهمة.
- لا تستخدمها لمجرد حل سريع.

## 13) الفرق بين أكثر الأوامر التي يختلط معناها على المبتدئ

### `up`

- يشغّل الخدمات.
- وقد يبنيها إذا أضفت `--build`.

### `stop`

- يوقف الحاويات فقط.
- لا يحذفها.

### `start`

- يشغّل حاويات موجودة ومتوقفة.

### `restart`

- يعيد تشغيل حاوية أو خدمة موجودة.

### `down`

- يوقف ويزيل الحاويات والشبكة الخاصة بالمشروع.

### `down -v`

- أخطر من `down` لأنه يحذف الـ volumes أيضاً.

### `build`

- يبني الصور فقط.

### `logs`

- يعرض السجلات.

### `exec`

- ينفذ أمراً داخل حاوية تعمل حالياً.

## 14) سيناريوهات جاهزة للمشروع

### سيناريو 1: الموقع يعمل لكن هناك خطأ 502 أو مشكلة API

ابدأ بهذه الأوامر:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 nginx
```

الهدف:

- تعرف هل `backend` متوقف أو `nginx` لا يستطيع الوصول إليه.

### سيناريو 2: تريد تحديث backend فقط

```bash
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml logs -f backend
```

الهدف:

- تحديث خدمة واحدة فقط بدلاً من إعادة بناء المشروع كله.

### سيناريو 3: عدّلت إعداد Nginx أو SSL وتريد تطبيقه بأقل مخاطرة

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
docker compose -f docker-compose.prod.yml logs --tail=100 nginx
```

الهدف:

- فحص أولاً، ثم reload، ثم مراجعة النتيجة.

### سيناريو 4: تريد فقط معرفة هل SSL موجود أم لا

```bash
docker compose -f docker-compose.prod.yml exec nginx ls /etc/letsencrypt/live/dociva.io
docker compose -f docker-compose.prod.yml logs --tail=100 nginx
```

الهدف:

- التحقق بدون العبث بالشهادة.

## 15) أوامر أنصح بعدم تنفيذها بشكل عشوائي على هذا المشروع

لا تنفذ الأوامر التالية على السيرفر إلا إذا كنت تعرف أثرها بدقة:

```bash
docker compose -f docker-compose.prod.yml down -v
docker volume prune
docker system prune -a --volumes
rm -rf certbot/conf
rm -rf certbot/www
bash scripts/init-letsencrypt.sh
```

السبب:

- بعضها قد يحذف بيانات.
- بعضها قد يحذف ملفات التحقق أو ملفات الشهادات.
- بعضها قد يعيد تهيئة SSL بينما الخدمة تعمل بالفعل.

## 16) أفضل منهج آمن قبل أي أمر على السيرفر

قبل أي تدخل في الإنتاج، اتبع هذا الترتيب:

1. افهم الحالة الحالية عبر `ps` و `logs`.
2. حدّد الخدمة المتأثرة فقط.
3. استخدم أقل أمر يحقق الهدف.
4. إذا كان الأمر متعلقاً بـ SSL، لا تبدأ بـ Certbot بل ابدأ بـ `nginx -t` وقراءة السجلات.
5. لا تحذف volumes أو ملفات `certbot` إلا مع نسخة احتياطية واضحة.
6. إذا كان الإصلاح يمكن أن يتم بـ `reload` أو `restart` لخدمة واحدة، فلا تستخدم `down` للمشروع كله.

## 17) ملخص سريع جداً

إذا كنت مبتدئاً وتريد قاعدة عملية واحدة:

- ابدأ دائماً بـ `ps` ثم `logs`.
- إذا كانت المشكلة في Nginx أو SSL استخدم `nginx -t` قبل أي reload.
- لا تستخدم `down -v` على الاستضافة.
- لا تعبث بـ `certbot/conf` ما دام SSL يعمل.
- لا تشغل `init-letsencrypt.sh` إلا إذا كنت تحتاج فعلاً إنشاء أو إعادة تهيئة الشهادة.

هذا الدليل مخصص ليكون مرجع تشغيل آمن للمشروع، وليس مجرد قائمة أوامر عامة من Docker.