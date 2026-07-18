export interface TermsSection {
  title: string;
  body: string[];
}

export interface TermsDoc {
  heading: string;
  subtitle: string;
  version: string;
  sections: TermsSection[];
  footer: string;
}

export const termsAr: TermsDoc = {
  heading: "شروط الاستخدام وسياسة الخصوصية",
  subtitle: "يُرجى قراءة هذه الشروط بعناية قبل استخدام المنصة.",
  version: "الإصدار 0.9 — Staff Edition",
  sections: [
    {
      title: "١. البيانات التي نجمعها",
      body: [
        "بيانات الحساب: الاسم، اسم المستخدم، والبريد الإلكتروني (عبر Clerk).",
        "المحتوى الذي تنشره: صور، فيديوهات، تعليقات، وقصص.",
        "بيانات التفاعل: اللايكات، الحفظ، والمشاهدات — وتُستخدم حصراً لتحسين اقتراحات المحتوى لك.",
        "الرسائل الخاصة بين المستخدمين.",
        "يتم تخزين الصور والفيديوهات على خوادمنا الخاصة عبر منصة BaaS التي طوّرناها، ولا نشارك ملفاتك مع أي طرف خارجي.",
      ],
    },
    {
      title: "٢. التزاماتنا تجاه بياناتك",
      body: [
        "لا نستخدم بياناتك إلا لتحسين تجربتك داخل المنصة فحسب.",
        "يُحظر حظراً مطلقاً على أي مطوّر أو فرد من الفريق بيع بياناتك أو مشاركتها مع أي طرف ثالث.",
        "يُحظر استخدام بياناتك في أي غرض غير مشروع أو خارج نطاق تشغيل الخدمة.",
        "بيانات التفاعل المستخدمة في الخوارزمية لا تُحفظ أكثر من 90 يوماً.",
      ],
    },
    {
      title: "٣. الفئة العمرية",
      body: [
        "Silver Stream موجّه للمستخدمين الذين تجاوزوا 18 سنة.",
        "إن كنت دون الثامنة عشرة، فإن تسجيلك واستخدامك للتطبيق يُعدّ إقراراً منك بأنك حصلت على موافقة وليّ أمرك.",
        "في حال عدم الحصول على هذه الموافقة، تقع على عاتقك وحدك المسؤولية الكاملة عن أي ضرر قد يلحق بك، ويُعفى فريق Silver Stream من أي تبعة قانونية في هذا الشأن.",
      ],
    },
    {
      title: "٤. مسؤولية المستخدم",
      body: [
        "Silver Stream منصة للتواصل والمشاركة. الفريق التطويري محدود العدد وغير قادر على مراقبة جميع المحتوى.",
        "أنت وحدك المسؤول عن المحتوى الذي تنشره، واستخدامك للتطبيق وفق قوانين بلدك، وأي نزاعات تنشأ بينك وبين مستخدمين آخرين.",
        "التطبيق متاح لجميع البلدان، غير أن الالتزام بقوانين بلدك يقع على عاتقك أنت.",
        "لا يتحمل فريق Silver Stream أي مسؤولية قانونية عن محتوى المستخدمين أو طريقة استخدامهم للمنصة.",
      ],
    },
    {
      title: "٥. المحتوى المحظور والعقوبات",
      body: [
        "يُطرد نهائياً من المنصة كل مستخدم يقوم بأي مما يلي:",
        "• انتحال الشخصية — ادّعاء كونه شخصاً آخر أو جهة رسمية.",
        "• الترهيب والتهديد — بأي شكل كان تجاه مستخدمين أو غيرهم.",
        "• الأعمال غير المشروعة — أي نشاط مخالف للقانون عبر المنصة.",
        "• السرقة — سرقة محتوى أو بيانات أو هوية.",
        "• المحتوى المخل — نشر أي محتوى منافٍ للآداب العامة أو غير لائق للمجتمع.",
        "• الألفاظ البذيئة — استخدام لغة غير لائقة أو مسيئة.",
        "الطرد نهائي وغير قابل للاستئناف في الحالات الجسيمة، ويحق للفريق اتخاذ القرار وفق تقديره.",
      ],
    },
    {
      title: "٦. إقرار بمحدودية الخدمة",
      body: [
        "Silver Stream منصة ناشئة في مراحلها الأولى، وتعمل بفريق تطويري محدود الإمكانيات.",
        "لا تضمن المنصة مستوى حماية كاملاً للبيانات أو المحتوى في هذه المرحلة.",
        "لا يتوفر حالياً دعم قانوني أو تعويض في حال وقوع أي ضرر.",
        "بتسجيلك واستخدامك للمنصة، فأنت تُقرّ صراحةً بعلمك بهذه المحدودية وتوافق على تحمّل المخاطر المترتبة على ذلك.",
      ],
    },
    {
      title: "٧. أمان حسابك",
      body: [
        "لن يطلب فريق Silver Stream منك أبداً معلوماتك الحساسة ككلمات المرور أو بيانات الدفع عبر أي قناة تواصل.",
        "إياك ثم إياك ثم إياك مشاركة بريدك الإلكتروني أو رمز التحقق الخاص بحسابك مع أي شخص كان، بما في ذلك من يدّعي انتماءه لفريقنا.",
        "من يُفصح عن هذه المعلومات يكون قد تنازل عن حقه بيده، ولن تتحمل المنصة أي مسؤولية.",
        "باستخدامك للمنصة، تُقرّ بأنك اخترت كلمة مرور قوية لحسابك. أي اختراق ناجم عن كلمة مرور ضعيفة يقع على عاتقك وحدك.",
      ],
    },
    {
      title: "٨. استغلال الثغرات الأمنية",
      body: [
        "يُحظر استغلال أي ثغرة أو خلل أمني في المنصة.",
        "من يُثبت تورطه في ذلك قد يتعرض للمساءلة القانونية.",
        "إن اكتشفت ثغرة، يُرجى الإبلاغ عنها للفريق بشكل مسؤول.",
      ],
    },
    {
      title: "٩. حقوق العلامة التجارية",
      body: [
        "نعتذر مسبقاً لأصحاب أي علامة تجارية قد تتشابه مع اسم المنصة أو شعارها أو أي عنصر فيها؛ إذ إن المنصة لا تزال في مراحلها الأولى وتحتاج إلى اسم مؤقت ريثما يُعتمد الاسم الرسمي.",
        "سيُعاد النظر في الاسم والشعار وجميع عناصر الهوية البصرية فور التحقق من خلوّها من أي تعارض مع علامات تجارية مسجّلة.",
        "إن كنت تعتقد أن عنصراً ما يمس علامتك التجارية، يُرجى مراسلة إدارة المنصة عبر البريد الرسمي وسنتعامل مع بلاغك بجدية تامة وفي أقرب وقت.",
      ],
    },
    {
      title: "١٠. إخلاء مسؤولية — عدم التعويض المالي",
      body: [
        "المنصة في مرحلة تأسيسية ولا تمتلك حالياً أي ميزانية للتعويضات.",
        "لا تتعهد المنصة بتقديم أي تعويض مادي أو مالي بأي شكل من الأشكال وتحت أي ظرف في المرحلة الراهنة.",
        "باستخدامك للمنصة فأنت تُقرّ علمك بذلك وتتنازل عن المطالبة بأي تعويض مادي.",
      ],
    },
    {
      title: "١١. المنصة مبنية بمساعدة الذكاء الاصطناعي",
      body: [
        "تم بناء هذه المنصة بالاستعانة بأدوات الذكاء الاصطناعي، مما يعني احتمالية وجود ثغرات أو أخطاء غير مقصودة.",
        "نُشجّع المستخدمين على الإبلاغ عن أي خلل أو مشكلة يواجهونها عبر البريد الرسمي للإدارة، وسيُكافأ كل من يُسهم في رصد ثغرة حقيقية ويُبلّغ عنها بشكل مسؤول.",
        "لا يُعدّ وجود أخطاء برمجية مسوّغاً لاستغلال المنصة أو إلحاق الضرر بها أو بمستخدميها.",
      ],
    },
    {
      title: "١٢. حماية خصوصيتك الشخصية",
      body: [
        "نحذّرك بشدة من نشر أي معلومة شخصية حساسة على المنصة، ومنها: بريدك الإلكتروني، اسمك الحقيقي، صورتك الحقيقية، كلمات مرورك، موقعك الجغرافي أو عنوانك، أو أي بيانات تُعرّض خصوصيتك للخطر.",
        "المنصة لا تزال في طور التطوير ولا تمتلك حصانة أمنية كاملة في هذه المرحلة.",
        "أنت تتحمل وحدك مسؤولية المعلومات التي تختار نشرها، وتبرأ المنصة من أي ضرر ناتج عن إفصاحك الطوعي عن بياناتك.",
      ],
    },
    {
      title: "١٣. الهوية البصرية — حقوق قانونية مؤجّلة",
      body: [
        "الاسم والشعار وجميع عناصر المنصة لا تزال تحت الاختبار ولم تُسجَّل بعد كعلامة تجارية رسمية.",
        "مع ذلك، يُحظر صراحةً نسخ المنصة أو استنساخها أو استخدامها قاعدةً لمشروع آخر دون إذن خطي مسبق من الإدارة.",
        "من يثبت تورطه في سرقة المنصة أو انتحال هويتها سيتم اتخاذ الإجراءات القانونية اللازمة بحقه.",
      ],
    },
    {
      title: "١٤. تحذير من الهندسة الاجتماعية",
      body: [
        "إياك ثم إياك أن تنصاع لأي شخص يطلب منك معلومات شخصية أو بيانات حسابك تحت أي ذريعة كانت، سواء ادّعى انتماءه لفريق المنصة أو لجهة رسمية.",
        "هذا الأسلوب يُعرف بـ«الهندسة الاجتماعية» ويُستخدم للخداع والابتزاز والتهديد.",
        "كل من يتعرض للابتزاز أو التهديد داخل المنصة عليه الإبلاغ فوراً ولا ينصاع للمبتز أبداً.",
        "كل من ثبت قيامه بابتزاز أو تهديد مستخدم آخر سيُحذف حسابه نهائياً أو يُقيَّد دون إنذار مسبق.",
      ],
    },
    {
      title: "١٥. حق الفريق في تعديل الشروط",
      body: [
        "يحتفظ فريق Silver Stream بالحق الكامل في تعديل هذه الشروط أو تحديثها أو إعادة صياغتها في أي وقت يراه مناسباً، دون الحاجة إلى استئذان المستخدمين أو إخطارهم مسبقاً.",
        "يُعدّ استمرارك في استخدام المنصة بعد نشر أي تعديل قبولاً صريحاً وتاماً منك للشروط المحدَّثة.",
        "تقع على عاتقك مسؤولية مراجعة الشروط بصفة دورية للاطلاع على كل ما يستجد فيها.",
      ],
    },
    {
      title: "١٦. حق الفريق في إيقاف الخدمة أو تعليقها",
      body: [
        "تحتفظ المنصة بالحق المطلق في تعليق الخدمة كلياً أو جزئياً، مؤقتاً أو دائماً، في أي وقت ولأي سبب، سواء أعلنت عن ذلك مسبقاً أم لم تُعلن.",
        "لا يترتب على هذا الإيقاف أي التزام بتعويض المستخدمين أو إخطارهم بمهلة زمنية محددة.",
        "قد يشمل الإيقاف صيانة الخوادم، أو ترقية البنية التقنية، أو ظروفاً قاهرة خارجة عن إرادة الفريق. في جميع الأحوال، المنصة غير مسؤولة عن أي ضرر أو خسارة ناجمة عن توقف الخدمة.",
      ],
    },
    {
      title: "١٧. حق الفريق في إنهاء أي حساب",
      body: [
        "يملك فريق Silver Stream صلاحية تقييد أي حساب أو تعليقه أو حذفه نهائياً، في أي وقت وبمحض إرادته، دون اشتراط تقديم مبرر أو إشعار مسبق.",
        "لا يحق للمستخدم المُوقَف حسابُه المطالبة بأي تعويض أو استرداد، ولا يحق له إنشاء حساب جديد إن كان الحذف بسبب مخالفة جسيمة.",
        "هذه الصلاحية مطلقة غير مقيدة، وتُستخدم لصون سلامة المجتمع وحماية بيئة المنصة.",
      ],
    },
    {
      title: "١٨. المحتوى الخارجي والروابط الأجنبية",
      body: [
        "قد تحتوي المنصة على روابط لمواقع أو خدمات خارجية لا تقع تحت سيطرة فريق Silver Stream ولا تمت له بصلة.",
        "لا تتحمل المنصة أي مسؤولية عن محتوى تلك المواقع أو سياساتها أو الأضرار التي قد تنجم عن التعامل معها.",
        "إقدامك على زيارة أي رابط خارجي أو التعامل معه يجري على مسؤوليتك الشخصية الكاملة.",
      ],
    },
    {
      title: "١٩. تعهد المستخدم بتعويض الفريق",
      body: [
        "بقبولك هذه الشروط، تتعهد صراحةً بأن تُعفي فريق Silver Stream وجميع أعضائه ومطوريه من أي مطالبة أو دعوى قانونية أو خسارة أو مصروفات تنشأ عن استخدامك للمنصة، أو انتهاكك لهذه الشروط، أو إضرارك بأي طرف ثالث عبر المنصة.",
        "هذا التعهد يشمل تغطية أي تكاليف قانونية أو قضائية قد يتكبدها الفريق جراء تصرفاتك.",
        "بعبارة أوضح: إن جلبت مشكلة على نفسك أو على غيرك عبر المنصة، فأنت وحدك من يتحمل تبعاتها القانونية والمالية.",
      ],
    },
    {
      title: "٢٠. الخدمة مقدَّمة «كما هي» — دون ضمانات",
      body: [
        "تُقدَّم منصة Silver Stream بحالتها الراهنة «كما هي» و«كما هي متاحة»، دون أي ضمان صريح أو ضمني بشأن الجودة أو الاستمرارية أو الخلو من العيوب أو الملاءمة لغرض بعينه.",
        "لا يضمن الفريق خلوّ المنصة من الأخطاء البرمجية، ولا يضمن عدم انقطاع الخدمة، ولا سلامة البيانات من أي تلف أو فقدان.",
        "استخدامك للمنصة يعني قبولك الكامل لهذه المخاطر وتحملك لها بإرادتك الحرة.",
      ],
    },
    {
      title: "٢١. الاختصاص القانوني والجهة المختصة",
      body: [
        "تخضع هذه الشروط وتُفسَّر وفقاً للمبادئ القانونية العامة المعمول بها، نظراً لكون المنصة موجَّهة للمستخدمين من جميع أنحاء العالم.",
        "في حال نشوء أي نزاع بين المستخدم والمنصة، يكون التواصل المباشر عبر البريد الإلكتروني الرسمي للإدارة هو المسار الأول والمفضّل لحل الخلاف بالطرق الودية.",
        "تحتفظ المنصة بالحق في اتخاذ الإجراءات القانونية اللازمة أمام الجهات المختصة في البلد الذي ينتمي إليه المخالف أو في أي ولاية قضائية تراها الإدارة مناسبة.",
      ],
    },
  ],
  footer:
    "باستخدامك لمنصة Silver Stream فأنت تُقرّ بقراءة هذه الشروط وفهمها والموافقة الكاملة على جميع بنودها دون استثناء. جهلك بهذه الشروط لا يُعفيك من الالتزام بها.",
};

