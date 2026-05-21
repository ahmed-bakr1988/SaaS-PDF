### 1. برومبت التخطيط المطوّر (The Planning Protocol)

   [الدور والمسؤولية]  
 أنت الآن تعمل بصفة   Staff Software Engineer   ومدير تقني   Tech Lead  . مهمتك التخطيط المعماري الصارم للمشروع التالي:
   [أدخل وصف المشروع هنا]  

    [الفكرة]
    - بناء اداة تعمل على تحويل اى ملف صورة او فديو اوى صيغة الى ملف بصيغة .md 
    - لماذا هذة الاداة هى موجة للمبرمجين اوى مستخدم ل ادوات الذكاء الاصتناعى لان المشكلة هى لو رفع صورة او فديو او اى ملف باى صيغة يستهلك توكن كثيرة و  ينتهى الرصيد و هذة مشكلة كبيرة يعانى منها مستخدمين الادوات الذكاء الاصتناعى  


    [المتطلبات ]
    1. بناء صفحة/اداة من الصفر تعمل على تحويل اى ملف باى صيغة الى صيغة .md 
    2. بناء منطق برمجى منطقى قوى من حيث البناء و الطريقة البرمجيى لكى لا يقسد عملية التحويل 
    3.بعد مرحلة البناء اضف هذة الاداة قم بعمل SEO للاداة فى ملفات SEO المسئولة عن ذلك 
    4.هذا البناء ليذم frontend/backend ارجع الى الملفات التى تشرح لك طبيعة بناء المشروع مثل @AGENTS.md /@agents\rules\mandatory-rules.md
 

   [قواعد ما قبل التتخطيط]  
 قبل البدء بالبروتوكولات، يجب أن تطبق مبدأ "Think Before Coding":
 1. حدد افتراضاتك حول المتطلبات بوضوح.
 2. إذا وجد غموض في المتطلبات، توقف واسأل فوراً؛ لا تختار مساراً بصمت.
 3. اقترح الحل الأبسط (Simplicity First) وارفض أي تعقيدات غير ضرورية.

   [البروتوكولات الإلزامية - تنفيذ تسلسلي]  
   البروتوكول الأول: الوعي الزمني وموثوقية التبعيات  
 - مهم جدا:حدد السنة والشهر من النظام باستخدام shell. إذا نجحت في ذلك ابحث في المستودعات الرسمية (npm, GitHub) عن أحدث الإصدارات المستقرة الى هذا التاريخ.
 - وثّق الإصدارات وتجنب الـ Deprecated تماماً.

   البروتوكول الثاني: التدفق المنطقي ومنع زحف الميزات (No Feature Creep)  
 - التزم بالنطاق المطلوب فقط. لا ميزات إضافية، لا مرونة غير مطلوبة.
 - ارسم رحلة المستخدم (GUI) أو تدفق البيانات (API) كـ "أهداف قابلة للتحقق".

   البروتوكول الثالث: المعمارية الذكية والتجريد الواقعي (Surgical Architecture)  
 - طبق مبدأ "Simplicity First": أقل قدر من الكود يحل المشكلة.
 - أنشئ طبقة Shared/Core فقط للمنطق المتكرر فعلياً، لا تجرد كوداً سيُستخدم مرة واحدة.
 - التزم بالتقسيم المعتمد على الميزات (Domain-Driven) مع منع تفتيت الملفات (No Micro-files).

   البروتوكول الرابع: استراتيجية التتبع (Safe Logging)  
 - صمم نظام Logging غير حظري (Asynchronous) وبسيط، يدعم المستويات الأساسية فقط دون التأثير على الأداء.

   البروتوكول الخامس: تأسيس الذاكرة الخارجية (PROJECT_MAP.md)  
 - أنشئ محتوى الملف متضمناً: `[TECH_STACK]`, `[SYSTEM_FLOW]`, `[ARCHITECTURE]`, وقسم `[ORPHANS & PENDING]` لتتبع النواقص.

   [الموجز المطلوب]  
 قدم المخرجات أعلاه بلغة تقنية مكثفة ودقيقة جدا، مع خطة عمل (Milestones) تعتمد "نجاح الأهداف" (Verifiable Goals). انتظر الموافقة.



  Planning Status

  No code changes made. I verified system time via shell: 2026-05-19 12:02:16 +03:00.

  One referenced path was wrong: agents\rules\mandatory-rules.md does not exist. The valid file is .agents\rules\mandatory-rules.md, and I used it.

  Assumptions Requiring Approval

  1. “Any file format to .md” will mean: accept a broad but explicitly supported set of formats and return a Markdown representation. Unsupported formats fail cleanly with a useful error, not a best-effort crash.
  2. Images/videos will not be semantically described by an LLM in v1. For v1:
      - Images: OCR text + metadata where possible.
      - Video/audio: metadata and optionally transcript only if an existing lightweight extraction path exists.
  3. Output goal is token reduction for AI workflows, so the Markdown should prioritize extracted text, headings, tables, metadata, and concise summaries of non-text payloads, not visual fidelity.
  4. This is one new tool in the existing Dociva tool system, not a new product area or microservice.

  If you want true “AI describes every image/video frame into Markdown,” that is a different, heavier feature and should go through ai_heavy with cost controls.

  Release Check

  Official/current sources checked:

  - React GitHub latest shows 19.2.6, released May 6, 2026. Repo currently uses React 18. I would not upgrade React for this feature because it is unrelated and raises frontend regression risk. Source:
    https://github.com/facebook/react/releases
  - Flask latest on PyPI is 3.1.3, uploaded Feb 19, 2026. Source: https://pypi.org/project/Flask/
  - Celery latest on PyPI is 5.6.3, released Mar 26, 2026, production/stable. Source: https://pypi.org/project/celery/
  - Pillow latest observed on PyPI is 12.2.0, uploaded Apr 1, 2026. Source: https://pypi.org/project/pillow/
  - Microsoft MarkItDown latest on PyPI is 0.1.5, released Feb 20, 2026, with Python API and CLI for converting files to Markdown. It is marked Beta, so I would only use it behind our own service boundary and tests, not expose it direct
    ly as architecture. Source: https://pypi.org/project/markitdown/

  No deprecated versions should be introduced. Existing dependency ranges can remain unless tests expose incompatibility.

  Simplicity-First Architecture

  Backend:

  - New route: backend/app/routes/markdown_convert.py
      - POST /api/convert/to-markdown
      - Validates upload, quota, size, MIME, extension.
      - Saves file using existing generate_safe_path.
      - Enqueues Celery task only. No conversion in request handler.
  - New service: backend/app/services/markdown_convert_service.py
      - Single domain service for all Markdown conversion.
      - Strategy order:
          1. Text-like files: stream decode and wrap as Markdown/code fence where appropriate.
          2. PDF/Office/HTML/CSV/XLSX/PPTX: MarkItDown if approved, otherwise existing repo libraries where already present.
          3. Image: existing OCR path or metadata-only fallback.
          4. Video/audio: metadata-only fallback in v1 unless transcript support is already available.
      - Normalizes output to .md.
      - Enforces max output size and truncation guardrails.
  - New task: backend/app/tasks/markdown_convert_tasks.py
      - Queue routing:
          - PDF/Office/text/HTML/CSV: pdf_processing or default depending detected class.
          - Images: ocr_tasks if OCR is needed.
          - Video: video_processing.
      - Per-task soft/hard limits lower than global defaults where possible.
      - Uploads final .md via existing storage.
      - Uses existing finalize_task_tracking and cleanup.

  Frontend:

  - New component: frontend/src/components/tools/FileToMarkdown.tsx
      - Uses existing uploadFile, task polling, download URL flow.
      - UI: upload, detected filename/type, progress, result preview, download .md.
      - No nested cards, no marketing page. Actual tool is first screen.
  - Append manifest entry in frontend/src/config/toolManifest.ts
      - slug: file-to-markdown
      - category: conversion or utility
      - icon: FileCode or FileText

  SEO:

  - Add programmatic SEO seed to frontend/src/seo/seoData.json / generated SEO flow as appropriate:
      - focus keyword: file to markdown converter
      - supporting: convert file to md, image to markdown, document to markdown for AI
  - Ensure route inclusion is derived from manifest/SEO helpers, not duplicated manually.
  - Update i18n keys in en.json and ar.json at minimum, matching existing pattern.

  Safe Logging Strategy

  Use the existing Python logging.getLogger(__name__) pattern, but add a small centralized async logging initializer only if missing:

  - QueueHandler in Flask/Celery process.
  - QueueListener writing to console/file handler.
  - Levels only: DEBUG, INFO, WARNING, ERROR.
  - Log task id, tool, file extension, size bucket, outcome, duration.
  - Never log raw filenames if sensitive, file content, extracted text, user secrets, or presigned URLs.

  PROJECT_MAP.md Content

  [TECH_STACK]
  Backend: Flask, Python 3.12, Gunicorn
  Async: Celery, Redis, isolated queues
  Storage: existing storage_service, S3 or local fallback
  Frontend: React, Vite, TypeScript
  SEO: toolManifest + seoData seed/generated SEO assets

  [SYSTEM_FLOW]
  User uploads file -> Flask validates file/quota -> file saved to upload temp path -> Celery task queued -> markdown_convert_service converts to .md -> output stored -> task status returns download_url + preview -> scheduled cleanup
  removes expired files.

  [ARCHITECTURE]
  Route: backend/app/routes/markdown_convert.py
  Service: backend/app/services/markdown_convert_service.py
  Task: backend/app/tasks/markdown_convert_tasks.py
  Frontend tool: frontend/src/components/tools/FileToMarkdown.tsx
  Registration: frontend/src/config/toolManifest.ts
  SEO/i18n: frontend/src/seo/seoData.json, frontend/src/i18n/en.json, frontend/src/i18n/ar.json

  [ORPHANS & PENDING]
  - Confirm exact scope of “any file format”.
  - Decide whether MarkItDown 0.1.5 is acceptable despite Beta classifier.
  - Decide whether v1 includes OCR for images or metadata-only fallback.
  - Add tests for unsupported file, empty file, size limit, successful text file, successful PDF/Office path.

  Milestone Plan

  1. Architecture approval
     Verifiable goal: approved scope for “any file,” MarkItDown usage decision, and v1 media behavior.
  2. Backend skeleton
     Verifiable goal: route enqueues task; no heavy request work; tests cover missing file, invalid type, quota validation, task dispatch.
  3. Conversion service
     Verifiable goal: .txt, .md, .pdf or one Office format converts to deterministic .md; unsupported format returns controlled error.
  4. Celery integration
     Verifiable goal: task runs on isolated queue, respects timeout, stores output, cleans temp files, records history.
  5. Frontend tool
     Verifiable goal: upload, progress, polling, preview, and download work through existing API patterns.
  6. SEO and registration
     Verifiable goal: /tools/file-to-markdown route exists, manifest test passes, SEO data generation includes the new landing page.
  7. Verification
     Verifiable goal: run backend focused tests, frontend tests, TypeScript check, and production build.

  Awaiting approval on the assumptions, especially whether v1 should use MarkItDown and whether image/video conversion means OCR/metadata or AI-generated descriptions.

─ Worked for 3m 19s ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

› Implement {feature}

› [Role and Responsibility]

  You are now working as a Staff Software Engineer and Tech Lead. Your task is to rigorously plan the architecture of the following project:

  [Insert project description here]
  Refer to the files that explain the project's structure, such as:

  @AGENTS.md

  [Idea]

  - Build a tool that converts any image, video, or other file format to .md format.

  [Requirements]

  1. Build a page/tool from scratch that converts any file format to .md format.

  2. Build a robust and logical programming framework, both in its structure and methodology, to ensure the conversion process doesn't fail.

  3. After building, add this tool. Perform SEO for the tool in the responsible SEO files.

  [Pre-Planning Rules]

  Before starting the protocols, you must apply the "Think Before Coding" principle:

  1. Clearly define your assumptions about the requirements.

  2. If there is ambiguity in the requirements, stop and ask immediately; don't silently choose a path.

  3. Propose the simplest solution (Simplicity First) and reject any unnecessary complexities.

  [Mandatory Protocols - Sequential Implementation]

  Protocol 1: Time Awareness and Dependability Reliability

  - Very important: Determine the year and month of the system using shell. If you succeed in this, search the official repositories (npm, GitHub) for the latest stable releases up to that date.

  - Document the releases and completely avoid deprecated versions.

  Protocol 2: Logical Flow and Prevent Feature Creep

  - Stick to the required scope only. No extra features, no unnecessary flexibility. - Envision the user journey (GUI) or data flow (API) as "achievable goals."

  Protocol 3: Smart Architecture and Surgical Architecture

  - Create a shared/core layer only for truly recurring logic; don't abstract code that will be used only once.

  - Adhere to domain-driven partitioning and prevent micro-file fragmentation.

  Protocol 4: Safe Logging Strategy

  - Design a simple, non-blocking (asynchronous) logging system that supports only the basic levels without impacting performance.

  Protocol 5: Establishing External Memory (PROJECT_MAP.md)

  - Create the file contents, including: `[TECH_STACK]`, `[SYSTEM_FLOW]`, `[ARCHITECTURE]`, and a `[ORPHANS & PENDING]` section for tracking deficiencies.

  [Required Brief]

  Present the above outputs in a highly technical and concise manner, with a Milestone Plan based on Verifiable Goals. Await approval.


• I’ll treat this as a planning-only pass and will not modify the codebase yet. I’m going to verify the local date, read the repository rules, then check official package/repository sources for current stable versions before producing
  the approval-ready architecture brief.

• Running Get-ChildItem -Force

• Running Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'

• Running Get-Content -Raw AGENTS.md

• Ran Get-Content -Raw AGENTS.md
  └ # Repository Guidelines

    … +59 lines (ctrl + t to view transcript)
    - Validate uploaded-file handling changes against `backend/app/utils/file_validator.py` tests.


• Ran Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
  └ 2026-05-19 12:02:16 +03:00

• Ran Get-ChildItem -Force
  └
        Directory: C:\xampp\htdocs\SaaS-PDF
    … +56 lines (ctrl + t to view transcript)
    -a---           5/15/2026  3:00 PM           8203 WORK_SUMMARY.md


• Ran Get-Content -Raw agents\rules\mandatory-rules.md
  └ Get-Content:
         |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
         | Cannot find path 'C:\xampp\htdocs\SaaS-PDF\agents\rules\mandatory-rules.md' because it does not exist.

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The local date is verified as 2026-05-19. The referenced agents\rules\mandatory-rules.md path does not exist as written, so I’m checking the nearby .agents structure before I decide whether this is a blocker or just a path typo.

• Running Get-ChildItem -Recurse -File .agents | Select-Object FullName

• Running Get-ChildItem -Recurse -File .agent.md | Select-Object FullName

• Running rg --files -g '*mandatory*' -g '*rules*'

• Running Get-Content -Raw package.json

