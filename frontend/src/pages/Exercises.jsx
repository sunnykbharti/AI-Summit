import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Play,
  Search,
  Sparkles,
  StretchHorizontal,
  Target,
  Wind,
  X,
  Zap,
} from "lucide-react";

export const exercises = [
  {
    id: 0,
    name: "Study & Interview Posture Guard (स्टडी व इंटरव्यू पोस्चर गार्ड)",
    category: "Ergonomics",
    difficulty: "All Levels (सभी के लिए)",
    duration: "निरंतर (Continuous)",
    calories: "फोकस मोड",
    description:
      "स्टडी सेशंस और रिमोट इंटरव्यू के दौरान Text Neck, Slouching, Shoulder Tilt और स्क्रीन की निकटता की रीयल-टाइम AI निगरानी।",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=RqcOCb4IAL8",
    tags: ["Ergonomics", "Study", "Interview", "Text Neck", "पोस्चर", "गर्दन"],
    link: "/pose-analysis?exercise=desk",
    targetMuscles: ["Cervical Extensors", "Rhomboids", "Thoracic Spine", "Deep Neck Flexors"],
    steps: [
      "कुर्सी पर सीधे बैठें, दोनों पैर जमीन पर समतल रखें और रीढ़ को सहारा (Lumbar Support) दें।",
      "कंप्यूटर स्क्रीन को आंखों के स्तर (Eye Level) पर रखें ताकि गर्दन को आगे न झुकाना पड़े (Avoid Forward Neck)।",
      "कंधों को ढीला और पीछे रोल करके रखें; दोनों कंधे एक समान ऊंचाई (Balanced Shoulders) पर हों।",
      "कोहनियों को टेबल पर 90° कोण पर रखें और कलाई को न्यूट्रल स्थिति में रखें।"
    ],
    breathing: "डायफ्राम से गहरी और सहज सांस लें (Diaphragmatic Breathing); हर 25 मिनट पर 20 सेकंड के लिए दूर देखें।",
    commonMistakes: [
      "स्क्रीन के बहुत नजदीक झुकना (Proximity Error) - सुधार: आंखों से स्क्रीन की दूरी 50-70 cm रखें।",
      "आगे की ओर गर्दन झुकाना (Text Neck Syndrome) - सुधार: Chin Tucks एक्सरसाइज करें।",
      "एक तरफ झुककर बैठना (Lateral Shoulder Tilt) - सुधार: दोनों सिट बोंस (Sit Bones) पर बराबर वजन रखें।"
    ],
    correctiveMicroDrills: [
      "Chin Tucks: 15 रेप्स x 3 सेट्स (गर्दन को सीधा पीछे डबल चिन की तरह खींचें)।",
      "Scapular Retractions: 12 रेप्स x 3 सेट्स (शोल्डर ब्लेड्स को आपस में सिकोड़ें)।",
      "Seated Thoracic Extensions: 10 रेप्स x 2 सेट्स (कुर्सी के सहारे छाती ऊपर खोलें)।"
    ]
  },
  {
    id: 100,
    name: "Facial Reaction & Emotion Analysis (फेशियल रिएक्शन व इमोशन)",
    category: "Reaction & Emotion",
    difficulty: "All Levels (सभी के लिए)",
    duration: "निरंतर (Continuous)",
    calories: "माइंड व फोकस",
    description:
      "AI द्वारा चेहरे के माइक्रो-एक्सप्रेशन्स, मांसपेशियों के तनाव (Facial Tension), जुड़ाव (Engagement) और थकान (Fatigue) का वास्तविक समय में मूल्यांकन।",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=RqcOCb4IAL8",
    tags: ["Facial AI", "Emotion", "Reaction", "Fatigue", "चेहरा", "तनाव"],
    link: "/reaction-analysis",
    targetMuscles: ["Masseter Muscle", "Frontalis", "Orbicularis Oculi", "Temporalis"],
    steps: [
      "कैमरे के ठीक सामने बैठें, चेहरे पर पर्याप्त और समान प्रकाश (Good Lighting) सुनिश्चित करें।",
      "जबड़ा (Jaw) और माथा (Forehead) ढीला रखें, स्वाभाविक और शांत चेहरे के हाव-भाव बनाए रखें।",
      "बातचीत या इंटरव्यू के दौरान आंखों का संपर्क (Eye Contact) स्क्रीन या लेंस पर बनाए रखें।",
      "तनाव महसूस होने पर चेहरे की मांसपेशियों को ढीला छोड़ें और गहरी सांस लें।"
    ],
    breathing: "4 सेकंड नाक से सांस लें, 4 सेकंड रोकें और 6 सेकंड में मुंह से धीरे-धीरे छोड़ें (Box Breathing)।",
    commonMistakes: [
      "जबड़ा बहुत जोर से भींचना (Jaw Clenching) - सुधार: दांतों के बीच हल्की जगह रखें।",
      "माथे पर लगातार शिकन या तनाव (Forehead Furrowing) - सुधार: आइब्रो रिलैक्स करें।",
      "पलकें न झपकाना (Screen Stare / Eye Strain) - सुधार: हर मिनट में स्वाभाविक रूप से पलकें झपकाएं।"
    ],
    correctiveMicroDrills: [
      "Jaw Releases: जबड़े को धीरे-धीरे 10 बार खोलें और बंद करें।",
      "Palming Eye Relief: दोनों हथेलियों को रगड़कर गर्म करें और 30 सेकंड आंखों पर रखें।",
      "Neck Lateral Glides: गर्दन को बाएं-दाएं 5-5 बार धीरे-धीरे स्ट्रेच करें।"
    ]
  },
  {
    id: 1,
    name: "Squats (स्क्वैट्स - बॉडीवेट स्क्वाट)",
    category: "Strength",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "10 मिनट",
    calories: "80 kcal",
    description:
      "लोअर बॉडी की स्ट्रेंथ, हिप मोबिलिटी और कोर स्टेबिलिटी को विकसित करने वाला सबसे प्रभावी बुनियादी व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=aclHkVaku9U",
    tags: ["Legs", "Strength", "Lower Body", "Squats", "जांघें", "घुटने"],
    link: "/pose-analysis?exercise=squat",
    targetMuscles: ["Quadriceps Femoris", "Gluteus Maximus", "Hamstrings", "Erector Spinae", "Core"],
    steps: [
      "पैरों को कंधों की चौड़ाई के बराबर रखें और पंजों को 15-30° हल्का बाहर की ओर इंगित करें।",
      "मूवमेंट की शुरुआत हिप्स को पीछे धकेलते हुए (Hip Hinge) करें, जैसे किसी कुर्सी पर बैठ रहे हों।",
      "घुटनों को पंजों की सीध में बाहर की तरफ ट्रैक करते हुए नीचे झुकें; चेस्ट तनी हुई और रीढ़ न्यूट्रल रखें।",
      "हिप क्रीज को घुटनों के समानांतर (Parallel Depth ~ 90° Knee Angle) तक नीचे लाएं।",
      "एड़ियों और मिड-फुट से जमीन को मजबूती से धकेलते हुए वापस खड़े हों और ऊपर ग्लूट्स को 1 सेकंड स्क्वीज करें।"
    ],
    breathing: "नीचे जाने से पहले पेट में गहरी सांस भरकर कोर को ब्रेस करें; ऊपर उठते हुए जोर से सांस छोड़ें।",
    commonMistakes: [
      "घुटनों का अंदर झुकना (Knee Valgus Collapse) - सुधार: घुटनों को एक्टिवली बाहर फैलाएं।",
      "नीचे जाते समय एड़ियां उठना (Heels Lifting) - सुधार: वजन हील्स पर रखें और Ankle Mobility बढ़ाएं।",
      "धड़ का बहुत ज्यादा आगे झुक जाना - सुधार: नजर सामने रखें, कोर ब्रेस करें और चेस्ट तानें।"
    ],
    correctiveMicroDrills: [
      "Banded Clamshells: 15 रेप्स x 3 सेट्स (Gluteus Medius को मजबूत करने के लिए)।",
      "Box Squats: 12 रेप्स x 3 सेट्स (सही डेप्थ और हिप हिंज सीखने के लिए)।",
      "Ankle Dorsiflexion Wall Mobilization: 10 रेप्स प्रति पैर (एड़ियों को जमीन पर बनाए रखने के लिए)।"
    ]
  },
  {
    id: 2,
    name: "Push Ups (पुश-अप्स - चेस्ट व आर्म्स)",
    category: "Strength",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "8 मिनट",
    calories: "70 kcal",
    description:
      "छाती (Chest), कंधों (Anterior Deltoids), ट्राइसेप्स और पूरे कोर को एक साथ मजबूत करने वाला क्लासिक बॉडीवेट व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=IODxDxX7oi4",
    tags: ["Chest", "Arms", "Core", "Pushup", "छाती", "बाजु"],
    link: "/pose-analysis?exercise=pushup",
    targetMuscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Deltoids", "Core Stabilizers", "Serratus Anterior"],
    steps: [
      "हथेलियों को कंधों से थोड़ा बाहर फर्श पर मजबूती से रखें और उंगलियों को फैलाकर रखें।",
      "सिर, कंधे, हिप्स और एड़ियों को एक सीधी rigid plank line में रखें; कोर और ग्लूट्स को टाइट करें।",
      "कोहनियों को शरीर के साथ 45° का कोण (तीर का आकार - Arrow Shape) बनाते हुए नीचे लाएं; 90° बाहर न फैलाएं।",
      "छाती को फर्श से 2-3 इंच ऊपर तक लाएं ताकि चेस्ट फाइबर्स में पूरा खिंचाव महसूस हो।",
      "फर्श को मजबूती से पुश करते हुए ऊपर आएं और शोल्डर ब्लेड्स को हल्का प्रोट्रैक्ट (Protraction) करें।"
    ],
    breathing: "नीचे जाते समय सांस अंदर लें (Eccentric); ऊपर पुश करते समय सांस बाहर छोड़ें (Concentric)।",
    commonMistakes: [
      "हिप्स का नीचे लटकना (Hip Sagging) - सुधार: पेट की मांसपेशियों को कसकर रखें और ग्लूट्स टाइट करें।",
      "कोहनियों का 90° पर बाहर फैलना (Elbow Flare) - सुधार: कोहनियों को पसलियों के करीब 45° पर रखें।",
      "सिर्फ गर्दन नीचे झुकाना - सुधार: सिर को रीढ़ की सीध में रखें, फर्श पर 1 फीट आगे देखें।"
    ],
    correctiveMicroDrills: [
      "Scapular Push-ups: 15 रेप्स x 3 सेट्स (शोल्डर ब्लेड कंट्रोल और स्थिरता हेतु)।",
      "Incline Push-ups (Bench/Table): 12 रेप्स x 3 सेट्स (परफेक्ट फॉर्म के साथ न्यूरोमस्कुलर कंट्रोल के लिए)।",
      "Forearm Plank Hold: 45 सेकंड x 3 सेट्स (हिप सैगिंग रोकने के लिए)।"
    ]
  },
  {
    id: 3,
    name: "Surya Namaskar (सूर्य नमस्कार - 12 आसनों का प्रवाह)",
    category: "Yoga",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "15 मिनट",
    calories: "100 kcal",
    description:
      "शारीरिक लचीलेपन, रीढ़ की मोबिलिटी, मांसपेशियों की ताकत और मानसिक शांति को बढ़ाने वाला 12 आसनों का संपूर्ण वैदिक चक्र।",
    image:
      "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=6IUy8rFfB9E",
    tags: ["Yoga", "Flexibility", "Mobility", "Surya Namaskar", "योग", "लचीलापन"],
    link: "/pose-analysis?exercise=suryanamaskar",
    targetMuscles: ["Full Body Kinetic Chain", "Hamstrings", "Spinal Flexibility", "Chest & Shoulders", "Hip Flexors"],
    steps: [
      "1. प्रणामासन (Prayer Pose): दोनों हथेलियों को चेस्ट के पास जोड़कर सीधे खड़े हों, वजन दोनों पैरों पर समान।",
      "2. हस्त उत्तानासन (Raised Arms): गहरी सांस लेते हुए भुजाएं ऊपर उठाएं, हल्का सा बैकबेंड करें।",
      "3. पादहस्तासन (Forward Fold): सांस छोड़ते हुए हिप्स से आगे झुकें, रीढ़ सीधी रखें और हथेलियां पैरों के पास लाएं।",
      "4. अश्व संचालनासन (Equestrian): सांस लेते हुए दायां पैर पीछे ले जाएं, घुटना जमीन पर, नजर ऊपर।",
      "5. दंडासन (Plank): सांस रोककर बायां पैर भी पीछे लाएं, शरीर सिर से पैर तक सीधी रेखा में।",
      "6. अष्टांग नमस्कार (Eight Limbed): सांस छोड़ते हुए घुटने, छाती और ठुड्डी जमीन पर लगाएं।",
      "7. भुजंगासन (Cobra Pose): सांस लेते हुए छाती को ऊपर उठाएं, शोल्डर्स नीचे, कोहनियां हल्की मुड़ी हुई।",
      "8. पर्वतासन / अधोमुख (Downward Dog): सांस छोड़ते हुए हिप्स ऊपर उठाएं, एड़ियां फर्श की ओर दबाएं।",
      "9. अश्व संचालनासन: सांस लेते हुए दायां पैर आगे लाएं दोनों हाथों के बीच।",
      "10. पादहस्तासन: सांस छोड़ते हुए बायां पैर भी आगे लाएं और सिर घुटनों के पास ले जाएं।",
      "11. हस्त उत्तानासन: सांस लेते हुए भुजाएं ऊपर उठाकर पीछे स्ट्रेच करें।",
      "12. प्रणामासन: सांस छोड़ते हुए दोनों हाथ जोड़कर मूल स्थिति में लौटें।"
    ],
    breathing: "शरीर को खोलते समय (Backbend / Rise) सांस अंदर लें; आगे झुकते समय (Fold) सांस बाहर छोड़ें।",
    commonMistakes: [
      "आसनों के बीच सांस रोक लेना - सुधार: हर आसन के साथ तय श्वास चक्र का पालन करें।",
      "पादहस्तासन में कमर मोड़कर झुकना - सुधार: घुटने हल्के मोड़ें लेकिन हिप्स से झुकें।",
      "भुजंगासन में कंधों को कानों से सटा लेना - सुधार: शोल्डर्स को नीचे रोल करें और छाती खोलें।"
    ],
    correctiveMicroDrills: [
      "Cat-Cow Mobility Flow: 10 साइकल x 2 सेट्स (स्पाइनल फ्लेक्सिबिलिटी के लिए)।",
      "Standing Forward Fold Hold (घुटने हल्के मुड़े): 30 सेकंड होल्ड x 3 सेट्स (हैमस्ट्रिंग मोबिलिटी हेतु)।",
      "Low Lunge Hip Opener: 30 सेकंड प्रति पैर (हिप फ्लेक्सर्स खोलने के लिए)।"
    ]
  },
  {
    id: 4,
    name: "Plank Hold (प्लैंक होल्ड - कोर स्टेबिलिटी)",
    category: "Core",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "5 मिनट",
    calories: "45 kcal",
    description:
      "रीढ़ की रक्षा करने वाली डीप कोर मसल्स, पेट और हिप्स को मजबूत करने वाला सबसे सुरक्षित आइसोमेट्रिक व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
    tags: ["Core", "Stability", "Balance", "Plank", "पेट", "कोर"],
    link: "/pose-analysis?exercise=plank",
    targetMuscles: ["Transverse Abdominis", "Rectus Abdominis", "Obliques", "Gluteus Maximus", "Serratus Anterior"],
    steps: [
      "Forearms को फर्श पर रखें, कोहनियां कंधों के ठीक नीचे 90° पर रखें।",
      "पैरों को पीछे सीधा फैलाएं, एड़ियों को पीछे धकेलें और सिर से एड़ियों तक शरीर को सीधा रखें।",
      "नाभि को रीढ़ की तरफ खींचें (Abdominal Hollow Body), ग्लूट्स और जांघों को कसकर रखें।",
      "गर्दन को न्यूट्रल रखें, फर्श पर दोनों हाथों के बीच देखें (सिर को नीचे न लटकने दें)।",
      "हिप्स को न ज्यादा ऊपर उठाएं और न ही नीचे गिरने दें; पूरे समय पेट में तनाव महसूस करें।"
    ],
    breathing: "सांस को कभी न रोकें; डायफ्राम से छोटी, नियंत्रित और स्थिर सांसें लेते रहें।",
    commonMistakes: [
      "हिप्स का नीचे गिरना (Lumbar Hyperextension) - सुधार: पेल्विस को हल्का पोस्टीरियर टिल्ट (Tuck Pelvis) करें।",
      "हिप्स को पहाड़ की तरह ऊपर उठा लेना - सुधार: कंधों और एड़ियों की सीध में हिप्स रखें।",
      "कंधों पर बहुत अधिक तनाव लेना - सुधार: कोहनियों से फर्श को नीचे पुश करके शोल्डर ब्लेड्स फैलाएं।"
    ],
    correctiveMicroDrills: [
      "Dead Bug: 12 रेप्स x 3 सेट्स (बिना कमर उठाए कोर एक्टिवेशन हेतु)।",
      "Bird-Dog: 10 रेप्स प्रति साइड x 3 सेट्स (क्रॉस-बॉडी स्टेबिलिटी और बैक सपोर्ट हेतु)।",
      "RKC Hardstyle Plank: 15 सेकंड का मैक्सिमम टेंशन होल्ड x 4 सेट्स।"
    ]
  },
  {
    id: 5,
    name: "Lunges (लंजेस - यूनीलेटरल लेग स्ट्रेंथ)",
    category: "Strength",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "10 मिनट",
    calories: "85 kcal",
    description:
      "दोनों पैरों की ताकत में असंतुलन को दूर करने वाला, हिप स्टेबिलिटी और संतुलन सुधारने वाला बेहतरीन व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=QOVaHwm-Q6U",
    tags: ["Legs", "Balance", "Strength", "Lunges", "जांघें", "बैलेंस"],
    link: "/pose-analysis?exercise=lunges",
    targetMuscles: ["Quadriceps", "Gluteus Maximus", "Hamstrings", "Calves", "Hip Stabilizers"],
    steps: [
      "सीधे खड़े होकर एक पैर से आगे 2.5 से 3 फीट बड़ा और नियंत्रित कदम बढ़ाएं।",
      "धड़ को बिल्कुल सीधा (Vertical Torso) रखते हुए पीछे वाले घुटने को फर्श की ओर नीचे लाएं।",
      "आगे वाला घुटना 90° का कोण बनाए और टखने (Ankle) के ठीक ऊपर रहे (पंजों से आगे न निकले)।",
      "आगे वाली एड़ी (Front Heel) से जमीन को दबाते हुए वापस शुरुआती स्थिति में लौटें।"
    ],
    breathing: "नीचे जाते समय सांस अंदर लें; आगे वाली एड़ी से ऊपर उठते हुए सांस बाहर छोड़ें।",
    commonMistakes: [
      "आगे वाले घुटने का अंदर झुकना (Knee Valgus) - सुधार: घुटने को एक्टिवली बाहर की दिशा में रखें।",
      "धड़ का आगे झुक जाना - सुधार: कोर को ब्रेस करें और कंधों को हिप्स के ठीक ऊपर रखें।",
      "छोटा कदम रखना जिससे आगे वाली एड़ी उठ जाए - सुधार: कदम थोड़ा लंबा और स्थिर रखें।"
    ],
    correctiveMicroDrills: [
      "Split Squat Hold: 20 सेकंड प्रति पैर x 3 सेट्स (आइसोमेट्रिक स्ट्रेंथ के लिए)।",
      "Step-Ups on Low Box: 12 रेप्स प्रति पैर x 3 सेट्स (सिंगल लेग स्टेबिलिटी के लिए)।",
      "Half-Kneeling Hip Flexor Stretch: 30 सेकंड प्रति साइड (टाइट हिप्स को खोलने के लिए)।"
    ]
  },
  {
    id: 6,
    name: "Tree Pose / Vrikshasana (वृक्षासन - बैलेंस व फोकस)",
    category: "Yoga",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "5 मिनट",
    calories: "25 kcal",
    description:
      "सिंगल-लेग बैलेंस, पेल्विक अलाइनमेंट, टखने की स्थिरता और एकाग्रता को विकसित करने वाला पारंपरिक हठयोग आसन।",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=NYhH8Gr35cI",
    tags: ["Yoga", "Posture", "Breathing", "Tree Pose", "वृक्षासन", "संतुलन"],
    link: "/pose-analysis?exercise=tree_pose",
    targetMuscles: ["Ankle Stabilizers", "Calves", "Gluteus Medius", "Deep Core Stabilizers"],
    steps: [
      "ताड़ासन में सीधे खड़े हों; एक पैर के चारों कोनों को जमीन में मजबूती से जमाएं (Rooted Foot)।",
      "दूसरे पैर के तलवे को जांघ के अंदरूनी हिस्से (Inner Thigh) या पिंडली (Calf) पर रखें (घुटने पर कभी न रखें)।",
      "पेल्विस को न्यूट्रल और सामने की ओर चौकोर (Square Hips) रखें; हिप को एक तरफ बाहर न निकलने दें।",
      "हाथों को छाती के पास Prayer Pose में रखें या सिर के ऊपर सीधा उठाएं।",
      "नजर को सामने किसी एक स्थिर बिंदु (Drishti Point) पर टिकाएं और शरीर को संतुलित रखें।"
    ],
    breathing: "नाक से 4 सेकंड अंदर और 4 सेकंड बाहर धीमी, शांत लयबद्ध सांस लें।",
    commonMistakes: [
      "पैर को directly घुटने के जोड़ पर दबाना - सुधार: पैर को केवल जांघ या पिंडली पर रखें।",
      "कमर को एक तरफ बाहर निकाल देना - सुधार: स्टैंडिंग ग्लूट को कसकर रखें और पेल्विस सीधा रखें।",
      "कंधों में जरूरत से ज्यादा तनाव - सुधार: कंधों को ढीला छोड़ें और सांस को शांत रखें।"
    ],
    correctiveMicroDrills: [
      "Single Leg Balance on Pillow: 30 सेकंड प्रति पैर x 3 सेट्स।",
      "Banded Lateral Monster Walk: 15 कदम दोनों दिशाओं में (Gluteus Medius स्ट्रेंथ हेतु)।",
      "Calf Raises on Wall: 15 रेप्स x 3 सेट्स।"
    ]
  },
  {
    id: 7,
    name: "Warrior II / Virabhadrasana II (वीरभद्रासन II)",
    category: "Yoga",
    difficulty: "Intermediate (मध्यम)",
    duration: "8 मिनट",
    calories: "50 kcal",
    description:
      "पैरों की सहनशक्ति, हिप ओपनिंग और पूरे शरीर में शक्ति व स्थिरता का संचार करने वाला शक्तिशाली योगासन।",
    image:
      "https://images.unsplash.com/photo-1599447292180-45fd84092ef4?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=Mn6RSIRCV3w",
    tags: ["Yoga", "Balance", "Legs", "Warrior", "वीरभद्रासन", "ताकत"],
    link: "/pose-analysis?exercise=warrior",
    targetMuscles: ["Quadriceps", "Adductors", "Gluteus Medius", "Deltoids", "Core"],
    steps: [
      "पैरों को 3.5 से 4 फीट की चौड़ाई में फैलाकर खड़े हों।",
      "आगे वाले पैर के पंजे को 90° सामने घुमाएं और पीछे वाले पैर को 45° अंदर की ओर रखें।",
      "आगे वाले घुटने को 90° मोड़ें ताकि घुटना सीधे टखने के ऊपर रहे और जांघ फर्श के समानांतर हो।",
      "दोनों बाहों को कंधों के स्तर पर फर्श के समानांतर फैलाएं और दृष्टि आगे वाली उंगलियों पर रखें।",
      "धड़ को दोनों पैरों के ठीक बीच में लंबवत (Vertical Spine) रखें; आगे की ओर न झुकें।"
    ],
    breathing: "छाती में गहरी सांस भरें और सांस छोड़ते हुए हिप्स को थोड़ा और नीचे स्थिर करें।",
    commonMistakes: [
      "आगे वाले घुटने का अंदर गिरना - सुधार: घुटने को छोटी उंगली की दिशा में बाहर रखें।",
      "पीछे वाले पैर की बाहरी एड़ी जमीन से उठना - सुधार: पीछे वाले पैर की बाहरी धार को जमीन में दबाएं।",
      "कंधों का ऊपर कानों की तरफ चढ़ना - सुधार: शोल्डर ब्लेड्स को नीचे रोल करें।"
    ],
    correctiveMicroDrills: [
      "Wall Supported Warrior II Hold: 30 सेकंड प्रति साइड x 3 सेट्स।",
      "Cossack Squats: 8 रेप्स प्रति साइड (हिप और एडक्टर मोबिलिटी हेतु)।",
      "Adductor Foam Rolling: 45 सेकंड प्रति जांघ।"
    ]
  },
  {
    id: 8,
    name: "Trikonasana / Triangle Pose (त्रिकोणासन)",
    category: "Yoga",
    difficulty: "Intermediate (मध्यम)",
    duration: "7 मिनट",
    calories: "40 kcal",
    description:
      "रीढ़ की फ्लेक्सिबिलिटी, हैमस्ट्रिंग्स का खिंचाव और धड़ के लेटरल लचीलेपन को बढ़ाने वाला क्लासिक योगासन।",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=upFYlxZHj14",
    tags: ["Yoga", "Triangle", "Hamstrings", "त्रिकोणासन", "लचीलापन"],
    link: "/pose-analysis?exercise=triangle",
    targetMuscles: ["Hamstrings", "Obliques", "Latissimus Dorsi", "Hip Abductors", "Spine"],
    steps: [
      "पैरों को 3 फीट चौड़ा खोलें, आगे का पंजा 90° बाहर और पीछे का 15° अंदर।",
      "दोनों हाथों को कंधों की सीध में फैलाएं और गहरी सांस लें।",
      "सांस छोड़ते हुए हिप्स से आगे की ओर रीढ़ को लंबा करते हुए झुकें।",
      "नीचे वाले हाथ को पिंडली, टखने या ब्लॉक पर रखें और दूसरे हाथ को छत की तरफ सीधा तानें।",
      "छाती को सामने की ओर खोलें (Open Chest) और ऊपर वाले हाथ के अंगूठे को देखें।"
    ],
    breathing: "झुकते समय सांस बाहर छोड़ें; पोज़ में रहते हुए पसलियों में गहरी सांस भरें।",
    commonMistakes: [
      "आगे वाले घुटने को हाइपरएक्सटेंड (Lock) कर देना - सुधार: घुटने में माइक्रो-बेंड रखें।",
      "छाती का फर्श की ओर गिर जाना - सुधार: ऊपर वाले कंधे को पीछे रोल करें और चेस्ट खोलें।"
    ],
    correctiveMicroDrills: [
      "Standing Side Bends: 10 रेप्स प्रति साइड (ऑब्लिक मोबिलिटी के लिए)।",
      "Hamstring Strap Stretch: 45 सेकंड प्रति पैर (हैमस्ट्रिंग फ्लेक्सिबिलिटी हेतु)।"
    ]
  },
  {
    id: 9,
    name: "Glute Bridge (ग्लूट ब्रिज - पेल्विक व ग्लूट एक्टिवेशन)",
    category: "Strength",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "8 मिनट",
    calories: "60 kcal",
    description:
      "ग्लूट्स को सक्रिय करने, लोअर बैक पेन को कम करने और पेल्विक स्थिरता बढ़ाने वाला सुरक्षित व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=wPM8icPu6H8",
    tags: ["Glutes", "Hips", "Strength", "ग्लूट्स", "हिप्स"],
    link: "/pose-analysis?exercise=squat",
    targetMuscles: ["Gluteus Maximus", "Hamstrings", "Erector Spinae", "Transverse Abdominis"],
    steps: [
      "पीठ के बल लेटें, घुटने मोड़ें और पैरों को हिप-विड्थ की दूरी पर फर्श पर रखें।",
      "एड़ियों को हिप्स के करीब लाएं, हाथ शरीर के दोनों तरफ फर्श पर आराम से रखें।",
      "एड़ियों से जमीन को धकेलते हुए हिप्स को ऊपर उठाएं जब तक घुटने, हिप्स और कंधे एक सीधी रेखा में न आ जाएं।",
      "शीर्ष स्थिति (Top Position) पर ग्लूट्स को 2 सेकंड मजबूती से स्क्वीज करें।",
      "नियंत्रण के साथ धीरे-धीरे हिप्स को फर्श पर वापस लाएं।"
    ],
    breathing: "नीचे सांस अंदर लें; ऊपर हिप्स उठाते समय सांस बाहर छोड़ें और ग्लूट्स स्क्वीज करें।",
    commonMistakes: [
      "कमर को बहुत ज्यादा मोड़ना (Lumbar Hyperextension) - सुधार: हिप्स को केवल ग्लूट्स से उठाएं, कमर से नहीं।",
      "पैरों के पंजों से वजन धकेलना - सुधार: सारा दबाव एड़ियों (Heels) पर रखें।"
    ],
    correctiveMicroDrills: [
      "Banded Glute Bridges: 15 रेप्स x 3 सेट्स।",
      "Single-Leg Glute Bridge Hold: 15 सेकंड प्रति साइड x 3 सेट्स।"
    ]
  },
  {
    id: 10,
    name: "Cat Cow Stretch (मार्जरी-बिटिलासन - स्पाइनल मोबिलिटी)",
    category: "Mobility",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "6 मिनट",
    calories: "30 kcal",
    description:
      "रीढ़ की मोबिलिटी बढ़ाने, गर्दन और पीठ के तनाव को दूर करने वाला कोमल और उपचारात्मक व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=y39PrKY_4JM",
    tags: ["Mobility", "Stretching", "Spine", "Cat Cow", "रीढ़", "मोबिलिटी"],
    link: "/pose-analysis?exercise=suryanamaskar",
    targetMuscles: ["Erector Spinae", "Rectus Abdominis", "Cervical Spine", "Thoracic Extensors"],
    steps: [
      "टेबलटॉप पोज़िशन में आएं: हथेलियां कंधों के नीचे और घुटने हिप्स के ठीक नीचे रखें।",
      "Cow Pose (सांस अंदर): पेट को फर्श की ओर नीचे लाएं, छाती और टेलबोन ऊपर उठाएं, नजर ऊपर।",
      "Cat Pose (सांस बाहर): रीढ़ को छत की तरफ मोड़ें (Round Spine), नाभि को अंदर खींचें और ठुड्डी छाती से लगाएं।",
      "प्रत्येक मूवमेंट को सांस की गति के साथ तालमेल में 10-15 चक्र तक दोहराएं।"
    ],
    breathing: "रीढ़ को नीचे झुकाते हुए (Cow) सांस अंदर लें; पीठ को गोल करते हुए (Cat) सांस पूरी बाहर छोड़ें।",
    commonMistakes: [
      "कोहनियों को मोड़ लेना - सुधार: हाथों को सीधा रखें और मूवमेंट रीढ़ से संचालित करें।",
      "गर्दन पर झटका देना - सुधार: मूवमेंट को स्मूद और धीमा रखें।"
    ],
    correctiveMicroDrills: [
      "Thoracic Rotations: 10 रेप्स प्रति साइड।",
      "Child's Pose Rest: 1 मिनट डीप ब्रीदिंग।"
    ]
  },
  {
    id: 11,
    name: "Downward Dog (अधोमुख श्वानासन - फुल बॉडी स्ट्रेच)",
    category: "Yoga",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "7 मिनट",
    calories: "45 kcal",
    description:
      "पूरे शरीर को रीसेट करने वाला, हैमस्ट्रिंग्स और पिंडलियों को स्ट्रेच करने वाला और कंधों को मजबूत करने वाला क्लासिक योगासन।",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=EC7RGJ975iM",
    tags: ["Yoga", "Downward Dog", "Hamstrings", "अधोमुख", "स्ट्रेच"],
    link: "/pose-analysis?exercise=suryanamaskar",
    targetMuscles: ["Hamstrings", "Calves", "Latissimus Dorsi", "Deltoids", "Core"],
    steps: [
      "चारों हाथ-पैरों पर आएं, उंगलियों को अच्छी तरह फैलाकर फर्श पर मजबूती से जमाएं।",
      "सांस छोड़ते हुए घुटनों को ऊपर उठाएं और हिप्स को पीछे और छत की तरफ धकेलें (उल्टे 'V' का आकार)।",
      "हाथों से फर्श को आगे-नीचे धकेलें और रीढ़ को लंबा करें; छाती को जांघों की दिशा में ले जाएं।",
      "एड़ियों को फर्श की तरफ दबाएं (हैमस्ट्रिंग्स टाइट हों तो घुटने हल्के मुड़े रख सकते हैं)।",
      "गर्दन को ढीला छोड़ें और सिर को ऊपरी बाहों के बीच आराम से रखें।"
    ],
    breathing: "पसलियों और पेट में गहरी, शांत और लयबद्ध सांसें लें।",
    commonMistakes: [
      "कंधों पर सारा वजन डाल देना - सुधार: हिप्स को पीछे ऊपर खींचकर वजन पैरों की तरफ ट्रांसफर करें।",
      "पीठ को कूबड़ की तरह गोल करना - सुधार: घुटने हल्के मोड़ें और रीढ़ को सीधा लंबा रखें।"
    ],
    correctiveMicroDrills: [
      "Calf Stretch against Wall: 30 सेकंड प्रति पैर।",
      "Pedal the Feet in Downward Dog: 20 रेप्स।"
    ]
  },
  {
    id: 12,
    name: "Bhujangasana / Cobra Pose (भुजंगासन - बैकबेंड)",
    category: "Yoga",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "6 मिनट",
    calories: "35 kcal",
    description:
      "छाती और फेफड़ों को खोलने वाला, रीढ़ को मजबूत बनाने वाला और कमर के लचीलेपन को सुधारने वाला योगासन।",
    image:
      "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=JDcdhTuycOI",
    tags: ["Yoga", "Cobra", "Spine", "भुजंगासन", "कमर"],
    link: "/pose-analysis?exercise=suryanamaskar",
    targetMuscles: ["Spinal Extensors", "Erector Spinae", "Pectorals", "Latissimus Dorsi", "Glutes"],
    steps: [
      "पेट के बल सीधे लेट जाएं, पैरों को पीछे सीधा और पंजे फर्श पर समतल रखें।",
      "हथेलियों को कंधों के नीचे फर्श पर रखें, कोहनियों को पसलियों के करीब सटाकर रखें।",
      "सांस लेते हुए छाती को फर्श से ऊपर उठाएं; हाथों पर ज्यादा वजन न दें, पीठ की मांसपेशियों का उपयोग करें।",
      "कंधों को कानों से दूर नीचे और पीछे रोल करें; नजर सामने या हल्की ऊपर रखें।",
      "सांस छोड़ते हुए धीरे-धीरे छाती को फर्श पर वापस लाएं।"
    ],
    breathing: "ऊपर उठते समय गहरी सांस अंदर लें; नीचे आते समय धीरे-धीरे सांस छोड़ें।",
    commonMistakes: [
      "कोहनियों को पूरी तरह सीधा करके लोअर बैक पर दबाव डालना - सुधार: कोहनियों को हल्का मुड़ा रखें।",
      "कंधों को कानों से चिपका लेना - सुधार: शोल्डर्स को नीचे दबाकर गर्दन को लंबी रखें।"
    ],
    correctiveMicroDrills: [
      "Prone Cobra (बिना हाथों के केवल बैक से छाती उठाना): 10 रेप्स x 3 सेट्स।",
      "Sphinx Pose Hold: 45 सेकंड होल्ड।"
    ]
  },
  {
    id: 13,
    name: "Child's Pose / Balasana (बालासन - रेस्ट व रिकवरी)",
    category: "Yoga",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "5 मिनट",
    calories: "20 kcal",
    description:
      "वर्कआउट के बाद रीढ़, कूल्हों और कंधों को आराम देने वाला और नर्वस सिस्टम को शांत करने वाला विश्राम आसन।",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=2MJGg-dUKh0",
    tags: ["Yoga", "Stretching", "Relaxation", "बालासन", "विश्राम"],
    link: "/pose-analysis?exercise=suryanamaskar",
    targetMuscles: ["Spinal Extensors", "Latissimus Dorsi", "Glutes", "Hip Joints"],
    steps: [
      "घुटनों के बल बैठें, बड़े अंगूठे आपस में मिले हुए और घुटनों को मैट की चौड़ाई जितना खोलें।",
      "सांस छोड़ते हुए धड़ को जांघों के बीच नीचे लाएं और माथे को फर्श पर टिकाएं।",
      "दोनों भुजाओं को आगे की ओर सीधा फैलाएं या शरीर के दोनों तरफ आरामदायक स्थिति में रखें।",
      "हिप्स को एड़ियों की ओर ढीला छोड़ें और रीढ़ को प्राकृतिक रूप से लंबा होने दें।"
    ],
    breathing: "पीठ के निचले हिस्से और पसलियों में गहरी और धीमी सांसें भरें।",
    commonMistakes: [
      "हिप्स को एड़ियों से बहुत ऊंचा रखना - सुधार: आवश्यकता हो तो जांघों के नीचे कुशन या तकिया रखें।"
    ],
    correctiveMicroDrills: [
      "Thread the Needle Stretch: 30 सेकंड प्रति साइड।",
      "Deep Belly Breathing: 2 मिनट।"
    ]
  },
  {
    id: 14,
    name: "Jumping Jacks (जंपिंग जैक्स - कार्डियो वॉर्मअप)",
    category: "Cardio",
    difficulty: "Beginner (प्रारंभिक)",
    duration: "7 मिनट",
    calories: "90 kcal",
    description:
      "हार्ट रेट बढ़ाने, पूरे शरीर का तापमान बढ़ाने और कैलोरी बर्न करने वाला क्लासिक कार्डियो व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=c4DAnQ6DtF8",
    tags: ["Cardio", "Warm Up", "Full Body", "Jumping Jacks", "कार्डियो"],
    link: "/pose-analysis?exercise=squat",
    targetMuscles: ["Calves", "Quadriceps", "Deltoids", "Core", "Cardiovascular System"],
    steps: [
      "सीधे खड़े हों, पैर आपस में मिले हुए और हाथ शरीर के दोनों तरफ हों।",
      "हल्की छलांग लगाकर पैरों को कंधों से चौड़ा खोलें और साथ ही दोनों हाथों को सिर के ऊपर ताली की तरह लाएं।",
      "तुरंत दूसरी छलांग के साथ पैरों को वापस मिलाएं और हाथों को नीचे लाएं।",
      "पंजों के अग्रभाग (Balls of Feet) पर हल्का लैंड करें ताकि जोड़ों पर झटका न लगे।"
    ],
    breathing: "जंप करते समय लयबद्ध और निरंतर श्वास बनाए रखें।",
    commonMistakes: [
      "सपाट पैरों (Flat Feet) पर भारी लैंडिंग करना - सुधार: घुटने हल्के मोड़कर पंजों पर सॉफ्ट लैंडिंग करें।"
    ],
    correctiveMicroDrills: [
      "Ankle Bounces: 30 सेकंड x 2 सेट्स।",
      "Arm Circles: 15 रेप्स आगे और पीछे।"
    ]
  },
  {
    id: 15,
    name: "High Knees (हाई नीज़ - कार्डियो एंड्योरेंस)",
    category: "Cardio",
    difficulty: "Intermediate (मध्यम)",
    duration: "6 मिनट",
    calories: "95 kcal",
    description:
      "लोअर बॉडी की ताकत, हिप फ्लेक्सर्स और कार्डियोवैस्कुलर एंड्योरेंस को बढ़ाने वाला गतिशील व्यायाम।",
    image:
      "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=80",
    video: "https://www.youtube.com/watch?v=8opcQdC-V-U",
    tags: ["Cardio", "Endurance", "Full Body", "High Knees", "सहनशक्ति"],
    link: "/pose-analysis?exercise=lunges",
    targetMuscles: ["Hip Flexors", "Quadriceps", "Calves", "Core", "Glutes"],
    steps: [
      "हिप-विड्थ पर पैर रखकर खड़े हों और कोर को टाइट रखें।",
      "एक घुटने को तेजी से छाती की ओर हिप लेवल (90°) तक ऊपर उठाएं।",
      "उसी समय विपरीत हाथ को रनिंग मोशन में आगे लाएं।",
      "पैर नीचे लाते ही तुरंत दूसरे घुटने को ऊपर उठाएं और तेज गति से दोहराएं।"
    ],
    breathing: "2 कदम सांस अंदर और 2 कदम सांस बाहर की लय में श्वास लें।",
    commonMistakes: [
      "धड़ को पीछे झुका लेना - सुधार: शरीर को हल्का आगे झुकाकर कोर टाइट रखें।"
    ],
    correctiveMicroDrills: [
      "A-Skips: 20 रेप्स x 2 सेट्स।",
      "High Knee March (धीमी गति में): 20 रेप्स x 2 सेट्स।"
    ]
  }
];

