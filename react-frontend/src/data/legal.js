/* VERIFIED AGAINST THE CORPUS — do not hand-edit section numbers.
 *
 * Two entries here were wrong, and wrong in a specific, instructive way:
 *
 *     §307 "Attempt to murder"   -> that is the INDIAN Penal Code.
 *                                   PPC §307 is "Cases in which Qisas for
 *                                   qatl-e-amd shall not be enforced".
 *                                   Attempted murder in Pakistan is §324.
 *
 *     §304 "Culpable homicide"   -> also the IPC. PPC §304 is "Proof of
 *                                   qatl-i-amd liable to qisas". The nearest
 *                                   Pakistani equivalent is qatl shibh-i-amd,
 *                                   §315-316.
 *
 * The PPC and IPC were the same 1860 statute, but Pakistan renumbered Chapter
 * XVI wholesale in the Qisas and Diyat Ordinance 1990. Any source trained mostly
 * on Indian law -- which is most of them, including every general LLM -- will
 * confidently hand you the IPC number for a Pakistani offence. That is exactly
 * the failure this product exists to prevent, and it was sitting in our own
 * hardcoded table, rendered as fact on a page titled "Offences and punishments".
 *
 * Verify with: python backend/scripts/verify_static_law.py
 */

/* Static legal reference content, lifted verbatim from the previous build.
   This is hand-written domain work (real sections, real punishments) and is
   worth more than the code around it — so it moved out of the components and
   into data, unchanged in substance.

   One change: severity/colour was stored as raw CSS variables ("var(--red)"),
   which put presentation inside the data. It's now semantic ("high"/"medium"/
   "low") and the component decides how that looks. */