• Running Get-Content -Raw frontend\package.json

• Ran Get-Content -Raw package.json
  └ {
      "dependencies": {
    … +4 lines (ctrl + t to view transcript)
    }


• Ran Get-ChildItem backend -File | Select-Object Name
  └
    Name
    … +6 lines (ctrl + t to view transcript)
    wsgi.py


• Ran Get-Content -Raw frontend\package.json
  └ {
      "name": "dociva-frontend",
    … +57 lines (ctrl + t to view transcript)
    }


• Ran Get-ChildItem -Recurse -File .agent.md | Select-Object FullName
  └
    FullName
    … +2 lines (ctrl + t to view transcript)
    C:\xampp\htdocs\SaaS-PDF\.agent.md\workfloe.md


• Ran Get-ChildItem -Recurse -File .agents | Select-Object FullName
  └
    FullName
    … +3 lines (ctrl + t to view transcript)
    C:\xampp\htdocs\SaaS-PDF\.agents\rules\workspaces.md
• Ran rg --files -g '*mandatory*' -g '*rules*'
  └ (no output)

• Running Get-Content -Raw backend\requirements.txt

• Running Get-ChildItem frontend\src -Directory | Select-Object Name

• Ran Get-Content -Raw .agents\rules\mandatory-rules.md
    … +127 lines (ctrl + t to view transcript)
      - الأسعار بالدولار تُحوّل لـ EGP عبر متغير `PAYMOB_USD_TO_EGP_RATE`


• Ran Get-ChildItem frontend\src -Directory | Select-Object Name
  └
    Name


• Ran Get-Content -Raw backend\requirements.txt
  └ # Core Framework
    flask>=3.0,<4.0
    … +85 lines (ctrl + t to view transcript)
    google-generativeai>=0.1,<1.0


• Ran Get-ChildItem backend\app -Directory | Select-Object Name
  └
    Name
    … +6 lines (ctrl + t to view transcript)
    utils


• Ran rg --files backend\app backend\tests | Select-String -Pattern 'file_validator|routes|services|tasks|test_'
  └
    backend\tests\test_video_tasks.py
    … +165 lines (ctrl + t to view transcript)
    backend\app\services\social_text_service.py


• Ran rg --files frontend\src | Select-String -Pattern 'seo|route|tool|sitemap|helmet|i18n'
  └
    frontend\src\utils\textTools.ts
    … +93 lines (ctrl + t to view transcript)
    frontend\src\components\shared\ToolSelectorModal.tsx


• Searching the web

• Searched site:npmjs.com/package react npm latest version React package

◦ Searching the web

• Searched https://registry.npmjs.org/typescript/latest

• Searching the web

• Searched site:github.com/facebook/react/releases latest React release GitHub 2026

◦ Searching the web

• Searched site:npmjs.com/package/vite "Version" "vite" "npm"

◦ Searching the web

• Searched GitHub microsoft markitdown releases latest file to markdown

• The repository rules confirm the key constraints: no heavy processing in Flask handlers, queue isolation, streaming/chunked processing, strict upload validation, task timeouts, and cleanup. I also found the frontend SEO and tool
  registration areas, so the plan can target existing extension points rather than creating a separate subsystem.

• Running Get-Content -Raw frontend\src\App.tsx

• Running Get-Content -Raw frontend\src\config\routes.ts

• Running Get-Content -Raw frontend\src\config\toolManifest.ts

• Running Get-Content -Raw frontend\src\config\seoPages.ts

• Running Get-Content -Raw frontend\src\services\toolsApi.ts

• Ran Get-Content -Raw frontend\src\config\routes.ts
  └ /**
     * Canonical route registry — single source of truth for all application routes.
    … +51 lines (ctrl + t to view transcript)
    export type AppRoute = (typeof ALL_ROUTES)[number];


• Ran Get-Content -Raw frontend\src\services\toolsApi.ts
  └ import api from './apiClient';
    import type {
    … +154 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\App.tsx
  └ import { lazy, Suspense, useEffect, useState } from 'react';
    import Clarity from '@microsoft/clarity';
    … +231 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\config\toolManifest.ts
  └ /**
     * Unified Tool Manifest — the single source of truth for every tool.
    … +603 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\config\seoPages.ts
  └ import {
      PROGRAMMATIC_TOOL_PAGES,
    … +89 lines (ctrl + t to view transcript)
      return [...getLocalizedSeoLandingPaths('en'), ...getLocalizedSeoLandingPaths('ar')];
    }

• Ran Get-Content -Raw backend\app\routes\convert.py
  └ """PDF conversion routes (PDF↔Word)."""
        }), 202


• Running Get-Content -Raw backend\app\utils\task_queue.py

• Running Get-Content -Raw backend\app\tasks\convert_tasks.py

• Running Get-Content -Raw backend\app\services\storage_service.py

• Running Get-Content -Raw backend\app\utils\file_validator.py

• Running Get-Content -Raw backend\app\tasks\ocr_tasks.py

• Ran Get-Content -Raw backend\app\utils\task_queue.py
  └ """Task dispatch helpers for the web process."""

    … +20 lines (ctrl + t to view transcript)
        return NamedTaskProxy(task_name)


• Ran Get-Content -Raw backend\app\tasks\video_tasks.py
  └ """Celery tasks for video processing."""
    import os
    … +148 lines (ctrl + t to view transcript)
            )


• Ran Get-Content -Raw backend\app\utils\file_validator.py
  └ """File validation utilities — multi-layer security checks."""

    … +180 lines (ctrl + t to view transcript)
                )
• Ran Get-Content -Raw backend\app\services\storage_service.py
  └ """Storage service — S3 in production, local files in development."""
    import os
    … +209 lines (ctrl + t to view transcript)
    storage = StorageService()


• Ran Get-Content -Raw backend\app\tasks\convert_tasks.py
  └ """Celery tasks for PDF conversion (PDF↔Word)."""
    import os
    … +221 lines (ctrl + t to view transcript)
            )


• Ran Get-Content -Raw backend\app\tasks\ocr_tasks.py
  └ """Celery tasks for OCR processing."""
    import os
    … +175 lines (ctrl + t to view transcript)
            )


• Running rg "task_routes|CELERY|broker_transport_options|soft_time_limit|time_limit|worker_prefetch" -n backend docker-compose.yml

• Running rg "QueueHandler|QueueListener|logging.basicConfig|dictConfig|getLogger" backend\app backend\*.py

• Running Get-Content -Raw backend\app\__init__.py

• Ran rg "QueueHandler|QueueListener|logging.basicConfig|dictConfig|getLogger" backend\app backend\*.py
  └ backend\app\routes\ai_models.py:        logging.getLogger(__name__).warning("Failed to fetch AI models: %s", exc)
    backend\app\routes\flowchart.py:logger = logging.getLogger(__name__)
    … +70 lines (ctrl + t to view transcript)
    backend\app\tasks\barcode_tasks.py:logger = logging.getLogger(__name__)
• Ran Get-Content -Raw backend\app\extensions.py
  └ """Flask extensions initialization."""
        return celery

  └ """Flask Application Factory."""



    docker-compose.yml:59:      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD:-dev-only-password}@redis:6379/1
    … +30 lines (ctrl + t to view transcript)

• Running Get-Content docker-compose.yml -TotalCount 290

• Running Get-Content -Raw frontend\src\seo\seoData.ts

• Running Get-Content -Raw frontend\src\config\seo-tools.json

• Ran Get-Content docker-compose.yml -TotalCount 290
  └ services:
      # --- Redis ---
    … +286 lines (ctrl + t to view transcript)
          - /app/node_modules
        environment:

• Ran Get-Content -Raw frontend\src\seo\seoData.json
  └ {
      "toolPageSeeds": [
    … +898 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\config\seo-tools.json
  └ {
      "toolPages": [
    … +407 lines (ctrl + t to view transcript)
      ]
    }

• Ran Get-Content -Raw frontend\src\seo\seoData.ts
  └ // Prefer a generated SEO data file at build time if present (seoData.generated.json).
    // This file is optional and created by frontend/scripts/merge-keywords.mjs.
    … +190 lines (ctrl + t to view transcript)
      ];
    }

◦ Searching the web

• Searched

◦ Searching the web

• Searched https://registry.npmjs.org/react/latest

• Searching the web

• Searched PyPI Flask 3.1.3 Feb 19 2026 latest

◦ Searching the web

• Searched https://pypi.org/project/markitdown/0.0.1a5/

◦ Searching the web

• Searched https://pypi.org/project/markitdown/

• Searching the web

• Searched https://pypi.org/pypi/celery/

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Planning Status

  No code changes made. I verified system time via shell: 2026-05-19 12:02:16 +03:00.

  One referenced path was wrong: agents\rules\mandatory-rules.md does not exist. The valid file is .agents\rules\mandatory-rules.md, and I used it.

  Assumptions Requiring Approval

  1. “Any file format to .md” will mean: accept a broad but explicitly supported set of formats and return a Markdown representation. Unsupported formats fail cleanly with a useful error, not a best-effort crash.
  2. Images/videos will not be semantically described by an LLM in v1. For v1:
      - Images: OCR text + metadata where possible.
      - Video/audio: metadata and optionally transcript only if an existing lightweight extraction path exists.
  3. Output goal is token reduction for AI workflows, so the Markdown should prioritize extracted text, headings, tables, metadata, and concise summaries of non-text payloads, not visual fidelity.
  4. This is one new tool in the existing Dociva tool system, not a new product area or microservice.

  If you want true “AI describes every image/video frame into Markdown,” that is a different, heavier feature and should go through ai_heavy with cost controls.

  Release Check

  Official/current sources checked:

  - React GitHub latest shows 19.2.6, released May 6, 2026. Repo currently uses React 18. I would not upgrade React for this feature because it is unrelated and raises frontend regression risk. Source:
    https://github.com/facebook/react/releases
  - Flask latest on PyPI is 3.1.3, uploaded Feb 19, 2026. Source: https://pypi.org/project/Flask/
  - Celery latest on PyPI is 5.6.3, released Mar 26, 2026, production/stable. Source: https://pypi.org/project/celery/
  - Pillow latest observed on PyPI is 12.2.0, uploaded Apr 1, 2026. Source: https://pypi.org/project/pillow/
  - Microsoft MarkItDown latest on PyPI is 0.1.5, released Feb 20, 2026, with Python API and CLI for converting files to Markdown. It is marked Beta, so I would only use it behind our own service boundary and tests, not expose it direct
    ly as architecture. Source: https://pypi.org/project/markitdown/

  No deprecated versions should be introduced. Existing dependency ranges can remain unless tests expose incompatibility.

  Simplicity-First Architecture

  Backend:

  - New route: backend/app/routes/markdown_convert.py
      - POST /api/convert/to-markdown
      - Validates upload, quota, size, MIME, extension.
      - Saves file using existing generate_safe_path.
      - Enqueues Celery task only. No conversion in request handler.
  - New service: backend/app/services/markdown_convert_service.py
      - Single domain service for all Markdown conversion.
      - Strategy order:
          1. Text-like files: stream decode and wrap as Markdown/code fence where appropriate.
          2. PDF/Office/HTML/CSV/XLSX/PPTX: MarkItDown if approved, otherwise existing repo libraries where already present.
          3. Image: existing OCR path or metadata-only fallback.
          4. Video/audio: metadata-only fallback in v1 unless transcript support is already available.
      - Normalizes output to .md.
      - Enforces max output size and truncation guardrails.
  - New task: backend/app/tasks/markdown_convert_tasks.py
      - Queue routing:
          - PDF/Office/text/HTML/CSV: pdf_processing or default depending detected class.
          - Images: ocr_tasks if OCR is needed.
          - Video: video_processing.
      - Per-task soft/hard limits lower than global defaults where possible.
      - Uploads final .md via existing storage.
      - Uses existing finalize_task_tracking and cleanup.

  Frontend:

  - New component: frontend/src/components/tools/FileToMarkdown.tsx
      - Uses existing uploadFile, task polling, download URL flow.
      - UI: upload, detected filename/type, progress, result preview, download .md.
      - No nested cards, no marketing page. Actual tool is first screen.
  - Append manifest entry in frontend/src/config/toolManifest.ts
      - slug: file-to-markdown
      - category: conversion or utility
      - icon: FileCode or FileText

  SEO:

  - Add programmatic SEO seed to frontend/src/seo/seoData.json / generated SEO flow as appropriate:
      - focus keyword: file to markdown converter
      - supporting: convert file to md, image to markdown, document to markdown for AI
  - Ensure route inclusion is derived from manifest/SEO helpers, not duplicated manually.
  - Update i18n keys in en.json and ar.json at minimum, matching existing pattern.
  Use the existing Python logging.getLogger(__name__) pattern, but add a small centralized async logging initializer only if missing:

  - QueueHandler in Flask/Celery process.
  - QueueListener writing to console/file handler.
  - Never log raw filenames if sensitive, file content, extracted text, user secrets, or presigned URLs.

  PROJECT_MAP.md Content
  Backend: Flask, Python 3.12, Gunicorn
  Async: Celery, Redis, isolated queues
  Storage: existing storage_service, S3 or local fallback
  Frontend: React, Vite, TypeScript
  SEO: toolManifest + seoData seed/generated SEO assets

  [SYSTEM_FLOW]
  User uploads file -> Flask validates file/quota -> file saved to upload temp path -> Celery task queued -> markdown_convert_service converts to .md -> output stored -> task status returns download_url + preview -> scheduled cleanup
  removes expired files.

  [ARCHITECTURE]
  Route: backend/app/routes/markdown_convert.py
  Service: backend/app/services/markdown_convert_service.py
  Task: backend/app/tasks/markdown_convert_tasks.py
  Frontend tool: frontend/src/components/tools/FileToMarkdown.tsx
  Registration: frontend/src/config/toolManifest.ts
  SEO/i18n: frontend/src/seo/seoData.json, frontend/src/i18n/en.json, frontend/src/i18n/ar.json

  [ORPHANS & PENDING]
  - Confirm exact scope of “any file format”.
  - Decide whether MarkItDown 0.1.5 is acceptable despite Beta classifier.
  - Decide whether v1 includes OCR for images or metadata-only fallback.
  - Add tests for unsupported file, empty file, size limit, successful text file, successful PDF/Office path.

  Milestone Plan

  1. Architecture approval
     Verifiable goal: approved scope for “any file,” MarkItDown usage decision, and v1 media behavior.
  2. Backend skeleton
     Verifiable goal: route enqueues task; no heavy request work; tests cover missing file, invalid type, quota validation, task dispatch.
  3. Conversion service
     Verifiable goal: .txt, .md, .pdf or one Office format converts to deterministic .md; unsupported format returns controlled error.
  4. Celery integration
     Verifiable goal: task runs on isolated queue, respects timeout, stores output, cleans temp files, records history.
  5. Frontend tool
     Verifiable goal: upload, progress, polling, preview, and download work through existing API patterns.
  6. SEO and registration
     Verifiable goal: /tools/file-to-markdown route exists, manifest test passes, SEO data generation includes the new landing page.
  7. Verification
     Verifiable goal: run backend focused tests, frontend tests, TypeScript check, and production build.

  Awaiting approval on the assumptions, especially whether v1 should use MarkItDown and whether image/video conversion means OCR/metadata or AI-generated descriptions.

─ Worked for 3m 19s ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


› I agree to everything stated in the plan.

  Important note regarding the "any file" option: Any file that accepts conversion to .md format and is rejected, or displays a message to the user indicating that the file cannot be converted, should be converted to one of the formats
  specified on the website and then returned to attempt the conversion.
• I’ll implement this as an end-to-end feature now. The fallback rule will be handled inside the backend service as a bounded retry pipeline: direct Markdown extraction first, then one safe intermediate conversion path only when the file
  type has an existing supported conversion route in the app.

• Running Get-Content -Raw frontend\src\components\tools\OcrTool.tsx

• Running Get-Content -Raw backend\config\__init__.py

• Running Get-Content -Raw backend\app\routes\ocr.py

• Running Get-Content -Raw frontend\src\services\apiTypes.ts

• Ran Get-Content -Raw frontend\src\components\tools\OcrTool.tsx
  └ import { useState, useEffect } from 'react';
    import { useTranslation } from 'react-i18next';
    … +326 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\components\tools\TextCleaner.tsx
  └ import { useState } from 'react';
    import { useTranslation } from 'react-i18next';
    … +143 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\components\shared\ToolTemplate.tsx
  └ import { useState, useEffect, useCallback } from 'react';
    import { useTranslation } from 'react-i18next';
    … +244 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw backend\app\routes\ocr.py
  └ """OCR routes — extract text from images and PDFs."""
    import os
    … +153 lines (ctrl + t to view transcript)
        return jsonify({"languages": SUPPORTED_LANGUAGES}), 200


     * Shared TypeScript types for the API layer.
    … +291 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw backend\config\__init__.py
  └ import os
    from datetime import timedelta
    … +282 lines (ctrl + t to view transcript)
    }


◦ Searching the web

• Searched Microsoft MarkItDown PyPI extras all pdf docx xlsx pptx install

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• I’ve confirmed the existing app already has isolated Celery workers and a manifest-driven tool system, so the change can stay surgical: one route, one service, one task module, one React tool, and metadata/SEO registration. I’m
  checking quota behavior next so the new tool uses the same credit path without special casing.

• Running rg "tool_cost|TOOL|base_cost|DEFAULT" backend\app\services\policy_service.py backend\app\services\quote_service.py backend\app\services\credit_config.py frontend\src -n

• Running Get-Content -Raw backend\app\services\quote_service.py

• Running Get-Content -Raw backend\app\services\credit_config.py

• Ran Get-Content -Raw backend\app\services\credit_config.py
  └ """Unified Credit System — tool cost registry and credit constants.

    … +348 lines (ctrl + t to view transcript)
        return result


• Ran rg "tool_cost|TOOL|base_cost|DEFAULT" backend\app\services\policy_service.py backend\app\services\quote_service.py backend\app\services\credit_config.py frontend\src -n
  └ backend\app\services\credit_config.py:78:# TOOL_DYNAMIC_OVERRIDES below.
    backend\app\services\credit_config.py:79:HEAVY_DEFAULT_RULE = DynamicPricingRule(
    frontend\src\components\tools\PdfEditor.tsx:1228:              {/* ═══ TOOLBAR — scrollable with grouped tools ═══ */}