const categoryList = [
  { id: "All", label: "सभी (All)" },
  { id: "Ergonomics", label: "एर्गोनॉमिक्स (Ergonomics)" },
  { id: "Strength", label: "स्ट्रेंथ (Strength)" },
  { id: "Yoga", label: "योग (Yoga)" },
  { id: "Core", label: "कोर (Core)" },
  { id: "Mobility", label: "मोबिलिटी (Mobility)" },
  { id: "Cardio", label: "कार्डियो (Cardio)" },
  { id: "Reaction & Emotion", label: "रिएक्शन (Reaction)" },
];

const difficultyList = [
  { id: "All", label: "सभी लेवल्स (All Levels)" },
  { id: "Beginner", label: "प्रारंभिक (Beginner)" },
  { id: "Intermediate", label: "मध्यम (Intermediate)" },
];

const Exercises = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState(null);

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        exercise.name.toLowerCase().includes(q) ||
        exercise.description.toLowerCase().includes(q) ||
        (exercise.steps && exercise.steps.some((s) => s.toLowerCase().includes(q))) ||
        (exercise.targetMuscles && exercise.targetMuscles.some((m) => m.toLowerCase().includes(q))) ||
        exercise.tags.some((tag) => tag.toLowerCase().includes(q));

      const matchesCategory =
        category === "All" || exercise.category === category;

      const matchesDifficulty =
        difficulty === "All" || exercise.difficulty.includes(difficulty);

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [search, category, difficulty]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Background Decor */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[140px]" />
        <div className="absolute -right-40 top-[20%] h-[550px] w-[550px] rounded-full bg-blue-50 blur-[150px]" />
        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-50 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        {/* Header Section */}
        <section className="mb-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">
            <Sparkles size={14} />
            व्यायाम व योग निर्देशिका (Exercise Library)
          </div>

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-slate-900">
                एक्सरसाइज और योग का
                <span className="block bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  संपूर्ण हिंदी गाइड
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                प्रत्येक व्यायाम, योगासन और मोबिलिटी रूटीन के विस्तृत स्टेप-बाय-स्टेप निर्देश, श्वास तकनीक, आम गलतियों के सुधार और सुधारात्मक माइक्रो-एक्सरसाइज सीखें।
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <LibraryStat
                icon={<Activity size={17} />}
                value="16+"
                label="कुल व्यायाम (Total)"
              />
              <LibraryStat
                icon={<HeartPulse size={17} />}
                value="7"
                label="श्रेणियां (Categories)"
              />
              <LibraryStat
                icon={<Target size={17} />}
                value="2"
                label="कठिनाई स्तर (Levels)"
              />
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mb-8">
          <div className="relative max-w-2xl">
            <Search
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="व्यायाम, योगासन या लक्षित मसल्स खोजें (जैसे Squats, Core, घुटने, Plank)..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-12 text-sm text-slate-900 shadow-sm outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-900"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="mb-10 space-y-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              श्रेणी (Category)
            </p>

            <div className="flex flex-wrap gap-2">
              {categoryList.map((item) => (
                <FilterButton
                  key={item.id}
                  active={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </FilterButton>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              कठिनाई स्तर (Difficulty)
            </p>

            <div className="flex flex-wrap gap-2">
              {difficultyList.map((item) => (
                <FilterButton
                  key={item.id}
                  active={difficulty === item.id}
                  onClick={() => setDifficulty(item.id)}
                >
                  {item.label}
                </FilterButton>
              ))}
            </div>
          </div>
        </section>

        {/* Results Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              उपलब्ध व्यायाम व आसन
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredExercises.length} व्यायाम उपलब्ध हैं
            </p>
          </div>
        </div>

        {/* Exercise Grid */}
        {filteredExercises.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onOpen={() => setSelectedExercise(exercise)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            onReset={() => {
              setSearch("");
              setCategory("All");
              setDifficulty("All");
            }}
          />
        )}
      </main>

      {/* Detail Modal */}
      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
};

/* ===============================================================
   EXERCISE CARD
================================================================ */

const ExerciseCard = ({ exercise, onOpen }) => {
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/10">
      {/* Image Header */}
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <img
          src={exercise.image}
          alt={exercise.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

        {/* Category Badge */}
        <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md">
          {exercise.category}
        </div>

        {/* Difficulty Badge */}
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {exercise.difficulty}
        </div>

        {/* Quick Open Button */}
        <button
          onClick={onOpen}
          className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 transition duration-300 hover:scale-110 hover:bg-cyan-500"
          title="विस्तार से देखें"
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-cyan-700">
          {exercise.name}
        </h3>

        <p className="mt-2.5 line-clamp-2 text-sm leading-6 text-slate-600">
          {exercise.description}
        </p>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 border-y border-slate-100 py-3 text-xs text-slate-500">
          <MetaItem
            icon={<Clock3 size={15} />}
            value={exercise.duration}
          />

          <MetaItem
            icon={<Flame size={15} />}
            value={exercise.calories}
          />
        </div>

        {/* Tags */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {exercise.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* View Details Button */}
        <button
          onClick={onOpen}
          className="group/btn mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50/60 py-2.5 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-900"
        >
          स्टेप-बाय-स्टेप निर्देश देखें
          <ArrowRight
            size={16}
            className="transition group-hover/btn:translate-x-1"
          />
        </button>
      </div>
    </article>
  );
};

/* ===============================================================
   COMPREHENSIVE EXERCISE MODAL
================================================================ */

const ExerciseModal = ({ exercise, onClose }) => {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900/60 text-white backdrop-blur-md transition hover:bg-slate-900"
          title="बंद करें"
        >
          <X size={20} />
        </button>

        {/* Hero Header */}
        <div className="relative h-64 overflow-hidden sm:h-72 bg-slate-900">
          <img
            src={exercise.image}
            alt={exercise.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-85"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-3 py-1 text-xs font-semibold text-cyan-300 backdrop-blur-md">
                {exercise.category}
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
                {exercise.difficulty}
              </span>
            </div>

            <h2 className="text-2xl font-black text-white sm:text-3xl">
              {exercise.name}
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Description */}
          <p className="text-base leading-7 text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {exercise.description}
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailBox
              icon={<Clock3 size={17} className="text-cyan-600" />}
              title="अनुशंसित अवधि"
              value={exercise.duration}
            />

            <DetailBox
              icon={<Flame size={17} className="text-rose-500" />}
              title="अनुमानित ऊर्जा"
              value={exercise.calories}
            />

            <DetailBox
              icon={<Target size={17} className="text-violet-600" />}
              title="स्तर"
              value={exercise.difficulty}
            />

            <DetailBox
              icon={<Dumbbell size={17} className="text-blue-600" />}
              title="प्रकार"
              value={exercise.category}
            />
          </div>

          {/* Target Muscles */}
          {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-sm">
                <Dumbbell size={18} className="text-cyan-600" />
                लक्षित मांसपेशियां (Target Muscles)
              </div>
              <div className="flex flex-wrap gap-2">
                {exercise.targetMuscles.map((muscle) => (
                  <span
                    key={muscle}
                    className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-medium text-blue-800"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {exercise.steps && exercise.steps.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-base">
                <Layers size={20} className="text-cyan-600" />
                स्टेप-बाय-स्टेप निर्देश (Step-by-Step Execution Guide)
              </div>

              <div className="space-y-3">
                {exercise.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white shadow-sm">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-800 font-normal">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breathing Cue */}
          {exercise.breathing && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-teal-900 font-bold text-sm">
                <Wind size={18} className="text-teal-600" />
                श्वास तकनीक (Breathing Mechanics)
              </div>
              <p className="text-sm leading-6 text-teal-900 font-medium">
                {exercise.breathing}
              </p>
            </div>
          )}

          {/* Common Mistakes & Form Corrections */}
          {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-amber-950 font-bold text-sm">
                <AlertTriangle size={18} className="text-amber-600" />
                सामान्य गलतियां और सुधार (Common Biomechanical Mistakes)
              </div>

              <div className="space-y-2.5">
                {exercise.commonMistakes.map((mistake, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-900 leading-relaxed"
                  >
                    <span className="text-amber-600 font-bold mt-0.5">•</span>
                    <span>{mistake}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrective Micro-Drills */}
          {exercise.correctiveMicroDrills && exercise.correctiveMicroDrills.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-emerald-950 font-bold text-sm">
                <Zap size={18} className="text-emerald-600" />
                सुधार के लिए छोटी-छोटी एक्सरसाइज (Corrective Micro-Drills)
              </div>

              <div className="space-y-2">
                {exercise.correctiveMicroDrills.map((drill, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 rounded-xl bg-white/80 p-2.5 border border-emerald-100 text-xs sm:text-sm font-medium text-emerald-900"
                  >
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{drill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video & Start Analysis Action Buttons */}
          <div className="pt-2 grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => navigate(exercise.link || "/pose-analysis")}
              className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-4 font-bold text-white shadow-xl shadow-cyan-600/20 transition hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500"
            >
              <Sparkles size={19} />
              {exercise.id === 100
                ? "फेशियल रिएक्शन एनालिसिस शुरू करें"
                : "AI पोस्चर एनालिसिस शुरू करें"}
            </button>

            <a
              href={exercise.video}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-4 font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900"
            >
              <Play size={19} fill="currentColor" className="text-rose-500" />
              डेमो वीडियो देखें (Watch Demo)
            </a>
          </div>

          {/* Safety Disclaimer */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-cyan-600" />
            <p className="text-xs leading-5 text-slate-600">
              <strong>सुरक्षा नोट:</strong> सभी व्यायाम अपनी शारीरिक क्षमता के अनुसार धीरे-धीरे करें। यदि किसी जोड़ या कमर में तीखा दर्द हो, तो तुरंत रुकें और फिजियोथेरेपिस्ट या योग प्रशिक्षक से परामर्श लें।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===============================================================
   HELPER COMPONENTS
================================================================ */

const FilterButton = ({ active, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-medium transition ${
        active
          ? "border-cyan-400 bg-cyan-50 text-cyan-800 shadow-sm font-semibold ring-2 ring-cyan-200"
          : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
};

const MetaItem = ({ icon, value }) => {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className="text-cyan-600">{icon}</span>
      <span>{value}</span>
    </div>
  );
};

const DetailBox = ({ icon, title, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>

      <p className="mt-1.5 text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
};

const LibraryStat = ({ icon, value, label }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-cyan-600">
        {icon}
        <span className="text-lg font-black text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
};

const EmptyState = ({ onReset }) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
        <Search size={26} />
      </div>

      <h3 className="mt-5 text-xl font-bold text-slate-900">
        कोई व्यायाम नहीं मिला
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        कृपया अन्य कीवर्ड खोजें या फिल्टर रीसेट करके सभी उपलब्ध व्यायाम देखें।
      </p>

      <button
        onClick={onReset}
        className="mt-6 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 shadow-sm"
      >
        फ़िल्टर रीसेट करें (Reset Filters)
      </button>
    </div>
  );
};

export default Exercises;