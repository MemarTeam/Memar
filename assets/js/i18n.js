// Language: Arabic by default, English on request. Static text in the HTML is Arabic,
// with the English beside it in a data-en attribute; text made by scripts comes from STR below.

const KEY = 'memar-lang';

function detect() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ar' || q === 'en') { localStorage.setItem(KEY, q); return q; }
  } catch (e) { /* storage blocked */ }
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'ar' || s === 'en') return s;
  } catch (e) { /* storage blocked */ }
  return 'ar';
}

export const lang = detect();
export const other = lang === 'ar' ? 'en' : 'ar';

export function applyLang(root = document) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (lang !== 'en') return;
  root.querySelectorAll('[data-en]').forEach((el) => { el.textContent = el.dataset.en; });
  root.querySelectorAll('[data-en-label]').forEach((el) => { el.setAttribute('aria-label', el.dataset.enLabel); });
  root.querySelectorAll('[data-en-placeholder]').forEach((el) => { el.setAttribute('placeholder', el.dataset.enPlaceholder); });
}

export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch (e) { /* storage blocked */ }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url.toString());
}

// pick the right language from a bilingual field, falling back to the other one
export function L(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return (v[lang] || v[other] || '').trim();
}

const LOC = lang === 'ar' ? 'ar-EG-u-nu-arab-ca-gregory' : 'en-GB';
const TZ = 'Asia/Riyadh';   // events are shown in Saudi time
const fmt = (o) => new Intl.DateTimeFormat(LOC, { timeZone: TZ, ...o });
export const day = (d) => fmt({ day: 'numeric' }).format(d);
export const month = (d) => fmt({ month: 'long' }).format(d);
export const weekday = (d) => fmt({ weekday: 'long' }).format(d);
export const time = (d) => fmt({ hour: 'numeric', minute: '2-digit' }).format(d);
export const fullDate = (d) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const shortStamp = (d) => {
  const now = new Date();
  const key = (x) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(x);
  const t = time(d);
  if (key(d) === key(now)) return `${STR[lang].today} ${t}`;
  if (key(d) === key(new Date(now.getTime() - 864e5))) return `${STR[lang].yesterday} ${t}`;
  return `${fmt({ day: 'numeric', month: 'short' }).format(d)} ${t}`;
};
export const num = (n, pad = 0) => {
  const s = String(n).padStart(pad, '0');
  return lang === 'ar' ? s.replace(/\d/g, (c) => '٠١٢٣٤٥٦٧٨٩'[c]) : s;
};
// a date in both languages, for the announcement film
export function bothDates(d) {
  const o = (x) => ({ timeZone: TZ, ...x });
  const arLoc = 'ar-EG-u-nu-arab-ca-gregory';
  const ar = new Intl.DateTimeFormat(arLoc, o({ weekday: 'long', day: 'numeric', month: 'long' })).format(d).replace('،', '')
    + ' · ' + new Intl.DateTimeFormat(arLoc, o({ hour: 'numeric', minute: '2-digit' })).format(d);
  const en = new Intl.DateTimeFormat('en-GB', o({ weekday: 'short', day: 'numeric', month: 'short' })).format(d).replace(',', '')
    + ' · ' + new Intl.DateTimeFormat('en-US', o({ hour: 'numeric', minute: '2-digit' })).format(d);
  return { en, ar };
}

export function t(key, vars) {
  let s = (STR[lang] && STR[lang][key]) || STR.ar[key] || key;
  if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
  return s;
}