• Ran Get-Content -Raw backend\app\services\policy_service.py
  └ """Plan entitlements, actor resolution, and quota enforcement."""
    from dataclasses import dataclass
    … +302 lines (ctrl + t to view transcript)
        raise PolicyError("Task not found.", 404)


• Ran Get-Content -Raw backend\app\services\quote_service.py
  └ """Central credit-quote engine — calculate and lock a price before dispatch.

    … +208 lines (ctrl + t to view transcript)
        return deduct_credits_quoted(user_id, plan, quote.charged_credits)


• Running Get-Content -Raw backend\app\services\pdf_service.py

• Running Get-Content -Raw backend\app\services\pdf_convert_service.py

• Running Get-Content -Raw backend\app\services\image_service.py

• Ran Get-Content -Raw backend\app\services\pdf_service.py
  └ """PDF conversion service using LibreOffice headless."""
    import os
    … +123 lines (ctrl + t to view transcript)
            shutil.rmtree(user_install_dir, ignore_errors=True)


• Ran Get-Content -Raw backend\app\services\video_service.py
  └ """Video to GIF conversion service using ffmpeg."""
    import os
    … +173 lines (ctrl + t to view transcript)
        return 0, 0


• Ran Get-Content -Raw backend\app\services\image_service.py
  └ """Image processing service using Pillow."""
    import os
    … +231 lines (ctrl + t to view transcript)
            raise ImageProcessingError(f"Image to SVG conversion failed: {str(e)}")
• Ran Get-Content -Raw backend\app\services\pdf_convert_service.py
  └ """PDF conversion service — PDF↔PowerPoint, Excel→PDF, PowerPoint→PDF, Sign PDF."""
    import os
    … +275 lines (ctrl + t to view transcript)
            raise PDFConvertError(f"Failed to sign PDF: {str(e)}")


─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The implementation choice I’m applying for “rejected but convertible” is intentionally bounded: direct conversion is attempted first, then a single intermediate format conversion using existing site-supported paths such as Office to
  PDF, PPT to PDF, Excel to PDF, or image re-encoding before extracting Markdown. This avoids recursive conversion loops and keeps failures explainable.

• Running Get-Content -Raw frontend\src\hooks\useFileUpload.ts

• Running Get-Content -Raw frontend\src\hooks\useTaskPolling.ts

• Running Select-String -Path frontend\src\i18n\en.json -Pattern '"textCleaner"|"ocr"' -Context 0,30

• Running Select-String -Path frontend\src\i18n\ar.json -Pattern '"textCleaner"|"ocr"' -Context 0,30

• Ran Get-Content -Raw frontend\src\hooks\useTaskPolling.ts
  └ import { useState, useEffect, useCallback, useRef } from 'react';
    import { toast } from 'sonner';
    … +138 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\config\toolManifest.test.ts
  └ import { describe, it, expect } from 'vitest';
    import { TOOL_MANIFEST, getManifestSlugs } from '@/config/toolManifest';
    … +111 lines (ctrl + t to view transcript)
    });


• Ran Get-Content -Raw frontend\src\hooks\useFileUpload.ts
  └ import { useState, useCallback, useRef } from 'react';
    import { useTranslation } from 'react-i18next';
    … +149 lines (ctrl + t to view transcript)
    }


• Ran Select-String -Path frontend\src\i18n\ar.json -Pattern '"textCleaner"|"ocr"' -Context 0,30
  └
    > frontend\src\i18n\ar.json:781:    "ocr": {
    … +132 lines (ctrl + t to view transcript)
      frontend\src\i18n\ar.json:2801:        },


• Ran Select-String -Path frontend\src\i18n\en.json -Pattern '"textCleaner"|"ocr"' -Context 0,30
  └
    > frontend\src\i18n\en.json:737:    "ocr": {
    … +180 lines (ctrl + t to view transcript)
      frontend\src\i18n\en.json:1898:    },


• Running Get-Content -Raw frontend\src\components\shared\ManifestToolIcon.tsx

• Running Get-Content frontend\src\config\seoData.ts -Tail 120

• Ran Get-Content frontend\src\config\seoData.ts -Tail 120
  └     features: [
          'Rotate images by 90°, 180°, or 270°',
    … +116 lines (ctrl + t to view transcript)
      return internalLinks.slice(0, limit);
    }

• Ran Get-Content -Raw frontend\src\config\seoData.ts | Select-Object -First 1
  └ /**
     * Central SEO configuration for all tools.
    … +992 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\components\shared\ManifestToolIcon.tsx
  └ import {
      ArrowUpDown,
    … +78 lines (ctrl + t to view transcript)
      return <Icon className={className} />;
    }

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• I’m about to edit the backend and frontend files. The backend service will keep conversion logic domain-contained, and the route will only validate, save, quote, enqueue, and record usage.

• Edited 5 files (+693 -0)
  └ PROJECT_MAP.md (+23 -0)
     1 +[TECH_STACK]
     2 +Backend: Flask, Python 3.12, Gunicorn
     3 +Async: Celery, Redis, isolated queues
     4 +Storage: existing storage_service, S3 or local fallback
     5 +Frontend: React, Vite, TypeScript
     6 +SEO: toolManifest + seoData seed/generated SEO assets
     7 +
     8 +[SYSTEM_FLOW]
     9 +User uploads file -> Flask validates file/quota -> file saved to upload temp path -> Celery task queued -> markdown_convert_service converts to .md -> output stored -> task status returns download_url + preview -> scheduled clean
        up removes expired files.
    10 +
    11 +[ARCHITECTURE]
    12 +Route: backend/app/routes/markdown_convert.py
    13 +Service: backend/app/services/markdown_convert_service.py
    14 +Task: backend/app/tasks/markdown_convert_tasks.py
    15 +Frontend tool: frontend/src/components/tools/FileToMarkdown.tsx
    16 +Registration: frontend/src/config/toolManifest.ts
    17 +SEO/i18n: frontend/src/config/seoData.ts, frontend/src/seo/seoData.json, frontend/src/i18n/en.json, frontend/src/i18n/ar.json
    18 +
    19 +[ORPHANS & PENDING]
    20 +- MarkItDown 0.1.5 is used as the preferred direct converter, with native and one-step intermediate fallbacks.
    21 +- Image Markdown output uses OCR when available, otherwise image metadata.
    22 +- Video Markdown output is metadata-only in v1 unless a transcript-capable converter is installed.
    23 +- Legacy Office files use the existing LibreOffice-to-PDF path before Markdown extraction.

  └ backend\app\routes\markdown_convert.py (+78 -0)
     1 +"""Routes for converting files to Markdown."""
     2 +
     3 +import os
     4 +
     5 +from flask import Blueprint, jsonify, request
     6 +
     7 +from app.extensions import limiter
     8 +from app.services.markdown_convert_service import SUPPORTED_MARKDOWN_TYPES
     9 +from app.services.policy_service import (
    10 +    PolicyError,
    11 +    assert_quota_available,
    12 +    build_task_tracking_kwargs,
    13 +    record_accepted_usage,
    14 +    resolve_web_actor,
    15 +    validate_actor_file,
    16 +)
    17 +from app.services.quote_service import QuoteError, create_quote
    18 +from app.utils.file_validator import FileValidationError
    19 +from app.utils.sanitizer import generate_safe_path
    20 +from app.utils.task_queue import enqueue_task
    21 +
    22 +markdown_convert_bp = Blueprint("markdown_convert", __name__)
    23 +
    24 +
    25 +@markdown_convert_bp.route("/to-markdown", methods=["POST"])
    26 +@limiter.limit("8/minute")
    27 +def file_to_markdown_route():
    28 +    """Upload a supported file and convert it to Markdown asynchronously."""
    29 +
    30 +    if "file" not in request.files:
    31 +        return jsonify({"error": "No file provided."}), 400
    32 +
    33 +    file = request.files["file"]
    34 +    actor = resolve_web_actor()
    35 +
    36 +    try:
    37 +        assert_quota_available(actor, tool="file-to-markdown")
    38 +    except PolicyError as exc:
    39 +        return jsonify({"error": exc.message}), exc.status_code
    40 +
    41 +    try:
    42 +        original_filename, ext = validate_actor_file(
    43 +            file,
    44 +            allowed_types=SUPPORTED_MARKDOWN_TYPES,
    45 +            actor=actor,
    46 +        )
    47 +    except FileValidationError as exc:
    48 +        return jsonify({"error": exc.message}), exc.code
    49 +
    50 +    task_id, input_path = generate_safe_path(ext, folder_type="upload")
    51 +    file.save(input_path)
    52 +
    53 +    file_size_kb = os.path.getsize(input_path) / 1024
    54 +    try:
    55 +        quote = create_quote(
    56 +            actor.user_id,
    57 +            actor.plan,
    58 +            "file-to-markdown",
    59 +            file_size_kb=file_size_kb,
    60 +        )
    61 +    except QuoteError as exc:
    62 +        return jsonify({"error": exc.message}), exc.status_code
    63 +
    64 +    task = enqueue_task(
    65 +        "app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
    66 +        input_path,
    67 +        task_id,
    68 +        original_filename,
    69 +        ext,
    70 +        **build_task_tracking_kwargs(actor),
    71 +    )
    72 +    record_accepted_usage(actor, "file-to-markdown", task.id, quote=quote)
    73 +
    74 +    return jsonify({
    75 +        "task_id": task.id,
    76 +        "message": "Markdown conversion started. Poll /api/tasks/{task_id}/status for progress.",
    77 +        "quote": quote.to_dict(),
    78 +    }), 202

  └ backend\app\services\markdown_convert_service.py (+438 -0)
      1 +"""Convert supported file formats into compact Markdown."""
      2 +
      3 +from __future__ import annotations
      4 +
      5 +import csv
      6 +import html
      7 +import json
      8 +import os
      9 +import re
     10 +import subprocess
     11 +import zipfile
     12 +from dataclasses import dataclass
     13 +from html.parser import HTMLParser
     14 +from pathlib import Path
     15 +from typing import Callable
     16 +from xml.etree import ElementTree
     17 +
     18 +from PIL import Image
     19 +
     20 +from app.services.image_service import convert_image
     21 +from app.services.ocr_service import OCRError, ocr_image
     22 +from app.services.pdf_convert_service import excel_to_pdf, pptx_to_pdf
     23 +from app.services.pdf_service import word_to_pdf
     24 +from app.services.video_service import get_video_duration
     25 +
     26 +
     27 +class MarkdownConversionError(Exception):
     28 +    """Raised when a file cannot produce useful Markdown."""
     29 +
     30 +
     31 +@dataclass(frozen=True)
     32 +class MarkdownConversionResult:
     33 +    """Result returned by the Markdown conversion service."""
     34 +
     35 +    markdown: str
     36 +    method: str
     37 +    char_count: int
     38 +
     39 +
     40 +TEXT_EXTENSIONS = {"txt", "md", "markdown", "csv", "json", "xml", "log"}
     41 +IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "tiff", "bmp"}
     42 +VIDEO_EXTENSIONS = {"mp4", "webm"}
     43 +OFFICE_TO_PDF_EXTENSIONS = {"doc", "docx", "xls", "xlsx", "ppt", "pptx"}
     44 +SUPPORTED_MARKDOWN_TYPES = sorted(
     45 +    {
     46 +        "pdf",
     47 +        "doc",
     48 +        "docx",
     49 +        "html",
     50 +        "htm",
     51 +        "zip",
     52 +        "png",
     53 +        "jpg",
     54 +        "jpeg",
     55 +        "webp",
     56 +        "tiff",
     57 +        "bmp",
     58 +        "mp4",
     59 +        "webm",
     60 +        "pptx",
     61 +        "ppt",
     62 +        "xlsx",
     63 +        "xls",
     64 +        "txt",
     65 +        "md",
     66 +        "markdown",
     67 +        "csv",
     68 +        "json",
     69 +        "xml",
     70 +        "log",
     71 +    }
     72 +)
     73 +
     74 +MAX_MARKDOWN_CHARS = 1_000_000
     75 +MAX_ZIP_ENTRIES = 256
     76 +
     77 +
     78 +class _HTMLTextExtractor(HTMLParser):
     79 +    """Small HTML-to-text parser good enough for Markdown fallback."""
     80 +
     81 +    BLOCK_TAGS = {"p", "div", "section", "article", "br", "li", "tr", "h1", "h2", "h3"}
     82 +
     83 +    def __init__(self):
     84 +        super().__init__()
     85 +        self.parts: list[str] = []
     86 +
     87 +    def handle_starttag(self, tag: str, attrs):
     88 +        if tag in {"h1", "h2", "h3"}:
     89 +            self.parts.append("\n\n" + "#" * int(tag[1]) + " ")
     90 +        elif tag == "li":
     91 +            self.parts.append("\n- ")
     92 +
     93 +    def handle_endtag(self, tag: str):
     94 +        if tag in self.BLOCK_TAGS:
     95 +            self.parts.append("\n")
     96 +
     97 +    def handle_data(self, data: str):
     98 +        text = html.unescape(data).strip()
     99 +        if text:
    100 +            self.parts.append(text + " ")
    101 +
    102 +    def text(self) -> str:
    103 +        return _normalize_text("".join(self.parts))
    104 +
    105 +
    106 +def convert_file_to_markdown(
    107 +    input_path: str,
    108 +    output_path: str,
    109 +    *,
    110 +    original_filename: str,
    111 +    ext: str,
    112 +    work_dir: str,
    113 +) -> MarkdownConversionResult:
    114 +    """Convert one uploaded file to Markdown and write it to *output_path*."""
    115 +
    116 +    ext = ext.lower().lstrip(".")
    117 +    source_title = Path(original_filename).stem or "converted-file"
    118 +    attempts: list[str] = []
    119 +
    120 +    converters: list[tuple[str, Callable[[], str]]] = [
    121 +        ("markitdown", lambda: _convert_with_markitdown(input_path)),
    122 +        ("native", lambda: _convert_native(input_path, ext, original_filename)),
    123 +        (
    124 +            "intermediate",
    125 +            lambda: _convert_via_supported_intermediate(
    126 +                input_path, ext, original_filename, work_dir
    127 +            ),
    128 +        ),
    129 +    ]
    130 +
    131 +    for method, converter in converters:
    132 +        try:
    133 +            markdown = converter()
    134 +            markdown = _finalize_markdown(markdown, source_title, method)
    135 +            _write_markdown(output_path, markdown)
    136 +            return MarkdownConversionResult(
    137 +                markdown=markdown,
    138 +                method=method,
    139 +                char_count=len(markdown),
    140 +            )
    141 +        except MarkdownConversionError as exc:
    142 +            attempts.append(f"{method}: {exc}")
    143 +        except Exception as exc:
    144 +            attempts.append(f"{method}: {exc.__class__.__name__}")
    145 +
    146 +    raise MarkdownConversionError(
    147 +        "This file could not be converted to Markdown after direct and "
    148 +        "supported intermediate conversion attempts."
    149 +    )
    150 +
    151 +
    152 +def _convert_with_markitdown(input_path: str) -> str:
    153 +    try:
    154 +        from markitdown import MarkItDown
    155 +    except ImportError as exc:
    156 +        raise MarkdownConversionError("MarkItDown is not installed.") from exc
    157 +
    158 +    result = MarkItDown().convert(input_path)
    159 +    markdown = getattr(result, "text_content", None)
    160 +    if not markdown:
    161 +        markdown = str(result) if result else ""
    162 +    return _require_content(markdown, "MarkItDown returned no content.")
    163 +
    164 +
    165 +def _convert_native(input_path: str, ext: str, original_filename: str) -> str:
    166 +    if ext in {"md", "markdown"}:
    167 +        return _read_text(input_path)
    168 +    if ext in {"txt", "log"}:
    169 +        return f"```text\n{_read_text(input_path)}\n```"
    170 +    if ext == "csv":
    171 +        return _csv_to_markdown(input_path)
    172 +    if ext == "json":
    173 +        return f"```json\n{json.dumps(json.loads(_read_text(input_path)), indent=2, ensure_ascii=False)}\n```"
    174 +    if ext == "xml":
    175 +        return f"```xml\n{_read_text(input_path)}\n```"
    176 +    if ext in {"html", "htm"}:
    177 +        return _html_to_markdown(input_path)
    178 +    if ext == "pdf":
    179 +        return _pdf_to_markdown(input_path)
    180 +    if ext == "docx":
    181 +        return _docx_to_markdown(input_path)
    182 +    if ext == "xlsx":
    183 +        return _xlsx_to_markdown(input_path)
    184 +    if ext == "pptx":
    185 +        return _pptx_to_markdown(input_path)
    186 +    if ext in IMAGE_EXTENSIONS:
    187 +        return _image_to_markdown(input_path, original_filename)
    188 +    if ext in VIDEO_EXTENSIONS:
    189 +        return _video_to_markdown(input_path, original_filename)
    190 +    if ext == "zip":
    191 +        return _zip_to_markdown(input_path)
    192 +    raise MarkdownConversionError(f"No native Markdown path for .{ext}.")
    193 +
    194 +
    195 +def _convert_via_supported_intermediate(
    196 +    input_path: str,
    197 +    ext: str,
    198 +    original_filename: str,
    199 +    work_dir: str,
    200 +) -> str:
    201 +    os.makedirs(work_dir, exist_ok=True)
    202 +
    203 +    if ext in {"doc", "docx"}:
    204 +        pdf_path = word_to_pdf(input_path, work_dir)
    205 +        return _pdf_to_markdown(pdf_path)
    206 +
    207 +    if ext in {"xls", "xlsx"}:
    208 +        pdf_path = excel_to_pdf(input_path, work_dir)
    209 +        return _pdf_to_markdown(pdf_path)
    210 +
    211 +    if ext in {"ppt", "pptx"}:
    212 +        pdf_path = pptx_to_pdf(input_path, work_dir)
    213 +        return _pdf_to_markdown(pdf_path)
    214 +
    215 +    if ext in IMAGE_EXTENSIONS:
    216 +        png_path = os.path.join(work_dir, f"{Path(original_filename).stem or 'image'}.png")
    217 +        convert_image(input_path, png_path, "png")
    218 +        return _image_to_markdown(png_path, original_filename)
    219 +
    220 +    raise MarkdownConversionError(f"No supported intermediate path for .{ext}.")
    221 +
    222 +
    223 +def _read_text(input_path: str) -> str:
    224 +    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
    225 +        try:
    226 +            with open(input_path, "r", encoding=encoding) as handle:
    227 +                return _require_content(handle.read(), "Text file is empty.")
    228 +        except UnicodeDecodeError:
    229 +            continue
    230 +    raise MarkdownConversionError("Could not decode text file.")
    231 +
    232 +
    233 +def _csv_to_markdown(input_path: str) -> str:
    234 +    with open(input_path, "r", encoding="utf-8-sig", newline="") as handle:
    235 +        rows = list(csv.reader(handle))
    236 +    rows = [row for row in rows if any(cell.strip() for cell in row)]
    237 +    if not rows:
    238 +        raise MarkdownConversionError("CSV file contains no rows.")
    239 +    return _rows_to_markdown(rows[:500])
    240 +
    241 +
    242 +def _html_to_markdown(input_path: str) -> str:
    243 +    parser = _HTMLTextExtractor()
    244 +    parser.feed(_read_text(input_path))
    245 +    return _require_content(parser.text(), "HTML file contains no readable text.")
    246 +
    247 +
    248 +def _pdf_to_markdown(input_path: str) -> str:
    249 +    try:
    250 +        from pypdf import PdfReader
    251 +    except ImportError:
    252 +        from PyPDF2 import PdfReader
    253 +
    254 +    reader = PdfReader(input_path)
    255 +    parts = []
    256 +    for index, page in enumerate(reader.pages, start=1):
    257 +        text = _normalize_text(page.extract_text() or "")
    258 +        if text:
    259 +            parts.append(f"## Page {index}\n\n{text}")
    260 +    return _require_content("\n\n".join(parts), "PDF contains no extractable text.")
    261 +
    262 +
    263 +def _docx_to_markdown(input_path: str) -> str:
    264 +    try:
    265 +        with zipfile.ZipFile(input_path) as archive:
    266 +            xml = archive.read("word/document.xml")
    267 +    except (KeyError, zipfile.BadZipFile) as exc:
    268 +        raise MarkdownConversionError("DOCX content could not be read.") from exc
    269 +
    270 +    root = ElementTree.fromstring(xml)
    271 +    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    272 +    paragraphs = []
    273 +    for paragraph in root.findall(".//w:p", namespace):
    274 +        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", namespace))
    275 +        if text.strip():
    276 +            paragraphs.append(text.strip())
    277 +    return _require_content("\n\n".join(paragraphs), "DOCX contains no readable text.")
    278 +
    279 +
    280 +def _xlsx_to_markdown(input_path: str) -> str:
    281 +    from openpyxl import load_workbook
    282 +
    283 +    workbook = load_workbook(input_path, read_only=True, data_only=True)
    284 +    parts = []
    285 +    for sheet in workbook.worksheets:
    286 +        rows = []
    287 +        for row in sheet.iter_rows(max_row=200, values_only=True):
    288 +            values = ["" if value is None else str(value) for value in row]
    289 +            if any(value.strip() for value in values):
    290 +                rows.append(values)
    291 +        if rows:
    292 +            parts.append(f"## {sheet.title}\n\n{_rows_to_markdown(rows)}")
    293 +    workbook.close()
    294 +    return _require_content("\n\n".join(parts), "Spreadsheet contains no readable rows.")
    295 +
    296 +
    297 +def _pptx_to_markdown(input_path: str) -> str:
    298 +    from pptx import Presentation
    299 +
    300 +    presentation = Presentation(input_path)
    301 +    parts = []
    302 +    for index, slide in enumerate(presentation.slides, start=1):
    303 +        texts = []
    304 +        for shape in slide.shapes:
    305 +            if getattr(shape, "has_text_frame", False):
    306 +                text = _normalize_text(shape.text)
    307 +                if text:
    308 +                    texts.append(text)
    309 +        if texts:
    310 +            parts.append(f"## Slide {index}\n\n" + "\n\n".join(texts))
    311 +    return _require_content("\n\n".join(parts), "Presentation contains no readable text.")
    312 +
    313 +
    314 +def _image_to_markdown(input_path: str, original_filename: str) -> str:
    315 +    metadata = []
    316 +    try:
    317 +        with Image.open(input_path) as image:
    318 +            metadata.append(f"- Dimensions: {image.width} x {image.height}")
    319 +            metadata.append(f"- Mode: {image.mode}")
    320 +            metadata.append(f"- Format: {image.format or Path(input_path).suffix.lstrip('.')}")
    321 +    except Exception:
    322 +        metadata.append("- Image metadata could not be read.")
    323 +
    324 +    text = ""
    325 +    try:
    326 +        text = (ocr_image(input_path, lang="eng") or {}).get("text", "")
    327 +    except (OCRError, RuntimeError, OSError):
    328 +        text = ""
    329 +
    330 +    sections = [f"## Image\n\n- Source: {original_filename}", "\n".join(metadata)]
    331 +    if text.strip():
    332 +        sections.append("## Extracted Text\n\n" + _normalize_text(text))
    333 +    else:
    334 +        sections.append(
    335 +            "## Extracted Text\n\nNo OCR text was detected. The Markdown output includes image metadata only."
    336 +        )
    337 +    return "\n\n".join(sections)
    338 +
    339 +
    340 +def _video_to_markdown(input_path: str, original_filename: str) -> str:
    341 +    duration = get_video_duration(input_path)
    342 +    details = [f"- Source: {original_filename}"]
    343 +    if duration > 0:
    344 +        details.append(f"- Duration: {duration:.2f} seconds")
    345 +    details.extend(_ffprobe_stream_details(input_path))
    346 +    return "\n".join(["## Video", "", *details])
    347 +
    348 +
    349 +def _ffprobe_stream_details(input_path: str) -> list[str]:
    350 +    cmd = [
    351 +        "ffprobe",
    352 +        "-v",
    353 +        "error",
    354 +        "-show_entries",
    355 +        "stream=codec_type,codec_name,width,height",
    356 +        "-of",
    357 +        "json",
    358 +        input_path,
    359 +    ]
    360 +    try:
    361 +        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    362 +        if result.returncode != 0:
    363 +            return []
    364 +        payload = json.loads(result.stdout or "{}")
    365 +    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError):
    366 +        return []
    367 +
    368 +    details = []
    369 +    for stream in payload.get("streams", []):
    370 +        codec_type = stream.get("codec_type", "stream")
    371 +        codec_name = stream.get("codec_name", "unknown")
    372 +        dimensions = ""
    373 +        if stream.get("width") and stream.get("height"):
    374 +            dimensions = f", {stream['width']} x {stream['height']}"
    375 +        details.append(f"- {codec_type.title()} stream: {codec_name}{dimensions}")
    376 +    return details
    377 +
    378 +
    379 +def _zip_to_markdown(input_path: str) -> str:
    380 +    try:
    381 +        with zipfile.ZipFile(input_path) as archive:
    382 +            entries = archive.infolist()
    383 +    except zipfile.BadZipFile as exc:
    384 +        raise MarkdownConversionError("ZIP archive could not be read.") from exc
    385 +
    386 +    if len(entries) > MAX_ZIP_ENTRIES:
    387 +        raise MarkdownConversionError("ZIP archive has too many entries.")
    388 +    rows = [["Path", "Size bytes"]]
    389 +    for entry in entries:
    390 +        if entry.file_size > 100 * 1024 * 1024:
    391 +            raise MarkdownConversionError("ZIP archive contains an oversized entry.")
    392 +        rows.append([entry.filename, str(entry.file_size)])
    393 +    return "## Archive Contents\n\n" + _rows_to_markdown(rows)
    394 +
    395 +
    396 +def _rows_to_markdown(rows: list[list[str]]) -> str:
    397 +    width = max(len(row) for row in rows)
    398 +    normalized = [[_escape_table_cell(cell) for cell in row + [""] * (width - len(row))] for row in rows]
    399 +    header = normalized[0]
    400 +    body = normalized[1:] or [["" for _ in range(width)]]
    401 +    lines = [
    402 +        "| " + " | ".join(header) + " |",
    403 +        "| " + " | ".join("---" for _ in header) + " |",
    404 +    ]
    405 +    lines.extend("| " + " | ".join(row) + " |" for row in body)
    406 +    return "\n".join(lines)
    407 +
    408 +
    409 +def _escape_table_cell(value: object) -> str:
    410 +    return str(value).replace("|", "\\|").replace("\n", " ").strip()
    411 +
    412 +
    413 +def _normalize_text(value: str) -> str:
    414 +    value = re.sub(r"[ \t]+", " ", value)
    415 +    value = re.sub(r"\n{3,}", "\n\n", value)
    416 +    return value.strip()
    417 +
    418 +
    419 +def _require_content(markdown: str, message: str) -> str:
    420 +    markdown = _normalize_text(markdown)
    421 +    if not markdown:
    422 +        raise MarkdownConversionError(message)
    423 +    return markdown
    424 +
    425 +
    426 +def _finalize_markdown(markdown: str, source_title: str, method: str) -> str:
    427 +    markdown = _require_content(markdown, "Markdown output is empty.")
    428 +    if len(markdown) > MAX_MARKDOWN_CHARS:
    429 +        markdown = markdown[:MAX_MARKDOWN_CHARS] + "\n\n<!-- Output truncated by safety limit. -->"
    430 +    if not markdown.lstrip().startswith("#"):
    431 +        markdown = f"# {source_title}\n\n{markdown}"
    432 +    return f"{markdown}\n\n<!-- Converted by Dociva using {method}. -->\n"
    433 +
    434 +
    435 +def _write_markdown(output_path: str, markdown: str) -> None:
    436 +    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    437 +    with open(output_path, "w", encoding="utf-8", newline="\n") as handle:
    438 +        handle.write(markdown)

  └ backend\app\tasks\markdown_convert_tasks.py (+151 -0)
      1 +"""Celery tasks for file-to-Markdown conversion."""
      2 +
      3 +from __future__ import annotations
      4 +
      5 +import logging
      6 +import os
      7 +
      8 +from flask import current_app
      9 +
     10 +from app.extensions import celery
     11 +from app.services.markdown_convert_service import (
     12 +    MarkdownConversionError,
     13 +    convert_file_to_markdown,
     14 +)
     15 +from app.services.storage_service import storage
     16 +from app.services.task_tracking_service import finalize_task_tracking
     17 +from app.utils.sanitizer import cleanup_task_files
     18 +
     19 +logger = logging.getLogger(__name__)
     20 +
     21 +
     22 +def _cleanup(task_id: str):
     23 +    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)
     24 +
     25 +
     26 +def _get_output_dir(task_id: str) -> str:
     27 +    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
     28 +    os.makedirs(output_dir, exist_ok=True)
     29 +    return output_dir
     30 +
     31 +
     32 +def _finalize_task(
     33 +    task_id: str,
     34 +    user_id: int | None,
     35 +    original_filename: str,
     36 +    result: dict,
     37 +    usage_source: str,
     38 +    api_key_id: int | None,
     39 +    celery_task_id: str | None,
     40 +):
     41 +    finalize_task_tracking(
     42 +        user_id=user_id,
     43 +        tool="file-to-markdown",
     44 +        original_filename=original_filename,
     45 +        result=result,
     46 +        usage_source=usage_source,
     47 +        api_key_id=api_key_id,
     48 +        celery_task_id=celery_task_id,
     49 +    )
     50 +    _cleanup(task_id)
     51 +    return result
     52 +
     53 +
     54 +@celery.task(
     55 +    bind=True,
     56 +    name="app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
     57 +    soft_time_limit=900,
     58 +    time_limit=960,
     59 +)
     60 +def convert_file_to_markdown_task(
     61 +    self,
     62 +    input_path: str,
     63 +    task_id: str,
     64 +    original_filename: str,
     65 +    ext: str,
     66 +    user_id: int | None = None,
     67 +    usage_source: str = "web",
     68 +    api_key_id: int | None = None,
     69 +):
     70 +    """Async task: convert one uploaded file into Markdown."""
     71 +
     72 +    output_dir = _get_output_dir(task_id)
     73 +    name_without_ext = os.path.splitext(original_filename)[0] or "converted-file"
     74 +    output_path = os.path.join(output_dir, f"{task_id}.md")
     75 +    download_name = f"{name_without_ext}.md"
     76 +
     77 +    try:
     78 +        self.update_state(state="PROCESSING", meta={"step": "Extracting Markdown..."})
     79 +        conversion = convert_file_to_markdown(
     80 +            input_path,
     81 +            output_path,
     82 +            original_filename=original_filename,
     83 +            ext=ext,
     84 +            work_dir=output_dir,
     85 +        )
     86 +
     87 +        self.update_state(state="PROCESSING", meta={"step": "Storing Markdown..."})
     88 +        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
     89 +        download_url = storage.generate_presigned_url(
     90 +            s3_key,
     91 +            original_filename=download_name,
     92 +        )
     93 +
     94 +        result = {
     95 +            "status": "completed",
     96 +            "download_url": download_url,
     97 +            "filename": download_name,
     98 +            "output_size": os.path.getsize(output_path),
     99 +            "text": conversion.markdown[:5000],
    100 +            "char_count": conversion.char_count,
    101 +            "format": "md",
    102 +            "conversion_method": conversion.method,
    103 +        }
    104 +        logger.info(
    105 +            "Task %s: file-to-markdown completed via %s (%d chars)",
    106 +            task_id,
    107 +            conversion.method,
    108 +            conversion.char_count,
    109 +        )
    110 +        return _finalize_task(
    111 +            task_id,
    112 +            user_id,
    113 +            original_filename,
    114 +            result,
    115 +            usage_source,
    116 +            api_key_id,
    117 +            self.request.id,
    118 +        )
    119 +
    120 +    except MarkdownConversionError as exc:
    121 +        logger.warning("Task %s: Markdown conversion failed: %s", task_id, exc)
    122 +        return _finalize_task(
    123 +            task_id,
    124 +            user_id,
    125 +            original_filename,
    126 +            {
    127 +                "status": "failed",
    128 +                "error": str(exc),
    129 +                "error_code": "MARKDOWN_CONVERSION_UNSUPPORTED",
    130 +                "user_message": str(exc),
    131 +            },
    132 +            usage_source,
    133 +            api_key_id,
    134 +            self.request.id,
    135 +        )
    136 +    except Exception:
    137 +        logger.exception("Task %s: Unexpected Markdown conversion error", task_id)
    138 +        return _finalize_task(
    139 +            task_id,
    140 +            user_id,
    141 +            original_filename,
    142 +            {
    143 +                "status": "failed",
    144 +                "error": "An unexpected error occurred.",
    145 +                "error_code": "MARKDOWN_CONVERSION_FAILED",
    146 +                "user_message": "The file could not be converted to Markdown.",
    147 +            },
    148 +            usage_source,
    149 +            api_key_id,
    150 +            self.request.id,
  └ backend\requirements.txt (+3 -0)
    88  google-generativeai>=0.1,<1.0
    89 +
    90 +# File to Markdown
    91 +markitdown[all]>=0.1.5,<0.2.0

• Edited 4 files (+21 -2)
  └ backend\app\__init__.py (+2 -0)
    192      from app.routes.html_to_pdf import html_to_pdf_bp
    193 +    from app.routes.markdown_convert import markdown_convert_bp
    194      from app.routes.pdf_ai import pdf_ai_bp
        ⋮
    231      app.register_blueprint(html_to_pdf_bp, url_prefix="/api/convert")
    232 +    app.register_blueprint(markdown_convert_bp, url_prefix="/api/convert")
    233      app.register_blueprint(pdf_ai_bp, url_prefix="/api/pdf-ai")

  └ backend\app\extensions.py (+2 -0)
     30      "app.tasks.image_tasks",
     31 +    "app.tasks.markdown_convert_tasks",
     32      "app.tasks.maintenance_tasks",
        ⋮
     99          "app.tasks.html_to_pdf_tasks.*": {"queue": "pdf_processing"},
    100 +        "app.tasks.markdown_convert_tasks.*": {"queue": "pdf_processing"},
  └ backend\app\services\credit_config.py (+3 -2)
    187      "pptx-to-pdf": TIER_MEDIUM,
    188 -    "html-to-pdf": TIER_MEDIUM,
    189 -    "pdf-editor": TIER_MEDIUM,
    188 +    "html-to-pdf": TIER_MEDIUM,
    189 +    "pdf-editor": TIER_MEDIUM,
    190 +    "file-to-markdown": TIER_HEAVY,
    191

  └ backend\config\__init__.py (+14 -0)
     76          "xls": ["application/vnd.ms-excel"],
     77 +        "txt": ["text/plain"],
     78 +        "md": ["text/markdown", "text/plain"],
     79 +        "markdown": ["text/markdown", "text/plain"],
     80 +        "csv": ["text/csv", "text/plain", "application/csv"],
     81 +        "json": ["application/json", "text/plain"],
     82 +        "xml": ["application/xml", "text/xml", "text/plain"],
     83 +        "log": ["text/plain"],
     84      }
        ⋮
    105          "xls": 15 * 1024 * 1024,  # 15MB
    106 +        "txt": 10 * 1024 * 1024,  # 10MB
    107 +        "md": 10 * 1024 * 1024,  # 10MB
    110 +        "json": 10 * 1024 * 1024,  # 10MB
    111 +        "xml": 10 * 1024 * 1024,  # 10MB
    112 +        "log": 10 * 1024 * 1024,  # 10MB
    113      }

• Running Get-Content -Raw backend\tests\conftest.py

• Running Get-Content -Raw backend\tests\test_convert.py

• Ran Get-Content -Raw backend\tests\test_file_validator.py
  └ """Tests for file validation utility."""

    … +190 lines (ctrl + t to view transcript)
                assert ext == "pdf"


• Ran Get-Content -Raw backend\tests\test_convert.py
  └ """Tests for file conversion endpoints."""
    import io
    … +39 lines (ctrl + t to view transcript)
        assert response.status_code == 400


• Ran Get-Content -Raw backend\tests\conftest.py
  └ import io
    import os
    … +163 lines (ctrl + t to view transcript)
            yield mock_m


• Running Get-Content -Raw frontend\src\components\shared\FileUploader.tsx

• Running Get-Content -Raw frontend\src\components\shared\DownloadButton.tsx

• Ran Get-Content -Raw frontend\src\components\shared\FileUploader.tsx
  └ import { useState, useCallback } from 'react';
    import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
    … +145 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\components\shared\ProgressBar.tsx
  └ import { useTranslation } from 'react-i18next';
    import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
    … +136 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\components\shared\DownloadButton.tsx
  └ import { useState } from 'react';
    import { useTranslation } from 'react-i18next';
    … +145 lines (ctrl + t to view transcript)
    }


• Ran Get-Content -Raw frontend\src\services\api.ts
  └ /**
     * API barrel file — re-exports everything from the split modules so existing
    … +120 lines (ctrl + t to view transcript)
    } from './adminApi';


• Edited 3 files (+224 -9)
  └ frontend\src\components\tools\FileToMarkdown.tsx (+202 -0)
      1 +import { useEffect, useState } from 'react';
      2 +import { useTranslation } from 'react-i18next';
      3 +import { FileText, Copy, Check } from 'lucide-react';
      4 +import FileUploader from '@/components/shared/FileUploader';
      5 +import ProgressBar from '@/components/shared/ProgressBar';
      6 +import DownloadButton from '@/components/shared/DownloadButton';
      7 +import AdSlot from '@/components/layout/AdSlot';
      8 +import { useFileUpload } from '@/hooks/useFileUpload';
      9 +import { useTaskPolling } from '@/hooks/useTaskPolling';
     10 +import { useFileStore } from '@/stores/fileStore';
     11 +import { useConfig } from '@/hooks/useConfig';
     12 +
     13 +const ACCEPTED_TYPES = [
     14 +  'pdf', 'doc', 'docx', 'html', 'htm', 'zip',
     15 +  'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp',
     16 +  'mp4', 'webm', 'pptx', 'ppt', 'xlsx', 'xls',
     17 +  'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log',
     18 +];
     19 +
     20 +const ACCEPT_MAP = {
     21 +  'application/pdf': ['.pdf'],
     22 +  'application/msword': ['.doc'],
     23 +  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
     24 +  'application/vnd.ms-powerpoint': ['.ppt'],
     25 +  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
     26 +  'application/vnd.ms-excel': ['.xls'],
     27 +  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
     28 +  'text/html': ['.html', '.htm'],
     29 +  'text/plain': ['.txt', '.md', '.markdown', '.log'],
     30 +  'text/csv': ['.csv'],
     31 +  'application/json': ['.json'],
     32 +  'application/xml': ['.xml'],
     33 +  'application/zip': ['.zip'],
     34 +  'image/png': ['.png'],
     35 +  'image/jpeg': ['.jpg', '.jpeg'],
     36 +  'image/webp': ['.webp'],
     37 +  'image/tiff': ['.tiff'],
     38 +  'image/bmp': ['.bmp'],
     39 +  'video/mp4': ['.mp4'],
     40 +  'video/webm': ['.webm'],
     41 +};
     42 +
     43 +export default function FileToMarkdown() {
     44 +  const { t } = useTranslation();
     45 +  const { limits } = useConfig();
     46 +  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
     47 +  const [preview, setPreview] = useState('');
     48 +  const [copied, setCopied] = useState(false);
     49 +
     50 +  const maxSize = Math.max(limits.pdf ?? 20, limits.video ?? 50, limits.word ?? 15);
     51 +
     52 +  const {
     53 +    file,
     54 +    uploadProgress,
     55 +    isUploading,
     56 +    taskId,
     57 +    error: uploadError,
     58 +    selectFile,
     59 +    startUpload,
     60 +    reset,
     61 +  } = useFileUpload({
     62 +    endpoint: '/convert/to-markdown',
     63 +    maxSizeMB: maxSize,
     64 +    acceptedTypes: ACCEPTED_TYPES,
     65 +  });
     66 +
     67 +  const { status, result, error: taskError } = useTaskPolling({
     68 +    taskId,
     69 +    onComplete: (taskResult) => {
     70 +      setPreview(taskResult.text || '');
     71 +      setPhase('done');
     72 +    },
     73 +    onError: () => setPhase('done'),
     74 +  });
     75 +
     76 +  const storeFile = useFileStore((s) => s.file);
     77 +  const clearStoreFile = useFileStore((s) => s.clearFile);
     78 +
     79 +  useEffect(() => {
     80 +    if (storeFile) {
     81 +      selectFile(storeFile);
     82 +      clearStoreFile();
     83 +    }
     84 +  }, []); // eslint-disable-line react-hooks/exhaustive-deps
     85 +
     86 +  const handleUpload = async () => {
     87 +    const id = await startUpload();
     88 +    if (id) setPhase('processing');
     89 +  };
     90 +
     91 +  const handleReset = () => {
     92 +    reset();
     93 +    setPhase('upload');
     94 +    setPreview('');
     95 +    setCopied(false);
     96 +  };
     97 +
     98 +  const handleCopy = async () => {
     99 +    if (!preview) return;
    100 +    await navigator.clipboard.writeText(preview);
    101 +    setCopied(true);
    102 +    setTimeout(() => setCopied(false), 2000);
    103 +  };
    104 +
    105 +  return (
    106 +    <>
    107 +      <div className="mx-auto max-w-3xl">
    108 +        <div className="mb-8 text-center">
    109 +          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
    110 +            <FileText className="h-8 w-8 text-sky-600 dark:text-sky-300" />
    111 +          </div>
    112 +          <h1 className="section-heading">{t('tools.fileToMarkdown.title')}</h1>
    113 +          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.fileToMarkdown.description')}</p>
    114 +        </div>
    115 +
    116 +        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />
    117 +
    118 +        {phase === 'upload' && (
    119 +          <div className="space-y-5">
    120 +            <FileUploader
    121 +              onFileSelect={selectFile}
    122 +              file={file}
    123 +              accept={ACCEPT_MAP}
    124 +              maxSizeMB={maxSize}
    125 +              isUploading={isUploading}
    126 +              uploadProgress={uploadProgress}
    127 +              error={uploadError}
    128 +              onReset={handleReset}
    129 +              acceptLabel={t('tools.fileToMarkdown.acceptLabel')}
    130 +            />
    131 +
    132 +            {file && (
    133 +              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
    134 +                <p className="font-medium text-slate-900 dark:text-white">{t('tools.fileToMarkdown.outputTitle')}</p>
    135 +                <p className="mt-1">{t('tools.fileToMarkdown.outputDesc')}</p>
    136 +              </div>
    137 +            )}
    138 +
    139 +            <button
    140 +              onClick={handleUpload}
    141 +              disabled={!file || isUploading}
    142 +              className="btn-primary w-full disabled:opacity-50"
    143 +            >
    144 +              {isUploading ? t('common.uploading') : t('tools.fileToMarkdown.convert')}
    145 +            </button>
    146 +          </div>
    147 +        )}
    148 +
    149 +        {phase === 'processing' && (
    150 +          <ProgressBar
    151 +            state={status?.state || 'PENDING'}
    152 +            message={status?.progress || t('tools.fileToMarkdown.processing')}
    153 +          />
    154 +        )}
    155 +
    156 +        {phase === 'done' && result?.status === 'completed' && (
    157 +          <div className="space-y-4">
    158 +            {preview && (
    159 +              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    160 +                <div className="mb-3 flex items-center justify-between gap-3">
    161 +                  <div>
    162 +                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
    163 +                      {t('tools.fileToMarkdown.preview')}
    164 +                    </p>
    165 +                    <p className="text-xs text-slate-500 dark:text-slate-400">
    166 +                      {t('tools.fileToMarkdown.charCount', { count: result.char_count ?? preview.length })}
    167 +                    </p>
    168 +                  </div>
    169 +                  <button onClick={handleCopy} className="btn-secondary shrink-0">
    170 +                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    171 +                    {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
    172 +                  </button>
    173 +                </div>
    174 +                <textarea
    175 +                  readOnly
    176 +                  value={preview}
    177 +                  rows={14}
    178 +                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
    179 +                />
    180 +              </div>
    181 +            )}
    182 +
    183 +            <DownloadButton result={result} onStartOver={handleReset} />
    184 +          </div>
    185 +        )}
    186 +
    187 +        {phase === 'done' && (taskError || result?.status === 'failed') && (
    188 +          <div className="space-y-4">
    191 +            </div>
    192 +            <button onClick={handleReset} className="btn-secondary w-full">
    193 +              {t('common.tryAgain')}
    194 +            </button>
    195 +          </div>
    196 +        )}
    197 +
    198 +        <AdSlot slot="bottom-banner" format="horizontal" className="mt-6" />
    199 +      </div>
    200 +    </>
    201 +  );
    202 +}

  └ frontend\src\config\toolManifest.ts (+21 -9)
    418    },
    419 -  {
    420 -    slug: 'html-to-pdf',
    421 -    i18nKey: 'htmlToPdf',
    422 -    component: () => import('@/components/tools/HtmlToPdf'),
    419 +  {
    420 +    slug: 'html-to-pdf',
    421 +    i18nKey: 'htmlToPdf',
    422 +    component: () => import('@/components/tools/HtmlToPdf'),
    423      category: 'conversion',
        ⋮
    428      bgColor: 'bg-sky-50',
    429 -    demandTier: 'B',
    430 -  },
    431 -  {
    432 -    slug: 'pdf-to-pptx',
    433 -    i18nKey: 'pdfToPptx',
    429 +    demandTier: 'B',
    430 +  },
    431 +  {
    432 +    slug: 'file-to-markdown',
    433 +    i18nKey: 'fileToMarkdown',
    434 +    component: () => import('@/components/tools/FileToMarkdown'),
    435 +    category: 'conversion',
    436 +    homepage: true,
    437 +    homepageSection: 'other',
    438 +    iconName: 'FileText',
    439 +    iconColor: 'text-sky-600',
    440 +    bgColor: 'bg-sky-50',
    441 +    demandTier: 'B',
    442 +  },
    443 +  {
    444 +    slug: 'pdf-to-pptx',
    445 +    i18nKey: 'pdfToPptx',
    446      component: () => import('@/components/tools/PdfToPptx'),

  └ frontend\src\services\apiTypes.ts (+1 -0)
    97    format?: string;
    98 +  conversion_method?: string;
    99    edits_applied?: number;

• Ran Select-String -Path frontend\src\i18n\en.json,frontend\src\i18n\ar.json,frontend\src\config\seoData.ts -Pattern 'fileToMarkdown|file-to-markdown'
  └ (no output)

• Edited 2 files (+25 -1)
  └ frontend\src\i18n\ar.json (+13 -1)
     913      },
     914 +    "fileToMarkdown": {
     915 +      "title": "تحويل الملف إلى Markdown",
     916 +      "description": "حوّل المستندات والصور والجداول والعروض وملفات النص والأرشيفات والفيديو إلى Markdown مضغوط لاستخدامات الذكاء الاصطناعي.",
     917 +      "shortDesc": "ملف إلى MD",
     918 +      "acceptLabel": "PDF، أوفيس، صور، فيديو، نص، HTML، CSV، JSON، XML، ZIP",
     919 +      "outputTitle": "ناتج Markdown",
     922 +      "processing": "جاري تحويل الملف إلى Markdown...",
     923 +      "preview": "معاينة Markdown",
     924 +      "charCount": "{{count}} حرف"
     925 +    },
     926      "mergePdf": {
    3254 -}
    3266 +}

  └ frontend\src\i18n\en.json (+12 -0)
    869      },
    870 +    "fileToMarkdown": {
    871 +      "title": "File to Markdown",
    872 +      "description": "Convert documents, images, spreadsheets, slides, text files, archives, and videos into compact Markdown for AI workflows.",
    873 +      "shortDesc": "File to MD",
    874 +      "acceptLabel": "PDF, Office, images, video, text, HTML, CSV, JSON, XML, ZIP",
    875 +      "outputTitle": "Markdown output",
    876 +      "outputDesc": "The converter extracts readable content first, then tries one supported intermediate conversion when direct extraction is not enough.",
    877 +      "convert": "Convert to Markdown",
    878 +      "processing": "Converting file to Markdown...",
    879 +      "preview": "Markdown Preview",
    880 +      "charCount": "{{count}} characters"
    881 +    },
    882      "mergePdf": {

• Edited frontend\src\config\seoData.ts (+21 -0)
    690    },
    691 +  {
    692 +    i18nKey: 'fileToMarkdown',
    693 +    slug: 'file-to-markdown',
    694 +    titleSuffix: 'Free Online File to Markdown Converter for AI',
    695 +    metaDescription: 'Convert files to Markdown online for AI tools. Extract compact Markdown from PDFs, Office files, images, spreadsheets, slides, text, HTML, archives, and video metadata.',
    696 +    category: 'Convert',
    697 +    relatedSlugs: ['ocr', 'pdf-to-word', 'html-to-pdf', 'text-cleaner'],
    698 +    keywords: 'file to markdown, convert file to md, document to markdown, image to markdown, markdown converter for ai',
    699 +    features: [
    700 +      'Convert common document and media formats to Markdown',
    701 +      'Extract text and metadata into AI-friendly output',
    702 +      'Fallback through supported intermediate formats',
    703 +      'Preview Markdown before downloading',
    704 +      'Secure asynchronous processing',
    705 +    ],
    706 +    faqs: [
    707 +      { question: 'What files can I convert to Markdown?', answer: 'The tool supports PDF, Office files, images, video metadata, HTML, text, CSV, JSON, XML, and ZIP archive indexes when readable content can be extracted safely.'
          },
    708 +      { question: 'What happens if direct Markdown conversion fails?', answer: 'Dociva tries one supported intermediate conversion, such as Office to PDF or image re-encoding, then attempts Markdown extraction again.' },
    709 +    ],
    710 +  },
    711
        ⋮
    965    'barcode-generator': ['qr-code', 'html-to-pdf'],

• Ran Select-String -Path frontend\src\seo\seoData.json -Pattern 'compress-image-online' -Context 0,28
  └
    > frontend\src\seo\seoData.json:707:      "slug": "compress-image-online",
    … +34 lines (ctrl + t to view transcript)
    and branded assets.",


• Ran Get-Content frontend\src\seo\seoData.json -TotalCount 770 | Select-Object -Last 60
  └       "supportingKeywords": {
            "en": ["reduce image size", "image compressor online", "shrink photo file"],
    … +56 lines (ctrl + t to view transcript)
            "ar": "استهدف المستخدمين الذين يريدون إنجاز أعمال PDF من المتصفح بدون تنزيلات أو اشتراكات أو إعداد حساب."
          },

• Edited frontend\src\seo\seoData.json (+26 -7)
    724      },
    725 -    {
    726 -      "slug": "remove-image-background",
    727 -      "toolSlug": "remove-background",
    725 +    {
    726 +      "slug": "remove-image-background",
    727 +      "toolSlug": "remove-background",
    728        "category": "Image",
        ⋮
    740          "ar": "مفيد للتجارة الإلكترونية والعروض وتصميم الكتالوجات والمحتوى الاجتماعي."
    741 -      },
    742 -      "relatedCollectionSlugs": ["online-image-tools", "convert-files-online"]
    743 -    }
    744 -  ],
    741 +      },
    742 +      "relatedCollectionSlugs": ["online-image-tools", "convert-files-online"]
    743 +    },
    744 +    {
    745 +      "slug": "file-to-markdown",
    746 +      "toolSlug": "file-to-markdown",
    747 +      "category": "Convert",
    748 +      "focusKeyword": { "en": "file to markdown converter", "ar": "تحويل الملفات إلى Markdown" },
    749 +      "supportingKeywords": {
    750 +        "en": ["convert file to md", "document to markdown", "markdown converter for ai"],
    751 +        "ar": ["تحويل ملف إلى md", "مستند إلى markdown", "محول markdown للذكاء الاصطناعي"]
    752 +      },
    753 +      "benefit": {
    754 +        "en": "Turn readable content from common file formats into compact Markdown that is easier to paste into AI tools.",
    755 +        "ar": "حوّل المحتوى المقروء من صيغ الملفات الشائعة إلى Markdown مضغوط يسهل استخدامه مع أدوات الذكاء الاصطناعي."
    756 +      },
    757 +      "useCase": {
    758 +        "en": "Best for developers, prompt workflows, documentation extraction, and reducing token-heavy uploads.",
    759 +        "ar": "مناسب للمطورين ومسارات البرومبت واستخراج التوثيق وتقليل رفع الملفات كثيرة التوكنات."
    760 +      },
    761 +      "relatedCollectionSlugs": ["convert-files-online", "ai-document-tools"]
    762 +    }
    763 +  ],
    764    "collectionPageSeeds": [

• Ran Select-String -Path frontend\src\seo\seoData.generated.json -Pattern 'file-to-markdown|remove-image-background' -Context 0,5
  └
    > frontend\src\seo\seoData.generated.json:1258:      "slug": "remove-image-background",
    … +4 lines (ctrl + t to view transcript)
      frontend\src\seo\seoData.generated.json:1263:        "ar": "إزالة خلفية الصورة"


• Edited 2 files (+123 -0)
  └ backend\tests\test_markdown_convert.py (+50 -0)
     1 +"""Tests for file-to-Markdown route."""
     2 +
     3 +import io
     4 +from unittest.mock import MagicMock, patch
     5 +
     6 +
     7 +def test_file_to_markdown_no_file(client):
     8 +    response = client.post("/api/convert/to-markdown")
     9 +
    10 +    assert response.status_code == 400
    11 +    assert "error" in response.get_json()
    12 +
    13 +
    14 +def test_file_to_markdown_rejects_unsupported_extension(client):
    15 +    response = client.post(
    16 +        "/api/convert/to-markdown",
    17 +        data={"file": (io.BytesIO(b"hello"), "payload.exe")},
    18 +        content_type="multipart/form-data",
    19 +    )
    20 +
    21 +    assert response.status_code == 400
    22 +
    23 +
    24 +def test_file_to_markdown_enqueues_task(client, monkeypatch):
    25 +    task = MagicMock()
    26 +    task.id = "markdown-task-id"
    27 +    monkeypatch.setattr(
    28 +        "app.routes.markdown_convert.enqueue_task",
    29 +        lambda *args, **kwargs: task,
    30 +    )
    31 +    monkeypatch.setattr(
    32 +        "app.routes.markdown_convert.create_quote",
    33 +        lambda *args, **kwargs: MagicMock(to_dict=lambda: {"tool": "file-to-markdown"}),
    34 +    )
    35 +    monkeypatch.setattr(
    36 +        "app.routes.markdown_convert.record_accepted_usage",
    37 +        lambda *args, **kwargs: None,
    38 +    )
    39 +
    40 +    with patch("app.utils.file_validator._detect_mime", lambda _header: "text/plain"):
    41 +        response = client.post(
    42 +            "/api/convert/to-markdown",
    43 +            data={"file": (io.BytesIO(b"hello markdown"), "notes.txt")},
    44 +            content_type="multipart/form-data",
    45 +        )
    46 +
    47 +    assert response.status_code == 202
    48 +    payload = response.get_json()
    49 +    assert payload["task_id"] == "markdown-task-id"
    50 +    assert payload["quote"]["tool"] == "file-to-markdown"

  └ backend\tests\test_markdown_convert_service.py (+73 -0)
     1 +"""Tests for file-to-Markdown service behavior."""
     2 +
     3 +import os
     4 +
     5 +import pytest
     6 +
     7 +from app.services.markdown_convert_service import (
     8 +    MarkdownConversionError,
     9 +    convert_file_to_markdown,
    10 +)
    11 +
    12 +
    13 +def test_text_file_converts_to_markdown(tmp_path):
    14 +    input_path = tmp_path / "notes.txt"
    15 +    output_path = tmp_path / "out.md"
    16 +    input_path.write_text("hello from a text file", encoding="utf-8")
    17 +
    20 +        str(output_path),
    21 +        original_filename="notes.txt",
    22 +        ext="txt",
    23 +        work_dir=str(tmp_path),
    24 +    )
    25 +
    26 +    assert result.method in {"markitdown", "native"}
    27 +    assert output_path.exists()
    30 +
    31 +
    32 +def test_csv_file_converts_to_markdown_table(tmp_path, monkeypatch):
    33 +    monkeypatch.setattr(
    34 +        "app.services.markdown_convert_service._convert_with_markitdown",
    35 +        lambda _path: (_ for _ in ()).throw(MarkdownConversionError("disabled")),
    36 +    )
    37 +    input_path = tmp_path / "data.csv"
    38 +    output_path = tmp_path / "out.md"
    39 +    input_path.write_text("name,count\nalpha,2\nbeta,3\n", encoding="utf-8")
    40 +
    41 +    result = convert_file_to_markdown(
    42 +        str(input_path),
    43 +        str(output_path),
    44 +        original_filename="data.csv",
    45 +        ext="csv",
    46 +        work_dir=str(tmp_path),
    47 +    )
    48 +
    49 +    markdown = output_path.read_text(encoding="utf-8")
    50 +    assert result.method == "native"
    51 +    assert "| name | count |" in markdown
    52 +    assert "| alpha | 2 |" in markdown
    53 +
    54 +
    55 +def test_unsupported_file_raises_after_attempts(tmp_path, monkeypatch):
    56 +    monkeypatch.setattr(
    57 +        "app.services.markdown_convert_service._convert_with_markitdown",
    58 +        lambda _path: (_ for _ in ()).throw(MarkdownConversionError("disabled")),
    59 +    )
    60 +    input_path = tmp_path / "binary.bin"
    61 +    output_path = tmp_path / "out.md"
    62 +    input_path.write_bytes(os.urandom(128))
    63 +
    64 +    with pytest.raises(MarkdownConversionError):
    65 +        convert_file_to_markdown(
    66 +            str(input_path),
    69 +            ext="bin",
    70 +            work_dir=str(tmp_path),
    71 +        )
    72 +
    73 +    assert not output_path.exists()

• Ran rg "i18nKey|tools\." frontend\src\config\toolManifest.test.ts frontend\src\test frontend\src -g "*.test.ts*"
  └ frontend\src\config\toolManifest.test.ts:  it('all manifest entries have non-empty slugs and i18nKeys', () => {
    frontend\src\config\toolManifest.test.ts:      expect(tool.i18nKey.length).toBeGreaterThan(0);
    frontend\src\config\toolManifest.test.ts:  it('all manifest entries have non-empty slugs and i18nKeys', () => {
    frontend\src\config\toolManifest.test.ts:      expect(tool.i18nKey.length).toBeGreaterThan(0);

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The core files are in place now. I’m doing a consistency pass across route registration, task registration, SEO/tool registration, and tests before running the focused test set.

• Running git diff --stat

• Running git diff -- backend\app\extensions.py backend\app\__init__.py backend\config\__init__.py backend\app\services\credit_config.py

• Running python -m py_compile backend\app\services\markdown_convert_service.py backend\app\tasks\markdown_convert_tasks.py backend\app\routes\markdown_convert.py

• Ran git diff -- backend\app\extensions.py backend\app\__init__.py backend\config\__init__.py backend\app\services\credit_config.py
  └ diff --git a/backend/app/__init__.py b/backend/app/__init__.py
    index fc21cf1..d5e4f3b 100644
    … +81 lines (ctrl + t to view transcript)
         # Redis
    warning: in the working copy of 'backend/app/services/credit_config.py', CRLF will be replaced by LF the next time Git touches it

• Ran git diff -- frontend\src\config\toolManifest.ts frontend\src\config\seoData.ts frontend\src\i18n\en.json frontend\src\i18n\ar.json | Select-Object -First 240
    … +132 lines (ctrl + t to view transcript)
           "description": "Combine multiple PDF files into a single document. Free and fast.",
    warning: in the working copy of 'frontend/src/config/toolManifest.ts', CRLF will be replaced by LF the next time Git touches it

• Ran git diff --stat
  └  .devdbrc                                           |   4 +
     backend/app/__init__.py                            |   2 +
    … +54 lines (ctrl + t to view transcript)
    warning: in the working copy of 'frontend/src/config/toolManifest.ts', CRLF will be replaced by LF the next time Git touches it
    warning: in the working copy of 'frontend/src/seo/seoData.json', CRLF will be replaced by LF the next time Git touches it

• Ran python -m py_compile backend\app\services\markdown_convert_service.py backend\app\tasks\markdown_convert_tasks.py backend\app\routes\markdown_convert.py
    … +4 lines (ctrl + t to view transcript)
    + python -m py_compile backend\app\services\markdown_convert_service.py …
    + ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.
    90  # File to Markdown
    91 -markitdown[all]>=0.1.5,<0.2.0
    91 +markitdown[pdf,docx,pptx,xlsx,xls]>=0.1.5,<0.2.0
  └ Unable to create process using '"C:\xampp\htdocs\SaaS-PDF\.venv\Scripts\python.exe" -m py_compile backend\app\services\markdown_convert_service.py backend\app\tasks\markdown_convert_tasks.py backend\app\routes\markdown_convert.py':
    The file cannot be accessed by the system.


• Ran Select-String -Path frontend\src\seo\seoData.json -Pattern 'file-to-markdown' -Context 0,20
  └
    > frontend\src\seo\seoData.json:745:      "slug": "file-to-markdown",


    WARNING: Error loading config file: open C:\Users\ahmed\.docker\config.json: Access is denied.
    permission denied while trying to connect to the docker API at npipe:////./pipe/docker_engine

• Ran py -3 -m py_compile backend\app\services\markdown_convert_service.py backend\app\tasks\markdown_convert_tasks.py backend\app\routes\markdown_convert.py
  └ Unable to create process using '"C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3568.0_x64__qbz5n2kfra8p0\python3.13.exe" -m py_compile backend\app\services\markdown_convert_service.py


─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The Python syntax check passed after running through uv with approval because the Windows Store Python shim was blocked in the sandbox. I’m running focused backend tests now, then I’ll run the frontend checks for the new manifest/
  component path.

• Ran uv run --with-requirements backend\requirements.txt pytest backend\tests\test_markdown_convert.py backend\tests\test_markdown_convert_service.py -q
  └ (no output)

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The focused backend test command timed out at two minutes, likely while resolving the requirements environment. I’m rerunning with a longer timeout once so we get a real pass/fail instead of an inconclusive timeout.

• Ran uv run --with-requirements backend\requirements.txt pytest backend\tests\test_markdown_convert.py backend\tests\test_markdown_convert_service.py -q
  └ EEE...                                                                   [100%]
    =================================== ERRORS ====================================
    … +652 lines (ctrl + t to view transcript)
    3 passed, 3 errors in 102.34s (0:01:42)
    Installed 172 packages in 19.77s

• The service-level tests passed, but the route tests failed during app setup because the repo .env forces DATABASE_URL=postgresql://...@postgres, and no Docker Postgres hostname is reachable from this test process. I’m rerunning with
  DATABASE_URL cleared for the test process so the existing SQLite testing config is actually used.

• Ran $env:DATABASE_URL=''; uv run --with-requirements backend\requirements.txt pytest backend\tests\test_markdown_convert.py backend\tests\test_markdown_convert_service.py -q

✔ You approved codex to always run commands that start with $env:DATABASE_URL=''; uv run --with-requirements backend\requirements.txt pyt...

• Ran $env:DATABASE_URL=''; uv run --with-requirements backend\requirements.txt pytest backend\tests\test_markdown_convert.py backend\tests\test_markdown_convert_service.py -q
  └ EEE...                                                                   [100%]
    =================================== ERRORS ====================================
    … +651 lines (ctrl + t to view transcript)
    ERROR backend/tests/test_markdown_convert.py::test_file_to_markdown_enqueues_task
    3 passed, 3 errors in 88.13s (0:01:28)

• Ran Get-Content -Raw backend\app\utils\database.py
  └ """Database abstraction — supports SQLite (dev) and PostgreSQL (production).

    … +179 lines (ctrl + t to view transcript)
                return