export const FAQ_SECTIONS = [
    {cat:"Criminal Law",cat_ur:"فوجداری قانون",tone:"high",items:[
      {
        q:"What are my rights when arrested?",
        q_ur:"گرفتاری کے وقت میرے کیا حقوق ہیں؟",
        a:"Under Article 10 of the Constitution and Section 61 CrPC: you must be informed of the grounds of arrest, produced before a Magistrate within 24 hours, and have the right to consult a lawyer of your choice immediately. Police cannot detain you beyond 24 hours without a judicial remand order.",
        a_ur:"دستورِ پاکستان کے آرٹیکل 10 اور ضابطہ فوجداری (CrPC) کی دفعہ 61 کے تحت: آپ کو گرفتاری کی وجوہات سے فوری طور پر آگاہ کیا جانا چاہیے، 24 گھنٹے کے اندر مجسٹریٹ کے سامنے پیش کیا جانا چاہیے، اور اپنی پسند کے وکیل سے فوری مشاورت کا حق حاصل ہے۔ پولیس عدالتی ریمانڈ کے بغیر آپ کو 24 گھنٹے سے زیادہ حراست میں نہیں رکھ سکتی۔"
      },
      {
        q:"What is Section 302 PPC (Murder)?",
        q_ur:"دفعہ 302 تعزیراتِ پاکستان (قتلِ عمد) کیا ہے؟",
        a:"Section 302 deals with Qatl-e-Amd (intentional murder). Punishment: death penalty OR life imprisonment, plus payment of Diyat (blood money) to the victim's heirs as prescribed by the court. The heirs may also waive or compound the offence under Sections 309–310.",
        a_ur:"دفعہ 302 تعزیراتِ پاکستان کا تعلق قتلِ عمد (عمدی قتل) سے ہے۔ سزا: موت کی سزا یا عمر قید، اور ساتھ ہی عدالت کے تجویز کردہ خون بہا (دیت) کی ادائیگی۔ وارثین دفعہ 309-310 کے تحت جرم معاف یا سمجھوتہ بھی کر سکتے ہیں۔"
      },
      {
        q:"How do I register an FIR?",
        q_ur:"ایف آئی آر (FIR) کیسے درج کروائی جائے؟",
        a:"Go to the nearest police station. If police refuse to register, approach a Magistrate under Section 22-A CrPC who can direct registration. For women, child, and cyber offences, FIRs can also be lodged at district Women Police Stations. Always get a certified copy of the FIR.",
        a_ur:"قریبی تھانے جائیں۔ اگر پولیس اندراج سے انکار کرے تو ضابطہ فوجداری کی دفعہ 22-A کے تحت مجسٹریٹ سے رجوع کریں جو اندراج کا حکم دے سکتا ہے۔ خواتین، بچوں اور سائبر جرائم کے لیے، اضلاع میں خواتین کے تھانوں میں بھی ایف آئی آر درج کی جا سکتی ہے۔ ہمیشہ ایف آئی آر کی تصدیق شدہ کاپی حاصل کریں۔"
      },
      {
        q:"What is bail and how do I get it?",
        q_ur:"ضمانت کیا ہے اور یہ کیسے حاصل کی جاتی ہے؟",
        a:"Bail is temporary release from custody. Bailable offences (Schedule II CrPC, column 5 = 'Yes') grant bail as a right from the police. Non-bailable offences require a bail application before a Sessions Judge or High Court. Murder, dacoity, and terrorism cases are typically non-bailable unless the court is satisfied that the accused is not likely to commit further offences.",
        a_ur:"ضمانت حراست سے عارضی رہائی ہے۔ قابلِ ضمانت جرائم (ضابطہ فوجداری کے شیڈول II، کالم 5 میں 'ہاں') میں پولیس سے ضمانت حاصل کرنا ایک حق ہے۔ غیر قابلِ ضمانت جرائم کے لیے سیشن جج یا ہائی کورٹ میں ضمانت کی درخواست درکار ہوتی ہے۔ قتل، ڈکیتی، اور دہشت گردی کے مقدمات عام طور پر غیر قابلِ ضمانت ہوتے ہیں جب تک کہ عدالت مطمئن نہ ہو جائے کہ ملزم کے مزید جرم کرنے کا امکان نہیں ہے۔"
      },
      {
        q:"What is the difference between bailable and non-bailable offences?",
        q_ur:"قابلِ ضمانت اور غیر قابلِ ضمانت جرائم میں کیا فرق ہے؟",
        a:"Bailable offences (e.g. hurt, theft below PKR 500): the accused has a right to bail from police or court. Non-bailable offences (e.g. murder, rape, robbery): bail is at the court's discretion and must be applied for in writing. The court weighs flight risk, evidence, and public safety.",
        a_ur:"قابلِ ضمانت جرائم (مثلاً عام مار پیٹ، 500 روپے سے کم کی چوری): ملزم کو پولیس یا عدالت سے ضمانت کا حق حاصل ہوتا ہے۔ غیر قابلِ ضمانت جرائم (مثلاً قتل، زنا بالربر، ڈکیتی): ضمانت عدالت کے صوابدید پر ہوتی ہے اور اس کے لیے تحریری درخواست دینا پڑتی ہے۔ عدالت فرار ہونے کے خطرے، شواہد اور عوامی تحفظ کا جائزہ لیتی ہے۔"
      },
      {
        q:"What is a cognizable vs non-cognizable offence?",
        q_ur:"قابلِ دست اندازی اور ناقابلِ دست اندازی جرم میں کیا فرق ہے؟",
        a:"Cognizable offences (e.g. murder, robbery, rape): police can arrest without a warrant and investigate without Magistrate's order. Non-cognizable offences (e.g. assault, defamation): police require a Magistrate's order to investigate or make an arrest. FIR is registered for cognizable offences; complaint challan for non-cognizable ones.",
        a_ur:"قابلِ دست اندازی جرائم (مثلاً قتل، ڈکیتی، زنا): پولیس وارنٹ کے بغیر گرفتار اور مجسٹریٹ کے حکم کے بغیر تفتیش کر سکتی ہے۔ ناقابلِ دست اندازی جرائم (مثلاً عام حملہ، ہتکِ عزت): پولیس کو تفتیش یا گرفتاری کے لیے مجسٹریٹ کے حکم کی ضرورت ہوتی ہے۔ قابلِ دست اندازی جرائم کے لیے ایف آئی آر درج کی جاتی ہے جبکہ ناقابلِ دست اندازی کے لیے شکایت درج کی جاتی ہے۔"
      },
      {
        q:"Can police search my home without a warrant?",
        q_ur:"کیا پولیس وارنٹ کے بغیر میرے گھر کی تلاشی لے سکتی ہے؟",
        a:"Generally no — Section 96 CrPC requires a search warrant issued by a Magistrate. Exceptions: hot pursuit (Section 165), reasonable suspicion of stolen goods, or if an officer has reason to believe a person is concealing themselves. Any illegal search may be challenged before the Sessions Court or High Court.",
        a_ur:"عام طور پر نہیں — ضابطہ فوجداری کی دفعہ 96 کے تحت مجسٹریٹ کا جاری کردہ سرچ وارنٹ ضروری ہے۔ استثنیٰ: تعاقب کے دوران (دفعہ 165)، چوری شدہ مال کا معقول شبہ، یا اگر افسر کے پاس یہ یقین کرنے کی وجہ ہو کہ کوئی شخص خود کو چھپا رہا ہے۔ کسی بھی غیر قانونی تلاشی کو سیشن کورٹ یا ہائی کورٹ میں چیلنج کیا جا سکتا ہے۔"
      },
      {
        q:"What is plea bargaining in Pakistan?",
        q_ur:"پاکستان میں پلی بارگیننگ (سودے بازی) کیا ہے؟",
        a:"Under NAB Ordinance 1999, an accused facing corruption charges can voluntarily offer to return the proceeds of corruption in exchange for acquittal. In regular criminal courts (Section 345 PPC), compoundable offences (e.g. hurt, cheating) can be settled between parties with the court's permission.",
        a_ur:"نیب آرڈیننس 1999 کے تحت، کرپشن کے الزامات کا سامنا کرنے والا ملزم بریت کے بدلے کرپشن سے حاصل کردہ رقم رضاکارانہ طور پر واپس کرنے کی پیشکش کر سکتا ہے۔ عام فوجداری عدالتوں میں (تعزیراتِ پاکستان کی دفعہ 345)، سمجھوتہ کے قابل جرائم (مثلاً مار پیٹ، دھوکہ دہی) فریقین کے درمیان عدالت کی اجازت سے حل کیے جا سکتے ہیں۔"
      },
    ]},
    {cat:"Family Law",cat_ur:"خاندانی قانون",tone:"medium",items:[
      {
        q:"How does a wife file for Khula?",
        q_ur:"بیوی خلع کے لیے کیسے دعویٰ دائر کرے؟",
        a:"File a suit in the Family Court under the Muslim Family Laws Ordinance 1961 and the West Pakistan Family Courts Act 1964. You must generally return the haq-mehr. The court grants Khula if the marriage is irretrievably broken — the husband's consent is not required. Process typically takes 3–6 months.",
        a_ur:"مسلم عائلی قوانین آرڈیننس 1961 اور مغربی پاکستان فیملی کورٹ ایکٹ 1964 کے تحت فیملی کورٹ میں دعویٰ دائر کریں۔ عام طور پر آپ کو حق مہر واپس کرنا ہوگا۔ اگر شادی ناقابلِ تلافی حد تک ٹوٹ چکی ہو تو عدالت خلع دے دیتی ہے — اس میں شوہر کی رضا مندی کی ضرورت نہیں ہوتی۔ یہ عمل عام طور پر 3 سے 6 ماہ لیتا ہے۔"
      },
      {
        q:"How does Talaq (divorce by husband) work?",
        q_ur:"طلاق (شوہر کی طرف سے طلاق) کا عمل کیسے ہوتا ہے؟",
        a:"Under Section 7 MFLO 1961, the husband must send written notice of Talaq to the Chairman of the Union Council and a copy to the wife. Divorce takes effect after 90 days (iddat period), during which reconciliation attempts are made. Talaq without notice is still valid but the husband faces criminal penalty.",
        a_ur:"مسلم عائلی قوانین (MFLO) 1961 کی دفعہ 7 کے تحت، شوہر کے لیے لازمی ہے کہ وہ یونین کونسل کے چیئرمین کو طلاق کا تحریری نوٹس بھیجے اور ایک کاپی بیوی کو بھیجے۔ طلاق 90 دن (عدت کی مدت) کے بعد نافذ ہوتی ہے، جس کے دوران صلح کی کوششیں کی جاتی ہیں۔ بغیر نوٹس کے طلاق بھی نافذ ہو جاتی ہے لیکن شوہر کو فوجداری جرمانے کا سامنا کرنا پڑتا ہے۔"
      },
      {
        q:"How is child custody decided?",
        q_ur:"بچوں کی تحویل (کسٹڈی) کا فیصلہ کیسے ہوتا ہے؟",
        a:"Under the Guardians and Wards Act 1890, the paramount consideration is the welfare of the child. Generally: the mother has custody (hizanat) of sons up to age 7 and daughters until puberty, unless she remarries. The father is the natural guardian for property matters. Courts can override these defaults based on the child's best interests.",
        a_ur:"گارڈینز اینڈ وارڈز ایکٹ 1890 کے تحت، سب سے اہم غور بچے کی فلاح و بہبود ہے۔ عام طور پر: ماں کو بیٹوں کی 7 سال کی عمر تک اور بیٹیوں کی بالغ ہونے تک تحویل (حضانت) حاصل ہوتی ہے، الا یہ کہ وہ دوسری شادی کر لے۔ شوہر مالی معاملات کا قدرتی سرپرست ہوتا ہے۔ عدالتیں بچے کے بہترین مفاد کی بنیاد پر ان طے شدہ قوانین کو تبدیل کر سکتی ہیں۔"
      },
      {
        q:"What is the process for getting maintenance (nafaqa)?",
        q_ur:"نان نفقہ (خرچہ) حاصل کرنے کا کیا طریقہ ہے؟",
        a:"File an application in the Family Court. The court can order interim maintenance within days. The husband is legally obligated to provide maintenance under Section 9 MFLO. Amount considers the husband's income, wife's needs, and standard of living. Non-payment can lead to attachment of property and arrest.",
        a_ur:"فیملی کورٹ میں درخواست دائر کریں۔ عدالت چند دنوں کے اندر عبوری نان نفقہ کا حکم دے سکتی ہے۔ مسلم عائلی قوانین آرڈیننس کی دفعہ 9 کے تحت شوہر قانونی طور پر نفقہ فراہم کرنے کا پابند ہے۔ رقم کا تعین شوہر کی آمدنی، بیوی کی ضروریات اور طرزِ زندگی کو دیکھ کر کیا جاتا ہے۔ عدم ادائیگی کی صورت میں جائیداد کی قرقی اور گرفتاری ہو سکتی ہے۔"
      },
      {
        q:"What is haq-mehr and can I claim it after divorce?",
        q_ur:"حق مہر کیا ہے اور کیا میں طلاق کے بعد اس کا دعویٰ کر سکتی ہوں؟",
        a:"Haq-mehr is the mandatory dower (financial gift) from husband to wife — a condition of valid Islamic marriage. If unpaid, the wife can file a civil suit to recover it at any time during or after the marriage. It does not expire. The nikah-nama specifies the agreed amount.",
        a_ur:"حق مہر وہ لازمی مہر (مالی تحفہ) ہے جو شوہر بیوی کو دیتا ہے — جو کہ اسلامی نکاح کے درست ہونے کی شرط ہے۔ اگر یہ ادا نہ کیا گیا ہو، تو بیوی شادی کے دوران یا بعد میں کسی بھی وقت اسے حاصل کرنے کے لیے سول دعویٰ دائر کر سکتی ہے۔ یہ کبھی ختم نہیں ہوتا۔ نکاح نامے میں طے شدہ رقم درج ہوتی ہے۔"
      },
      {
        q:"How is inheritance distributed under Pakistani law?",
        q_ur:"پاکستانی قانون کے تحت وراثت کیسے تقسیم کی جاتی ہے؟",
        a:"Under the Muslim Personal Law (Shariat) Application Act 1962, inheritance follows Islamic Shariat law. Sons receive double the share of daughters. Spouses, parents, and children are primary heirs. A will (wasiyat) cannot exceed one-third of the estate. Non-Muslim heirs are excluded. For Hindus and Christians, separate succession acts apply.",
        a_ur:"مسلم پرسنل لا (شریعت) ایپلیکیشن ایکٹ 1962 کے تحت، وراثت اسلامی شریعت کے مطابق تقسیم ہوتی ہے۔ بیٹوں کا حصہ بیٹیوں سے دوگنا ہوتا ہے۔ شریکِ حیات، والدین اور بچے بنیادی وارث ہیں۔ وصیت جائیداد کے ایک تہائی سے زیادہ نہیں ہو سکتی۔ غیر مسلم وارثین کو خارج کیا گیا ہے۔ ہندوؤں اور عیسائیوں کے لیے علیحدہ وراثت کے قوانین لاگو ہوتے ہیں۔"
      },
    ]},
    {cat:"Property & Tenancy",cat_ur:"جائیداد اور کرایہ داری",tone:"low",items:[
      {
        q:"Can a landlord evict a tenant without a court order?",
        q_ur:"کیا مالک مکان عدالتی حکم کے بغیر کرایہ دار کو بے دخل کر سکتا ہے؟",
        a:"No. Under the Punjab Rented Premises Act 2009 and equivalent provincial laws, a landlord cannot forcibly evict a tenant. Eviction requires filing an application before the Rent Controller who issues a notice. The tenant has the right to contest. Forcible eviction is a criminal offence under Section 441/447 PPC.",
        a_ur:"نہیں۔ پنجاب رینٹڈ پریمیسز ایکٹ 2009 اور اس کے مساوی صوبائی قوانین کے تحت، مالک مکان زبردستی کرایہ دار کو بے دخل نہیں کر سکتا۔ بے دخلی کے لیے رینٹ کنٹرولر کے سامنے درخواست دائر کرنی پڑتی ہے جو نوٹس جاری کرتا ہے۔ کرایہ دار کو دفاع کا حق حاصل ہے۔ زبردستی بے دخلی تعزیراتِ پاکستان کی دفعہ 441/447 کے تحت ایک جرم ہے۔"
      },
      {
        q:"What is the mutation (intiqal) process for property?",
        q_ur:"جائیداد کا انتقال (انتقال) کرانے کا کیا طریقہ ہے؟",
        a:"After buying property, the buyer must apply to the local Patwari/Revenue Officer for mutation within 3 months. Required documents: sale deed, CNIC, previous ownership documents, and fee receipt. Without mutation, ownership is not reflected in the government record (Fard), which can lead to complications in future sales or disputes.",
        a_ur:"جائیداد خریدنے کے بعد، خریدار کو 3 ماہ کے اندر انتقال کے لیے مقامی پٹواری/ریونیو آفیسر کو درخواست دینی ہوگی۔ مطلوبہ دستاویزات: بیعنامہ (سپیڈ ڈیڈ)، شناختی کارڈ، سابقہ ملکیت کی دستاویزات اور فیس کی رسید۔ انتقال کے بغیر، ملکیت سرکاری ریکارڈ (فرد) میں درج نہیں ہوتی، جس سے مستقبل میں فروخت یا تنازعات کی صورت میں پیچیدگیاں پیدا ہو سکتی ہیں۔"
      },
      {
        q:"How do I challenge a property dispute in court?",
        q_ur:"میں عدالت میں جائیداد کے تنازع کو کیسے چیلنج کروں؟",
        a:"File a civil suit for declaration/permanent injunction in the Civil Court (District Judge level). Alternatively, file a constitutional petition in the High Court if a government authority is involved. Get a stay order to freeze the disputed property during litigation. Always have your title deed, inheritance certificate, and mutation record ready.",
        a_ur:"سول کورٹ (ڈسٹرکٹ جج کی سطح) میں استقرارِ حق/حکم امتناعی کا سول دعویٰ دائر کریں۔ متبادل طور پر، اگر کوئی سرکاری ادارہ ملوث ہو تو ہائی کورٹ میں آئینی پٹیشن دائر کریں۔ مقدمہ بازی کے دوران متنازع جائیداد کو منجمد کرنے کے لیے اسٹے آرڈر حاصل کریں۔ اپنے پاس ملکیت کی دستاویز، وراثت کا سرٹیفکیٹ اور انتقال کا ریکارڈ ہمیشہ تیار رکھیں۔"
      },
      {
        q:"What are squatter rights (adverse possession) in Pakistan?",
        q_ur:"پاکستان میں ناجائز قابض کے حقوق (قبضہ مخالفانہ) کیا ہیں؟",
        a:"Under the Limitation Act 1908, a person in continuous, open, hostile possession of property for 12 years acquires the right to sue for title. However, adverse possession does not automatically extinguish the original owner's title — a court must formally recognize it. Possession must be uninterrupted and without the owner's permission.",
        a_ur:"لیمیٹیشن ایکٹ 1908 کے تحت، ایک شخص جو 12 سال سے کسی جائیداد پر مسلسل، کھلم کھلا اور مخالفانہ قابض ہو، وہ ملکیت کا دعویٰ دائر کرنے کا حق حاصل کر لیتا ہے۔ تاہم، قبضہ مخالفانہ خود بخود اصل مالک کا حق ختم نہیں کرتا — عدالت کو باضابطہ طور پر اس کا اعتراف کرنا پڑتا ہے۔ قبضہ بلا تعطل اور مالک کی اجازت کے بغیر ہونا چاہیے۔"
      },
    ]},
    {cat:"Labour Law",cat_ur:"لیبر قوانین",tone:"low",items:[
      {
        q:"What is the minimum wage in Pakistan?",
        q_ur:"پاکستان میں کم از کم اجرت کیا ہے؟",
        a:"The Federal Government periodically revises the minimum wage. As of recent notifications, the federal minimum wage is PKR 37,000/month (2024–25) for unskilled workers. Provinces may set higher rates: Punjab and Sindh have their own notifications. Non-compliance can be reported to the Labour Department.",
        a_ur:"وفاقی حکومت وقتاً فوقتاً کم از کم اجرت پر نظرثانی کرتی ہے۔ حالیہ نوٹیفکیشنز کے مطابق، غیر ہنرمند مزدوروں کے لیے وفاقی کم از کم اجرت 37,000 روپے ماہانہ (2024-25) ہے۔ صوبے اس سے زیادہ شرح مقرر کر سکتے ہیں: پنجاب اور سندھ کے اپنے نوٹیفکیشنز ہیں۔ خلاف ورزی کی صورت میں لیبر ڈیپارٹمنٹ کو رپورٹ کی جا سکتی ہے۔"
      },
      {
        q:"What are my rights if I am wrongfully terminated?",
        q_ur:"اگر مجھے غیر قانونی طور پر برطرف کیا جائے تو میرے کیا حقوق ہیں؟",
        a:"Under the Industrial Relations Act 2012 (IRA) and Employment of Children Act 1991, an employee who is dismissed without cause or proper procedure can file a complaint with the Labour Court within 30 days. Remedies include reinstatement with back wages or severance pay (EOBI benefits). Always get your termination letter in writing.",
        a_ur:"صنعتی تعلقات ایکٹ (IRA) 2012 اور ایمپلائمنٹ آف چلڈرن ایکٹ 1991 کے تحت، جس ملازم کو بغیر کسی وجہ یا مناسب طریقہ کار کے برطرف کیا گیا ہو، وہ 30 دن کے اندر لیبر کورٹ میں شکایت درج کرا سکتا ہے۔ تلافی کے اقدامات میں بقایا تنخواہ کے ساتھ بحالی یا ملازمت کی برطرفی کا معاوضہ (EOBI فوائد) شامل ہیں۔ برطرفی کا خط ہمیشہ تحریری طور پر حاصل کریں۔"
      },
      {
        q:"Am I entitled to gratuity and provident fund?",
        q_ur:"کیا میں گریچویٹی اور پروویڈنٹ فنڈ کا حقدار ہوں؟",
        a:"Under the West Pakistan Industrial & Commercial Employment (S&C) Ordinance 1968, permanent employees are entitled to gratuity of 30 days' wages for every year of service after completing one year. Provident fund contributions (8.33% employer + employee) are mandatory for industrial establishments employing 10+ workers under the Employees Provident Fund Act.",
        a_ur:"مغربی پاکستان انڈسٹریل اینڈ کمرشل ایمپلائمنٹ (S&C) آرڈیننس 1968 کے تحت، مستقل ملازمین ایک سال کی سروس مکمل کرنے کے بعد ہر سال کے بدلے 30 دن کی اجرت کی گریچویٹی کے حقدار ہیں۔ پروویڈنٹ فنڈ کے واجبات (8.33% آجر + ملازم) ان تمام صنعتی اداروں کے لیے لازمی ہیں جہاں ملازمین پروویڈنٹ فنڈ ایکٹ کے تحت 10 یا اس سے زیادہ ملازمین کام کرتے ہوں۔"
      },
      {
        q:"Can an employer deduct wages without my consent?",
        q_ur:"کیا آجر میری رضامندی کے بغیر اجرت کاٹ سکتا ہے؟",
        a:"No. Under Section 24 Payment of Wages Act 1936, unauthorized deductions are prohibited. Permitted deductions: fines, absence from duty, advances, income tax, provident fund, and housing provided by the employer. Any unlawful deduction can be challenged before the Payment of Wages Authority within 12 months.",
        a_ur:"نہیں۔ پیمنٹ آف ویجز ایکٹ 1936 کی دفعہ 24 کے تحت غیر مجاز کٹوتیاں ممنوع ہیں۔ جائز کٹوتیاں: جرمانے، ڈیوٹی سے غیر حاضری، ایڈوانس، انکم ٹیکس، پروویڈنٹ فنڈ اور آجر کی طرف سے فراہم کردہ رہائش۔ کسی بھی غیر قانونی کٹوتی کو 12 ماہ کے اندر پیمنٹ آف ویجز اتھارٹی کے سامنے چیلنج کیا جا سکتا ہے۔"
      },
    ]},
    {cat:"Cyber Law (PECA 2016)",cat_ur:"سائبر قوانین (PECA 2016)",tone:"low",items:[
      {
        q:"What are the main offences under PECA 2016?",
        q_ur:"PECA 2016 کے تحت اہم جرائم کون سے ہیں؟",
        a:"Section 3: Unauthorized access (up to 3 months or PKR 50,000). Section 20: Online defamation/false information (up to 3 years + PKR 1M). Section 24: Cyberstalking (up to 5 years + PKR 1M). Section 22: Child pornography (up to 7 years + PKR 5M). Section 11: Hate speech online (up to 7 years + fine).",
        a_ur:"دفعہ 3: غیر مجاز رسائی (3 ماہ تک قید یا 50,000 روپے جرمانہ)۔ دفعہ 20: آن لائن ہتکِ عزت/جھوٹی معلومات (3 سال تک قید + 10 لاکھ روپے جرمانہ)۔ دفعہ 24: سائبر ہراسگی (5 سال تک قید + 10 لاکھ روپے جرمانہ)۔ دفعہ 22: بچوں کی نازیبا ویڈیوز/تصاویر (7 سال تک قید + 50 لاکھ روپے جرمانہ)۔ دفعہ 11: آن لائن نفرت انگیز تقریر (7 سال تک قید + جرمانہ)۔"
      },
      {
        q:"How do I report cybercrime or online harassment?",
        q_ur:"میں سائبر کرائم یا آن لائن ہراسگی کی رپورٹ کیسے کروں؟",
        a:"File a complaint at the FIA Cybercrime Wing (NR3C): visit www.fia.gov.pk, call 1787, or visit the nearest FIA office. For women/girls facing online harassment, the Digital Rights Foundation helpline is 0800-03523 (free). Always preserve screenshots, URLs, and digital evidence before reporting. Courts can also issue injunctions to take down content.",
        a_ur:"ایف آئی اے سائبر کرائم ونگ (NR3C) میں شکایت درج کریں: ویب سائٹ www.fia.gov.pk پر جائیں، 1787 پر کال کریں، یا قریبی ایف آئی اے آفس جائیں۔ آن لائن ہراسگی کا سامنا کرنے والی خواتین/لڑکیوں کے لیے ڈیجیٹل رائٹس فاؤنڈیشن کی ہیلپ لائن 03523-0800 (مفت) ہے۔ رپورٹنگ سے پہلے ہمیشہ اسکرین شاٹس، یو آر ایل اور ڈیجیٹل شواہد محفوظ کریں۔ عدالتیں مواد ہٹانے کے لیے حکم امتناعی بھی جاری کر سکتی ہے۔"
      },
      {
        q:"Is sharing someone's private photos online illegal?",
        q_ur:"کیا کسی کی نجی تصاویر آن لائن شیئر کرنا غیر قانونی ہے؟",
        a:"Yes. Under Section 21 PECA 2016 (non-consensual intimate images/revenge porn), sharing, displaying, or transmitting someone's intimate images without consent is punishable by up to 5 years imprisonment and/or PKR 5M fine. The victim can also seek civil damages and a restraining order.",
        a_ur:"جی ہاں۔ PECA 2016 کی دفعہ 21 (بغیر رضامندی کے نجی تصاویر شیئر کرنا) کے تحت، کسی کی رضامندی کے بغیر اس کی نجی تصاویر شیئر کرنا، دکھانا یا منتقل کرنا 5 سال تک قید اور/یا 50 لاکھ روپے جرمانے کی سزا کے لائق ہے۔ متاثرہ شخص دیوانی ہرجانے اور امتناعی احکامات کے لیے بھی رجوع کر سکتا ہے۔"
      },
      {
        q:"Can I be arrested for a social media post?",
        q_ur:"کیا مجھے سوشل میڈیا پوسٹ پر گرفتار کیا جا سکتا ہے؟",
        a:"Yes. Under Section 20 PECA 2016, posts that are considered defamatory, false, or likely to cause social panic can lead to arrest. Section 11 covers online hate speech. However, legitimate criticism of public officials is protected expression. FIA must obtain a court order for most arrests. If arrested, immediately contact a lawyer.",
        a_ur:"جی ہاں۔ PECA 2016 کی دفعہ 20 کے تحت ایسی پوسٹس جو ہتک آمیز، جھوٹی یا سماجی خوف و ہراس پھیلانے کا باعث بنیں، گرفتاری کا سبب بن سکتی ہیں۔ دفعہ 11 آن لائن نفرت انگیز تقریر کا احاطہ کرتی ہے۔ تاہم، عوامی عہدیداروں پر جائز تنقید آئینی طور پر محفوظ اظہارِ رائے ہے۔ ایف آئی اے کو زیادہ تر گرفتاریوں کے لیے عدالتی حکم نامے کی ضرورت ہوتی ہے۔ گرفتاری کی صورت میں فوری وکیل سے رابطہ کریں۔"
      },
    ]},
    {cat:"Women's Rights",cat_ur:"خواتین کے حقوق",tone:"medium",items:[
      {
        q:"What legal protections do women have against domestic violence?",
        q_ur:"خواتین کو گھریلو تشدد کے خلاف کیا قانونی تحفظات حاصل ہیں؟",
        a:"The Punjab Protection of Women Against Violence Act 2016, Sindh Domestic Violence (Prevention and Protection) Act 2013, and Protection against Harassment of Women at the Workplace Act 2010 provide protections. Women can file a complaint at the Magistrate's court for a Protection Order, which can ban the abuser from the home. The District Protection Committee provides shelter and legal aid.",
        a_ur:"پنجاب پروٹیکشن آف ویمن اگینسٹ وائلنس ایکٹ 2016، سندھ ڈومیسٹک وائلنس (پریونشن اینڈ پروٹیکشن) ایکٹ 2013، اور پروٹیکشن اگینسٹ ہراسمنٹ آف ویمن ایٹ ورک پلیس ایکٹ 2010 تحفظ فراہم کرتے ہیں۔ خواتین پروٹیکشن آرڈر کے لیے مجسٹریٹ کی عدالت میں شکایت درج کرا سکتی ہیں، جو بدسلوکی کرنے والے کو گھر سے بے دخل کر سکتا ہے۔ ضلعی پروٹیکشن کمیٹی پناہ گاہ اور قانونی امداد فراہم کرتی ہے۔"
      },
      {
        q:"What is the harassment at workplace law?",
        q_ur:"کام کی جگہ پر ہراسگی کا قانون کیا ہے؟",
        a:"The Protection Against Harassment of Women at the Workplace Act 2010 applies to all public and private organizations. Every organization must have an Inquiry Committee. A victim can file a complaint within 3 months. Penalties: warning to removal from service + 3 years imprisonment for repeated offences. The Federal Ombudsman handles appeals.",
        a_ur:"کام کی جگہ پر خواتین کو ہراساں کیے جانے کے خلاف تحفظ کا قانون 2010 تمام سرکاری اور نجی اداروں پر لاگو ہوتا ہے۔ ہر ادارے میں ایک انکوائری کمیٹی کا ہونا لازمی ہے۔ متاثرہ خاتون 3 ماہ کے اندر شکایت درج کرا سکتی ہے۔ سزائیں: تنبیہ سے لے کر ملازمت سے برطرفی تک اور بار بار جرم کرنے پر 3 سال قید۔ وفاقی محتسب اپیلوں کی سماعت کرتا ہے۔"
      },
      {
        q:"Can a woman inherit property equally with men?",
        q_ur:"کیا عورت مرد کے ساتھ برابر جائیداد کی وارث بن سکتی ہے؟",
        a:"Under Islamic law (applicable to Muslims), daughters receive half the share of sons. However, a daughter's right to inherit cannot be waived or denied. Courts increasingly enforce women's inheritance rights. The Prevention of Anti-Women Practices Act 2011 criminalizes depriving women of inheritance — up to 10 years imprisonment.",
        a_ur:"اسلامی قانون (جو مسلمانوں پر لاگو ہے) کے تحت، بیٹیوں کو بیٹوں کا آدھا حصہ ملتا ہے۔ تاہم، بیٹی کے وراثت کے حق سے دستبرداری یا انکار نہیں کیا جا سکتا۔ عدالتیں خواتین کے وراثت کے حقوق کو سختی سے نافذ کرتی ہیں۔ خواتین کے حقوق کے خلاف رسومات کی روک تھام کا قانون 2011 خواتین کو وراثت سے محروم کرنے کو جرم قرار دیتا ہے جس کی سزا 10 سال تک قید ہے۔"
      },
      {
        q:"What are the rights of a divorced woman?",
        q_ur:"طلاق یافتہ خاتون کے کیا حقوق ہیں؟",
        a:"A divorced woman is entitled to: (1) her unpaid haq-mehr, (2) maintenance (iddat) for 90 days post-divorce, (3) maintenance for children in her custody, (4) mataa (consolation gift) at the court's discretion. Under the Family Courts Act, she can also claim her share of jointly acquired property during the marriage.",
        a_ur:"طلاق یافتہ خاتون درج ذیل کی حقدار ہے: (1) اپنا غیر ادا شدہ حق مہر، (2) طلاق کے بعد 90 دن تک کا نان نفقہ (عدت)، (3) اپنی تحویل میں بچوں کا نان نفقہ، (4) عدالت کے صوابدید پر متاع (تسلی بخش تحفہ)۔ فیملی کورٹس ایکٹ کے تحت وہ شادی کے دوران مشترکہ طور پر حاصل کی گئی جائیداد میں اپنے حصے کا دعویٰ بھی کر سکتی ہے۔"
      },
    ]},
  ];

