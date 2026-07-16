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
  version: "الإصدار 0.8 — Laws Edition",
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
  ],
  footer:
    "باستخدامك لمنصة Silver Stream فأنت تُقرّ بقراءة هذه الشروط وفهمها والموافقة عليها كاملةً.",
};

export const termsEn: TermsDoc = {
  heading: "Terms of Service & Privacy Policy",
  subtitle: "Please read these terms carefully before using the platform.",
  version: "Version 0.8 — Laws Edition",
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
  ],
  footer:
    "By using Silver Stream, you confirm that you have read, understood, and agreed to these terms in full.",
};

/** Detect whether to show Arabic or English terms based on the browser language. */
export function getTermsDoc(): TermsDoc {
  const lang = navigator.language || "";
  return lang.startsWith("ar") ? termsAr : termsEn;
}