export const STR = {
  ar: {
    home: 'الرئيسية', about: 'من نحن', events: 'الفعاليات', magazine: 'مجلة Vanguard', podcast: 'البودكاست', join: 'انضم إلينا',
    members: 'دخول الأعضاء', menu: 'القائمة', close: 'إغلاق', openMenu: 'افتح القائمة', closeMenu: 'أغلق القائمة',
    langShort: 'EN', langFull: 'English', langLabel: 'Switch to English', followUs: 'تابعنا',
    footer: 'فريق تابع لقسم العمارة',
    nextEvent: 'الفعالية القادمة', register: 'سجّل الآن', details: 'التفاصيل', allEvents: 'كل الفعاليات', past: 'فعاليات سابقة', upcoming: 'القادمة',
    workshop: 'ورشة', designathon: 'ديزايناثون', talk: 'محاضرة', visit: 'زيارة ميدانية',
    issue: 'العدد', latestIssue: 'العدد الأحدث', readIssue: 'اقرأ العدد', readLatest: 'اقرأ العدد الأحدث', nextIssue: 'العدد القادم', submitWork: 'أرسل مشاركتك للمجلة', readVanguard: 'اقرأ Vanguard',
    episode: 'الحلقة', listen: 'استمع', listenOn: 'استمع على {p}', allEpisodes: 'كل الحلقات', nowEp: 'الأحدث',
    aboutUs: 'تعرّف علينا', joinUs: 'انضم إلينا',
    soon: 'قريبًا', firstEventSoon: 'أول فعالية قريبًا', firstIssue: 'العدد الأول قيد الإعداد', firstEp: 'الحلقة الأولى قريبًا',
    seeEvents: 'شاهد الفعاليات', seeIssues: 'اقرأ الأعداد', seeEps: 'استمع للحلقات',
    firstToKnow: 'كن أول من يعرف', firstToKnowText: 'لم نعلن فعاليتنا الأولى بعد. تابعنا لتصلك المواعيد والأعداد والحلقات أولًا.',
    followText: 'تصلك مواعيد الفعاليات والأعداد والحلقات الجديدة أولًا.',
    noEvents: 'لا فعاليات معلنة الآن', noEventsText: 'نحضّر لفعاليتنا القادمة. تابعنا لتعرف بموعدها أولًا، أو انضم إلينا لتشارك في تنظيمها.',
    followInsta: 'تابعنا على Instagram', whatEvents: 'ما الفعاليات التي ننظّمها؟',
    noIssues: 'العدد الأول قيد الإعداد', noIssuesText: 'نكتب العدد الأول من Vanguard الآن. أرسل مشاركتك ليكون عملك فيه.',
    noEps: 'الحلقة الأولى قريبًا', noEpsText: 'نسجّل أولى حلقات The Architecture Show. تابعنا لتصلك عند نشرها.',
    noTeam: 'نعرّف بالفريق قريبًا',
    // words on the public pages that the board can change (Page text); the page files carry the same words
    heroEyebrow: 'فريق تابع لقسم العمارة', heroTitle: 'فريق معماري بقيادة طلاب العمارة',
    heroLede: 'يرتقي بالمستوى الطلابي ويثري تجربتهم بتبادل الخبرات عبر مستويات ووسائط متنوعة.',
    whatTitle: 'ماذا نقدّم', whatLede: 'أربعة أنشطة، تُفتح أقسامها في الموقع مع أول محتوى',
    wWorkT: 'ورش ومحاضرات', wWork: 'لقاءات مع معماريين من مجالات مختلفة، وورش تبني مهارات يحتاجها الاستوديو.',
    wDesignT: 'الديزايناثون', wDesign: 'مسابقات تصميم مكثفة لمدة ٤٨ ساعة بمشاركة طلاب من جامعات أخرى.',
    podLede: 'حوارات قصيرة مع الأساتذة والطلاب والخريجين ومعماريين من خارج الجامعة.',
    aboutEyebrow: 'من نحن', aboutTitle: 'فريق يقوده الطلاب، ويرعاه القسم',
    aboutLede: 'معمار فريق يقوده طلاب العمارة ويرعاه قسم العمارة. نعمل على رفع مستوى الأعمال الطلابية، وعلى أن تكون دراسة العمارة تجربة أغنى.',
    aboutP1: 'نفعل ذلك بتبادل الخبرات: بين الطلاب عبر المستويات الدراسية، ومع الأساتذة والخريجين والمعماريين من خارج الجامعة.',
    aboutP2: 'ونفعله عبر وسائط متنوعة: فعاليات نلتقي فيها ونتعلّم، ومجلة نكتب فيها، وبودكاست نتحاور فيه.',
    goal1T: 'أعمال طلابية أقوى', goal1: 'مهارات ونصائح عملية تظهر في مشاريع الاستوديو.',
    goal2T: 'تبادل بين المستويات', goal2: 'ينقل الطلاب الأقدم ما تعلّموه إلى من بعدهم.',
    goal3T: 'قرب من المهنة', goal3: 'لقاءات مع معماريين وخريجين يعملون في المجال.',
    goal4T: 'وسائط متنوعة', goal4: 'فعاليات وكتابة وحوار، ليجد كل طالب طريقته.',
    eventsEyebrow: 'معمار', magEyebrow: 'مجلة شهرية',
    joinEyebrow: 'انضم إلينا', joinTitle: 'لك مكان في معمار', joinLede: 'شارك في الفعاليات، أو اكتب للمجلة، أو تطوّع مع الفريق.',
    wayVolT: 'تطوّع مع الفريق', wayVol: 'نظّم الفعاليات معنا، أو صمّم، أو صوّر، أو حرّر. لا يُشترط مستوى دراسي معيّن.',
    wayWriteT: 'اكتب للمجلة', wayWrite: 'أرسل مقالًا أو مشروعًا أو رسمًا أو صورة لعدد قادم من Vanguard.',
    wayComeT: 'تعال إلى فعالية', wayCome: 'فعالياتنا مفتوحة لطلاب العمارة. تابعنا لتعرف بموعد الفعالية القادمة.',
    contactT: 'تواصل معنا', contact: 'لفكرة فعالية أو تعاون أو سؤال، راسلنا أو اكتب لنا على حساباتنا.',
    eventsHead: 'الفعاليات', eventsLede: 'ورش ومحاضرات وديزايناثون وزيارات ميدانية، مفتوحة لطلاب العمارة.',
    magHead: 'مجلة Vanguard', magLede: 'مجلة شهرية بالنصائح والمعرفة والمحتوى التفاعلي لرفع جودة أعمال الطلاب.',
    submitNext: 'أرسل مشاركتك',
    today: 'اليوم', yesterday: 'أمس',
    demoNote: 'نسخة تجريبية ببيانات مثال، لا تُحفظ إلا في هذا المتصفح.', demoLaunch: 'اعرض حالة الإطلاق', demoFull: 'اعرض المحتوى التجريبي',
    // members' area
    mArea: 'مساحة الأعضاء', signInTitle: 'مساحة الأعضاء', signInText: 'للأعضاء المدعوين فقط. ادخل بحساب Google. إن لم يعمل على جهازك، اطلب رابط دخول إلى بريدك.',
    google: 'الدخول بحساب Google', emailLabel: 'البريد الإلكتروني', sendLink: 'أرسل رابط الدخول', linkSent: 'أرسلنا رابط الدخول إلى {e}. افتحه من هذا الجهاز.',
    confirmEmail: 'أكّد بريدك لإكمال الدخول', finish: 'أكمل الدخول',
    demoBoard: 'ادخل كعضو في المجلس (تجريبي)', demoMember: 'ادخل كعضو عادي (تجريبي)',
    notInvited: 'بريدك ليس في قائمة الأعضاء', notInvitedText: 'دخلت بالبريد {e}، لكنه غير مدعو بعد. اطلب من أحد أعضاء المجلس دعوتك، ثم ادخل من جديد.',
    signOut: 'تسجيل الخروج', board: 'المجلس', back: 'عودة إلى الموقع',
    gTools: 'الأدوات', gContent: 'المحتوى', gAdmin: 'الإدارة · للمجلس', overview: 'نظرة عامة',
    announce: 'مولّد الإعلانات', team: 'الفريق', settings: 'إعدادات الموقع', log: 'سجل التعديلات', access: 'الأعضاء والصلاحيات', profile: 'ملفي',
    issues: 'المجلة', episodes: 'البودكاست',
    hello: 'أهلًا {n}', helloText: 'من هنا تحدّث محتوى الموقع وتصنع إعلانات الفعاليات. كل تعديل يحمل وسمك.',
    add: 'إضافة', edit: 'تعديل', del: 'حذف', save: 'حفظ', cancel: 'إلغاء', saving: 'جارٍ الحفظ…', saved: 'تم الحفظ',
    confirmDel: 'حذف «{x}»؟', confirmDelText: 'يُحذف من الموقع فورًا، ويبقى أثره في سجل التعديلات.',
    addEvent: 'أضف فعالية', addIssue: 'أضف عددًا', addEpisode: 'أضف حلقة', addPerson: 'أضف شخصًا',
    emptyEvents: 'لا فعاليات بعد', emptyEventsText: 'أضف أول فعالية، وستظهر في الموقع وعلى الصفحة الرئيسية فورًا.', addFirstEvent: 'أضف أول فعالية',
    emptyIssues: 'لا أعداد بعد', emptyIssuesText: 'أضف العدد الأول، وسيظهر رف المجلة في الموقع.', addFirstIssue: 'أضف العدد الأول',
    emptyEps: 'لا حلقات بعد', emptyEpsText: 'أضف الحلقة الأولى، وسيظهر قسم البودكاست في الموقع.', addFirstEp: 'أضف الحلقة الأولى',
    emptyTeam: 'لم يُضف أحد للفريق بعد', emptyTeamText: 'أضف أعضاء الفريق وأدوارهم ليظهروا في صفحة «من نحن».', addFirstPerson: 'أضف أول شخص',
    emptyLog: 'لم يُعدَّل شيء بعد', emptyLogText: 'كل تعديل سيظهر هنا بوسم العضو الذي قام به ووقته. يراه أعضاء المجلس فقط.',
    onlyYou: 'أنت العضو الوحيد حتى الآن', onlyYouText: 'ادعُ أعضاء الفريق بالبريد الإلكتروني، ثم حدّد ما يستطيع كل واحد تعديله.',
    noPerm: 'لا تملك صلاحية تعديل هذا القسم. اطلب ذلك من أحد أعضاء المجلس.', viewOnly: 'للعرض فقط',
    f_type: 'النوع', f_title: 'العنوان', f_date: 'التاريخ', f_time: 'الوقت', f_place: 'المكان', f_summary: 'نبذة', f_register: 'رابط التسجيل',
    f_number: 'رقم العدد', f_month: 'الشهر', f_pdf: 'رابط قراءة العدد (PDF أو Google Drive)', f_cover: 'رابط صورة الغلاف (اختياري)', f_coverColor: 'لون الغلاف إن لم توجد صورة',
    f_epNumber: 'رقم الحلقة', f_guest: 'الضيف', f_url: 'رابط الحلقة', f_duration: 'المدة (دقائق:ثوان)',
    f_name: 'الاسم', f_role: 'المناصب', roleHint: 'منصب في كل سطر، بالترتيب الذي تريد ظهوره به. مثلًا «رئيس الفعاليات»، ثم في السطر التالي «مؤسس مشارك وعضو المجلس».', f_order: 'الترتيب', f_initials: 'الأحرف في الوسم', f_color: 'لون الوسم',
    f_ar: 'بالعربية', f_en: 'بالإنجليزية', required: 'هذا الحقل مطلوب',
    c_night: 'ليل المخطط', c_blue: 'أزرق المخطط', c_sand: 'رمل',
    s_instagram: 'رابط Instagram', s_tiktok: 'رابط TikTok', s_linkedin: 'رابط LinkedIn', s_email: 'البريد الإلكتروني للنادي',
    s_podName: 'اسم منصة البودكاست', s_podUrl: 'رابط البودكاست', s_joinUrl: 'رابط نموذج الانضمام', s_submitUrl: 'رابط نموذج المشاركة في المجلة',
    makeVideo: 'اصنع فيديو الإعلان',
    logAll: 'الكل', logMember: 'كل الأعضاء',
    a_create: 'أضاف {w} «{x}»', a_update: 'عدّل {w} «{x}»', a_delete: 'حذف {w} «{x}»', a_join: 'انضم إلى مساحة الأعضاء', a_invite: 'دعا {x}', a_revoke: 'ألغى دعوة {x}',
    a_perm: 'غيّر صلاحيات {x}', a_removeMember: 'أزال {x} من الأعضاء', a_settings: 'عدّل إعدادات الموقع', a_export: 'صدّر فيديو إعلان «{x}»',
    w_events: 'فعالية', w_issues: 'عددًا', w_episodes: 'حلقة', w_team: 'شخصًا في الفريق',
    sec_events: 'الفعاليات', sec_issues: 'المجلة', sec_episodes: 'البودكاست', sec_team: 'الفريق', sec_settings: 'الإعدادات', sec_access: 'الصلاحيات', sec_tools: 'الأدوات',
    member: 'العضو', email: 'البريد', boardCol: 'مجلس', remove: 'إزالة', you: 'أنت',
    inviteTitle: 'ادعُ عضوًا', inviteBtn: 'أرسل الدعوة', inviteHint: 'يدخل العضو بهذا البريد عبر Google أو رابط الدخول، فتظهر له الأقسام التي اخترتها.',
    pending: 'دعوات لم تُقبل بعد', revoke: 'إلغاء الدعوة', invited: 'تمت الدعوة',
    permHint: 'أعضاء المجلس يرون كل شيء ويديرون الصلاحيات وسجل التعديلات.',
    profileHint: 'هذا الوسم يظهر بجانب كل تعديل تقوم به.',
    genTitle: 'مولّد الإعلانات', genText: 'اكتب التفاصيل بالعربية والإنجليزية وأضف رابط التسجيل، ثم صدّر الفيديو بدقة 2K.',
    genFrom: 'من فعالية', genNone: 'بدون فعالية — أكتب بنفسي',
    anColor: 'اللون', anColorHint: 'تبدأ الفعالية بلون نوعها في الموقع: الورش بالأزرق، والديزايناثون بالأخضر، والمحاضرات بالطين، والزيارات بالحبر.',
    pal_blueprint: 'أزرق المخطط', pal_courtyard: 'أخضر الفناء', pal_clay: 'الطين', pal_ink: 'الحبر',
    topPill: 'الكبسولة العلوية', lines: 'التفاصيل بالترتيب', addLine: 'أضف سطرًا', qrLink: 'رابط رمز QR', qrCaption: 'نص رمز QR', qrHold: 'مدة بقاء رمز QR',
    play: 'تشغيل', pause: 'إيقاف', replay: 'من البداية', exportMp4: 'صدّر MP4', exporting: 'جارٍ التصدير… {p}٪', exported: 'جاهز. حُفظ الملف {f}.', exportFail: 'تعذّر التصدير في هذا المتصفح. جرّب Chrome أو Edge أو Safari.',
    or: 'أو', loading: 'جارٍ التحميل…', signingIn: 'جارٍ الدخول…',
    errSave: 'تعذّر الحفظ. تحقّق من الاتصال وحاول مرة أخرى.', errLoad: 'تعذّر التحميل. حدّث الصفحة وحاول مرة أخرى.', errSignIn: 'تعذّر الدخول. حاول مرة أخرى.',
    needEmailText: 'فتحت رابط الدخول على جهاز غير الذي طلبته منه. اكتب بريدك لإكمال الدخول.',
    demoSignInNote: 'في النسخة التجريبية لا حاجة لحساب. على الموقع الحقيقي يدخل الأعضاء بحساب Google أو برابط يصل إلى بريدهم.',
    gResources: 'الموارد', brand: 'الهوية البصرية', qr: 'رمز QR', more: 'المزيد',
    shortcuts: 'اختصارات', onSite: 'على الموقع الآن', recent: 'آخر التعديلات', seeAll: 'عرض الكل', lastEdit: 'آخر تعديل',
    n_upcoming: 'فعاليات قادمة', n_issues: 'أعداد المجلة', n_episodes: 'حلقات البودكاست', n_members: 'الأعضاء',
    hidden: 'مخفي من الموقع حتى يُضاف أول محتوى',
    col_blue: 'أزرق', col_green: 'أخضر', col_clay: 'طيني', col_night: 'ليلي', col_graphite: 'جرافيتي', col_ink: 'حبري',
    allowed: '{s}: مسموح', notAllowed: '{s}: غير مسموح', makeBoard: 'عضو في المجلس', boardOnSelf: 'لا يمكنك إزالة نفسك من المجلس.',
    removeQ: 'إزالة {x} من الأعضاء؟', removeText: 'يفقد الدخول فورًا. يمكنك دعوته من جديد في أي وقت.',
    inviteNote: 'لا يُرسل بريد تلقائيًا: أخبر العضو أن يدخل من صفحة الأعضاء بهذا البريد.', emailInvalid: 'اكتب بريدًا إلكترونيًا صحيحًا', alreadyMember: 'هذا البريد لعضو موجود',
    linkInvalid: 'الروابط تبدأ بـ https://', needOne: 'اكتب هذا بلغة واحدة على الأقل',
    holdS: '{n} ثوانٍ', lineN: 'السطر {n}', removeLine: 'احذف السطر', maxLines: 'ستة أسطر كحد أقصى',
    exportNote: 'بدقة 2K (‏2560 × 1440) و٦٠ إطارًا في الثانية. يستغرق التصدير دقيقة إلى دقيقتين؛ أبقِ الصفحة مفتوحة.',
    vp9Note: 'حُفظ الفيديو بترميز VP9. إن رفضه تطبيق ما، صدّره من Chrome أو Edge أو Safari.',
    h_workshop: 'ورشة معمار', h_designathon: 'ديزايناثون معمار', h_talk: 'محاضرة معمار', h_visit: 'زيارة معمار الميدانية', scanReg: 'امسح للتسجيل',
    qrText: 'اكتب أي رابط واحفظ رمز QR بألوان معمار للملصقات والعروض.', qrStyle: 'الألوان', qrInk: 'حبر على ورق', qrNight: 'ورق على ليل', qrBlue: 'أزرق على ورق',
    dlPng: 'نزّل PNG', dlSvg: 'نزّل SVG',
    brandText: 'الشعار والألوان والخطوط، جاهزة للمنشورات والعروض.', logoFiles: 'ملفات الشعار', colors: 'الألوان', fonts: 'الخطوط', copy: 'انسخ', copied: 'نُسخ',
    onPaper: 'على الورق', onNight: 'على الليل', onInk: 'على الحبر', brandRules: 'المثلث الأزرق علامة النشاط فقط، والأزرق للأفعال والتمييز. لا تمدّد الشعار ولا تغيّر ألوانه.',
    preview: 'معاينة', saveProfile: 'احفظ ملفي',
    darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح', appearance: 'المظهر',
    story: 'قصة الشعار', look: 'الخطوط والمظهر',
    pageText: 'نصوص الصفحات', a_text: 'عدّل نصوص الصفحات', sec_text: 'نصوص الصفحات',
    pageTextHint: 'كلمات الصفحات العامة بالعربية والإنجليزية. ما تغيّره يظهر في الموقع بعد الحفظ، والحقل الفارغ يعود إلى النص الأصلي.',
    ptOriginal: 'الأصل', ptRestore: 'أعد النص الأصلي', ptChanged: 'معدَّل', ptPages: 'الصفحات', ptAllRestored: 'عادت كل النصوص الأصلية إلى الحقول. احفظ لتثبيتها.', ptAlso: 'يظهر أيضًا في {x}',
    a_story: 'عدّل قصة الشعار', a_look: 'غيّر الخطوط والمظهر', sec_story: 'قصة الشعار', sec_look: 'المظهر',
    storyHint: 'تظهر في صفحة «من نحن» بعد التعريف بالفريق. عدّل النص بالعربية والإنجليزية، أو أخفِ القسم كله.',
    storyShow: 'اعرض القسم في صفحة «من نحن»', storyIsHidden: 'القسم مخفي من الموقع الآن.',
    st_title: 'عنوان القسم', st_logo: 'فكرة الشعار', st_steps: 'تعليقات الصور الثلاث', st_step: 'الصورة {n}',
    st_filmTitle: 'عنوان الفيلم', st_film: 'فكرة الفيلم', st_chapters: 'مراحل الفيلم', st_chTitle: 'اسم المرحلة', st_chText: 'وصفها',
    restoreText: 'استعد النص الأصلي', viewOnSite: 'اعرضها في الموقع', paraHint: 'اترك سطرًا فارغًا بين الفقرات.', restored: 'عاد النص الأصلي إلى الحقول. احفظ لتثبيته.',
    lookHint: 'تتغيّر الخطوط في كل صفحات الموقع ومساحة الأعضاء وفي فيديو الإعلان. الخطوط من Google Fonts. هذه الصفحة للمجلس فقط.',
    r_arHead: 'العناوين العربية', r_arBody: 'النص العربي', r_enHead: 'العناوين الإنجليزية', r_enBody: 'النص الإنجليزي', r_mono: 'التسميات الصغيرة والأرقام',
    otherFont: 'خط آخر من Google Fonts…', fontName: 'اسم الخط كما يظهر في Google Fonts', needArabic: 'اختر خطًا يدعم العربية', identityFont: 'خط الهوية',
    defaultTheme: 'المظهر الافتراضي للزوار', th_light: 'فاتح · الورق', th_dark: 'داكن · المخطط', th_auto: 'حسب جهاز الزائر', themeHint: 'يبدّل كل زائر المظهر بنفسه من زر المظهر، ويبقى اختياره في متصفحه.',
    resetLook: 'استعد خطوط الهوية', lookReset: 'عادت خطوط الهوية إلى الحقول. احفظ لتثبيتها.',
    sampleArHead: 'فريق معماري بقيادة طلاب العمارة', sampleArBody: 'يرتقي بالمستوى الطلابي ويثري تجربتهم بتبادل الخبرات عبر مستويات ووسائط متنوعة.',
    popupBlocked: 'لم تُفتح نافذة Google. اسمح بالنوافذ المنبثقة، أو افتح الصفحة في Safari أو Chrome بدل متصفح التطبيق، أو اطلب رابط دخول إلى بريدك.', unauthorizedDomain: 'عنوان الموقع غير مضاف في إعدادات Firebase بعد. أضفه في Authentication › Settings › Authorized domains.', linkQuota: 'وصلنا إلى حد رسائل الدخول اليومي. ادخل بحساب Google أو حاول غدًا.', linkExpired: 'انتهت صلاحية رابط الدخول أو استُخدم من قبل. اطلب رابطًا جديدًا.',
    f_photo: 'الصورة', photoHint: 'تظهر للعامة في صفحة «من نحن». ارفعها بعد موافقة صاحبها.', choosePhoto: 'اختر صورة', changePhoto: 'غيّر الصورة', removePhoto: 'أزل الصورة', zoom: 'تكبير', dragHint: 'اسحب الصورة لتضعها داخل الدائرة، أو استعمل الأسهم و+ و−.', noPhoto: 'بلا صورة', photoError: 'تعذّر فتح هذه الصورة. جرّب صورة JPG أو PNG.',
    navMain: 'القائمة الرئيسية', navPages: 'روابط الصفحات', navSections: 'أقسام مساحة الأعضاء', navQuick: 'التنقل السريع', demoLabel: 'عن هذه النسخة',
    staleNote: 'تعذّر تحديث المحتوى الآن، وهذه آخر نسخة محفوظة على جهازك.', offlineTitle: 'تعذّر تحميل المحتوى', offlineText: 'تحقّق من اتصالك بالإنترنت، ثم حاول مرة أخرى.', retry: 'حاول مرة أخرى', showMore: 'عرض المزيد', ourGoals: 'أهدافنا', waysToJoin: 'طرق الانضمام',
    sigNote: 'كل تعديل يحمل وسمك ويظهر في سجل المجلس.',
  },
  en: {
    home: 'Home', about: 'About', events: 'Events', magazine: 'Vanguard', podcast: 'Podcast', join: 'Join us',
    members: 'Members', menu: 'Menu', close: 'Close', openMenu: 'Open the menu', closeMenu: 'Close the menu',
    langShort: 'ع', langFull: 'العربية', langLabel: 'التبديل إلى العربية', followUs: 'Follow us',
    footer: 'A team sponsored by the architecture department',
    nextEvent: 'Next event', register: 'Register', details: 'Details', allEvents: 'All events', past: 'Past events', upcoming: 'Upcoming',
    workshop: 'Workshop', designathon: 'Designathon', talk: 'Talk', visit: 'Site visit',
    issue: 'Issue', latestIssue: 'Latest issue', readIssue: 'Read the issue', readLatest: 'Read the latest issue', nextIssue: 'Next issue', submitWork: 'Send us your work', readVanguard: 'Read Vanguard',
    episode: 'Episode', listen: 'Listen', listenOn: 'Listen on {p}', allEpisodes: 'All episodes', nowEp: 'Latest',
    aboutUs: 'About us', joinUs: 'Join us',
    soon: 'Coming soon', firstEventSoon: 'First event soon', firstIssue: 'First issue on its way', firstEp: 'First episode soon',
    seeEvents: 'See events', seeIssues: 'Read the issues', seeEps: 'Listen to episodes',
    firstToKnow: 'Be the first to know', firstToKnowText: 'Our first event isn’t announced yet. Follow us to hear about events, issues and episodes first.',
    followText: 'Hear about new events, issues and episodes first.',
    noEvents: 'No events announced right now', noEventsText: 'We’re preparing the next one. Follow us to hear the date first, or join us and help organize it.',
    followInsta: 'Follow us on Instagram', whatEvents: 'What kind of events do we run?',
    noIssues: 'The first issue is on its way', noIssuesText: 'We’re writing the first issue of Vanguard now. Send us your work and it could be in it.',
    noEps: 'The first episode is coming soon', noEpsText: 'We’re recording the first episodes of The Architecture Show. Follow us to hear when they’re out.',
    noTeam: 'We’ll introduce the team soon',
    heroEyebrow: 'A team sponsored by the architecture department', heroTitle: 'A student-led architecture team',
    heroLede: 'Raising the level of student work and enriching the experience by sharing expertise across levels and media.',
    whatTitle: 'What we do', whatLede: 'Four activities. Each gets its own page here once its first content is out.',
    wWorkT: 'Workshops and talks', wWork: 'Meetings with architects from different fields, and workshops that build the skills the studio needs.',
    wDesignT: 'Designathons', wDesign: 'Intense 48-hour design competitions with students from other universities.',
    podLede: 'Short conversations with professors, students, graduates and architects from outside the university.',
    aboutEyebrow: 'About us', aboutTitle: 'Led by students, sponsored by the department',
    aboutLede: 'Memar is a team run by architecture students and sponsored by the architecture department. We work to raise the level of student work and to make studying architecture a richer experience.',
    aboutP1: 'We do it by sharing expertise: between students across the years of study, and with professors, graduates and architects from outside the university.',
    aboutP2: 'And we do it through different media: events where we meet and learn, a magazine where we write, and a podcast where we talk.',
    goal1T: 'Better student work', goal1: 'Practical skills and advice that show in studio projects.',
    goal2T: 'Across the years', goal2: 'Older students pass on what they learned to younger ones.',
    goal3T: 'Closer to practice', goal3: 'Meetings with architects and graduates working in the field.',
    goal4T: 'Many media', goal4: 'Events, writing and conversation, so everyone finds a way in.',
    eventsEyebrow: 'Memar', magEyebrow: 'Monthly magazine',
    joinEyebrow: 'Join us', joinTitle: 'There’s a place for you in Memar', joinLede: 'Take part in events, write for the magazine, or volunteer with the team.',
    wayVolT: 'Volunteer with the team', wayVol: 'Help us organize events, design, photograph or edit. Students of every year are welcome.',
    wayWriteT: 'Write for the magazine', wayWrite: 'Send an article, a project, a drawing or a photo for a coming issue of Vanguard.',
    wayComeT: 'Come to an event', wayCome: 'Our events are open to architecture students. Follow us to hear when the next one is.',
    contactT: 'Get in touch', contact: 'For an event idea, a collaboration or a question, email us or message us on our accounts.',
    eventsHead: 'Events', eventsLede: 'Workshops, talks, designathons and site visits, open to architecture students.',
    magHead: 'Vanguard magazine', magLede: 'A monthly magazine of tips, knowledge and interactive content to raise the level of student work.',
    submitNext: 'Send your work',
    today: 'Today', yesterday: 'Yesterday',
    demoNote: 'Demo with example data, saved only in this browser.', demoLaunch: 'Show the launch state', demoFull: 'Show the example content',
    mArea: 'Members’ area', signInTitle: 'Members’ area', signInText: 'For invited members only. Sign in with Google. If that doesn’t work on your device, get a sign-in link by email.',
    google: 'Sign in with Google', emailLabel: 'Email', sendLink: 'Email me a sign-in link', linkSent: 'We sent a sign-in link to {e}. Open it on this device.',
    confirmEmail: 'Confirm your email to finish signing in', finish: 'Finish signing in',
    demoBoard: 'Enter as a board member (demo)', demoMember: 'Enter as a member (demo)',
    notInvited: 'Your email isn’t on the member list', notInvitedText: 'You signed in as {e}, but it hasn’t been invited yet. Ask a board member to invite you, then sign in again.',
    signOut: 'Sign out', board: 'Board', back: 'Back to the site',
    gTools: 'Tools', gContent: 'Content', gAdmin: 'Admin · board only', overview: 'Overview',
    announce: 'Announcement maker', team: 'Team', settings: 'Site settings', log: 'Edit history', access: 'Members and access', profile: 'My profile',
    issues: 'Magazine', episodes: 'Podcast',
    hello: 'Hello, {n}', helloText: 'Update the site and make event announcements from here. Every edit carries your tag.',
    add: 'Add', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', saving: 'Saving…', saved: 'Saved',
    confirmDel: 'Delete “{x}”?', confirmDelText: 'It disappears from the site right away. The edit history keeps a record.',
    addEvent: 'Add an event', addIssue: 'Add an issue', addEpisode: 'Add an episode', addPerson: 'Add a person',
    emptyEvents: 'No events yet', emptyEventsText: 'Add the first event and it appears on the site and the home page right away.', addFirstEvent: 'Add the first event',
    emptyIssues: 'No issues yet', emptyIssuesText: 'Add the first issue and the magazine shelf appears on the site.', addFirstIssue: 'Add the first issue',
    emptyEps: 'No episodes yet', emptyEpsText: 'Add the first episode and the podcast section appears on the site.', addFirstEp: 'Add the first episode',
    emptyTeam: 'No one is on the team page yet', emptyTeamText: 'Add the team and their roles to show them on the About page.', addFirstPerson: 'Add the first person',
    emptyLog: 'No edits yet', emptyLogText: 'Every edit will appear here with the tag of the member who made it and when. Only the board sees this.',
    onlyYou: 'You’re the only member so far', onlyYouText: 'Invite the team by email, then choose what each person can edit.',
    noPerm: 'You can’t edit this section. Ask a board member for access.', viewOnly: 'View only',
    f_type: 'Type', f_title: 'Title', f_date: 'Date', f_time: 'Time', f_place: 'Place', f_summary: 'Summary', f_register: 'Registration link',
    f_number: 'Issue number', f_month: 'Month', f_pdf: 'Link to read the issue (PDF or Google Drive)', f_cover: 'Cover image link (optional)', f_coverColor: 'Cover color if there’s no image',
    f_epNumber: 'Episode number', f_guest: 'Guest', f_url: 'Episode link', f_duration: 'Length (mm:ss)',
    f_name: 'Name', f_role: 'Positions', roleHint: 'One position per line, in the order you want them shown. For example “Head of Events”, then on the next line “Co-founder & Board member”.', f_order: 'Order', f_initials: 'Letters on the tag', f_color: 'Tag color',
    f_ar: 'Arabic', f_en: 'English', required: 'This field is required',
    c_night: 'Blueprint Night', c_blue: 'Blueprint Blue', c_sand: 'Sand',
    s_instagram: 'Instagram link', s_tiktok: 'TikTok link', s_linkedin: 'LinkedIn link', s_email: 'Club email',
    s_podName: 'Podcast platform name', s_podUrl: 'Podcast link', s_joinUrl: 'Join form link', s_submitUrl: 'Magazine submission form link',
    makeVideo: 'Make the announcement video',
    logAll: 'All', logMember: 'All members',
    a_create: 'added {w} “{x}”', a_update: 'edited {w} “{x}”', a_delete: 'deleted {w} “{x}”', a_join: 'joined the members’ area', a_invite: 'invited {x}', a_revoke: 'cancelled the invite for {x}',
    a_perm: 'changed access for {x}', a_removeMember: 'removed {x} from members', a_settings: 'edited the site settings', a_export: 'exported the announcement video for “{x}”',
    w_events: 'the event', w_issues: 'the issue', w_episodes: 'the episode', w_team: 'the team member',
    sec_events: 'Events', sec_issues: 'Magazine', sec_episodes: 'Podcast', sec_team: 'Team', sec_settings: 'Settings', sec_access: 'Access', sec_tools: 'Tools',
    member: 'Member', email: 'Email', boardCol: 'Board', remove: 'Remove', you: 'You',
    inviteTitle: 'Invite a member', inviteBtn: 'Send the invite', inviteHint: 'They sign in with this email through Google or a sign-in link, and see the sections you chose.',
    pending: 'Invites not yet accepted', revoke: 'Cancel invite', invited: 'Invited',
    permHint: 'Board members see everything and manage access and the edit history.',
    profileHint: 'This tag appears next to every edit you make.',
    genTitle: 'Announcement maker', genText: 'Type the details in Arabic and English, add the registration link, then export the video in 2K.',
    genFrom: 'From an event', genNone: 'No event — I’ll type it',
    anColor: 'Color', anColorHint: 'An event starts in the color of its type on the site: workshops blue, designathons green, talks clay, site visits ink.',
    pal_blueprint: 'Blueprint', pal_courtyard: 'Courtyard', pal_clay: 'Clay', pal_ink: 'Ink',
    topPill: 'Top pill', lines: 'Details, in order', addLine: 'Add a line', qrLink: 'QR code link', qrCaption: 'QR caption', qrHold: 'QR code stays on screen for',
    play: 'Play', pause: 'Pause', replay: 'Replay', exportMp4: 'Export MP4', exporting: 'Exporting… {p}%', exported: 'Done. Saved {f}.', exportFail: 'This browser can’t export video. Try Chrome, Edge or Safari.',
    or: 'or', loading: 'Loading…', signingIn: 'Signing in…',
    errSave: 'Couldn’t save. Check your connection and try again.', errLoad: 'Couldn’t load. Refresh the page and try again.', errSignIn: 'Couldn’t sign in. Please try again.',
    needEmailText: 'You opened the sign-in link on a different device from the one you asked on. Type your email to finish.',
    demoSignInNote: 'The demo needs no account. On the real site, members sign in with Google or with a link sent to their email.',
    gResources: 'Resources', brand: 'Brand kit', qr: 'QR code', more: 'More',
    shortcuts: 'Shortcuts', onSite: 'On the site now', recent: 'Recent edits', seeAll: 'See all', lastEdit: 'Last edit',
    n_upcoming: 'Upcoming events', n_issues: 'Magazine issues', n_episodes: 'Podcast episodes', n_members: 'Members',
    hidden: 'Hidden on the site until the first item is added',
    col_blue: 'Blue', col_green: 'Green', col_clay: 'Clay', col_night: 'Night', col_graphite: 'Graphite', col_ink: 'Ink',
    allowed: '{s}: allowed', notAllowed: '{s}: not allowed', makeBoard: 'Board member', boardOnSelf: 'You can’t remove yourself from the board.',
    removeQ: 'Remove {x} from members?', removeText: 'They lose access right away. You can invite them again any time.',
    inviteNote: 'No email is sent automatically: tell them to sign in on the members’ page with this address.', emailInvalid: 'Type a valid email address', alreadyMember: 'This email belongs to a member already',
    linkInvalid: 'Links start with https://', needOne: 'Write this in at least one language',
    holdS: '{n} seconds', lineN: 'Line {n}', removeLine: 'Remove line', maxLines: 'Six lines at most',
    exportNote: '2K (2560 × 1440), 60 frames a second. Exporting takes a minute or two; keep this page open.',
    vp9Note: 'Saved with VP9 video. If an app refuses it, export from Chrome, Edge or Safari.',
    h_workshop: 'Memar Workshop', h_designathon: 'Memar Designathon', h_talk: 'Memar Talk', h_visit: 'Memar Site Visit', scanReg: 'Scan to register',
    qrText: 'Type any link and save a QR code in Memar colours for posters and slides.', qrStyle: 'Colours', qrInk: 'Ink on paper', qrNight: 'Paper on night', qrBlue: 'Blue on paper',
    dlPng: 'Download PNG', dlSvg: 'Download SVG',
    brandText: 'The logo, colours and fonts, ready for posts and slides.', logoFiles: 'Logo files', colors: 'Colours', fonts: 'Fonts', copy: 'Copy', copied: 'Copied',
    onPaper: 'On paper', onNight: 'On night', onInk: 'On ink', brandRules: 'The blue triangle marks activity only, and blue is for actions and highlights. Don’t stretch the logo or change its colours.',
    preview: 'Preview', saveProfile: 'Save my profile',
    darkMode: 'Dark mode', lightMode: 'Light mode', appearance: 'Appearance',
    story: 'Logo story', look: 'Fonts and appearance',
    pageText: 'Page text', a_text: 'edited the page text', sec_text: 'Page text',
    pageTextHint: 'The words on the public pages, in Arabic and English. What you change shows on the site once you save; an empty field goes back to the original.',
    ptOriginal: 'Original', ptRestore: 'Restore the original', ptChanged: 'Changed', ptPages: 'Pages', ptAllRestored: 'All the original text is back in the fields. Save to keep it.', ptAlso: 'Also shown on {x}',
    a_story: 'edited the logo story', a_look: 'changed the fonts and appearance', sec_story: 'Logo story', sec_look: 'Appearance',
    storyHint: 'Shown on the About page, after the introduction. Edit the text in Arabic and English, or hide the whole section.',
    storyShow: 'Show this section on the About page', storyIsHidden: 'The section is hidden from the site right now.',
    st_title: 'Section title', st_logo: 'The idea of the logo', st_steps: 'Captions for the three pictures', st_step: 'Picture {n}',
    st_filmTitle: 'Film title', st_film: 'The idea of the film', st_chapters: 'The film’s chapters', st_chTitle: 'Chapter name', st_chText: 'What happens',
    restoreText: 'Restore the original text', viewOnSite: 'See it on the site', paraHint: 'Leave an empty line between paragraphs.', restored: 'The original text is back in the fields. Save to keep it.',
    lookHint: 'Fonts change on every page of the site, in the members’ area and in the announcement video. Fonts come from Google Fonts. Only the board sees this page.',
    r_arHead: 'Arabic headings', r_arBody: 'Arabic text', r_enHead: 'English headings', r_enBody: 'English text', r_mono: 'Small labels and numbers',
    otherFont: 'Another Google font…', fontName: 'Font name as shown on Google Fonts', needArabic: 'Pick a font that supports Arabic', identityFont: 'identity font',
    defaultTheme: 'Default appearance for visitors', th_light: 'Light · paper', th_dark: 'Dark · blueprint', th_auto: 'Follow the visitor’s device', themeHint: 'Every visitor can switch with the appearance button, and their choice stays in their browser.',
    resetLook: 'Restore the identity fonts', lookReset: 'The identity fonts are back in the fields. Save to keep them.',
    sampleArHead: 'فريق معماري بقيادة طلاب العمارة', sampleArBody: 'يرتقي بالمستوى الطلابي ويثري تجربتهم بتبادل الخبرات عبر مستويات ووسائط متنوعة.',
    popupBlocked: 'The Google window didn’t open. Allow pop-ups, open this page in Safari or Chrome instead of an app’s built-in browser, or get a sign-in link by email.', unauthorizedDomain: 'This site’s address isn’t added in Firebase yet. Add it under Authentication › Settings › Authorized domains.', linkQuota: 'Today’s limit of sign-in emails is used up. Sign in with Google, or try tomorrow.', linkExpired: 'This sign-in link has expired or was already used. Ask for a new one.',
    f_photo: 'Photo', photoHint: 'Shown publicly on the About page. Upload it only with the person’s agreement.', choosePhoto: 'Choose a photo', changePhoto: 'Change the photo', removePhoto: 'Remove the photo', zoom: 'Zoom', dragHint: 'Drag the photo to place it in the circle, or use the arrow keys and + and −.', noPhoto: 'No photo', photoError: 'Couldn’t open this image. Try a JPG or PNG.',
    navMain: 'Main menu', navPages: 'Page links', navSections: 'Members’ area sections', navQuick: 'Quick navigation', demoLabel: 'About this version',
    staleNote: 'Couldn’t refresh the content just now. This is the last copy saved on your device.', offlineTitle: 'Couldn’t load the content', offlineText: 'Check your internet connection, then try again.', retry: 'Try again', showMore: 'Show more', ourGoals: 'Our goals', waysToJoin: 'Ways to join',
    sigNote: 'Every edit carries your tag and appears in the board’s history.',
  }
};
