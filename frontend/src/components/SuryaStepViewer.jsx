import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Wind,
  Layers,
  Activity,
  Eye,
  Zap,
  Flame,
  AlertCircle,
  HelpCircle,
  Volume2
} from "lucide-react";

export const SURYA_STEPS = [
  {
    stepNumber: 1,
    id: "pranamasana",
    name_hi: "प्रणामासन",
    name_en: "Pranamasana (Prayer Pose)",
    mantra: "ॐ मित्राय नमः",
    mantra_translit: "Om Mitrāya Namaḥ",
    mantra_meaning: "समस्त सृष्टि के सच्चे मित्र को प्रणाम (Salutations to the friend of all beings).",
    drishti: "भ्रूमध्ये / नासाग्र (Eyebrow center or straight ahead)",
    chakra: "अनाहत चक्र (Anahata / Heart Chakra)",
    breath: "सामान्य सांस (Normal / Exhale)",
    breathType: "normal",
    cue: "सीधे खड़े हों, रीढ़ को लंबा रखें। दोनों हथेलियों को छाती के केंद्र पर अंजलि मुद्रा (Prayer Pose) में जोड़ें। कंधे ढीले रखें।",
    alignmentTips: [
      "दोनों पैरों को पास या हिप-चौड़ाई पर रखें, वजन दोनों पंजों पर बराबर रखें।",
      "रीढ़ (Spine) को बिल्कुल सीधा रखें, कंधे नीचे और ढीले हों।",
      "हथेलियों को छाती के बीच (हार्ट चक्र) पर हल्के से जोड़ें, कोहनी सामान्य रखें।",
      "ठुड्डी फर्श के समानांतर और चेहरे की मांसपेशियां शांत हों।"
    ],
    commonMistakes: [
      "कंधों को कानों की तरफ सिकोड़ना — कंधों को पीछे और नीचे की ओर ढीला छोड़ें।",
      "कमर (Lower back) को बहुत ज्यादा अंदर की तरफ दबाना — पेट की कोर को हल्का सक्रिय रखें।",
      "कोहनियों को बहुत ऊंचा उठाना या हथेलियों को अत्यधिक दबाना।"
    ],
    targetMuscles: "Core, Postural Spine, Calves, Pelvic Balance",
    image: "/surya/step1.svg",
  },
  {
    stepNumber: 2,
    id: "hasta_uttanasana",
    name_hi: "हस्त उत्तानासन",
    name_en: "Hasta Uttanasana (Raised Arms)",
    mantra: "ॐ रवये नमः",
    mantra_translit: "Om Ravaye Namaḥ",
    mantra_meaning: "तेजस्वी और प्रकाशमान शक्ति को नमन (Salutations to the shining one).",
    drishti: "हस्ताग्र (Hastagra - Upward toward thumbs)",
    chakra: "विशुद्धि चक्र (Vishuddha / Throat Chakra)",
    breath: "गहरी सांस अंदर लें (Deep Inhale)",
    breathType: "inhale",
    cue: "गहरी सांस लेते हुए दोनों भुजाओं को सिर के ऊपर उठाएं। पसलियों को ऊपर खींचते हुए ऊपरी पीठ से हल्का बैकबेंड करें।",
    alignmentTips: [
      "पेल्विस और कूल्हों को हल्का सा आगे पुश करें, रीढ़ को पहले ऊपर खींचें।",
      "बांहें कानों के समानांतर रहें और छाती को छत की ओर खोलें।",
      "गर्दन पर तनाव न दें; सिर को भुजाओं के स्वाभाविक संरेखण में रखें।",
      "पैरों के चारों कोनों से जमीन पर दृढ़ पकड़ बनाए रखें।"
    ],
    commonMistakes: [
      "कमर के निचले हिस्से (Lumbar) से जबरन झुकना — पहले ऊपर खिंचाव लें, फिर ऊपरी पीठ मोड़ें।",
      "घुटनों को बहुत ज्यादा मोड़ना या हाइपर-एक्सटेंड करना।",
      "हाथों को पीछे गिराना जबकि छाती सपाट ही रह जाए।"
    ],
    targetMuscles: "Abdominals, Chest, Shoulders, Spinal Extensors",
    image: "/surya/step2.svg",
  },
  {
    stepNumber: 3,
    id: "padahastasana",
    name_hi: "पादहस्तासन",
    name_en: "Padahastasana (Forward Fold)",
    mantra: "ॐ सूर्याय नमः",
    mantra_translit: "Om Sūryāya Namaḥ",
    mantra_meaning: "सक्रियता और जीवन को प्रेरित करने वाले सूर्य को नमन (Salutations to the life inspirer).",
    drishti: "नासाग्र / पिंडली (Nasagra - Shin / Nose tip)",
    chakra: "स्वाधिष्ठान चक्र (Swadhisthana / Sacral Chakra)",
    breath: "पूरी सांस बाहर छोड़ें (Full Exhale)",
    breathType: "exhale",
    cue: "सांस छोड़ते हुए कमर के बजाय सीधे हिप जॉइंट से आगे झुकें। हथेलियों को पैरों के दोनों तरफ या पिंडलियों पर रखें। घुटने हल्के मुड़ सकते हैं।",
    alignmentTips: [
      "हिप्स से झुकें (Hips hinge); रीढ़ को यथासंभव लंबा और सीधा रखें।",
      "यदि हैमस्ट्रिंग्स टाइट हों, तो घुटनों को थोड़ा मोड़कर रखना पूरी तरह सही है!",
      "हथेलियां या उंगलियां पंजों के पास फर्श पर या पिंडलियों पर आराम से टिकाएं।",
      "गर्दन और सिर को पूरी तरह ढीला और गुरुत्वाकर्षण के हवाले छोड़ दें।"
    ],
    commonMistakes: [
      "जबरन जमीन छूने के लिए पीठ को कूबड़ की तरह गोल करना — घुटने मोड़ना अधिक सुरक्षित है।",
      "घुटनों को पीछे की ओर लॉक करना, जिससे हैमस्ट्रिंग पर अनुचित खिंचाव आता है।",
      "गर्दन को ऊपर उठाकर तनाव में रखना — सिर को नीचे लटकने दें।"
    ],
    targetMuscles: "Hamstrings, Calves, Lower Back, Glutes",
    image: "/surya/step3.svg",
  },
  {
    stepNumber: 4,
    id: "ashwa_sanchalanasana_right",
    name_hi: "अश्व संचालनासन (दायां पैर पीछे)",
    name_en: "Ashwa Sanchalanasana (Equestrian Pose)",
    mantra: "ॐ भानवे नमः",
    mantra_translit: "Om Bhānave Namaḥ",
    mantra_meaning: "दिशाओं को प्रकाशित करने वाले को नमन (Salutations to the illuminator).",
    drishti: "भ्रूमध्ये (Bhrumadhya - Eyebrow center / Gently upward)",
    chakra: "आज्ञा चक्र (Ajna / Third Eye Chakra)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "सांस लेते हुए दायां पैर पीछे ले जाएं, दायां घुटना जमीन पर रखें। बायां घुटना टखने के ठीक ऊपर 90° पर रखें और छाती ऊपर उठाएं।",
    alignmentTips: [
      "आगे वाला घुटना टखने (Ankle) के ठीक ऊपर 90° संरेखण में हो, पंजे से आगे न जाए।",
      "पीछे वाले पैर का घुटना और पैर का ऊपरी भाग जमीन पर टिका रहे।",
      "हिप्स को नीचे और आगे की ओर दबने दें ताकि हिप फ्लेक्सर अच्छे से स्ट्रेच हो।",
      "छाती को चौड़ा करते हुए सामने या थोड़ा ऊपर की ओर देखें।"
    ],
    commonMistakes: [
      "आगे का घुटना पैर की उंगलियों से बहुत आगे निकलना (घुटने पर दबाव) — पैर को आगे खिसकाएं।",
      "छाती को जांघ पर गिरा देना — पसलियों को उठाकर सीना खोलें।",
      "कूल्हों का तिरछा होना — दोनों कूल्हों को आगे की ओर चौकोर (Square) रखें।"
    ],
    targetMuscles: "Hip Flexors, Quadriceps, Psoas, Chest, Hamstrings",
    image: "/surya/step4.svg",
  },
  {
    stepNumber: 5,
    id: "dandasana",
    name_hi: "दंडासन (प्लैंक पोज़)",
    name_en: "Dandasana (Plank / Stick Pose)",
    mantra: "ॐ खगाय नमः",
    mantra_translit: "Om Khagāya Namaḥ",
    mantra_meaning: "आकाश में निर्बाध गतिमान सूर्य को नमन (Salutations to the cosmic wanderer).",
    drishti: "नासाग्र (Nasagra - Floor 1-2 feet ahead)",
    chakra: "विशुद्धि / मणिपुर चक्र (Vishuddha / Manipura)",
    breath: "सांस रोकें या सामान्य धीमी सांस (Retain / Normal)",
    breathType: "retain",
    cue: "आगे वाले पैर को भी पीछे ले जाएं। शरीर को सिर से एड़ी तक एक सीधी रेखा (Straight Plank) में रखें। कोर को सक्रिय रखें।",
    alignmentTips: [
      "कंधे कलाइयों के ऊपर हों; कोहनियों का हल्का बेंड और हिप-लाइन में ~65° तक का लचीलापन मान्य है।",
      "हिप्स और रीढ़ को आरामदायक स्थिति में संतुलित रखें।",
      "नाभि को रीढ़ की तरफ खींचते हुए कोर और नितंबों (Glutes) को टाइट रखें।",
      "कंधों के ब्लेड्स के बीच की जगह को फर्श को धक्का देकर चौड़ा करें।"
    ],
    commonMistakes: [
      "कूल्हों का नीचे लटक जाना (कमर में दर्द का कारण) — पेट की कोर टाइट करें।",
      "समय से पहले कूल्हों को बहुत ऊंचा उठा लेना।",
      "गर्दन को नीचे गिराना या पंजों की तरफ देखना — फर्श पर आगे देखें।"
    ],
    targetMuscles: "Full Core, Deltoids, Triceps, Quads, Serratus Anterior",
    image: "/surya/step5.svg",
  },
  {
    stepNumber: 6,
    id: "ashtanga_namaskara",
    name_hi: "अष्टांग नमस्कार (8 अंग जमीन पर)",
    name_en: "Ashtanga Namaskara (Salute with 8 Limbs)",
    mantra: "ॐ पूष्णे नमः",
    mantra_translit: "Om Pūṣṇe Namaḥ",
    mantra_meaning: "शक्ति और पोषण देने वाले पोषक को नमन (Salutations to the nourisher).",
    drishti: "नासाग्र (Nasagra - Floor / Tip of nose)",
    chakra: "मणिपुर चक्र (Manipura / Solar Plexus Chakra)",
    breath: "सांस पूरी बाहर छोड़ें (Exhale & Pause)",
    breathType: "exhale",
    cue: "सांस छोड़ते हुए 8 अंग जमीन पर लगाएं: दो पंजे, दो घुटने, दो हथेलियां, छाती और ठुड्डी। कूल्हे थोड़े ऊपर उठे रहें।",
    alignmentTips: [
      "पहले घुटने जमीन पर लगाएं, फिर छाती और ठुड्डी को दोनों हथेलियों के बीच लाएं।",
      "कूल्हों और पेट को जमीन से थोड़ा ऊपर उठा कर रखें।",
      "कोहनियों को पसलियों के पास सटाकर रखें, बाहर की तरफ न फैलाएं।",
      "आठों संपर्क बिंदु जमीन पर हल्के से संतुलित हों।"
    ],
    commonMistakes: [
      "पेट को पूरी तरह जमीन पर सपाट गिरा देना — कूल्हों को थोड़ा ऊंचा रखें।",
      "कोहनियों को बाहर फैलाना — कोहनियों को पसलियों के पास सटाकर रखें।",
      "छाती के बजाय माथा जमीन पर लगाना।"
    ],
    targetMuscles: "Triceps, Chest, Upper Back, Core, Neck stabilizers",
    image: "/surya/step6.svg",
  },
  {
    stepNumber: 7,
    id: "bhujangasana",
    name_hi: "भुजंगासन (कोबरा पोज़)",
    name_en: "Bhujangasana (Cobra Pose)",
    mantra: "ॐ हिरण्यगर्भाय नमः",
    mantra_translit: "Om Hiraṇyagarbhāya Namaḥ",
    mantra_meaning: "स्वर्ण ब्रह्मांडीय ऊर्जा के स्रोत को नमन (Salutations to the golden cosmic self).",
    drishti: "भ्रूमध्ये (Bhrumadhya - Eyebrow center / Upward)",
    chakra: "स्वाधिष्ठान चक्र (Swadhisthana / Sacral Chakra)",
    breath: "गहरी सांस अंदर लें (Deep Inhale)",
    breathType: "inhale",
    cue: "आगे की ओर फिसलते हुए छाती और सिर को उठाएं। कोहनियां हल्की मुड़ी और शरीर से सटी रहें। कंधों को कानों से दूर रखें।",
    alignmentTips: [
      "पैरों के पंजों और प्यूबिक बोन को फर्श पर मजबूती से दबाएं।",
      "हाथों पर पूरा वजन डालने के बजाय पीठ की मांसपेशियों से सीना उठाएं।",
      "कोहनियां हल्की मुड़ी रहें और पसलियों के साथ चिपकी रहें।",
      "कंधों को पीछे और नीचे रोल करें, कॉलरबोन को चौड़ा रखें।"
    ],
    commonMistakes: [
      "हाथों को सीधा करके कंधों को कानों में सिकोड़ना।",
      "पीठ के निचले हिस्से को अत्यधिक दबाना बिना कोर सपोर्ट के।",
      "जांघों और कूल्हों को फर्श से ऊंचा उठाना (वह ऊर्ध्वमुख श्वानासन है, भुजंगासन नहीं)।"
    ],
    targetMuscles: "Spinal Extensors, Glutes, Chest, Shoulders",
    image: "/surya/step7.svg",
  },
  {
    stepNumber: 8,
    id: "adho_mukha_svanasana",
    name_hi: "अधोमुख श्वानासन (डाउनवर्ड डॉग)",
    name_en: "Adho Mukha Svanasana (Downward Dog)",
    mantra: "ॐ मरीचये नमः",
    mantra_translit: "Om Marīcaye Namaḥ",
    mantra_meaning: "उषा की सुनहरी किरणों को नमन (Salutations to the rays of dawn).",
    drishti: "नाभि (Nabhi - Navel center)",
    chakra: "विशुद्धि चक्र (Vishuddha / Throat Chakra)",
    breath: "सांस पूरी बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "सांस छोड़ते हुए कूल्हों को ऊपर और पीछे की ओर धकेलें। शरीर से उल्टा 'V' आकार बनाएं। रीढ़ को लंबा रखने पर ध्यान दें।",
    alignmentTips: [
      "पंजों की उंगलियों को अंदर मोड़ें और कूल्हों को आसमान की ओर उठाएं।",
      "हथेलियों को मजबूती से फैलाकर दबाएं, कलाइयों पर वजन कम रखें।",
      "यदि हैमस्ट्रिंग टाइट हों तो घुटनों को हल्का मोड़ें, मुख्य लक्ष्य रीढ़ को सीधा रखना है।",
      "सिर को भुजाओं के बीच आराम से छोड़ें और नाभि की ओर दृष्टि रखें।"
    ],
    commonMistakes: [
      "एड़ियों को जमीन पर सटाने के चक्कर में पीठ को गोल कर लेना — घुटने मोड़ना बेहतर है! ",
      "कलाइयों पर पूरा वजन गिरा देना — उंगलियों के पोरों से फर्श को दबाएं।",
      "कंधों को गर्दन की तरफ भींचना — कंधों को बाहर की ओर घुमाएं।"
    ],
    targetMuscles: "Hamstrings, Calves, Lats, Shoulders, Spine",
    image: "/surya/step8.svg",
  },
  {
    stepNumber: 9,
    id: "ashwa_sanchalanasana_left",
    name_hi: "अश्व संचालनासन (बायां पैर आगे)",
    name_en: "Ashwa Sanchalanasana (Left Leg Forward)",
    mantra: "ॐ आदित्याय नमः",
    mantra_translit: "Om Ādityāya Namaḥ",
    mantra_meaning: "अदिति के दिव्य पुत्र को नमन (Salutations to the cosmic child of Aditi).",
    drishti: "भ्रूमध्ये (Bhrumadhya - Eyebrow center)",
    chakra: "आज्ञा चक्र (Ajna / Third Eye Chakra)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "सांस लेते हुए बायां पैर (विपरीत पैर) दोनों हाथों के बीच आगे लाएं। दायां घुटना जमीन पर रखें, छाती खोलकर सामने देखें।",
    alignmentTips: [
      "आगे वाला बायां पैर दोनों हथेलियों के बीच में आए, घुटना टखने के ऊपर 90° पर हो।",
      "पीछे का दायां घुटना और पंजा फर्श पर आराम से रहे।",
      "कूल्हों को नीचे की ओर आराम से डूबने दें।",
      "सीना खोलते हुए रीढ़ और गर्दन को लंबा करें।"
    ],
    commonMistakes: [
      "पैर दोनों हाथों के पीछे ही अटक जाना — जरूरत हो तो हाथ से पैर को आगे लाएं।",
      "कूल्हों का टेढ़ा हो जाना — दोनों कूल्हों को समानांतर रखें।",
      "गर्दन को बहुत जोर से पीछे झटका देना।"
    ],
    targetMuscles: "Hip Flexors, Quadriceps, Pelvic Floor, Spine",
    image: "/surya/step9.svg",
  },
  {
    stepNumber: 10,
    id: "padahastasana_return",
    name_hi: "पादहस्तासन (वापसी)",
    name_en: "Padahastasana (Forward Fold Return)",
    mantra: "ॐ सवित्रे नमः",
    mantra_translit: "Om Savitre Namaḥ",
    mantra_meaning: "सृजनकर्ता और ऊर्जादाता को नमन (Salutations to the benevolent creator).",
    drishti: "नासाग्र / घुटने (Nasagra - Shin / Knee)",
    chakra: "स्वाधिष्ठान चक्र (Swadhisthana / Sacral Chakra)",
    breath: "सांस बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "पीछे वाले पैर को आगे लाएं। सांस छोड़ते हुए कूल्हों से आगे झुकें, धड़ को जांघों के करीब लाएं। घुटने हल्के मुड़े रख सकते हैं।",
    alignmentTips: [
      "दोनों पैरों को साथ या हिप-चौड़ाई पर रखें।",
      "कमर के बजाय कूल्हे के जोड़ों (Hips) से झुकें।",
      "हैमस्ट्रिंग्स की सुरक्षा के लिए घुटनों को हल्का लचीला रखें।",
      "सिर, गर्दन और बाहों को पूरी तरह गुरुत्वाकर्षण के साथ ढीला छोड़ें।"
    ],
    commonMistakes: [
      "घुटनों को पूरी तरह लॉक करके पीठ पर अत्यधिक दबाव डालना।",
      "हाथों से टखनों को जबरन खींचना।"
    ],
    targetMuscles: "Hamstrings, Calves, Lower Back, Neck",
    image: "/surya/step10.svg",
  },
  {
    stepNumber: 11,
    id: "hasta_uttanasana_return",
    name_hi: "हस्त उत्तानासन (वापसी)",
    name_en: "Hasta Uttanasana (Raised Arms Return)",
    mantra: "ॐ अर्काय नमः",
    mantra_translit: "Om Arkāya Namaḥ",
    mantra_meaning: "प्रशंसा और वंदना के योग्य सूर्य को नमन (Salutations to the one worthy of praise).",
    drishti: "हस्ताग्र (Hastagra - Upward toward thumbs)",
    chakra: "विशुद्धि चक्र (Vishuddha / Throat Chakra)",
    breath: "गहरी सांस अंदर लें (Deep Inhale)",
    breathType: "inhale",
    cue: "सांस लेते हुए रीढ़ को खोलते हुए सीधे ऊपर उठें। बाहों को सिर के ऊपर खींचते हुए हल्का सा बैकबेंड करें।",
    alignmentTips: [
      "कोर को सक्रिय रखते हुए धीरे-धीरे सीधे खड़े हों।",
      "बाहों को ऊपर और हल्का पीछे खींचें, बाइसेप्स कानों के पास हों।",
      "ऊपरी पीठ से खिंचाव लें, पेल्विस को हल्का आगे रखें।",
      "फेफड़ों में ताजगी से भरी गहरी सांस लें।"
    ],
    commonMistakes: [
      "गोल पीठ के साथ झटके से खड़े होना, जिससे चक्कर आ सकते हैं।",
      "बिना पेट की सुरक्षा के केवल निचली कमर को मोड़ना।"
    ],
    targetMuscles: "Spinal Extensors, Chest, Shoulders, Core",
    image: "/surya/step11.svg",
  },
  {
    stepNumber: 12,
    id: "pranamasana_end",
    name_hi: "प्रणामासन (समापन)",
    name_en: "Pranamasana (Prayer Pose Return)",
    mantra: "ॐ भास्कराय नमः",
    mantra_translit: "Om Bhāskarāya Namaḥ",
    mantra_meaning: "संसार को आलोकित करने वाले को नमन (Salutations to the cosmic illuminator).",
    drishti: "नासाग्र / शांत दृष्टि (Tip of nose / Centered stillness)",
    chakra: "अनाहत चक्र (Anahata / Heart Chakra)",
    breath: "सांस बाहर छोड़ें (Exhale & Relax)",
    breathType: "exhale",
    cue: "सांस छोड़ते हुए हथेलियों को छाती के बीच प्रार्थना मुद्रा में वापस लाएं। शांत खड़े रहकर सांस को सामान्य होने दें। एक चक्र पूर्ण!",
    alignmentTips: [
      "हथेलियां छाती के केंद्र पर अंजलि मुद्रा में वापस आएं।",
      "रीढ़ सीधी, कंधे ढीले और दोनों पैरों पर संतुलित वजन रहे।",
      "2-3 गहरी और सामान्य सांसें लेकर ऊर्जा को महसूस करें।",
      "एक चक्र संपन्न हुआ, अगले राउंड के लिए शरीर को तैयार करें।"
    ],
    commonMistakes: [
      "आसन समाप्त होते ही शरीर को तुरंत ढीला छोड़ देना — 2 सेकंड स्थिरता बनाए रखें।",
      "सांस की लय भूल जाना।"
    ],
    targetMuscles: "Whole Body Balance, Postural Core, Mental Stillness",
    image: "/surya/step12.svg",
  },
];