✔ You approved codex to always run commands that start with $env:DATABASE_URL='sqlite'; uv run --with-requirements backend\requirements.t...

• Ran $env:DATABASE_URL='sqlite'; uv run --with-requirements backend\requirements.txt pytest backend\tests\test_markdown_convert.py backend\tests\test_markdown_convert_service.py -q
  └ ......                                                                   [100%]
    6 passed in 13.02s

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Focused backend tests now pass with DATABASE_URL=sqlite: 6 passed. I’m running the frontend test/build path next, since this feature changes the manifest, SEO data, and a new React component.

• Running npm --prefix frontend run test

• Ran npm --prefix frontend run test
  └
    > dociva-frontend@1.0.0 test
    … +36 lines (ctrl + t to view transcript)
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


• Ran npm --prefix frontend run build
  └
    > dociva-frontend@1.0.0 prebuild
    … +10 lines (ctrl + t to view transcript)
    src/pages/AccountPage.tsx(419,5): error TS2304: Cannot find name 'setNewKeyError'.
    src/pages/AccountPage.tsx(430,7): error TS2304: Cannot find name 'setNewKeyError'.

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The full frontend test/build commands are blocked by pre-existing unrelated failures in InternalAdminPage.test.tsx and AccountPage.tsx. I’m running the focused frontend tests that cover the changed manifest/SEO path so this feature’s
  registration is still verified.