export const GLOSSARY_TERMS = [
    {
      t:"Acquittal",
      t_ur:"بریت (Acquittal)",
      d:"A judgment by a court that the accused is not guilty of the charges; results in discharge from prosecution.",
      d_ur:"عدالت کا یہ فیصلہ کہ ملزم الزامات کا مرتکب نہیں پایا گیا؛ اس کے نتیجے میں مقدمہ ختم ہو جاتا ہے۔"
    },
    {
      t:"Affidavit",
      t_ur:"حلف نامہ (Affidavit)",
      d:"A written sworn statement of fact, voluntarily made under oath before an authorized officer (e.g. Oath Commissioner or Notary).",
      d_ur:"حقائق کا تحریری بیان جو کسی مجاز افسر (مثلاً اوتھ کمشنر یا نوٹری پبلک) کے سامنے حلفاً دیا جائے۔"
    },
    {
      t:"Arzi (Petition)",
      t_ur:"عرضی (Petition)",
      d:"A written application or petition submitted to a court, police station, or government authority requesting relief or action.",
      d_ur:"عدالت، تھانے یا کسی سرکاری ادارے میں جمع کرائی جانے والی تحریری درخواست جس میں انصاف یا کارروائی کی التجا ہو۔"
    },
    {
      t:"Bail",
      t_ur:"ضمانت (Bail)",
      d:"Temporary release of an accused from custody, on furnishing a security/surety, while awaiting trial.",
      d_ur:"مقدمے کی سماعت تک مچلکہ یا ضمانت فراہم کرنے پر ملزم کی حراست سے عارضی رہائی۔"
    },
    {
      t:"Challan",
      t_ur:"چالان (Challan)",
      d:"A report submitted by police to the court after investigation — equivalent to a charge sheet. Also refers to a traffic fine slip.",
      d_ur:"تفتیش کے بعد پولیس کی طرف سے عدالت میں پیش کی جانے والی رپورٹ؛ اسے فردِ جرم کا چارج شیٹ بھی کہا جاتا ہے۔ ٹریفک جرمانے کی پرچی بھی چالان کہلاتی ہے۔"
    },
    {
      t:"Cognizable Offence",
      t_ur:"قابلِ دست اندازی جرم (Cognizable Offence)",
      d:"An offence for which police may arrest without a warrant and investigate without a Magistrate's order (e.g. murder, robbery).",
      d_ur:"ایسا جرم جس میں پولیس مجسٹریٹ کے وارنٹ کے بغیر ملزم کو گرفتار اور تفتیش کا آغاز کر سکتی ہے (مثلاً قتل، ڈکیتی)۔"
    },
    {
      t:"Complaint",
      t_ur:"استغاثہ / شکایت (Complaint)",
      d:"A formal allegation made before a Magistrate by a private person; distinct from an FIR filed at a police station.",
      d_ur:"کسی نجی شخص کی طرف سے مجسٹریٹ کے سامنے کی جانے والی باضابطہ شکایت؛ یہ تھانے میں درج ہونے والی ایف آئی آر سے الگ ہوتی ہے۔"
    },
    {
      t:"Decree",
      t_ur:"ڈگری (Decree)",
      d:"A formal order of a civil court expressing its adjudication — final, preliminary, or partly final.",
      d_ur:"دیوانی عدالت کا وہ حتمی تحریری فیصلہ جو فریقین کے حقوق کا حتمی تعین کرتا ہے۔"
    },
    {
      t:"Diyat",
      t_ur:"دیت (Diyat)",
      d:"Blood money payable to the heirs of a murder or injury victim under Islamic law; the amount is prescribed by the Federal Government annually.",
      d_ur:"قتل یا چوٹ پہنچانے کے نقصان کے عوض مقتول کے وارثین کو ادا کیا جانے والا خون بہا، جس کی رقم وفاقی حکومت سالانہ مقرر کرتی ہے۔"
    },
    {
      t:"EOBI",
      t_ur:"ای او بی آئی (EOBI)",
      d:"Employees' Old-Age Benefits Institution — provides pension, invalidity, and survivor benefits to industrial workers under EOBI Act 1976.",
      d_ur:"ایمپلائز اولڈ ایج بینیفٹس انسٹی ٹیوشن — جو صنعتی مزدوروں کو ریٹائرمنٹ پر پنشن، معذوری اور بیوگان کے وظائف فراہم کرتا ہے۔"
    },
    {
      t:"FIR",
      t_ur:"ایف آئی آر (FIR)",
      d:"First Information Report — the first written document registered at a police station when a cognizable offence is reported.",
      d_ur:"فرسٹ انفارمیشن رپورٹ — تھانے میں قابلِ دست اندازی جرم کی اطلاع ملنے پر درج کی جانے والی پہلی تحریری دستاویز۔"
    },
    {
      t:"Fard (Property Record)",
      t_ur:"فرد (Fard)",
      d:"The official land record document issued by the Revenue Department showing ownership, area, and nature of land.",
      d_ur:"محکمہ مال کا وہ سرکاری کاغذ جو زمین کی ملکیت، رقبہ اور اس کی نوعیت کو ظاہر کرتا ہے۔"
    },
    {
      t:"Guardianship",
      t_ur:"سرپرستی (Guardianship)",
      d:"Legal authority and responsibility over a minor's person or property, governed by the Guardians and Wards Act 1890.",
      d_ur:"نابالغ کی ذات یا اس کی جائیداد پر قانونی اختیار اور ذمہ داری، جو گارڈینز اینڈ وارڈز ایکٹ 1890 کے تحت آتی ہے۔"
    },
    {
      t:"Habeas Corpus",
      t_ur:"حبسِ بے جا (Habeas Corpus)",
      d:"A constitutional writ (Article 199) requiring a person under arrest or detention to be brought before a judge to determine if the detention is lawful.",
      d_ur:"آئینی رٹ (آرٹیکل 199) جس کے تحت کسی بھی غیر قانونی حراست میں رکھے گئے شخص کو عدالت کے روبرو پیش کرنے کا حکم دیا جاتا ہے۔"
    },
    {
      t:"Haq-Mehr",
      t_ur:"حق مہر (Haq-Mehr)",
      d:"Mandatory dower (financial gift) from husband to wife — a condition of valid Islamic marriage; the wife can claim it at any time.",
      d_ur:"نکاح کے وقت شوہر کی طرف سے بیوی کو دیا جانے والا لازمی مالی تحفہ، جس پر بیوی کا پورا حق ہوتا ہے۔"
    },
    {
      t:"Iddat",
      t_ur:"عدت (Iddat)",
      d:"The waiting period a woman must observe after divorce (90 days) or husband's death (4 months 10 days) before she can remarry.",
      d_ur:"طلاق (90 دن) یا شوہر کے انتقال (4 ماہ 10 دن) کے بعد عورت کے لیے دوسری شادی کرنے سے پہلے انتظار کرنے کی مخصوص مدت۔"
    },
    {
      t:"Injunction",
      t_ur:"حکم امتناعی / اسٹے (Injunction)",
      d:"A court order requiring a party to do or refrain from doing a specific act. Temporary injunctions freeze the status quo pending final decision.",
      d_ur:"عدالت کا وہ نوٹس جو کسی فریق کو کوئی مخصوص کام کرنے سے روکتا یا کرنے کا حکم دیتا ہے۔"
    },
    {
      t:"Khula",
      t_ur:"خلع (Khula)",
      d:"Judicial divorce initiated by the wife in Family Court, usually by returning the haq-mehr; the husband's consent is not required.",
      d_ur:"بیوی کی طرف سے فیملی کورٹ کے ذریعے طلاق حاصل کرنا، جس میں عام طور پر حق مہر واپس کرنا پڑتا ہے اور شوہر کی اجازت درکار نہیں ہوتی۔"
    },
    {
      t:"Locus Standi",
      t_ur:"حقِ دعویٰ (Locus Standi)",
      d:"The right or capacity to bring a case to court. A person must show a legal interest in the matter to be heard.",
      d_ur:"کسی معاملے کو عدالت میں لانے کا قانونی حق یا حیثیت۔ مدعی کو ثابت کرنا پڑتا ہے کہ اس کا معاملے میں کوئی قانونی مفاد وابستہ ہے۔"
    },
    {
      t:"Mandamus",
      t_ur:"حکم نامہ تعمیلی (Mandamus)",
      d:"A writ issued by a High Court directing a public authority or inferior court to perform a duty it is legally obligated to perform.",
      d_ur:"ہائی کورٹ کی طرف سے جاری کردہ وہ آئینی رٹ جو کسی سرکاری ادارے کو اپنا قانونی فریضہ انجام دینے کی ہدایت کرتی ہے۔"
    },
    {
      t:"Mutation (Intiqal)",
      t_ur:"انتقالِ جائیداد (Mutation)",
      d:"The transfer of property ownership records in the government land register from seller/deceased to buyer/heir, done through the Patwari.",
      d_ur:"پٹواری کے ذریعے سرکاری ریکارڈ میں جائیداد کی ملکیت بیچنے والے سے خریدار کے نام منتقل کرنے کا عمل۔"
    },
    {
      t:"Nikah-Nama",
      t_ur:"نکاح نامہ (Nikah-Nama)",
      d:"The official marriage contract document signed by both parties, the Nikah Registrar, and witnesses; legally required for a registered marriage.",
      d_ur:"شادی کا باضابطہ تحریری معاہدہ جس پر دولہا، دلہن، نکاح خواں اور گواہان دستخط کرتے ہیں۔"
    },
    {
      t:"Non-Cognizable Offence",
      t_ur:"ناقابلِ دست اندازی جرم (Non-Cognizable Offence)",
      d:"An offence for which police cannot arrest without a warrant (e.g. assault without grievous hurt, defamation). Requires a Magistrate's order to investigate.",
      d_ur:"ایسا جرم جس میں پولیس مجسٹریٹ کے وارنٹ کے بغیر گرفتار نہیں کر سکتی اور تفتیش کے لیے بھی عدالتی حکم درکار ہوتا ہے۔"
    },
    {
      t:"Parole",
      t_ur:"پیرول (Parole)",
      d:"Conditional early release of a prisoner before completion of sentence, subject to supervision and conditions.",
      d_ur:"سزا پوری ہونے سے پہلے قیدی کی مخصوص شرائط اور نگرانی کے تحت عارضی یا مشروط رہائی۔"
    },
    {
      t:"Plaint",
      t_ur:"عرضی دعویٰ (Plaint)",
      d:"The written statement of a plaintiff's claim filed in a civil court to initiate a lawsuit.",
      d_ur:"دیوانی عدالت میں مقدمہ شروع کرنے کے لیے مدعی کی طرف سے پیش کیا جانے والا تحریری دعویٰ۔"
    },
    {
      t:"Power of Attorney",
      t_ur:"مختار نامہ (Power of Attorney)",
      d:"A legal document authorizing one person (the attorney/agent) to act on behalf of another in specified legal or financial matters.",
      d_ur:"وہ قانونی دستاویز جس کے ذریعے ایک شخص دوسرے شخص کو اپنے مالی یا قانونی معاملات میں نمائندگی کا اختیار دیتا ہے۔"
    },
    {
      t:"Qatl-e-Amd",
      t_ur:"قتلِ عمد (Qatl-e-Amd)",
      d:"Intentional murder — Section 302 PPC. Punishable by death penalty or life imprisonment plus Diyat.",
      d_ur:"جان بوجھ کر کسی کو قتل کرنا (دفعہ 302 تعزیراتِ پاکستان)۔ اس کی سزا موت، عمر قید اور دیت ہے۔"
    },
    {
      t:"Qisas",
      t_ur:"قصاص (Qisas)",
      d:"Retributive punishment under Islamic law — the heirs of a murder victim have the right to demand equal retaliation (death) for the killer.",
      d_ur:"برابری کا بدلہ — اسلامی قانون کے تحت مقتول کے وارثین کو یہ حق حاصل ہے کہ وہ قاتل کو بھی اسی طرح سزائے موت دینے کا مطالبہ کریں۔"
    },
    {
      t:"Remand",
      t_ur:"ریمانڈ (Remand)",
      d:"An order sending an accused person back into custody (police or judicial) for further investigation or pending trial.",
      d_ur:"تفتیش یا ٹرائل کے دوران ملزم کو مزید تفتیش کے لیے پولیس یا جیل (جوڈیشل) کی تحویل میں دینے کا عدالتی حکم۔"
    },
    {
      t:"Suo Motu",
      t_ur:"از خود نوٹس (Suo Motu)",
      d:"Latin for 'on its own motion' — when a superior court (Supreme Court, High Court) takes action on its own initiative without a formal petition.",
      d_ur:"اعلیٰ عدالت (سپریم کورٹ یا ہائی کورٹ) کا کسی معاملے پر بغیر کسی درخواست کے خود سے کارروائی شروع کرنا۔"
    },
    {
      t:"Stay Order",
      t_ur:"اسٹے آرڈر (Stay Order)",
      d:"A court order temporarily suspending the operation of a lower court's judgment, administrative decision, or ongoing action pending appeal.",
      d_ur:"عدالت کا وہ عارضی حکم جو نچلی عدالت کے فیصلے یا کسی انتظامی کارروائی کو عارضی طور پر معطل رکھتا ہے۔"
    },
    {
      t:"Surety",
      t_ur:"ضامن (Surety)",
      d:"A person who provides a guarantee to the court that an accused on bail will appear for trial; liable to forfeit the bail amount if the accused absconds.",
      d_ur:"وہ شخص جو عدالت میں ملزم کی ضمانت لیتا ہے کہ وہ تاریخِ پیشی پر حاضر ہوگا؛ بصورتِ دیگر ضامن کی مچلکہ رقم ضبط ہو جاتی ہے۔"
    },
    {
      t:"Talaq",
      t_ur:"طلاق (Talaq)",
      d:"Islamic divorce pronounced by the husband. Under MFLO 1961, written notice must be sent to the Union Council Chairman — effective after 90-day iddat.",
      d_ur:"شوہر کی طرف سے رشتہ نکاح کا خاتمہ۔ قانوناً شوہر یونین کونسل کو نوٹس دینے کا پابند ہے اور طلاق 90 دن کے بعد نافذ ہوتی ہے۔"
    },
    {
      t:"Wakeel (Advocate)",
      t_ur:"وکیل (Wakeel)",
      d:"A licensed legal practitioner enrolled with a Bar Council, authorized to represent clients in court proceedings.",
      d_ur:"بار کونسل کا لائسنس یافتہ قانونی ماہر جو عدالت میں مؤکل کی نمائندگی کرنے کا مجاز ہوتا ہے۔"
    },
    {
      t:"Wasiyat (Will)",
      t_ur:"وصیت (Wasiyat)",
      d:"A testamentary document by a Muslim specifying distribution of estate. Cannot exceed one-third of the estate; non-heirs only.",
      d_ur:"مرنے والے کے بعد جائیداد کی تقسیم کے حوالے سے تحریر۔ کوئی بھی شخص اپنی جائیداد کے ایک تہائی سے زیادہ کی وصیت نہیں کر سکتا۔"
    },
    {
      t:"Writ",
      t_ur:"رٹ (Writ)",
      d:"A formal written order issued by a superior court (High Court/Supreme Court) directing an authority or person to act or refrain from acting.",
      d_ur:"ہائی کورٹ یا سپریم کورٹ کا جاری کردہ وہ باضابطہ حکم نامہ جو کسی اتھارٹی کو کوئی کام کرنے یا باز رہنے کا حکم دے۔"
    },
    {
      t:"Written Statement",
      t_ur:"جوابِ دعویٰ (Written Statement)",
      d:"The defendant's formal written reply to the plaintiff's plaint in a civil case, admitting or denying each allegation and raising defences.",
      d_ur:"سول مقدمے میں مدعا علیہ (ڈیفنڈنٹ) کی طرف سے پیش کیا جانے والا دعوے کا باضابطہ تحریری جواب۔"
    },
    {
      t:"Zina",
      t_ur:"زنا (Zina)",
      d:"Sexual intercourse outside of marriage, regulated under the Hudood Ordinances 1979 in Pakistan. Carries severe penalties; proof requirements are very strict.",
      d_ur:"بغیر شادی کے جنسی تعلقات، جو پاکستان میں حدود قوانین 1979 کے تحت جرم مانے جاتے ہیں؛ اس کے لیے ثبوت کے سخت ترین معیار ہیں۔"
    },
  ];