export default function SuryaStepViewer({
  activeStepNumber = 1,
  detectedPoseName = "",
  poseQuality = 0,
  voicePrompt = "",
  className = "",
  onSkipStep = null,
}) {
  const [selectedStep, setSelectedStep] = useState(activeStepNumber || 1);
  const [autoSync, setAutoSync] = useState(true);
  const [activeTab, setActiveTab] = useState("alignment"); // "alignment" | "mantra" | "mistakes"

  // Auto-sync viewed step with AI-detected step unless user manually overrode it
  useEffect(() => {
    if (activeStepNumber && autoSync) {
      setSelectedStep(activeStepNumber);
    }
  }, [activeStepNumber, autoSync]);

  const currentStepData =
    SURYA_STEPS.find((s) => s.stepNumber === selectedStep) || SURYA_STEPS[0];

  const isLiveStep = selectedStep === activeStepNumber;

  const handlePrev = () => {
    setAutoSync(false);
    setSelectedStep((prev) => (prev > 1 ? prev - 1 : 12));
  };

  const handleNext = () => {
    setAutoSync(false);
    setSelectedStep((prev) => (prev < 12 ? prev + 1 : 1));
  };

  const handleSelectStep = (num) => {
    setAutoSync(num === activeStepNumber);
    setSelectedStep(num);
  };

  const handleResumeSync = () => {
    setAutoSync(true);
    if (activeStepNumber) {
      setSelectedStep(activeStepNumber);
    }
  };

  // Breath styling
  const getBreathBadge = (type) => {
    switch (type) {
      case "inhale":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "exhale":
        return "bg-cyan-50 text-cyan-800 border-cyan-300";
      case "retain":
        return "bg-amber-50 text-amber-900 border-amber-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div
      className={`flex flex-col rounded-3xl border border-slate-200/90 bg-white/95 shadow-md backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Header with Step indicator and AutoSync toggle */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-black shadow-2xs">
            <Flame size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                सूर्य नमस्कार पूर्ण गाइड
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                12 चरण
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-500">
              चरण {selectedStep} / 12 • {currentStepData.name_en.split(" ")[0]}
            </p>
          </div>
        </div>

        {/* Sync Indicator / Button */}
        {autoSync ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI ऑटो-सिंक
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResumeSync}
            className="flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-[10px] font-bold text-cyan-700 hover:bg-cyan-100 transition shadow-2xs"
            title="लाइव AI डिटेक्शन से पुनः सिंक करें"
          >
            <RefreshCw size={11} className="text-cyan-600" />
            AI सिंक करें
          </button>
        )}
      </div>

      {/* Progress Bar (1-12) */}
      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-300"
          style={{ width: `${(selectedStep / 12) * 100}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
        {/* Step Image Card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/40 via-white to-slate-50/60 p-2 shadow-2xs group">
          {/* Active Live AI Tracking Ribbon */}
          {isLiveStep && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE ACTIVE
            </div>
          )}

          {/* Large Illustrated Step Vector Image */}
          <div className="w-full aspect-[4/3] max-h-52 sm:max-h-56 flex items-center justify-center overflow-hidden rounded-xl bg-white">
            <img
              src={currentStepData.image}
              alt={currentStepData.name_en}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="eager"
            />
          </div>

          {/* Floating Badges (Breath & Drishti) */}
          <div className="mt-2 flex items-center justify-between gap-1.5 px-1 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-black shadow-2xs ${getBreathBadge(
                currentStepData.breathType
              )}`}
            >
              <Wind size={13} />
              {currentStepData.breath}
            </span>

            <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/80 px-2 py-1 text-[10px] font-bold text-indigo-800">
              <Eye size={12} className="text-indigo-600" />
              दृष्टि: {currentStepData.drishti.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Step Title & Sanskrit Mantra Banner */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStepData.name_hi}
            </h4>
            <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
              #{currentStepData.stepNumber}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-600">
            {currentStepData.name_en}
          </p>

          {/* Authentic Vedic Mantra Highlight */}
          <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black text-amber-900 font-serif tracking-wide">
                {currentStepData.mantra}
              </p>
              <p className="text-[10px] font-bold text-amber-700 italic">
                {currentStepData.mantra_translit}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[9px] font-black text-amber-900">
                {currentStepData.chakra.split(" ")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Actionable Cue in Hindi / Hinglish */}
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-800 mb-1">
            <Zap size={12} className="text-cyan-600" />
            पोस्चर निर्देश (Technique Cue):
          </div>
          <p className="text-xs font-bold text-slate-800 leading-relaxed">
            {currentStepData.cue}
          </p>
        </div>

        {/* Interactive Tab Navigation */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("alignment")}
            className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === "alignment"
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 size={12} className="text-emerald-600" />
            अलाइनमेंट
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mantra")}
            className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === "mantra"
                ? "bg-white text-amber-900 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Flame size={12} className="text-amber-600" />
            मंत्र व श्वास
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mistakes")}
            className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 ${
              activeTab === "mistakes"
                ? "bg-white text-rose-900 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertCircle size={12} className="text-rose-600" />
            गलतियां
          </button>
        </div>

        {/* Tab 1: Anatomical Alignment Checklist */}
        {activeTab === "alignment" && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              सटीक अलाइनमेंट चेकपॉइंट्स (Key Alignment):
            </p>
            <ul className="space-y-1.5">
              {currentStepData.alignmentTips.map((tip, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 font-medium leading-snug bg-slate-50/60 p-2 rounded-xl border border-slate-100"
                >
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-emerald-600 mt-0.5"
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab 2: Vedic Mantra, Breathing & Chakra Energy */}
        {activeTab === "mantra" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                वैदिक सूर्य मंत्र (Vedic Surya Mantra):
              </span>
              <p className="text-base font-black text-amber-950 font-serif">
                {currentStepData.mantra}
              </p>
              <p className="text-xs font-bold text-amber-800 italic">
                {currentStepData.mantra_translit}
              </p>
              <p className="text-xs text-slate-700 font-medium pt-1 border-t border-amber-200/60">
                <span className="font-bold text-slate-900">अर्थ:</span> {currentStepData.mantra_meaning}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
                <p className="text-[10px] font-black text-indigo-700 uppercase">दृष्टि (Drishti / Gaze)</p>
                <p className="font-bold text-slate-800 mt-0.5">{currentStepData.drishti}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-2.5">
                <p className="text-[10px] font-black text-rose-700 uppercase">ऊर्जा केंद्र (Chakra)</p>
                <p className="font-bold text-slate-800 mt-0.5">{currentStepData.chakra}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Common Mistakes to Avoid */}
        {activeTab === "mistakes" && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
              सामान्य गलतियां और उनका सुधार (Mistakes & Fixes):
            </p>
            <ul className="space-y-1.5">
              {currentStepData.commonMistakes?.map((mistake, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 font-medium leading-snug bg-rose-50/50 p-2.5 rounded-xl border border-rose-100"
                >
                  <AlertCircle
                    size={15}
                    className="shrink-0 text-rose-600 mt-0.5"
                  />
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Target Muscles */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400">
            मांसपेशियां:
          </span>
          <span className="text-xs font-semibold text-slate-600 truncate">
            {currentStepData.targetMuscles}
          </span>
        </div>
      </div>

      {/* Footer Navigation Bar & 12-Step Strip */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 p-2.5 sm:p-3 space-y-2">
        {/* Next / Prev / Skip Controls */}
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            title="पिछला आसन"
          >
            <ChevronLeft size={14} />
            <span>पिछला</span>
          </button>

          {onSkipStep && (
            <button
              type="button"
              onClick={onSkipStep}
              className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition shadow-2xs"
              title="वर्तमान आसन को स्किप करें और तुरंत अगले आसन पर जाएं"
            >
              <span>स्किप आसन</span>
              <ChevronRight size={13} className="text-amber-700" />
            </button>
          )}

          <span className="font-mono text-xs font-black text-slate-800">
            {selectedStep} / 12
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            title="अगला आसन"
          >
            <span>अगला</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 12-Step Quick-Jump Thumbnail Strip */}
        <div className="grid grid-cols-6 gap-1 pt-1">
          {SURYA_STEPS.map((step) => {
            const isCurrent = selectedStep === step.stepNumber;
            const isLive = activeStepNumber === step.stepNumber;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => handleSelectStep(step.stepNumber)}
                className={`relative flex flex-col items-center justify-center rounded-lg p-1 text-[10px] font-black transition ${
                  isCurrent
                    ? "bg-amber-500 text-white shadow-2xs ring-2 ring-amber-300"
                    : isLive
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title={`${step.stepNumber}. ${step.name_hi} (${step.name_en})`}
              >
                <span>{step.stepNumber}</span>
                {isLive && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