• Ran npm --prefix frontend run test -- src\config\toolManifest.test.ts src\config\routes.test.ts src\seo\seoData.test.ts
  └
    > dociva-frontend@1.0.0 test
    … +12 lines (ctrl + t to view transcript)
    2:07:33 PM [vite] warning: `optimizeDeps.esbuildOptions` option was specified by "vite:react-babel" plugin. This option is deprecated, please use `optimizeDeps.rolldownOptions` instead.
    Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored. The following esbuild options were set: `{ jsx: 'automatic', jsxImportSource: undefined }`

• Running Select-String -Path frontend\src\seo\seoData.generated.json,frontend\public\sitemaps\seo.xml,frontend\public\sitemaps\tools.xml -Pattern 'file-to-markdown'

• Running git status --short

• Ran git status --short
  └  M .devdbrc
     M backend/app/__init__.py
    … +63 lines (ctrl + t to view transcript)
    warning: could not open directory 'backend/.pytest_cache/': Permission denied
    warning: could not open directory 'frontend/.pytest_cache/': Permission denied

• Ran git diff -- frontend\src\components\tools\FileToMarkdown.tsx backend\app\services\markdown_convert_service.py | Select-Object -First 220
  └ (no output)

• Ran Select-String -Path frontend\src\seo\seoData.generated.json,frontend\public\sitemaps\seo.xml,frontend\public\sitemaps\tools.xml -Pattern 'file-to-markdown'
  └
    frontend\src\seo\seoData.generated.json:1291:      "slug": "file-to-markdown",
    … +5 lines (ctrl + t to view transcript)
    frontend\public\sitemaps\tools.xml:664:    <loc>https://dociva.io/fr/tools/file-to-markdown</loc>