export const termsEn: TermsDoc = {
  heading: "Terms of Service & Privacy Policy",
  subtitle: "Please read these terms carefully before using the platform.",
  version: "Version 0.9 — Staff Edition",
  sections: [
    {
      title: "1. Data We Collect",
      body: [
        "Account data: name, username, and email address (via Clerk).",
        "Content you post: images, videos, comments, and stories.",
        "Interaction data: likes, saves, and views — used exclusively to improve content suggestions for you.",
        "Private messages between users.",
        "Media files are stored on our own servers via our in-house BaaS platform and are never shared with third parties.",
      ],
    },
    {
      title: "2. Our Commitment to Your Data",
      body: [
        "We use your data solely to improve your experience on the platform.",
        "It is strictly forbidden for any developer or team member to sell or share your data with any third party.",
        "Your data may not be used for any unlawful purpose or outside the scope of operating the service.",
        "Interaction data used for the recommendation algorithm is retained for no more than 90 days.",
      ],
    },
    {
      title: "3. Age Requirement",
      body: [
        "Silver Stream is intended for users who are 18 years of age or older.",
        "If you are under 18, registering and using the app constitutes your acknowledgment that you have obtained parental or guardian consent.",
        "If such consent was not obtained, you alone bear full responsibility for any harm that may result, and the Silver Stream team is released from any legal liability.",
      ],
    },
    {
      title: "4. User Responsibility",
      body: [
        "Silver Stream is a communication and sharing platform. The development team is small and unable to monitor all content.",
        "You are solely responsible for the content you post, your use of the app in compliance with your local laws, and any disputes arising between you and other users.",
        "The app is available in all countries; however, compliance with your local laws is your responsibility.",
        "The Silver Stream team bears no legal responsibility for user-generated content or how users choose to use the platform.",
      ],
    },
    {
      title: "5. Prohibited Content & Penalties",
      body: [
        "Users will be permanently banned from the platform for any of the following:",
        "• Impersonation — claiming to be another person or official entity.",
        "• Intimidation or threats — in any form toward users or others.",
        "• Unlawful activity — any illegal conduct carried out through the platform.",
        "• Theft — of content, data, or identity.",
        "• Inappropriate content — anything contrary to public decency or community standards.",
        "• Offensive language — use of inappropriate or abusive language.",
        "Bans are permanent and non-appealable in serious cases; the team reserves the right to decide at its discretion.",
      ],
    },
    {
      title: "6. Acknowledgment of Service Limitations",
      body: [
        "Silver Stream is an early-stage platform operated by a small development team with limited resources.",
        "The platform does not guarantee full data or content protection at this stage.",
        "No legal support or compensation is currently available in the event of any harm.",
        "By registering and using the platform, you expressly acknowledge awareness of these limitations and agree to assume any associated risks.",
      ],
    },
    {
      title: "7. Account Security",
      body: [
        "The Silver Stream team will never ask for your sensitive information such as passwords or payment details through any communication channel.",
        "Never, under any circumstances, share your email address or account verification code with anyone — including those claiming to be from our team.",
        "Anyone who discloses such information forfeits their rights by their own action; the platform bears no liability.",
        "By using the platform, you acknowledge that you have chosen a strong password for your account. Any breach resulting from a weak password is your responsibility alone.",
      ],
    },
    {
      title: "8. Security Vulnerability Exploitation",
      body: [
        "Exploiting any vulnerability or security flaw in the platform is strictly prohibited.",
        "Anyone proven to have done so may face legal accountability.",
        "If you discover a vulnerability, please report it to the team responsibly.",
      ],
    },
    {
      title: "9. Trademark Rights",
      body: [
        "We sincerely apologize to any trademark owner whose registered mark may resemble the platform's name, logo, or any of its visual elements. The platform is still in its early stages and requires a temporary name until an official one is confirmed.",
        "The name, logo, and all branding elements will be reviewed and changed as soon as we verify they do not conflict with any registered trademark.",
        "If you believe any element of the platform infringes on your trademark, please contact our administration via the official email and we will address your report seriously and promptly.",
      ],
    },
    {
      title: "10. Disclaimer — No Financial Compensation",
      body: [
        "The platform is in its founding stage and currently has no budget allocated for compensation of any kind.",
        "The platform makes no commitment to provide any material or financial compensation under any circumstance during this phase.",
        "By using the platform, you acknowledge this and waive any claim to financial compensation.",
      ],
    },
    {
      title: "11. Platform Built with AI Assistance",
      body: [
        "This platform was built with the assistance of artificial intelligence tools, which means bugs or unintended errors may exist.",
        "We encourage users to report any issue or malfunction they encounter via the official administration email. Users who responsibly disclose a genuine security vulnerability will be recognized.",
        "The presence of software bugs does not justify exploiting the platform or causing harm to it or its users.",
      ],
    },
    {
      title: "12. Protecting Your Personal Privacy",
      body: [
        "We strongly advise against publishing any sensitive personal information on the platform, including: your email address, real name, real photo, passwords, geographic location or home address, or any data that could compromise your privacy.",
        "The platform is still under development and does not yet have full security hardening.",
        "You alone are responsible for the information you choose to share publicly. The platform disclaims any liability resulting from your voluntary disclosure of personal data.",
      ],
    },
    {
      title: "13. Visual Identity — Pending Legal Registration",
      body: [
        "The platform's name, logo, and all visual elements are still under testing and have not yet been registered as an official trademark.",
        "Nevertheless, copying, cloning, or using the platform as a base for another project without prior written permission from the administration is strictly prohibited.",
        "Anyone proven to have stolen or impersonated the platform will be subject to appropriate legal action.",
      ],
    },
    {
      title: "14. Social Engineering Warning",
      body: [
        "Never comply with any person who requests your personal information or account credentials under any pretext — including those claiming to be from our team or an official authority.",
        "This tactic is known as 'social engineering' and is used to deceive, blackmail, and threaten victims.",
        "Anyone who experiences blackmail or threats on the platform must report it immediately and must not comply with the aggressor.",
        "Any user proven to have blackmailed or threatened another user will have their account permanently deleted or restricted without prior warning.",
      ],
    },
    {
      title: "15. Our Right to Amend These Terms",
      body: [
        "Silver Stream reserves the absolute right to modify, update, or entirely rewrite these Terms of Service at any time, without prior notice or the need to seek user consent.",
        "Your continued use of the platform following the publication of any amendment constitutes your full and explicit acceptance of the revised terms.",
        "It is your responsibility to review these terms periodically to stay informed of any changes. Ignorance of an update does not exempt you from compliance.",
      ],
    },
    {
      title: "16. Our Right to Suspend or Terminate the Service",
      body: [
        "The platform reserves the unconditional right to suspend or terminate all or part of its services — temporarily or permanently — at any time and for any reason, with or without prior announcement.",
        "Such suspension carries no obligation to compensate users or provide advance notice of any specific timeframe.",
        "Reasons may include server maintenance, technical upgrades, or circumstances beyond the team's control. Under no condition shall the platform be held liable for any loss or damage arising from a service interruption.",
      ],
    },
    {
      title: "17. Our Right to Terminate Any Account",
      body: [
        "Silver Stream retains the full authority to restrict, suspend, or permanently delete any account at its sole discretion, at any time and without the obligation to provide justification or advance notice.",
        "A user whose account has been terminated may not claim any form of compensation or refund, and may not create a new account if the deletion was the result of a serious violation.",
        "This authority is exercised without limitation and exists solely to preserve the safety and integrity of the platform's community.",
      ],
    },
    {
      title: "18. External Content and Third-Party Links",
      body: [
        "The platform may contain links to external websites or services that are entirely independent of Silver Stream and beyond its control.",
        "The platform bears no responsibility whatsoever for the content, policies, or any harm that may result from interacting with such external sites.",
        "Visiting or engaging with any third-party link is done entirely at your own risk and under your own responsibility.",
      ],
    },
    {
      title: "19. User Indemnification",
      body: [
        "By accepting these terms, you expressly agree to indemnify, defend, and hold harmless Silver Stream, its team members, and developers from any claim, lawsuit, loss, or expense — including legal fees — arising from your use of the platform, your breach of these terms, or any harm you cause to a third party through the platform.",
        "In plain terms: if your actions on this platform create a legal problem — for yourself or for others — you alone are responsible for the legal and financial consequences that follow.",
      ],
    },
    {
      title: "20. Service Provided \"As Is\" — No Warranties",
      body: [
        "Silver Stream is provided in its current state, on an \"as is\" and \"as available\" basis, without any express or implied warranty regarding quality, continuity, fitness for a particular purpose, or freedom from defects.",
        "The team makes no guarantee that the platform will be error-free, uninterrupted, or that your data will be free from loss or corruption.",
        "By using the platform, you fully and voluntarily accept these inherent risks.",
      ],
    },
    {
      title: "21. Governing Law and Jurisdiction",
      body: [
        "These terms are governed by and interpreted in accordance with general internationally recognized legal principles, given that the platform serves users from all parts of the world.",
        "In the event of any dispute between a user and the platform, direct communication through the official administration email is the preferred and primary channel for reaching an amicable resolution.",
        "The platform reserves the right to pursue legal action through the appropriate authorities in the jurisdiction where the offending user resides, or in any other jurisdiction the administration deems suitable.",
      ],
    },
  ],
  footer:
    "By using Silver Stream, you confirm that you have read, understood, and agreed to all terms set forth herein without exception. Your lack of awareness of any provision does not exempt you from your obligation to abide by it.",
};

/** Detect whether to show Arabic or English terms based on the browser language. */
export function getTermsDoc(): TermsDoc {
  const lang = navigator.language || "";
  return lang.startsWith("ar") ? termsAr : termsEn;
}
