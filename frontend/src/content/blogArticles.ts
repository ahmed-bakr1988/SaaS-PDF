export type BlogLocale = 'en' | 'ar' | 'fr';

interface LocalizedText {
  en: string;
  ar: string;
  fr: string;
}

interface BlogArticleSection {
  heading: LocalizedText;
  paragraphs: LocalizedText[];
  bullets?: LocalizedText[];
}

export interface BlogArticle {
  slug: string;
  category: 'PDF' | 'Image' | 'AI';
  publishedAt: string;
  readingMinutes: number;
  toolSlugs: string[];
  title: LocalizedText;
  excerpt: LocalizedText;
  seoDescription: LocalizedText;
  keyTakeaways: LocalizedText[];
  sections: BlogArticleSection[];
}

export interface LocalizedBlogArticle {
  slug: string;
  category: BlogArticle['category'];
  publishedAt: string;
  readingMinutes: number;
  toolSlugs: string[];
  title: string;
  excerpt: string;
  seoDescription: string;
  keyTakeaways: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets: string[];
  }>;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-compress-pdf-online',
    category: 'PDF',
    publishedAt: '2025-01-15',
    readingMinutes: 4,
    toolSlugs: ['compress-pdf', 'merge-pdf', 'pdf-to-word'],
    title: {
      en: 'How to Compress PDFs Without Losing Quality',
      ar: 'كيف تضغط ملفات PDF دون فقدان الجودة',
      fr: 'Comment compresser des PDF sans perte de qualité',
    },
    excerpt: {
      en: 'Learn the best techniques to reduce PDF file size while maintaining document quality for sharing and uploading.',
      ar: 'تعلّم أفضل الطرق لتقليل حجم ملفات PDF مع الحفاظ على جودة المستند للمشاركة والرفع.',
      fr: 'Découvrez les meilleures techniques pour réduire la taille des PDF tout en conservant la qualité du document.',
    },
    seoDescription: {
      en: 'A practical guide to reducing PDF size without ruining text clarity, image fidelity, or upload readiness.',
      ar: 'دليل عملي لتقليل حجم PDF بدون الإضرار بوضوح النص أو جودة الصور أو جاهزية الرفع.',
      fr: 'Guide pratique pour réduire la taille d’un PDF sans dégrader la netteté du texte ni la qualité des images.',
    },
    keyTakeaways: [
      {
        en: 'Start with balanced compression before trying aggressive settings.',
        ar: 'ابدأ دائماً بضغط متوازن قبل تجربة الإعدادات القوية.',
        fr: 'Commencez par une compression équilibrée avant les réglages agressifs.',
      },
      {
        en: 'Image-heavy PDFs shrink the most, while text-heavy files often need less compression.',
        ar: 'ملفات PDF الغنية بالصور تنخفض أكثر، بينما الملفات النصية تحتاج عادةً ضغطاً أقل.',
        fr: 'Les PDF riches en images gagnent le plus, alors que les fichiers textuels nécessitent souvent moins de compression.',
      },
      {
        en: 'Review the final file before sending it to clients or uploading it to portals.',
        ar: 'راجع الملف النهائي قبل إرساله للعملاء أو رفعه إلى أي بوابة.',
        fr: 'Vérifiez toujours le fichier final avant de l’envoyer à un client ou de le téléverser.',
      },
    ],
    sections: [
      {
        heading: {
          en: 'Why PDFs become too large',
          ar: 'لماذا تصبح ملفات PDF كبيرة جداً',
          fr: 'Pourquoi certains PDF deviennent trop lourds',
        },
        paragraphs: [
          {
            en: 'Most oversized PDFs are caused by embedded images, repeated scans, or exported documents that keep unnecessary metadata. The file may look simple, but it can still contain large assets behind the scenes.',
            ar: 'معظم ملفات PDF الكبيرة يكون سببها الصور المضمّنة، أو المسح الضوئي المتكرر، أو التصدير من برامج تحتفظ ببيانات وصفية غير ضرورية. قد يبدو الملف بسيطاً لكنه يحمل عناصر ثقيلة في الخلفية.',
            fr: 'La plupart des PDF volumineux sont dus aux images intégrées, aux scans répétés ou aux exports qui conservent trop de métadonnées. Le document peut sembler simple tout en contenant des éléments lourds en arrière-plan.',
          },
          {
            en: 'If your goal is email delivery, portal upload, or faster downloads, the right compression level matters more than chasing the smallest possible file.',
            ar: 'إذا كان هدفك هو الإرسال بالبريد أو الرفع إلى بوابة أو تسريع التنزيل، فإن اختيار مستوى الضغط المناسب أهم من مطاردة أصغر حجم ممكن.',
            fr: 'Si votre objectif est l’envoi par e-mail, le dépôt sur un portail ou un téléchargement plus rapide, le bon niveau de compression compte davantage que la taille minimale absolue.',
          },
        ],
      },
      {
        heading: {
          en: 'A safer compression workflow',
          ar: 'سير عمل أكثر أماناً للضغط',
          fr: 'Une méthode de compression plus sûre',
        },
        paragraphs: [
          {
            en: 'Use balanced compression first, inspect pages with small text or charts, then decide whether you need a stronger setting. This prevents quality regressions that are hard to notice until a document reaches a customer.',
            ar: 'استخدم الضغط المتوازن أولاً، ثم افحص الصفحات التي تحتوي على نص صغير أو مخططات، وبعدها قرر إن كنت بحاجة إلى ضغط أقوى. بهذه الطريقة تتجنب تدهور الجودة الذي قد لا تلاحظه إلا بعد وصول الملف إلى العميل.',
            fr: 'Appliquez d’abord une compression équilibrée, vérifiez les pages contenant du petit texte ou des graphiques, puis décidez si un niveau plus fort est nécessaire. Cela évite les régressions de qualité détectées trop tard.',
          },
        ],
        bullets: [
          {
            en: 'Compress before merging large reports to keep the final package smaller.',
            ar: 'اضغط الملفات قبل دمج التقارير الكبيرة للحفاظ على حجم الناتج النهائي أصغر.',
            fr: 'Compressez avant de fusionner de gros rapports afin de réduire le poids final.',
          },
          {
            en: 'Keep an original copy when handling signed or compliance documents.',
            ar: 'احتفظ بنسخة أصلية عند التعامل مع مستندات موقعة أو مرتبطة بالامتثال.',
            fr: 'Conservez une copie originale pour les documents signés ou réglementaires.',
          },
          {
            en: 'If a portal still rejects the file, remove metadata after compression.',
            ar: 'إذا استمرت البوابة في رفض الملف، فاحذف البيانات الوصفية بعد الضغط.',
            fr: 'Si le portail refuse encore le fichier, supprimez les métadonnées après compression.',
          },
        ],
      },
    ],
  },
  {
    slug: 'convert-images-without-losing-quality',
    category: 'Image',
    publishedAt: '2025-01-10',
    readingMinutes: 4,
    toolSlugs: ['image-converter', 'image-resize', 'compress-image'],
    title: {
      en: 'Convert Images Between Formats Losslessly',
      ar: 'تحويل الصور بين الصيغ دون فقدان',
      fr: 'Convertir des images entre formats sans perte',
    },
    excerpt: {
      en: 'A complete guide to converting between PNG, JPG, WebP and other image formats while preserving quality.',
      ar: 'دليل كامل للتحويل بين PNG وJPG وWebP وغيرها مع الحفاظ على الجودة.',
      fr: 'Guide complet pour convertir entre PNG, JPG, WebP et d’autres formats tout en préservant la qualité.',
    },
    seoDescription: {
      en: 'Choose the right image format for screenshots, product photos, transparent graphics, and web performance.',
      ar: 'اختر صيغة الصورة المناسبة للقطات الشاشة وصور المنتجات والعناصر الشفافة وأداء الويب.',
      fr: 'Choisissez le bon format pour les captures d’écran, les photos produit, les graphismes transparents et la performance web.',
    },
    keyTakeaways: [
      {
        en: 'PNG is best for transparency and interface graphics.',
        ar: 'PNG هو الأفضل للشفافية ورسومات الواجهات.',
        fr: 'Le PNG reste idéal pour la transparence et les interfaces.',
      },
      {
        en: 'JPG is efficient for photos, while WebP often gives the best web balance.',
        ar: 'JPG مناسب للصور الفوتوغرافية، بينما WebP يقدّم غالباً أفضل توازن للويب.',
        fr: 'Le JPG convient aux photos, tandis que le WebP offre souvent le meilleur compromis pour le web.',
      },
      {
        en: 'Resize before compressing if you need smaller files for publishing.',
        ar: 'غيّر الأبعاد قبل الضغط إذا كنت تحتاج ملفات أصغر للنشر.',
        fr: 'Redimensionnez avant de compresser si vous visez des fichiers plus légers pour la publication.',
      },
    ],
    sections: [
      {
        heading: {
          en: 'Pick the format for the job',
          ar: 'اختر الصيغة بحسب المهمة',
          fr: 'Choisir le format selon l’usage',
        },
        paragraphs: [
          {
            en: 'Image conversion is not only about compatibility. It affects loading speed, transparency support, print quality, and how clean the asset looks after repeated editing.',
            ar: 'تحويل الصور لا يتعلق بالتوافق فقط. بل يؤثر في سرعة التحميل، ودعم الشفافية، وجودة الطباعة، ومدى نظافة الملف بعد التعديل المتكرر.',
            fr: 'La conversion d’image ne concerne pas seulement la compatibilité. Elle influence la vitesse de chargement, la transparence, la qualité d’impression et la tenue de l’image après plusieurs éditions.',
          },
          {
            en: 'Screenshots and diagrams usually benefit from PNG or WebP, while camera photos often work better as JPG or WebP with moderate compression.',
            ar: 'لقطات الشاشة والرسومات تستفيد غالباً من PNG أو WebP، بينما صور الكاميرا تعمل عادةً بشكل أفضل مع JPG أو WebP بضغط متوسط.',
            fr: 'Les captures d’écran et schémas profitent souvent du PNG ou du WebP, alors que les photos d’appareil se prêtent mieux au JPG ou au WebP avec une compression modérée.',
          },
        ],
      },
      {
        heading: {
          en: 'Avoid hidden quality loss',
          ar: 'تجنب فقدان الجودة غير الملحوظ',
          fr: 'Éviter les pertes de qualité invisibles',
        },
        paragraphs: [
          {
            en: 'Repeated conversions between lossy formats degrade sharp edges and text overlays. Keep one high-quality master file, then export the version you need for delivery.',
            ar: 'التحويل المتكرر بين الصيغ الضائعة يضعف الحواف الحادة والنصوص فوق الصور. احتفظ بنسخة رئيسية عالية الجودة ثم صدّر النسخة المناسبة للتسليم.',
            fr: 'Les conversions répétées entre formats avec perte dégradent les bords nets et les textes incrustés. Conservez un original de qualité, puis exportez uniquement la version de diffusion.',
          },
        ],
        bullets: [
          {
            en: 'Resize hero images before uploading them to your website.',
            ar: 'غيّر أبعاد الصور الرئيسية قبل رفعها إلى موقعك.',
            fr: 'Redimensionnez les visuels principaux avant de les envoyer sur votre site.',
          },
          {
            en: 'Use transparent PNG or WebP for logos and overlays.',
            ar: 'استخدم PNG أو WebP شفافاً للشعارات والعناصر المركبة.',
            fr: 'Utilisez du PNG ou du WebP transparent pour les logos et surimpressions.',
          },
          {
            en: 'Choose compression after you confirm the final dimensions.',
            ar: 'اختر الضغط بعد التأكد من الأبعاد النهائية للصورة.',
            fr: 'Choisissez la compression après validation des dimensions finales.',
          },
        ],
      },
    ],
  },
  {
    slug: 'ocr-extract-text-from-images',
    category: 'AI',
    publishedAt: '2025-01-05',
    readingMinutes: 5,
    toolSlugs: ['ocr', 'pdf-to-word', 'extract-tables'],
    title: {
      en: 'Extract Text from Scanned Documents with OCR',
      ar: 'استخراج النص من المستندات الممسوحة بـ OCR',
      fr: 'Extraire du texte de documents numérisés avec l’OCR',
    },
    excerpt: {
      en: 'Turn scanned PDFs and images into editable, searchable text using our AI-powered OCR technology.',
      ar: 'حوّل ملفات PDF الممسوحة والصور إلى نص قابل للتعديل والبحث باستخدام OCR المدعوم بالذكاء الاصطناعي.',
      fr: 'Transformez les PDF numérisés et les images en texte modifiable et recherchable grâce à l’OCR.',
    },
    seoDescription: {
      en: 'Improve OCR accuracy with better scans, language selection, and post-processing workflows for editable output.',
      ar: 'ارفع دقة OCR من خلال تحسين المسح الضوئي واختيار اللغة وسير العمل اللاحق للحصول على نص قابل للتحرير.',
      fr: 'Améliorez la précision OCR grâce à de meilleurs scans, au bon choix de langue et à un workflow de correction.',
    },
    keyTakeaways: [
      {
        en: 'Clean scans and the right OCR language dramatically improve accuracy.',
        ar: 'المسح النظيف واختيار لغة OCR الصحيحة يرفعان الدقة بشكل كبير.',
        fr: 'Un scan propre et la bonne langue OCR améliorent fortement la précision.',
      },
      {
        en: 'OCR is ideal for searchable archives, not perfect page design recreation.',
        ar: 'OCR مناسب للأرشفة القابلة للبحث، وليس لإعادة تصميم الصفحة بدقة كاملة.',
        fr: 'L’OCR sert surtout à rendre les archives recherchables, pas à reproduire parfaitement la mise en page.',
      },
      {
        en: 'Use table extraction or Word conversion after OCR when structure matters.',
        ar: 'استخدم استخراج الجداول أو التحويل إلى Word بعد OCR عندما تكون البنية مهمة.',
        fr: 'Utilisez ensuite l’extraction de tableaux ou la conversion Word si la structure compte.',
      },
    ],
    sections: [
      {
        heading: {
          en: 'What OCR is good at',
          ar: 'ما الذي يتقنه OCR',
          fr: 'Ce que l’OCR fait bien',
        },
        paragraphs: [
          {
            en: 'OCR turns image-based text into selectable text that you can search, copy, and reuse. It is especially useful for scanned contracts, invoices, receipts, and photographed notes.',
            ar: 'يقوم OCR بتحويل النص الموجود داخل الصور إلى نص يمكن تحديده والبحث فيه ونسخه وإعادة استخدامه. وهو مفيد خصوصاً للعقود الممسوحة والفواتير والإيصالات والملاحظات المصوّرة.',
            fr: 'L’OCR transforme le texte présent dans une image en texte sélectionnable, copiable et recherchable. Il est particulièrement utile pour les contrats scannés, factures, reçus et notes photographiées.',
          },
          {
            en: 'It works best when text is high contrast, upright, and captured at a readable resolution. Blurry or skewed pages still work, but you should expect more cleanup afterward.',
            ar: 'يعمل بأفضل شكل عندما يكون النص واضح التباين ومستقيماً وبدقة مناسبة. يمكنه التعامل مع الصفحات المشوشة أو المائلة، لكنك ستحتاج عادةً إلى تنظيف أكبر بعد الاستخراج.',
            fr: 'Il fonctionne mieux quand le texte est net, bien contrasté, droit et d’une résolution suffisante. Les pages floues ou inclinées restent possibles, mais demandent plus de corrections ensuite.',
          },
        ],
      },
      {
        heading: {
          en: 'How to improve the final output',
          ar: 'كيف تحسن النتيجة النهائية',
          fr: 'Comment améliorer le résultat final',
        },
        paragraphs: [
          {
            en: 'Before running OCR, crop noisy margins and rotate crooked images. After extraction, move structured content into Word or a spreadsheet if you need real editing rather than plain text.',
            ar: 'قبل تشغيل OCR، قص الحواف المزعجة ودوّر الصور المائلة. وبعد الاستخراج، انقل المحتوى المنظم إلى Word أو جدول إذا كنت تحتاج تحريراً فعلياً وليس نصاً مجرداً فقط.',
            fr: 'Avant de lancer l’OCR, rognez les marges inutiles et redressez les images. Après extraction, envoyez le contenu structuré vers Word ou un tableur si vous avez besoin d’édition réelle.',
          },
        ],
        bullets: [
          {
            en: 'Use the exact OCR language whenever possible.',
            ar: 'استخدم لغة OCR الدقيقة كلما أمكن.',
            fr: 'Choisissez la langue OCR exacte dès que possible.',
          },
          {
            en: 'Split mixed documents when only a few pages need OCR.',
            ar: 'قسّم المستندات المختلطة عندما تكون بضع صفحات فقط بحاجة إلى OCR.',
            fr: 'Découpez les documents mixtes si seules quelques pages nécessitent l’OCR.',
          },
          {
            en: 'Review numbers and names manually before final delivery.',
            ar: 'راجع الأرقام والأسماء يدوياً قبل التسليم النهائي.',
            fr: 'Vérifiez manuellement les nombres et noms avant livraison.',
          },
        ],
      },
    ],
  },
  {
    slug: 'merge-split-pdf-files',
    category: 'PDF',
    publishedAt: '2024-12-28',
    readingMinutes: 4,
    toolSlugs: ['merge-pdf', 'split-pdf', 'extract-pages'],
    title: {
      en: 'Master Merging and Splitting PDF Files',
      ar: 'إتقان دمج وتقسيم ملفات PDF',
      fr: 'Maîtriser la fusion et la division de fichiers PDF',
    },
    excerpt: {
      en: 'Step-by-step guide to combining multiple PDFs into one or splitting a large PDF into separate files.',
      ar: 'دليل خطوة بخطوة لدمج عدة ملفات PDF في ملف واحد أو تقسيم ملف كبير إلى ملفات منفصلة.',
      fr: 'Guide pas à pas pour combiner plusieurs PDF en un seul ou découper un gros document en plusieurs fichiers.',
    },
    seoDescription: {
      en: 'Organize reports, contracts, and attachments faster by choosing the right merge, split, or extract workflow.',
      ar: 'نظّم التقارير والعقود والمرفقات بسرعة أكبر باختيار سير العمل المناسب للدمج أو التقسيم أو الاستخراج.',
      fr: 'Organisez plus vite rapports, contrats et pièces jointes en choisissant le bon workflow de fusion, division ou extraction.',
    },
    keyTakeaways: [
      {
        en: 'Merge for delivery packages, split for review and routing.',
        ar: 'استخدم الدمج لحزم التسليم، والتقسيم للمراجعة والتوزيع.',
        fr: 'Fusionnez pour livrer un dossier complet, découpez pour relire ou distribuer.',
      },
      {
        en: 'Extract only the pages you need instead of duplicating large files.',
        ar: 'استخرج الصفحات المطلوبة فقط بدلاً من تكرار الملفات الكبيرة كاملة.',
        fr: 'Extrayez uniquement les pages utiles plutôt que de dupliquer de gros fichiers.',
      },
      {
        en: 'Reorder pages before final export when document sequence matters.',
        ar: 'أعد ترتيب الصفحات قبل التصدير النهائي عندما يكون التسلسل مهماً.',
        fr: 'Réorganisez les pages avant export si l’ordre du document est critique.',
      },
    ],
    sections: [
      {
        heading: {
          en: 'When to merge and when to split',
          ar: 'متى تدمج ومتى تقسّم',
          fr: 'Quand fusionner et quand séparer',
        },
        paragraphs: [
          {
            en: 'Merging is useful when you need one clean delivery package for a client, regulator, or internal archive. Splitting helps when each stakeholder only needs specific pages or sections.',
            ar: 'الدمج مفيد عندما تحتاج حزمة تسليم نظيفة واحدة للعميل أو للجهة التنظيمية أو للأرشفة الداخلية. أما التقسيم فيفيد عندما يحتاج كل طرف صفحات أو أقساماً محددة فقط.',
            fr: 'La fusion est utile pour produire un dossier unique à transmettre à un client, un régulateur ou un archivage interne. La division aide quand chaque destinataire n’a besoin que de certaines pages.',
          },
          {
            en: 'A good workflow often combines both: extract or split first, then merge only the pages that belong together.',
            ar: 'وغالباً ما يجمع سير العمل الجيد بين الاثنين: استخرج أو قسّم أولاً، ثم ادمج الصفحات التي يجب أن تبقى معاً فقط.',
            fr: 'Le meilleur workflow combine souvent les deux: extraire ou découper d’abord, puis fusionner uniquement les pages réellement liées.',
          },
        ],
      },
      {
        heading: {
          en: 'Reduce mistakes in document assembly',
          ar: 'قلّل أخطاء تجميع المستندات',
          fr: 'Réduire les erreurs d’assemblage',
        },
        paragraphs: [
          {
            en: 'Before sending a compiled PDF, verify page order, duplicate pages, and section breaks. A fast visual scan after assembly is cheaper than reissuing the wrong document later.',
            ar: 'قبل إرسال PDF مجمّع، تأكد من ترتيب الصفحات وتكرارها وفواصل الأقسام. المراجعة البصرية السريعة بعد التجميع أقل كلفة بكثير من إعادة إصدار المستند لاحقاً بشكل خاطئ.',
            fr: 'Avant d’envoyer un PDF assemblé, vérifiez l’ordre des pages, les doublons et les ruptures de section. Un contrôle visuel rapide coûte moins cher qu’une réémission ultérieure.',
          },
        ],
        bullets: [
          {
            en: 'Name output files by audience or purpose.',
            ar: 'سمِّ الملفات الناتجة وفق الجمهور أو الغرض.',
            fr: 'Nommez les fichiers selon le destinataire ou l’usage.',
          },
          {
            en: 'Compress final bundles only after page order is locked.',
            ar: 'اضغط الحزم النهائية فقط بعد تثبيت ترتيب الصفحات.',
            fr: 'Compressez le lot final uniquement une fois l’ordre figé.',
          },
          {
            en: 'Use page extraction when only annexes or signatures are required.',
            ar: 'استخدم استخراج الصفحات عندما تحتاج فقط الملاحق أو صفحات التوقيع.',
            fr: 'Utilisez l’extraction si vous n’avez besoin que des annexes ou signatures.',
          },
        ],
      },
    ],
  },
  {
    slug: 'ai-chat-with-pdf-documents',
    category: 'AI',
    publishedAt: '2024-12-20',
    readingMinutes: 5,
    toolSlugs: ['chat-pdf', 'summarize-pdf', 'translate-pdf'],
    title: {
      en: 'Chat with Your PDF Documents Using AI',
      ar: 'تحدث مع مستندات PDF باستخدام الذكاء الاصطناعي',
      fr: 'Discutez avec vos documents PDF grâce à l’IA',
    },
    excerpt: {
      en: 'Discover how AI can help you ask questions and get instant answers from any PDF document.',
      ar: 'اكتشف كيف يساعدك الذكاء الاصطناعي على طرح الأسئلة والحصول على إجابات فورية من أي مستند PDF.',
      fr: 'Découvrez comment l’IA peut vous aider à poser des questions et obtenir des réponses instantanées à partir de n’importe quel PDF.',
    },
    seoDescription: {
      en: 'Use AI chat, summaries, and translation together to move from document reading to faster decisions.',
      ar: 'استخدم المحادثة والملخصات والترجمة بالذكاء الاصطناعي معاً للانتقال من القراءة إلى القرار بشكل أسرع.',
      fr: 'Combinez chat IA, résumés et traduction pour passer plus vite de la lecture à la décision.',
    },
    keyTakeaways: [
      {
        en: 'AI chat is strongest when you ask narrow, contextual questions.',
        ar: 'المحادثة الذكية تكون أقوى عندما تطرح أسئلة ضيقة ومحددة بالسياق.',
        fr: 'Le chat IA est plus performant avec des questions précises et contextualisées.',
      },
      {
        en: 'Summaries help you orient quickly before deeper analysis.',
        ar: 'الملخصات تساعدك على التوجيه السريع قبل التحليل المتعمق.',
        fr: 'Les résumés aident à s’orienter rapidement avant une analyse plus profonde.',
      },
      {
        en: 'Translation expands access, but the original document should still be reviewed for critical decisions.',
        ar: 'الترجمة توسّع الوصول، لكن يجب مراجعة المستند الأصلي عند اتخاذ قرارات حساسة.',
        fr: 'La traduction élargit l’accès, mais le document source doit être relu pour les décisions critiques.',
      },
    ],
    sections: [
      {
        heading: {
          en: 'Turn long documents into answers',
          ar: 'حوّل المستندات الطويلة إلى إجابات',
          fr: 'Transformer de longs documents en réponses',
        },
        paragraphs: [
          {
            en: 'AI chat becomes useful when documents are long, repetitive, or packed with details. Instead of scrolling for one clause or number, you can ask targeted questions and move faster.',
            ar: 'تصبح محادثة الذكاء الاصطناعي مفيدة عندما تكون المستندات طويلة أو متكررة أو مليئة بالتفاصيل. بدلاً من التمرير بحثاً عن بند أو رقم واحد، يمكنك طرح أسئلة محددة والتحرك بسرعة أكبر.',
            fr: 'Le chat IA devient particulièrement utile lorsque les documents sont longs, répétitifs ou très denses. Plutôt que de parcourir chaque page, vous posez une question ciblée et avancez plus vite.',
          },
          {
            en: 'This works especially well for policy manuals, proposals, research PDFs, and contract drafts that need quick understanding before deeper review.',
            ar: 'ويناسب ذلك بشكل خاص أدلة السياسات، والعروض، والأبحاث، ومسودات العقود التي تحتاج إلى فهم سريع قبل المراجعة المتعمقة.',
            fr: 'Cela fonctionne particulièrement bien pour les manuels, propositions, recherches PDF et projets de contrat nécessitant une compréhension rapide avant relecture détaillée.',
          },
        ],
      },
      {
        heading: {
          en: 'Build a practical AI workflow',
          ar: 'ابنِ سير عمل عملياً مع الذكاء الاصطناعي',
          fr: 'Construire un workflow IA pratique',
        },
        paragraphs: [
          {
            en: 'Start with a summary, ask follow-up questions about the exact section you care about, then translate or export only what needs to be shared. This keeps the workflow focused and auditable.',
            ar: 'ابدأ بملخص، ثم اطرح أسئلة متابعة حول القسم الذي يهمك فعلاً، ثم ترجم أو صدّر فقط ما يلزم مشاركته. هكذا يبقى سير العمل مركزاً وقابلاً للمراجعة.',
            fr: 'Commencez par un résumé, posez ensuite des questions ciblées sur la section utile, puis traduisez ou partagez seulement ce qui doit l’être. Le flux de travail reste ainsi concentré et contrôlable.',
          },
        ],
        bullets: [
          {
            en: 'Ask for page references when you need validation.',
            ar: 'اطلب الإشارة إلى الصفحات عندما تحتاج إلى تحقق إضافي.',
            fr: 'Demandez des références de pages lorsque vous avez besoin de validation.',
          },
          {
            en: 'Use summaries before meetings or handoffs.',
            ar: 'استخدم الملخصات قبل الاجتماعات أو التسليمات.',
            fr: 'Utilisez les résumés avant une réunion ou un transfert.',
          },
          {
            en: 'Keep human review in the loop for legal or financial material.',
            ar: 'أبقِ المراجعة البشرية حاضرة مع المواد القانونية أو المالية.',
            fr: 'Gardez toujours une relecture humaine pour les contenus juridiques ou financiers.',
          },
        ],
      },
    ],
  },
  {
    slug: 'how-to-prepare-pdf-for-google-indexing',
    category: 'PDF',
    publishedAt: '2026-05-11',
    readingMinutes: 6,
    toolSlugs: ['compress-pdf', 'ocr', 'pdf-metadata'],
    title: {
      en: 'How to Prepare PDF Files for Better Google Indexing',
      ar: 'كيف تجهز ملفات PDF لفهرسة أفضل في Google',
      fr: 'Comment preparer des PDF pour une meilleure indexation Google',
    },
    excerpt: {
      en: 'A practical workflow for making PDFs lighter, searchable, and easier for Google to understand and index.',
      ar: 'مسار عملي لجعل ملفات PDF أخف وزناً وقابلة للبحث وأسهل على Google في الفهم والفهرسة.',
      fr: 'Un workflow pratique pour rendre les PDF plus legers, consultables et plus faciles a indexer par Google.',
    },
    seoDescription: {
      en: 'Learn how PDF compression, OCR, metadata, and clean file naming improve crawlability and indexing quality.',
      ar: 'تعرف على كيف يرفع ضغط PDF وOCR والبيانات الوصفية وأسماء الملفات الواضحة من قابلية الزحف وجودة الفهرسة.',
      fr: 'Comprenez comment la compression, l OCR, les metadonnees et un nom de fichier propre ameliorent l indexation.',
    },
    keyTakeaways: [
      { en: 'Use text-based PDFs whenever possible instead of scanned images.', ar: 'استخدم ملفات PDF النصية كلما أمكن بدلاً من النسخ الممسوحة كصور.', fr: 'Preferez les PDF textuels aux versions scannees en image.' },
      { en: 'Keep file sizes low so documents are easier to crawl and load.', ar: 'حافظ على حجم الملف منخفضاً ليكون أسهل في الزحف والتحميل.', fr: 'Gardez des fichiers legers pour faciliter le crawl et le chargement.' },
      { en: 'Add useful metadata and descriptive filenames before publishing.', ar: 'أضف بيانات وصفية مفيدة واسم ملف واضح قبل النشر.', fr: 'Ajoutez des metadonnees utiles et un nom de fichier descriptif avant publication.' },
    ],
    sections: [
      {
        heading: { en: 'Start with crawlable text', ar: 'ابدأ بنص قابل للزحف', fr: 'Commencez par un texte explorable' },
        paragraphs: [
          { en: 'Google indexes PDFs far better when the document contains real selectable text. If your file is only a scan, run OCR first so search engines and users can search and extract the content.', ar: 'يفهرس Google ملفات PDF بشكل أفضل كثيراً عندما يحتوي المستند على نص حقيقي يمكن تحديده. إذا كان الملف مجرد مسح ضوئي، شغّل OCR أولاً حتى تتمكن محركات البحث والمستخدمون من البحث داخل المحتوى واستخراجه.', fr: 'Google indexe mieux les PDF contenant du vrai texte selectionnable. Si le document est seulement scanne, utilisez d abord l OCR pour rendre le contenu exploitable.' },
          { en: 'This matters most for guides, whitepapers, proposals, manuals, and downloadable resources that you want to rank for long-tail queries.', ar: 'وهذا مهم خصوصاً للأدلة والوايت بيبر والعروض والكتيبات والموارد القابلة للتنزيل التي تريد أن تتصدر كلماتها المفتاحية الطويلة.', fr: 'C est essentiel pour les guides, livres blancs, propositions, manuels et ressources telechargeables visant la longue traine.' },
        ],
      },
      {
        heading: { en: 'Reduce friction before publishing', ar: 'قلل العوائق قبل النشر', fr: 'Reduisez les frictions avant publication' },
        paragraphs: [
          { en: 'Compress large PDFs, remove unnecessary metadata noise, and use filenames that describe the topic clearly. Small cleanup steps improve both user experience and indexing quality.', ar: 'اضغط ملفات PDF الكبيرة، واحذف الضوضاء غير الضرورية من البيانات الوصفية، واستخدم أسماء ملفات تصف الموضوع بوضوح. هذه الخطوات الصغيرة تحسن تجربة المستخدم وجودة الفهرسة معاً.', fr: 'Compressez les gros PDF, supprimez les metadonnees inutiles et utilisez des noms de fichiers clairs. Ces ajustements ameliorent l experience et l indexation.' },
        ],
        bullets: [
          { en: 'Prefer one canonical PDF URL per document.', ar: 'استخدم رابط PDF أساسي واحد لكل مستند.', fr: 'Gardez une seule URL canonique par document PDF.' },
          { en: 'Avoid duplicate uploads with different filenames.', ar: 'تجنب رفع نسخ مكررة بأسماء ملفات مختلفة.', fr: 'Evitez les doublons publies sous plusieurs noms de fichiers.' },
          { en: 'Link to the PDF from a relevant HTML page with context.', ar: 'اربط الـ PDF من صفحة HTML ذات صلة وتحتوي على سياق واضح.', fr: 'Liez le PDF depuis une page HTML pertinente et contextualisee.' },
        ],
      },
    ],
  },
  {
    slug: 'best-pdf-seo-workflow-for-content-teams',
    category: 'PDF',
    publishedAt: '2026-05-11',
    readingMinutes: 6,
    toolSlugs: ['merge-pdf', 'compress-pdf', 'pdf-to-word'],
    title: {
      en: 'Best PDF SEO Workflow for Content Teams',
      ar: 'أفضل سير عمل SEO لملفات PDF لفرق المحتوى',
      fr: 'Le meilleur workflow SEO PDF pour les equipes contenu',
    },
    excerpt: {
      en: 'Build a repeatable process for publishing lead magnets, reports, and downloadable PDFs without creating indexing waste.',
      ar: 'ابنِ عملية قابلة للتكرار لنشر الأدلة والملفات القابلة للتنزيل بدون خلق هدر في الفهرسة.',
      fr: 'Construisez un processus reproductible pour publier des PDF telechargeables sans gaspiller le budget de crawl.',
    },
    seoDescription: {
      en: 'A content operations guide for avoiding duplicate PDFs, improving internal linking, and publishing stronger document assets.',
      ar: 'دليل تشغيلي لفرق المحتوى لتجنب تكرار ملفات PDF وتحسين الربط الداخلي ونشر أصول مستندية أقوى.',
      fr: 'Un guide operationnel pour eviter les doublons PDF, renforcer le maillage interne et publier de meilleurs actifs documentaires.',
    },
    keyTakeaways: [
      { en: 'Create one source file, one landing page, and one public PDF URL.', ar: 'أنشئ ملفاً مصدرياً واحداً وصفحة هبوط واحدة ورابط PDF علنياً واحداً.', fr: 'Gardez un fichier source, une page d atterrissage et une seule URL PDF publique.' },
      { en: 'Use HTML pages to target intent and PDFs to deliver the asset.', ar: 'استخدم صفحات HTML لاستهداف نية البحث، وPDF لتسليم الأصل.', fr: 'Utilisez les pages HTML pour l intention et les PDF pour la livraison du contenu.' },
      { en: 'Update old PDFs instead of republishing slight duplicates.', ar: 'حدّث ملفات PDF القديمة بدلاً من إعادة نشر نسخ متشابهة جداً.', fr: 'Mettez a jour les anciens PDF au lieu de republier de quasi-doublons.' },
    ],
    sections: [
      {
        heading: { en: 'Separate ranking pages from downloadable assets', ar: 'افصل بين صفحات الترتيب والأصول القابلة للتنزيل', fr: 'Separez les pages de ranking des actifs telechargeables' },
        paragraphs: [
          { en: 'The strongest setup is usually an HTML landing page that explains the topic and links to one downloadable PDF. This helps Google understand the subject while still giving users the file they need.', ar: 'أفضل إعداد غالباً هو صفحة HTML تشرح الموضوع ثم تربط إلى ملف PDF واحد قابل للتنزيل. هذا يساعد Google على فهم الموضوع ويمنح المستخدمين الملف الذي يحتاجون إليه.', fr: 'La meilleure configuration repose souvent sur une page HTML explicative qui pointe vers un seul PDF a telecharger. Google comprend mieux le sujet et l utilisateur obtient le fichier attendu.' },
        ],
      },
      {
        heading: { en: 'Control version sprawl', ar: 'سيطر على تضخم الإصدارات', fr: 'Controlez la multiplication des versions' },
        paragraphs: [
          { en: 'Many indexing problems come from publishing versioned PDFs, campaign copies, and renamed duplicates. Keep a clean archive and point internal links to the current canonical asset.', ar: 'كثير من مشاكل الفهرسة تأتي من نشر ملفات PDF بإصدارات متعددة أو نسخ حملات أو تكرارات بأسماء مختلفة. احتفظ بأرشيف نظيف ووجّه الروابط الداخلية إلى الأصل الحالي فقط.', fr: 'Beaucoup de problemes d indexation viennent des PDF versionnes, copies de campagne et doublons renommes. Gardez un archive propre et dirigez les liens internes vers l actif canonique courant.' },
        ],
        bullets: [
          { en: 'Merge appendices into one final delivery file.', ar: 'ادمج الملاحق في ملف تسليم نهائي واحد.', fr: 'Fusionnez les annexes dans un seul fichier final.' },
          { en: 'Compress before upload to avoid oversized downloads.', ar: 'اضغط قبل الرفع لتجنب ملفات تنزيل ضخمة.', fr: 'Compressez avant publication pour eviter des telechargements trop lourds.' },
          { en: 'Retire old URLs with redirects when documents are replaced.', ar: 'اسحب الروابط القديمة بإعادة توجيه عند استبدال المستندات.', fr: 'Retirez les anciennes URL avec redirection lorsque le document change.' },
        ],
      },
    ],
  },
  {
    slug: 'how-to-fix-soft-404-and-canonical-issues',
    category: 'AI',
    publishedAt: '2026-05-11',
    readingMinutes: 6,
    toolSlugs: ['text-cleaner', 'word-counter', 'html-to-pdf'],
    title: {
      en: 'How to Fix Soft 404 and Canonical Issues on SEO Pages',
      ar: 'كيف تعالج Soft 404 ومشاكل Canonical في صفحات SEO',
      fr: 'Comment corriger les Soft 404 et les problemes de canonique SEO',
    },
    excerpt: {
      en: 'A technical SEO checklist for stopping weak pages, duplicate routes, and invalid URL shells from confusing Google.',
      ar: 'قائمة تقنية لإيقاف الصفحات الضعيفة والمسارات المكررة وواجهات الروابط غير الصحيحة عن إرباك Google.',
      fr: 'Une checklist SEO technique pour empecher les pages faibles, doublons et URL invalides de perturber Google.',
    },
    seoDescription: {
      en: 'Learn when to return real 404s, when to use canonical tags, and how static route shells improve indexing quality.',
      ar: 'تعرف على متى يجب إرجاع 404 حقيقي، ومتى تستخدم canonical، وكيف تحسن shells الثابتة جودة الفهرسة.',
      fr: 'Apprenez quand renvoyer un vrai 404, quand utiliser une canonique et comment les shells statiques aident l indexation.',
    },
    keyTakeaways: [
      { en: 'Unknown routes should not return a normal 200 page.', ar: 'المسارات غير المعروفة يجب ألا تعيد صفحة 200 عادية.', fr: 'Les routes inconnues ne doivent pas renvoyer une page 200 normale.' },
      { en: 'Canonical tags help duplicates, but they do not fix weak or invalid URLs alone.', ar: 'علامات canonical تساعد مع التكرار، لكنها لا تعالج الروابط الضعيفة أو الخاطئة وحدها.', fr: 'La balise canonique aide sur les doublons mais ne corrige pas a elle seule les URL faibles ou invalides.' },
      { en: 'Pre-rendered shells give search engines cleaner first-response metadata.', ar: 'الـ shells المولدة مسبقاً تمنح محركات البحث بيانات وصفية أنظف من أول استجابة.', fr: 'Les shells pre-rendus fournissent des metadonnees plus propres des la premiere reponse.' },
    ],
    sections: [
      {
        heading: { en: 'Use the right response for the right URL', ar: 'استخدم الاستجابة المناسبة للرابط المناسب', fr: 'Utilisez la bonne reponse pour la bonne URL' },
        paragraphs: [
          { en: 'If a URL is invalid, removed, or never existed, return a real 404. If the content exists in two places for business reasons, keep one canonical version and redirect or annotate the secondary page.', ar: 'إذا كان الرابط غير صالح أو محذوفاً أو لم يوجد أصلاً، فأرجع 404 حقيقياً. وإذا كان المحتوى موجوداً في مكانين لأسباب عملية، فاحتفظ بنسخة أساسية واحدة وأعد التوجيه أو أضف canonical على الصفحة الثانوية.', fr: 'Si une URL est invalide, supprimee ou inexistante, renvoyez un vrai 404. Si le contenu existe a deux endroits pour des raisons legitimes, gardez une version canonique et redirigez ou annotez la secondaire.' },
        ],
      },
      {
        heading: { en: 'Avoid indexation waste', ar: 'تجنب هدر الفهرسة', fr: 'Evitez le gaspillage d indexation' },
        paragraphs: [
          { en: 'Search engines lose trust when invalid routes, parameter noise, or empty shells look like real pages. Clean routing and stronger metadata reduce crawl waste and improve prioritization.', ar: 'تفقد محركات البحث الثقة عندما تبدو المسارات الخاطئة أو المعلمات الفوضوية أو الواجهات الفارغة كأنها صفحات حقيقية. التنظيف الجيد للمسارات والبيانات الوصفية الأقوى يقللان هدر الزحف ويحسنان الأولوية.', fr: 'Les moteurs perdent en confiance lorsque des routes invalides, des parametres inutiles ou des shells vides ressemblent a de vraies pages. Un routage propre et de meilleures metadonnees reduisent le gaspillage.' },
        ],
      },
    ],
  },
  {
    slug: 'image-optimization-for-faster-seo-pages',
    category: 'Image',
    publishedAt: '2026-05-11',
    readingMinutes: 5,
    toolSlugs: ['compress-image', 'image-resize', 'image-converter'],
    title: {
      en: 'Image Optimization for Faster SEO Pages',
      ar: 'تحسين الصور لصفحات SEO أسرع',
      fr: 'Optimisation des images pour des pages SEO plus rapides',
    },
    excerpt: {
      en: 'Speed up landing pages and blog posts by resizing, converting, and compressing images with a publishing-first workflow.',
      ar: 'سرّع صفحات الهبوط والمقالات عبر تغيير الأبعاد والتحويل والضغط ضمن سير عمل مخصص للنشر.',
      fr: 'Accellerez les pages et articles en redimensionnant, convertissant et compressant les images avant publication.',
    },
    seoDescription: {
      en: 'Reduce image weight without harming design quality so your SEO pages load faster and keep users engaged.',
      ar: 'قلل وزن الصور بدون الإضرار بجودة التصميم حتى تحمل صفحات SEO أسرع وتحافظ على تفاعل المستخدم.',
      fr: 'Reduisez le poids des images sans nuire au rendu afin de charger plus vite et conserver l engagement.',
    },
    keyTakeaways: [
      { en: 'Resize first, then compress.', ar: 'غيّر الأبعاد أولاً ثم اضغط.', fr: 'Redimensionnez d abord, puis compressez.' },
      { en: 'Use the right format for screenshots, photos, and graphics.', ar: 'استخدم الصيغة المناسبة للقطات الشاشة والصور والعناصر الرسومية.', fr: 'Choisissez le bon format selon le type d image.' },
      { en: 'Fast-loading media supports both rankings and conversions.', ar: 'الوسائط السريعة تدعم الترتيب والتحويلات معاً.', fr: 'Des medias rapides aident a la fois le SEO et la conversion.' },
    ],
    sections: [
      {
        heading: { en: 'Performance starts before upload', ar: 'الأداء يبدأ قبل الرفع', fr: 'La performance commence avant l upload' },
        paragraphs: [
          { en: 'Many pages become slow because oversized source images are uploaded and only visually scaled down in the layout. Resize to the real display size first, then compress for delivery.', ar: 'تصبح كثير من الصفحات بطيئة لأن الصور المصدرية الضخمة تُرفع كما هي ثم تُصغر بصرياً فقط داخل التصميم. غيّر أبعادها إلى المقاس الحقيقي أولاً، ثم اضغطها للتسليم.', fr: 'Beaucoup de pages ralentissent car des images surdimensionnees sont mises en ligne puis seulement reduites visuellement. Ajustez d abord la taille reelle, puis compressez.' },
        ],
      },
      {
        heading: { en: 'Protect quality where it matters', ar: 'احفظ الجودة حيث يلزم', fr: 'Preservez la qualite la ou elle compte' },
        paragraphs: [
          { en: 'Keep sharp text in graphics, preserve transparency for interface elements, and avoid repeated lossy exports. Better asset hygiene produces lighter pages with fewer visual regressions.', ar: 'حافظ على وضوح النص داخل الرسومات، واحتفظ بالشفافية للعناصر البصرية، وتجنب التصدير الضائع المتكرر. نظافة الأصول البصرية تنتج صفحات أخف مع تراجعات بصرية أقل.', fr: 'Conservez un texte net dans les visuels, la transparence pour les elements d interface et evitez les exports destructifs repetes. Une hygiene d actifs correcte produit des pages plus legeres.' },
        ],
      },
    ],
  },
  {
    slug: 'document-workflows-that-improve-technical-seo',
    category: 'PDF',
    publishedAt: '2026-05-11',
    readingMinutes: 6,
    toolSlugs: ['merge-pdf', 'extract-pages', 'ocr'],
    title: {
      en: 'Document Workflows That Improve Technical SEO',
      ar: 'مسارات عمل المستندات التي تحسن Technical SEO',
      fr: 'Des workflows documentaires qui ameliorent le SEO technique',
    },
    excerpt: {
      en: 'Smart document operations reduce duplicate files, improve discoverability, and make large content libraries easier to crawl.',
      ar: 'عمليات المستندات الذكية تقلل الملفات المكررة وتحسن الاكتشاف وتجعل مكتبات المحتوى الكبيرة أسهل للزحف.',
      fr: 'Des operations documentaires intelligentes reduisent les doublons et rendent les bibliotheques plus faciles a explorer.',
    },
    seoDescription: {
      en: 'See how extraction, consolidation, OCR, and cleanup workflows support cleaner site architecture and stronger indexation signals.',
      ar: 'اكتشف كيف يدعم الاستخراج والدمج وOCR والتنظيف بنية موقع أنظف وإشارات فهرسة أقوى.',
      fr: 'Voyez comment l extraction, la consolidation, l OCR et le nettoyage soutiennent une architecture plus propre et une meilleure indexation.',
    },
    keyTakeaways: [
      { en: 'File operations affect crawl efficiency more than many teams expect.', ar: 'عمليات الملفات تؤثر على كفاءة الزحف أكثر مما تتوقعه كثير من الفرق.', fr: 'Les operations sur fichiers influencent le crawl plus qu on ne le pense.' },
      { en: 'A cleaner archive reduces duplicate and thin document URLs.', ar: 'الأرشيف الأنظف يقلل الروابط المكررة والصفحات المستندية الضعيفة.', fr: 'Une archive plus propre reduit les URL documentaires dupliquees ou faibles.' },
      { en: 'Document SEO works best when combined with clear HTML entry pages.', ar: 'SEO الخاص بالمستندات يعمل أفضل عند دمجه مع صفحات HTML مدخلية واضحة.', fr: 'Le SEO des documents fonctionne mieux avec des pages HTML d entree claires.' },
    ],
    sections: [
      {
        heading: { en: 'Consolidate scattered resources', ar: 'وحّد الموارد المتناثرة', fr: 'Consolidez les ressources dispersees' },
        paragraphs: [
          { en: 'When the same topic is split across annexes, outdated scans, and separate exports, search engines see fragmented signals. Consolidating related pages into one final document often improves clarity.', ar: 'عندما يتوزع الموضوع نفسه بين ملاحق ونسخ ممسوحة قديمة وتصديرات منفصلة، ترى محركات البحث إشارات مجزأة. توحيد الصفحات المرتبطة في مستند نهائي واحد يحسن الوضوح غالباً.', fr: 'Quand un meme sujet est disperse entre annexes, anciens scans et exports separes, les moteurs recoivent des signaux fragmentes. Regrouper dans un document final ameliore souvent la clarte.' },
        ],
      },
      {
        heading: { en: 'Remove low-value document clutter', ar: 'أزل فوضى المستندات منخفضة القيمة', fr: 'Supprimez le bruit documentaire a faible valeur' },
        paragraphs: [
          { en: 'Extract only the pages worth publishing, archive the rest, and run OCR where the content still matters. This leaves a smaller, stronger set of assets for Google to discover.', ar: 'استخرج الصفحات التي تستحق النشر فقط، وأرشف الباقي، وشغّل OCR حيث لا يزال المحتوى مهماً. هذا يترك مجموعة أصغر وأقوى من الأصول ليكتشفها Google.', fr: 'Extrayez seulement les pages utiles, archivez le reste et appliquez l OCR la ou le contenu compte encore. Vous gardez ainsi un ensemble d actifs plus petit et plus fort a indexer.' },
        ],
        bullets: [
          { en: 'Publish one strong resource instead of many weak attachments.', ar: 'انشر مورداً واحداً قوياً بدلاً من مرفقات كثيرة ضعيفة.', fr: 'Publiez une ressource forte plutot que plusieurs pieces jointes faibles.' },
          { en: 'Keep internal links aligned with the latest canonical asset.', ar: 'اجعل الروابط الداخلية تشير دائماً إلى الأصل الأحدث.', fr: 'Gardez les liens internes alignes sur l actif canonique le plus recent.' },
          { en: 'Audit old downloads during every content refresh cycle.', ar: 'راجع التنزيلات القديمة في كل دورة تحديث محتوى.', fr: 'Auditez les anciens telechargements a chaque cycle de mise a jour.' },
        ],
      },
    ],
  },
];

export function normalizeBlogLocale(language: string): BlogLocale {
  const baseLanguage = language.split('-')[0] as BlogLocale;
  return baseLanguage === 'ar' || baseLanguage === 'fr' ? baseLanguage : 'en';
}

function localizeText(text: LocalizedText, locale: BlogLocale): string {
  return text[locale] || text.en;
}

export function getLocalizedBlogArticle(article: BlogArticle, locale: BlogLocale): LocalizedBlogArticle {
  return {
    slug: article.slug,
    category: article.category,
    publishedAt: article.publishedAt,
    readingMinutes: article.readingMinutes,
    toolSlugs: article.toolSlugs,
    title: localizeText(article.title, locale),
    excerpt: localizeText(article.excerpt, locale),
    seoDescription: localizeText(article.seoDescription, locale),
    keyTakeaways: article.keyTakeaways.map((item) => localizeText(item, locale)),
    sections: article.sections.map((section) => ({
      heading: localizeText(section.heading, locale),
      paragraphs: section.paragraphs.map((paragraph) => localizeText(paragraph, locale)),
      bullets: (section.bullets || []).map((bullet) => localizeText(bullet, locale)),
    })),
  };
}

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((article) => article.slug === slug);
}