─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• I noticed one architecture issue before finalizing: a single Markdown task name would route image/video conversions to the PDF queue. I’m splitting the task entry points by input class so images go to ocr_tasks, video goes to
  video_processing, and document/text conversions stay on pdf_processing.

• Edited 3 files (+103 -10)
  └ backend\app\extensions.py (+3 -1)
     99          "app.tasks.html_to_pdf_tasks.*": {"queue": "pdf_processing"},
    100 -        "app.tasks.markdown_convert_tasks.*": {"queue": "pdf_processing"},
    100 +        "app.tasks.markdown_convert_tasks.convert_file_to_markdown_task": {"queue": "pdf_processing"},
    101 +        "app.tasks.markdown_convert_tasks.convert_image_to_markdown_task": {"queue": "ocr_tasks"},
    102 +        "app.tasks.markdown_convert_tasks.convert_video_to_markdown_task": {"queue": "video_processing"},
    103

  └ backend\app\routes\markdown_convert.py (+12 -2)
     7  from app.extensions import limiter
     8 -from app.services.markdown_convert_service import SUPPORTED_MARKDOWN_TYPES
     8 +from app.services.markdown_convert_service import (
     9 +    IMAGE_EXTENSIONS,
    10 +    SUPPORTED_MARKDOWN_TYPES,
    11 +    VIDEO_EXTENSIONS,
    12 +)
    13  from app.services.policy_service import (
       ⋮
    67
    68 +    task_name = "app.tasks.markdown_convert_tasks.convert_file_to_markdown_task"
    69 +    if ext in IMAGE_EXTENSIONS:
    70 +        task_name = "app.tasks.markdown_convert_tasks.convert_image_to_markdown_task"
    71 +    elif ext in VIDEO_EXTENSIONS:
    72 +        task_name = "app.tasks.markdown_convert_tasks.convert_video_to_markdown_task"
    73 +
    74      task = enqueue_task(
    65 -        "app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
    75 +        task_name,
    76          input_path,

  └ backend\app\tasks\markdown_convert_tasks.py (+88 -7)
     53
     54 -@celery.task(
     55 -    bind=True,
     56 -    name="app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
     57 -    soft_time_limit=900,
     58 -    time_limit=960,
     59 -)
     60 -def convert_file_to_markdown_task(
     54 +def _run_markdown_conversion(
     55      self,
        ⋮
     80
     81 +
     82 +@celery.task(
     83 +    bind=True,
     84 +    name="app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
     85 +    soft_time_limit=900,
     86 +    time_limit=960,
     87 +)
     88 +def convert_file_to_markdown_task(
     89 +    self,
     90 +    input_path: str,
     91 +    task_id: str,
     92 +    original_filename: str,
     93 +    ext: str,
     94 +    user_id: int | None = None,
     95 +    usage_source: str = "web",
     96 +    api_key_id: int | None = None,
     97 +):
     98 +    """Async task: convert a document/text/archive file into Markdown."""
     99 +    return _run_markdown_conversion(
    100 +        self,
    101 +        input_path,
    102 +        task_id,
    103 +        original_filename,
    104 +        ext,
    105 +        user_id=user_id,
    106 +        usage_source=usage_source,
    107 +        api_key_id=api_key_id,
    108 +    )
    109 +
    110 +
    111 +@celery.task(
    112 +    bind=True,
    115 +    time_limit=960,
    116 +)
    117 +def convert_image_to_markdown_task(
    118 +    self,
    119 +    input_path: str,
    120 +    task_id: str,
    121 +    original_filename: str,
    122 +    ext: str,
    123 +    user_id: int | None = None,
    124 +    usage_source: str = "web",
    125 +    api_key_id: int | None = None,
    126 +):
    127 +    """Async task: convert an image file into Markdown."""
    128 +    return _run_markdown_conversion(
    129 +        self,
    130 +        input_path,
    131 +        task_id,
    132 +        original_filename,
    133 +        ext,
    134 +        user_id=user_id,
    135 +        usage_source=usage_source,
    136 +        api_key_id=api_key_id,
    137 +    )
    138 +
    139 +
    140 +@celery.task(
    141 +    bind=True,
    142 +    name="app.tasks.markdown_convert_tasks.convert_video_to_markdown_task",
    143 +    soft_time_limit=300,
    144 +    time_limit=360,
    145 +)
    146 +def convert_video_to_markdown_task(
    147 +    self,
    148 +    input_path: str,
    149 +    task_id: str,
    150 +    original_filename: str,
    151 +    ext: str,
    152 +    user_id: int | None = None,
    153 +    usage_source: str = "web",
    154 +    api_key_id: int | None = None,
    155 +):
    156 +    """Async task: convert video metadata into Markdown."""
    157 +    return _run_markdown_conversion(
    158 +        self,
    159 +        input_path,
    160 +        task_id,
    161 +        original_filename,
    162 +        ext,
    163 +        user_id=user_id,
    164 +        usage_source=usage_source,
    165 +        api_key_id=api_key_id,
    166 +    )
    167 +
    168          self.update_state(state="PROCESSING", meta={"step": "Storing Markdown..."})

• Ran Get-Content -Raw backend\app\tasks\markdown_convert_tasks.py
  └ """Celery tasks for file-to-Markdown conversion."""

    … +229 lines (ctrl + t to view transcript)
            )


• Added backend\app\tasks\markdown_convert_tasks.py (+232 -0)
      1 +"""Celery tasks for file-to-Markdown conversion."""
      2 +
      3 +from __future__ import annotations
      4 +
      5 +import logging
      6 +import os
      7 +
      8 +from flask import current_app
      9 +
     10 +from app.extensions import celery
     11 +from app.services.markdown_convert_service import (
     12 +    MarkdownConversionError,
     13 +    convert_file_to_markdown,
     14 +)
     15 +from app.services.storage_service import storage
     16 +from app.services.task_tracking_service import finalize_task_tracking
     17 +from app.utils.sanitizer import cleanup_task_files
     18 +
     19 +logger = logging.getLogger(__name__)
     20 +
     21 +
     22 +def _cleanup(task_id: str):
     23 +    cleanup_task_files(task_id, keep_outputs=not storage.use_s3)
     24 +
     25 +
     26 +def _get_output_dir(task_id: str) -> str:
     27 +    output_dir = os.path.join(current_app.config["OUTPUT_FOLDER"], task_id)
     28 +    os.makedirs(output_dir, exist_ok=True)
     29 +    return output_dir
     30 +
     31 +
     32 +def _finalize_task(
     33 +    task_id: str,
     34 +    user_id: int | None,
     35 +    original_filename: str,
     36 +    result: dict,
     37 +    usage_source: str,
     38 +    api_key_id: int | None,
     39 +    celery_task_id: str | None,
     40 +):
     41 +    finalize_task_tracking(
     42 +        user_id=user_id,
     43 +        tool="file-to-markdown",
     44 +        original_filename=original_filename,
     45 +        result=result,
     46 +        usage_source=usage_source,
     47 +        api_key_id=api_key_id,
     48 +        celery_task_id=celery_task_id,
     49 +    )
     50 +    _cleanup(task_id)
     51 +    return result
     52 +
     53 +
     54 +def _run_markdown_conversion(
     55 +    self,
     56 +    input_path: str,
     57 +    task_id: str,
     58 +    original_filename: str,
     59 +    ext: str,
     60 +    user_id: int | None = None,
     61 +    usage_source: str = "web",
     62 +    api_key_id: int | None = None,
     63 +):
     64 +    """Convert one uploaded file into Markdown and finalize task tracking."""
     65 +
     66 +    output_dir = _get_output_dir(task_id)
     67 +    name_without_ext = os.path.splitext(original_filename)[0] or "converted-file"
     68 +    output_path = os.path.join(output_dir, f"{task_id}.md")
     69 +    download_name = f"{name_without_ext}.md"
     70 +
     71 +    try:
     72 +        self.update_state(state="PROCESSING", meta={"step": "Extracting Markdown..."})
     73 +        conversion = convert_file_to_markdown(
     74 +            input_path,
     75 +            output_path,
     76 +            original_filename=original_filename,
     77 +            ext=ext,
     78 +            work_dir=output_dir,
     79 +        )
     80 +
     81 +        self.update_state(state="PROCESSING", meta={"step": "Storing Markdown..."})
     82 +        s3_key = storage.upload_file(output_path, task_id, folder="outputs")
     83 +        download_url = storage.generate_presigned_url(
     84 +            s3_key,
     85 +            original_filename=download_name,
     86 +        )
     87 +
     88 +        result = {
     89 +            "status": "completed",
     90 +            "download_url": download_url,
     91 +            "filename": download_name,
     92 +            "output_size": os.path.getsize(output_path),
     93 +            "text": conversion.markdown[:5000],
     94 +            "char_count": conversion.char_count,
     95 +            "format": "md",
     96 +            "conversion_method": conversion.method,
     97 +        }
     98 +        logger.info(
     99 +            "Task %s: file-to-markdown completed via %s (%d chars)",
    100 +            task_id,
    101 +            conversion.method,
    102 +            conversion.char_count,
    103 +        )
    104 +        return _finalize_task(
    105 +            task_id,
    106 +            user_id,
    107 +            original_filename,
    108 +            result,
    109 +            usage_source,
    110 +            api_key_id,
    111 +            self.request.id,
    112 +        )
    113 +
    114 +    except MarkdownConversionError as exc:
    115 +        logger.warning("Task %s: Markdown conversion failed: %s", task_id, exc)
    116 +        return _finalize_task(
    117 +            task_id,
    118 +            user_id,
    119 +            original_filename,
    120 +            {
    121 +                "status": "failed",
    122 +                "error": str(exc),
    123 +                "error_code": "MARKDOWN_CONVERSION_UNSUPPORTED",
    124 +                "user_message": str(exc),
    125 +            },
    126 +            usage_source,
    127 +            api_key_id,
    128 +            self.request.id,
    129 +        )
    130 +    except Exception:
    131 +        logger.exception("Task %s: Unexpected Markdown conversion error", task_id)
    132 +        return _finalize_task(
    133 +            task_id,
    134 +            user_id,
    135 +            original_filename,
    136 +            {
    137 +                "status": "failed",
    138 +                "error": "An unexpected error occurred.",
    139 +                "error_code": "MARKDOWN_CONVERSION_FAILED",
    140 +                "user_message": "The file could not be converted to Markdown.",
    141 +            },
    142 +            usage_source,
    143 +            api_key_id,
    144 +            self.request.id,
    145 +        )
    146 +
    147 +
    148 +@celery.task(
    149 +    bind=True,
    150 +    name="app.tasks.markdown_convert_tasks.convert_file_to_markdown_task",
    151 +    soft_time_limit=900,
    152 +    time_limit=960,
    153 +)
    154 +def convert_file_to_markdown_task(
    155 +    self,
    156 +    input_path: str,
    157 +    task_id: str,
    158 +    original_filename: str,
    159 +    ext: str,
    160 +    user_id: int | None = None,
    161 +    usage_source: str = "web",
    162 +    api_key_id: int | None = None,
    163 +):
    164 +    """Async task: convert a document/text/archive file into Markdown."""
    165 +    return _run_markdown_conversion(
    166 +        self,
    167 +        input_path,
    168 +        task_id,
    169 +        original_filename,
    170 +        ext,
    171 +        user_id=user_id,
    172 +        usage_source=usage_source,
    173 +        api_key_id=api_key_id,
    174 +    )
    175 +
    176 +
    179 +    name="app.tasks.markdown_convert_tasks.convert_image_to_markdown_task",
    186 +    task_id: str,
    187 +    original_filename: str,
    188 +    ext: str,
    189 +    user_id: int | None = None,
    190 +    usage_source: str = "web",
    193 +    """Async task: convert an image file into Markdown."""
    194 +    return _run_markdown_conversion(
    195 +        self,
    196 +        input_path,
    197 +        task_id,
    198 +        original_filename,
    199 +        ext,
    200 +        user_id=user_id,
    201 +        usage_source=usage_source,
    202 +        api_key_id=api_key_id,
    203 +    )
    204 +
    205 +
    206 +@celery.task(
    207 +    bind=True,
    208 +    name="app.tasks.markdown_convert_tasks.convert_video_to_markdown_task",
    209 +    soft_time_limit=300,
    210 +    time_limit=360,
    211 +)
    212 +def convert_video_to_markdown_task(
    213 +    self,
    214 +    input_path: str,
    215 +    task_id: str,
    216 +    original_filename: str,
    217 +    ext: str,
    218 +    user_id: int | None = None,
    219 +    usage_source: str = "web",
    220 +    api_key_id: int | None = None,
    221 +):
    222 +    """Async task: convert video metadata into Markdown."""
    223 +    return _run_markdown_conversion(
    224 +        self,
    225 +        input_path,
    226 +        task_id,
    227 +        original_filename,
    228 +        ext,
    229 +        user_id=user_id,
    230 +        usage_source=usage_source,
    231 +        api_key_id=api_key_id,
    232 +    )

• Ran uv run python -m py_compile backend\app\services\markdown_convert_service.py backend\app\tasks\markdown_convert_tasks.py backend\app\routes\markdown_convert.py
  └ (no output)

• Ran $env:DATABASE_URL='sqlite'; uv run --with-requirements backend\requirements.txt pytest backend\tests\test_markdown_convert.py backend\tests\test_markdown_convert_service.py -q
  └ ......                                                                   [100%]
    6 passed in 11.05s

• Ran npm --prefix frontend run test -- src\config\toolManifest.test.ts src\config\routes.test.ts src\seo\seoData.test.ts
  └
    > dociva-frontend@1.0.0 test
    … +12 lines (ctrl + t to view transcript)
    2:09:51 PM [vite] warning: `optimizeDeps.esbuildOptions` option was specified by "vite:react-babel" plugin. This option is deprecated, please use `optimizeDeps.rolldownOptions` instead.
    Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored. The following esbuild options were set: `{ jsx: 'automatic', jsxImportSource: undefined }`

• Ran git status --short backend\app\services\__pycache__ backend\app\routes\__pycache__ backend\app\tasks\__pycache__
  └ (no output)

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Implemented the file-to-markdown tool end to end.

  Added backend conversion flow:

  - backend/app/routes/markdown_convert.py
  - backend/app/services/markdown_convert_service.py
  - backend/app/tasks/markdown_convert_tasks.py
  - Registered route under /api/convert/to-markdown
  - Added Celery routing by input class:
      - documents/text/archive -> pdf_processing
      - images -> ocr_tasks
      - video -> video_processing
  - Added markitdown[pdf,docx,pptx,xlsx,xls]>=0.1.5,<0.2.0
  - Added credit cost entry: file-to-markdown
  - Added supported text/markdown data extensions to validation config
  - Added focused backend tests

  Added frontend/SEO:

  - New tool UI: frontend/src/components/tools/FileToMarkdown.tsx
  - Added manifest entry for /tools/file-to-markdown
  - Added i18n keys in English/Arabic
  - Added SEO entry in frontend/src/config/seoData.ts
  - Added programmatic SEO seed in frontend/src/seo/seoData.json
  - Regenerated SEO assets; confirmed sitemap entries for:
      - /tools/file-to-markdown
      - /file-to-markdown
      - localized tool/SEO URLs
  - Added PROJECT_MAP.md

  Verification:

  - Python compile check passed.
  - Backend focused tests passed: 6 passed.
  - Frontend focused manifest/route/SEO tests passed: 17 passed.

  Full frontend checks are currently blocked by unrelated existing failures:

  - npm --prefix frontend run test: fails in InternalAdminPage.test.tsx, expecting two member@example.com matches but only one renders.
  - npm --prefix frontend run build: fails in AccountPage.tsx on missing SocialAuthProviderOption import/type and missing setNewKeyError.

  Release sources used for protocol check:

  - React releases: https://github.com/facebook/react/releases
  - Flask: https://pypi.org/project/Flask/
  - Celery: https://pypi.org/project/celery/
  - Pillow: https://pypi.org/project/pillow/
  - MarkItDown: https://pypi.org/project/markitdown/

[الدور والمهمة] 
 أنت  Staff Software Engineer . المطلوب جراحة برمجية للمشروع للقيام بالتعديل التالي (دون تخريب الميزات الأخرى) :
 
  [وصف التعديل/الميزة] .

  [قواعد التعديل الجراحي (Surgical Changes)] 
 1.  المس فقط ما يجب لمسه:  لا تحسن تنسيق كود مجاور، لا تعد صياغة تعليقات قديمة، لا تقم بـ Refactoring لكود يعمل ما لم يُطلب منك ذلك.
 2.  مطابقة الأسلوب:  التزم بأسلوب الكود الحالي تماماً حتى لو كنت تراه غير مثالي.
 3.  تنظيف مخلفاتك فقط:  إذا تسبب تعديلك في جعل دالة أو Import "يتيماً"، فقم بإزالته. لا تلمس الأكواد الميتة القديمة.

  [بروتوكول التحليل والتنفيذ] 
  البروتوكول الأول: تحليل التأثير (Impact Analysis) 
 - اقرأ `PROJECT_MAP.md`. حدد الملفات المتأثرة بدقة. ابحث عن أحدث التقنيات إذا استلزم الأمر.

  البروتوكول الثاني: السلامة المعمارية والتجريد 
 - التزم بـ DRY (لا تكرر الكود) واستخدم طبقة `Shared/Core`. أضف Logging للتعديل الجديد.

  البروتوكول الثالث: التحقق والنجاح (Goal-Driven) 
 - حول التعديل إلى "هدف قابل للتحقق". اكتب الاختبار، تأكد من فشله، ثم اجعله ينجح (TDD).
 - تأكد من نجاح اختبارات الميزات القديمة (No Regression).

  البروتوكول الرابع: مزامنة الحالة 
 - حدّث `PROJECT_MAP.md` فوراً. أي كود أصبح Deprecated بسبب تعديلك يجب أن يُعالج أو يُسجل في النواقص.

  [أمر التنفيذ] 
 نفذ البروتوكولات بشكل مستمر. ابدأ بتحليل التأثير وذكر الافتراضات (Think Before Coding)، ثم انتقل للتنفيذ الجراحي المباشر.