export const CORPUS_BACKED = ["PPC", "CRPC", "PECA 2016", "MFLO"];

export const PENALTY_LAWS = [
    {short:"PPC", short_ur:"تعزیراتِ پاکستان (PPC)", full:"Pakistan Penal Code 1860", full_ur:"تعزیراتِ پاکستان 1860", penalties:[
      {offence:"Murder (Qatl-e-Amd)", offence_ur:"قتلِ عمد", section:"302", punishment:"Death OR Life imprisonment + Diyat", punishment_ur:"سزائے موت یا عمر قید + دیت", sev:"high"},
      {offence:"Attempt to commit qatl-i-amd (attempted murder)", offence_ur:"اقدامِ قتل (قتل کی کوشش)", section:"324", punishment:"Up to 10 years imprisonment, or qisas-related liability if hurt is caused", punishment_ur:"10 سال تک قید، یا نقصان پہنچنے کی صورت میں قصاص سے متعلقہ ذمہ داری", sev:"high"},
      {offence:"Qatl shibh-i-amd (death without intent to kill)", offence_ur:"قتل شبہ عمد (بغیر ارادے کے موت)", section:"316", punishment:"Diyat, and up to 14 years imprisonment as ta'zir", punishment_ur:"دیت، اور تعزیر کے طور پر 14 سال تک قید", sev:"high"},
      {offence:"Rape", offence_ur:"زنا بالربر (زیادتی)", section:"375-376", punishment:"Death OR 10–25 years + fine", punishment_ur:"سزائے موت یا 10 سے 25 سال قید + جرمانہ", sev:"high"},
      {offence:"Robbery", offence_ur:"لوٹ مار (سرقہ بالجبر)", section:"392", punishment:"Up to 10 years + fine", punishment_ur:"10 سال تک قید + جرمانہ", sev:"high"},
      {offence:"Dacoity", offence_ur:"ڈکیتی (پانچ یا زائد افراد)", section:"395", punishment:"Life imprisonment OR up to 10 years + fine", punishment_ur:"عمر قید یا 10 سال تک قید + جرمانہ", sev:"high"},
      {offence:"Theft", offence_ur:"چوری", section:"379", punishment:"Up to 3 years + fine", punishment_ur:"3 سال تک قید + جرمانہ", sev:"medium"},
      {offence:"Cheating / Fraud", offence_ur:"دھوکہ دہی / فراڈ", section:"420", punishment:"Up to 7 years + fine", punishment_ur:"7 سال تک قید + جرمانہ", sev:"medium"},
      {offence:"Hurt (simple)", offence_ur:"عام چوٹ پہنچانا", section:"337A", punishment:"Up to 1 year OR fine (arsh)", punishment_ur:"1 سال تک قید یا ارش (تاوان)", sev:"medium"},
      {offence:"Grievous hurt", offence_ur:"شدید چوٹ پہنچانا", section:"337F", punishment:"Up to 14 years + daman", punishment_ur:"14 سال تک قید + ضمان", sev:"medium"},
      {offence:"Defamation", offence_ur:"ہتکِ عزت", section:"499-500", punishment:"Up to 2 years + fine", punishment_ur:"2 سال تک قید + جرمانہ", sev:"medium"},
      {offence:"Kidnapping", offence_ur:"اغوا", section:"363", punishment:"Up to 7 years + fine", punishment_ur:"7 سال تک قید + جرمانہ", sev:"high"},
      {offence:"Forgery", offence_ur:"جعلسازی", section:"468", punishment:"Up to 7 years + fine", punishment_ur:"7 سال تک قید + جرمانہ", sev:"medium"},
    ]},
    {short:"PECA 2016", short_ur:"سائبر ایکٹ (PECA)", full:"Prevention of Electronic Crimes Act 2016", full_ur:"سائبر جرائم کی روک تھام کا قانون 2016", penalties:[
      {offence:"Unauthorized access", offence_ur:"غیر مجاز رسائی (ہیکنگ)", section:"3", punishment:"Up to 3 months or PKR 50,000", punishment_ur:"3 ماہ تک قید یا 50,000 روپے جرمانہ", sev:"medium"},
      {offence:"Unauthorized access to critical infrastructure", offence_ur:"حساس انفراسٹرکچر تک غیر مجاز رسائی", section:"6", punishment:"Up to 3 years + PKR 1M", punishment_ur:"3 سال تک قید + 10 لاکھ روپے جرمانہ", sev:"high"},
      {offence:"Data damage / malware", offence_ur:"ڈیٹا کو نقصان / وائرس پھیلانا", section:"5", punishment:"Up to 3 years + PKR 1M", punishment_ur:"3 سال تک قید + 10 لاکھ روپے جرمانہ", sev:"medium"},
      {offence:"Online defamation", offence_ur:"آن لائن ہتکِ عزت", section:"20", punishment:"Up to 3 years + PKR 1M", punishment_ur:"3 سال تک قید + 10 لاکھ روپے جرمانہ", sev:"medium"},
      {offence:"Cyberstalking", offence_ur:"سائبر ہراسگی (تعاقب)", section:"24", punishment:"Up to 5 years + PKR 1M (1st offence); up to 7 years (repeat)", punishment_ur:"5 سال تک قید + 10 لاکھ روپے جرمانہ (پہلی بار)؛ 7 سال تک قید (دوبارہ)", sev:"high"},
      {offence:"Non-consensual intimate images", offence_ur:"بغیر رضامندی نجی تصاویر شیئر کرنا", section:"21", punishment:"Up to 5 years + PKR 5M", punishment_ur:"5 سال تک قید + 50 لاکھ روپے جرمانہ", sev:"high"},
      {offence:"Hate speech online", offence_ur:"آن لائن نفرت انگیز تقریر", section:"11", punishment:"Up to 7 years + fine", punishment_ur:"7 سال تک قید + جرمانہ", sev:"high"},
      {offence:"Terrorism-related cyber activity", offence_ur:"دہشت گردی سے متعلقہ آن لائن سرگرمی", section:"10", punishment:"Up to 7 years + fine", punishment_ur:"7 سال تک قید + جرمانہ", sev:"high"},
      {offence:"Child pornography", offence_ur:"بچوں کی نازیبا ویڈیوز/تصاویر", section:"22", punishment:"Up to 7 years + PKR 5M", punishment_ur:"7 سال تک قید + 50 لاکھ روپے جرمانہ", sev:"high"},
      {offence:"Spoofing / impersonation", offence_ur:"جعلی شناخت بنانا", section:"16-17", punishment:"Up to 3 years + PKR 500,000", punishment_ur:"3 سال تک قید + 5 لاکھ روپے جرمانہ", sev:"medium"},
    ]},
    {short:"Labour", short_ur:"لیبر قوانین", full:"Industrial Relations Act 2012 · Minimum Wages Ordinance 1961 · EOBI Act 1976", full_ur:"صنعتی تعلقات ایکٹ 2012 · کم از کم اجرت آرڈیننس 1961 · ای او بی آئی ایکٹ 1976", penalties:[
      {offence:"Unfair labour practice by an employer", offence_ur:"آجر کی طرف سے غیر منصفانہ رویہ", section:"31", punishment:"Fine, and liability before the Labour Court under the Industrial Relations Act 2012", punishment_ur:"لیبر کورٹ کے تحت جرمانہ اور کارروائی", sev:"medium"},
      {offence:"Paying below the notified minimum wage", offence_ur:"کم از کم اجرت سے کم ادائیگی", section:"9", punishment:"Prohibited by the Minimum Wages Ordinance 1961; offences taken up under s.10", punishment_ur:"کم از کم اجرت آرڈیننس 1961 کے تحت ممنوع", sev:"medium"},
      {offence:"Failure to register workers with EOBI", offence_ur:"ملازمین کو EOBI میں رجسٹر نہ کرنا", section:"37", punishment:"Penalty under the Employees' Old-Age Benefits Act 1976", punishment_ur:"ای او بی آئی ایکٹ 1976 کے تحت جرمانہ", sev:"medium"},
    ]},
    {short:"MFLO", short_ur:"عائلی قوانین (MFLO)", full:"Muslim Family Laws Ordinance 1961", full_ur:"مسلم عائلی قوانین آرڈیننس 1961", penalties:[
      {offence:"Talaq without Union Council notice", offence_ur:"یونین کونسل کو نوٹس دیے بغیر طلاق", section:"7", punishment:"Up to 1 year OR PKR 5,000 OR both", punishment_ur:"1 سال تک قید یا 5,000 روپے جرمانہ یا دونوں", sev:"medium"},
      {offence:"Second marriage without first wife's consent", offence_ur:"پہلی بیوی کی اجازت کے بغیر دوسری شادی", section:"6", punishment:"Up to 1 year + PKR 5,000 + payment of mehr", punishment_ur:"1 سال تک قید + 5,000 روپے جرمانہ + مہر کی فوری ادائیگی", sev:"high"},
      {offence:"Failure to maintain wife / children", offence_ur:"بیوی یا بچوں کا خرچہ نان نفقہ نہ دینا", section:"9", punishment:"Court attachment of property; also criminal contempt", punishment_ur:"جائیداد کی قرقی؛ اور توہینِ عدالت کے تحت گرفتاری", sev:"medium"},
    ]},
    {short:"NAB", short_ur:"احتساب قانون (NAB)", full:"National Accountability Ordinance 1999", full_ur:"قومی احتساب آرڈیننس 1999", penalties:[
      {offence:"Corruption (bribery / misuse of power)", offence_ur:"بدعنوانی (رشوت / اختیارات کا ناجائز استعمال)", section:"9(a)(i–xii)", punishment:"Up to 14 years + disgorgement of assets", punishment_ur:"14 سال تک قید + اثاثوں کی ضبطگی", sev:"high"},
      {offence:"Assets beyond known income sources", offence_ur:"آمدن سے زائد اثاثے رکھنا", section:"9(a)(v)", punishment:"Up to 14 years + confiscation", punishment_ur:"14 سال تک قید + ضبطگی", sev:"high"},
      {offence:"Cheating (s.415 PPC) to dishonestly induce delivery of property", offence_ur:"بدنیتی سے دھوکہ دہی کر کے جائیداد حاصل کرنا", section:"9(a)(ix)", punishment:"Up to 14 years, fine, and forfeiture of property (NAB Ordinance 1999)", punishment_ur:"14 سال تک قید، جرمانہ اور جائیداد کی ضبطگی", sev:"high"},
      {offence:"Aiding, abetting or conspiring in corruption", offence_ur:"بدعنوانی میں معاونت یا سازش کرنا", section:"9(a)(xii)", punishment:"Up to 14 years, fine, and forfeiture of property (NAB Ordinance 1999)", punishment_ur:"14 سال تک قید، جرمانہ اور جائیداد کی ضبطگی", sev:"high"},
    ]},
  ];
