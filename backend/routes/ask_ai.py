import os
import json
import urllib.request
import urllib.parse
from flask import Blueprint, jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

ask_ai_bp = Blueprint('ask_ai', __name__, url_prefix='/api/ask_ai')

# Catalog of available exercises in the system that can be launched directly
SYSTEM_EXERCISES = {
    "desk_posture": {
        "id": "desk_posture",
        "name_hi": "डेस्क व स्टडी पोस्चर",
        "name_en": "Desk Ergonomics",
        "category": "Desk Ergonomics",
        "target_muscles": "गर्दन (Cervical Spine), शोल्डर ब्लेड्स, रीढ़",
        "benefits": "गर्दन का दर्द, झुके हुए कंधे (Rounded Shoulders) और टेक्स्ट-नेक से बचाव।",
        "duration": "5-10 मिनट",
        "icon": "Monitor"
    },
    "suryanamaskar": {
        "id": "suryanamaskar",
        "name_hi": "सूर्य नमस्कार (12 आसन)",
        "name_en": "Surya Namaskar Flow",
        "category": "Traditional Yoga Flow",
        "target_muscles": "संपूर्ण शारीरिक काइनेटिक चेन, रीढ़, हैमस्ट्रिंग्स",
        "benefits": "कार्डियोवैस्कुलर फिटनेस, रीढ़ का लचीलापन और मानसिक एकाग्रता।",
        "duration": "10-15 मिनट",
        "icon": "Sparkles"
    },
    "cobra": {
        "id": "cobra",
        "name_hi": "भुजंगासन (Cobra Pose)",
        "name_en": "Cobra Pose",
        "category": "Hatha Yoga & Balance",
        "target_muscles": "लोअर बैक, चेस्ट, स्पाइनल एक्सटेंसर्स",
        "benefits": "कंप्यूटर पर आगे झुकने से दबी रीढ़ को पीछे खोलता है, कमर दर्द में राहत।",
        "duration": "3-5 मिनट",
        "icon": "Flame"
    },
    "squat": {
        "id": "squat",
        "name_hi": "स्क्वैट्स (Squats)",
        "name_en": "Bodyweight Squats",
        "category": "Gym & Strength",
        "target_muscles": "जांघें (Quadriceps), हिप्स (Glutes), घुटने",
        "benefits": "दिनभर बैठने से सोई हुई हिप मांसपेशियों (Glute Amnesia) को सक्रिय करता है।",
        "duration": "5 मिनट (3 सेट्स x 12 रेप्स)",
        "icon": "Dumbbell"
    },
    "plank": {
        "id": "plank",
        "name_hi": "प्लैंक होल्ड (Plank)",
        "name_en": "Core Plank Hold",
        "category": "Core Stability",
        "target_muscles": "डीप कोर (Transverse Abdominis), कमर",
        "benefits": "कमर के निचले हिस्से (L5-S1) को मजबूत सुरक्षा शील्ड प्रदान करता है।",
        "duration": "3 सेट्स x 30-45 सेकंड",
        "icon": "Shield"
    },
    "tree_pose": {
        "id": "tree_pose",
        "name_hi": "वृक्षासन (Tree Pose)",
        "name_en": "Tree Pose",
        "category": "Hatha Yoga & Balance",
        "target_muscles": "टखने (Ankle Stabilizers), पेल्विक संतुलन, डीप कोर",
        "benefits": "न्यूरोमस्कुलर समन्वय, संतुलन और एकाग्रता में वृद्धि।",
        "duration": "3 मिनट (प्रति साइड 45 सेकंड)",
        "icon": "Activity"
    },
    "downward_dog": {
        "id": "downward_dog",
        "name_hi": "अधोमुख श्वानासन (Downward Dog)",
        "name_en": "Downward Dog",
        "category": "Hatha Yoga & Balance",
        "target_muscles": "काफ्स, हैमस्ट्रिंग्स, कंधे, रीढ़",
        "benefits": "दिनभर बैठे रहने से सिकुड़ी पिछली मांसपेशियों (Posterior Chain) को स्ट्रेच करता है।",
        "duration": "3-5 मिनट",
        "icon": "Activity"
    },
    "lunges": {
        "id": "lunges",
        "name_hi": "लंजेस (Lunges)",
        "name_en": "Walking Lunges",
        "category": "Gym & Unilateral",
        "target_muscles": "क्वाड्रिसेप्स, हिप फ्लेक्सर्स, ग्लूट्स",
        "benefits": "हिप्स की जकड़न खोलता है और दोनों पैरों की ताकत को संतुलित करता है।",
        "duration": "5 मिनट",
        "icon": "Dumbbell"
    },
    "pushup": {
        "id": "pushup",
        "name_hi": "पुश-अप्स (Push-ups)",
        "name_en": "Push-ups",
        "category": "Calisthenics & Strength",
        "target_muscles": "छाती (Pectoralis), ट्राइसेप्स, कंधे",
        "benefits": "ऊपरी शरीर की ताकत और मजबूत स्कैपुलर स्थिरता।",
        "duration": "5 मिनट",
        "icon": "Dumbbell"
    },
    "warrior_two": {
        "id": "warrior_two",
        "name_hi": "वीरभद्रासन II (Warrior II)",
        "name_en": "Warrior II",
        "category": "Hatha Yoga & Balance",
        "target_muscles": "ग्रोइन, हिप्स, पैर, कंधे",
        "benefits": "पैल्विक क्षेत्र का तनाव दूर करता है और सहनशक्ति बढ़ाता है।",
        "duration": "4 मिनट",
        "icon": "Activity"
    },
    "triangle": {
        "id": "triangle",
        "name_hi": "त्रिकोणासन (Triangle Pose)",
        "name_en": "Triangle Pose",
        "category": "Hatha Yoga & Balance",
        "target_muscles": "साइड स्पाइन (Obliques), हैमस्ट्रिंग्स",
        "benefits": "रीढ़ के लचीलेपन और साइड-बेंडिंग मोबिलिटी में सुधार।",
        "duration": "4 मिनट",
        "icon": "Activity"
    },
    "reaction": {
        "id": "reaction",
        "name_hi": "प्रतिक्रिया व मनोदशा (Reaction & Emotion)",
        "name_en": "Reaction & Emotion",
        "category": "REACTION & EMOTION",
        "target_muscles": "चेहरा (Facial Micro-muscles), ऑक्युलर फोकस (Eyes), मानसिक तनाव",
        "benefits": "आंखों का तनाव (Eye Strain), मानसिक थकान और उच्च तनाव स्तर को घटाकर मूड को तरोताजा करता है।",
        "duration": "3-5 मिनट",
        "icon": "Smile",
        "route": "/reaction-analysis"
    }
}

# Training dataset benchmarks provided for AI classification
TRAINING_DATA = [
    {
        "input_features": {
            "lifestyle": "desk_bound",
            "sitting_hours": 9,
            "pain_area": "neck_upper_back",
            "stress_level": "medium",
            "fitness_level": "all_levels"
        },
        "recommended_label": "Desk Ergonomics",
        "category": "DESK ERGONOMICS",
        "exercise_id": "desk_posture"
    },
    {
        "input_features": {
            "lifestyle": "student_or_wfh",
            "sitting_hours": 8,
            "pain_area": "eye_strain_fatigue",
            "stress_level": "high",
            "fitness_level": "all_levels"
        },
        "recommended_label": "Reaction & Emotion",
        "category": "REACTION & EMOTION",
        "exercise_id": "reaction"
    },
    {
        "input_features": {
            "lifestyle": "early_riser_active",
            "sitting_hours": 5,
            "pain_area": "none",
            "stress_level": "low",
            "fitness_level": "all_levels"
        },
        "recommended_label": "Surya Namaskar",
        "category": "TRADITIONAL YOGA FLOW",
        "exercise_id": "suryanamaskar"
    }
]

# Healthy lifestyle habits beyond the app (Ergonomics, walking, running, screen habits)
BEYOND_APP_HABITS = [
    {
        "id": "look_away_20_20",
        "title": "20-20-20 स्क्रीन नियम (Look Away)",
        "subtitle": "कंप्यूटर व स्क्रीन से नजर हटाएं",
        "icon": "Eye",
        "category": "Eye & Cervical Ergonomics",
        "action": "हर 20 मिनट काम करने के बाद 20 सेकंड के लिए 20 फीट दूर किसी वस्तु को देखें।",
        "benefits": "आंखों का सूखापन, सिरदर्द और गर्दन के पिछले हिस्से के खिंचाव को तुरंत रिलीज करता है।",
        "frequency": "हर 20 मिनट"
    },
    {
        "id": "micro_walk_5min",
        "title": "5 मिनट की माइक्रो-वॉक (5-Min Hourly Walk)",
        "subtitle": "कुर्सी से उठकर टहलें",
        "icon": "Footprints",
        "category": "Cardio & Kinetic Chain",
        "action": "हर 1 घंटे लगातार बैठने के बाद 5 मिनट कुर्सी से उठकर घूमें, पानी पिएं या सीढ़ियां चढ़ें।",
        "benefits": "डीप वेन थ्रॉम्बोसिस, कमर की लम्बर डिस्क पर संपीड़न और सोए हुए ग्लूट्स (Glute Amnesia) से बचाव।",
        "frequency": "प्रति घंटा"
    },
    {
        "id": "running_brisk_walk",
        "title": "20 मिनट आउटडोर रनिंग / ब्रिस्क वॉक",
        "subtitle": "दैनिक कार्डियो एरोबिक मूवमेंट",
        "icon": "Flame",
        "category": "Endurance & Cardio",
        "action": "सुबह या शाम 15 से 20 मिनट खुली ताजी हवा में तेज चाल (Brisk Walk) या हल्की जॉगिंग / रनिंग करें।",
        "benefits": "हार्ट रेट और कार्डियोवैस्कुलर क्षमता बढ़ाता है, फेफड़ों को ऑक्सीजन देता है और तनाव घटाता है।",
        "frequency": "दैनिक (सुबह या शाम)"
    },
    {
        "id": "desk_shoulder_rolls",
        "title": "डेस्क शोल्डर रोल्स व चिन-टक्स",
        "subtitle": "बैठे-बैठे रीढ़ की रीसेट",
        "icon": "RotateCw",
        "category": "Mobility",
        "action": "कुर्सी पर सीधे बैठकर दोनों कंधों को 10 बार पीछे गोल घुमाएं और ठोड़ी को पीछे खींचकर चिन-टक करें।",
        "benefits": "झुके हुए कंधों (Round Shoulders) और टेक्स्ट-नेक (Text Neck) से त्वरित राहत।",
        "frequency": "दिन में 3-4 बार"
    }
]

def _generate_natural_voice_summary(user_msg: str, matched_exercises: list) -> str:
    """
    Generates a short, crisp, natural conversational spoken sentence in Hindi (15-25 words max).
    Example: 'आपके लिए सूर्य नमस्कार, 5 मिनट की वॉक और स्क्रीन से 20 सेकंड दूर देखना सबसे अच्छा रहेगा।'
    """
    msg = user_msg.lower()
    ex_names = [e["name_hi"].split("(")[0].strip() for e in matched_exercises[:2]]
    ex_str = " और ".join(ex_names) if ex_names else "सूर्य नमस्कार"

    if any(k in msg for k in ["sit", "बैठ", "desk", "computer", "laptop", "कुर्सी", "8 hour", "9 hour", "10 hour"]):
        return f"आपके लिए {ex_str}, हर एक घंटे में पांच मिनट की वॉक, और स्क्रीन से हर बीस मिनट में दूर देखना सबसे अच्छा रहेगा।"
    elif any(k in msg for k in ["neck", "गर्दन", "shoulder", "कंधे", "text neck"]):
        return f"गर्दन और कंधों के तनाव के लिए {ex_str} बहुत असरदार रहेगा। साथ ही स्क्रीन को आंखों के स्तर पर रखें।"
    elif any(k in msg for k in ["back", "कमर", "spine", "पीठ", "l5"]):
        return f"कमर दर्द से बचाव के लिए {ex_str} सबसे सही रहेगा। लगातार बैठने के बीच पांच मिनट की वॉक जरूर लें।"
    elif any(k in msg for k in ["knee", "घुटना", "घुटने", "joint"]):
        return f"घुटनों की मजबूती के लिए {ex_str} करें और रोज सुबह बीस मिनट की हल्की वॉक बनाए रखें।"
    elif any(k in msg for k in ["morning", "सुबह", "yoga", "ऊर्जा", "energy"]):
        return f"सुबह के लिए {ex_str} और ताजी हवा में पंद्रह मिनट की रनिंग आपके शरीर को पूरे दिन ऊर्जावान रखेगी।"
    elif any(k in msg for k in ["walk", "वॉक", "टहल", "running", "दौड़"]):
        return f"बहुत बढ़िया! बीस मिनट की ब्रिस्क वॉक या रनिंग के साथ {ex_str} करने से आप हमेशा स्वस्थ रहेंगे।"
    else:
        return f"आपके लिए {ex_str} और दिनभर में पांच मिनट की माइक्रो वॉक सबसे सही रहेगी।"

LIFESTYLE_RULES = [
    {
        "keywords": ["sitting", "desk", "computer", "laptop", "office", "बैठने", "डेस्क", "लैपटॉप", "कुर्सी", "8 hour", "9 hour", "10 hour", "hours"],
        "recommended": ["desk_posture", "cobra", "squat"],
        "advice_hi": "लंबे समय तक डेस्क पर बैठने से हिप फ्लेक्सर्स सिकुड़ जाते हैं और गर्दन पर अतिरिक्त दबाव पड़ता है। हर 45 मिनट में 2 मिनट का वॉक लें, 'डेस्क पोस्चर असेसमेंट' चालू करें और शाम को भुजंगासन व ग्लूट ब्रिज अवश्य करें।",
        "prevention": "एर्गोनॉमिक मॉनिटर अलाइनमेंट (आंखों के स्तर पर स्क्रीन) और लम्बर सपोर्ट से साइटिका व सर्वाइकल स्पॉन्डिलाइटिस से स्थायी बचाव होता है।"
    },
    {
        "keywords": ["neck", "neck pain", "cervical", "गर्दन", "गर्दन दर्द", "कंधे", "shoulder", "trapezius", "text neck"],
        "recommended": ["desk_posture", "cobra", "downward_dog"],
        "advice_hi": "गर्दन आगे झुकने (Forward Head Posture / Text Neck) से सर्वाइकल स्पाइन पर 27 किलोग्राम तक का भार पड़ता है। चिन टक्स (Chin Tucks) और भुजंगासन से डीप नेक फ्लेक्सर्स मजबूत होंगे।",
        "prevention": "मोबाइल को आंखों के सामने लाकर इस्तेमाल करें, सिर को नीचे न झुकाएं। हर 1 घंटे में 5 सेकंड के 5 चिन-टक्स करें।"
    },
    {
        "keywords": ["back", "back pain", "lower back", "spine", "कमर", "कमर दर्द", "पीठ", "रीढ़", "l5", "s1", "lumbar"],
        "recommended": ["cobra", "plank", "suryanamaskar"],
        "advice_hi": "लोअर बैक दर्द का 80% कारण कमजोर कोर और निष्क्रिय ग्लूट्स होते हैं। प्लैंक से रीढ़ को ब्रेस करें और भुजंगासन से लम्बर डिस्क पर दबाव कम करें। भारी वजन अचानक उठाने से बचें।",
        "prevention": "कमर को सीधा रखने के लिए पेट को हमेशा 20% हल्का टाइट (Bracing) रखें और एब्स व ग्लूट्स को मजबूत बनाएं।"
    },
    {
        "keywords": ["knee", "knees", "घुटना", "घुटने", "joint pain", "जोड़ों"],
        "recommended": ["tree_pose", "desk_posture", "squat"],
        "advice_hi": "घुटनों की सुरक्षा के लिए क्वाड्रिसेप्स और हिप एब्डक्टर्स (Gluteus Medius) को मजबूत करना अनिवार्य है। गहरे स्क्वैट्स के बजाय बॉक्स स्क्वैट्स या वृक्षासन से न्यूरोमस्कुलर स्थिरता बढ़ाएं।",
        "prevention": "चलते व उठते समय घुटनों को अंदर की ओर (Knee Valgus) न दबने दें। हमेशा पैर के पंजों की सीध में रखें।"
    },
    {
        "keywords": ["morning", "yoga", "flow", "stiffness", "सुबह", "योग", "दिनचर्या", "ऊर्जा", "energy", "flexibility", "लचीलापन"],
        "recommended": ["suryanamaskar", "tree_pose", "cobra"],
        "advice_hi": "सुबह का 10-15 मिनट का सूर्य नमस्कार सत्र 12 आसनों और श्वास के तालमेल से पूरे शरीर की रक्त संचार प्रणाली और लचीलेपन को पुनर्जीवित कर देता है।",
        "prevention": "सूर्योदय के समय खाली पेट नियमित सूर्य नमस्कार करने से मेटाबॉलिक रेट बढ़ता है और जीवनशैली जनित बीमारियों का खतरा 60% घटता है।"
    },
    {
        "keywords": ["stress", "fatigue", "tired", "थकान", "तनाव", "चिंता", "sleep", "नींद", "relax", "breath"],
        "recommended": ["suryanamaskar", "tree_pose", "desk_posture"],
        "advice_hi": "मानसिक तनाव सीधे गर्दन और ट्रैपेजियस मांसपेशियों में खिंचाव पैदा करता है। 5 मिनट का डीप डायफ्राग्मैटिक प्राणायाम (4 सेकंड श्वास, 4 सेकंड होल्ड, 6 सेकंड प्रश्वास) कोर्टिसोल को घटाता है।",
        "prevention": "सोने से 1 घंटा पहले स्क्रीन बंद करें और 5 मिनट वृक्षासन में स्थिर दृष्टि साधकर मन को शांत करें।"
    }
]


def _call_ollama_chat(prompt: str) -> str:
    """Invokes local Ollama qwen2.5:latest model with optimized token budget for fast response."""
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
    
    payload = {
        "model": ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "top_p": 0.85,
            "num_predict": 140,
        }
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ollama_url,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=45.0) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result.get("response", "").strip()


def _call_gemini_chat(prompt: str) -> str:
    """Invokes Google Gemini API if key is set."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 150}
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=15.0) as response:
        result = json.loads(response.read().decode("utf-8"))
        candidates = result.get("candidates", [])
        if candidates:
            return candidates[0]["content"]["parts"][0]["text"].strip()
    return ""


@ask_ai_bp.route('/chat', methods=['POST'])
def chat():
    """
    Main conversational endpoint:
    Curates response STRICTLY and ONLY from the user's voice/text query.
    No preset bias from fill-up forms. No canned fallbacks whatsoever.
    """
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    user_msg = (data.get("message") or "").strip()

    if not user_msg:
        return jsonify({"error": "संदेश खाली है (Empty message)"}), 400

    # Build prompt curated ONLY from what the user said, informed by training benchmarks
    llm_prompt = f"""You are PostureTrek AI's personal health, yoga, and movement coach.

TRAINING BENCHMARKS:
- If desk-bound / 8-9h sitting / neck & upper-back pain -> Recommend "Desk Ergonomics" (डेस्क पोस्चर असेसमेंट) and 20-20 screen rule.
- If student / WFH / 8h screen / eye strain & fatigue / high stress -> Recommend "Reaction & Emotion" (प्रतिक्रिया व मनोदशा AI / स्माइल व आई रिफ्रेश) and 5-min walk.
- If early riser / active / 5h sitting / low stress -> Recommend "Surya Namaskar" (सूर्य नमस्कार 12 आसन) and outdoor brisk walk/running.

USER INPUT:
"{user_msg}"

INSTRUCTIONS:
1. Base your answer STRICTLY on what the user asked above, guided by the training benchmarks.
2. Give 2-3 concise, practical bullet points in Hindi (under 70 words total).
3. On the last line write:
VOICE_SUMMARY: <one short friendly spoken line in Hindi under 15 words>"""

    ai_reply = ""
    try:
        ai_reply = _call_ollama_chat(llm_prompt)
    except Exception as e:
        print("Ollama call failed:", e)

    if not ai_reply:
        try:
            ai_reply = _call_gemini_chat(llm_prompt)
        except Exception as e:
            print("Gemini call failed:", e)

    # NO FALLBACKS WHATSOEVER: if AI model fails, return explicit error to user
    if not ai_reply:
        return jsonify({
            "error": "माफ कीजिए, AI अभी प्रोसेस नहीं कर पा रहा है। कृपया पुनः प्रयास करें।",
            "reply": "माफ कीजिए, AI अभी आपके संदेश को प्रोसेस नहीं कर पा रहा है। कृपया पुनः प्रयास करें।",
            "voice_summary": "माफ कीजिए, AI अभी प्रोसेस नहीं कर पा रहा है। कृपया पुनः प्रयास करें।",
            "suggested_exercises": [],
            "beyond_app_habits": []
        }), 503

    # Extract clean response text and the LLM's own generated voice summary
    voice_summary = ""
    clean_reply = ai_reply

    for marker in ["VOICE_SUMMARY:", "VOICE_LINE:", "VOICE:", "VOICE_SUMMARY", "VOICE_LINE"]:
        if marker in clean_reply:
            parts = clean_reply.split(marker)
            clean_reply = parts[0].strip()
            after_text = parts[1].strip().lstrip(":").strip()
            if after_text:
                voice_summary = after_text.split("\n")[0].strip()
            break

    if not voice_summary:
        lines = [l.strip() for l in clean_reply.split("\n") if l.strip() and not l.strip().startswith("#")]
        if lines:
            voice_summary = lines[0].replace("*", "").replace("•", "").strip()[:140]

    # Dynamically attach system exercise launch cards that match the conversation
    text_corpus = (user_msg + " " + clean_reply).lower()
    matched_exercises = []

    if any(k in text_corpus for k in ["desk", "डेस्क", "बैठ", "sitting", "laptop", "computer"]):
        matched_exercises.append(SYSTEM_EXERCISES["desk_posture"])
    if any(k in text_corpus for k in ["reaction", "emotion", "eye", "आंख", "fatigue", "थकान", "stress", "तनाव", "smile", "मनोदशा", "student", "wfh", "प्रतिक्रिया"]):
        matched_exercises.append(SYSTEM_EXERCISES["reaction"])
    if any(k in text_corpus for k in ["surya", "सूर्य", "namaskar", "morning", "सुबह"]):
        matched_exercises.append(SYSTEM_EXERCISES["suryanamaskar"])
    if any(k in text_corpus for k in ["cobra", "भुजंग", "back", "कमर", "पीठ", "spine", "lumbar", "l5"]):
        matched_exercises.append(SYSTEM_EXERCISES["cobra"])
    if any(k in text_corpus for k in ["knee", "घुटना", "घुटने", "balance", "संतुलन", "वृक्षासन", "tree"]):
        matched_exercises.append(SYSTEM_EXERCISES["tree_pose"])
    if any(k in text_corpus for k in ["squat", "स्क्वैट", "leg", "जांघ", "glute"]):
        matched_exercises.append(SYSTEM_EXERCISES["squat"])
    if any(k in text_corpus for k in ["plank", "प्लैंक", "core", "कोर", "abs"]):
        matched_exercises.append(SYSTEM_EXERCISES["plank"])
    if any(k in text_corpus for k in ["lunge", "लंजेस", "hip", "हिप"]):
        matched_exercises.append(SYSTEM_EXERCISES["lunges"])
    if any(k in text_corpus for k in ["downward", "अधोमुख", "hamstring"]):
        matched_exercises.append(SYSTEM_EXERCISES["downward_dog"])

    # Dynamically attach beyond-app habits that match the conversation
    matched_habits = []
    if any(k in text_corpus for k in ["computer", "screen", "स्क्रीन", "desk", "laptop", "eye", "आंख"]):
        matched_habits.append(BEYOND_APP_HABITS[0])  # 20-20-20 Look Away
    if any(k in text_corpus for k in ["walk", "वॉक", "टहल", "sit", "बैठ", "hour", "घंटे"]):
        matched_habits.append(BEYOND_APP_HABITS[1])  # 5-Min Hourly Walk
    if any(k in text_corpus for k in ["run", "दौड़", "running", "cardio", "stamina", "सुबह", "jogging"]):
        matched_habits.append(BEYOND_APP_HABITS[2])  # 20-Min Running / Brisk Walk
    if any(k in text_corpus for k in ["shoulder", "कंधे", "neck", "गर्दन", "stretch"]):
        matched_habits.append(BEYOND_APP_HABITS[3])  # Desk shoulder rolls

    return jsonify({
        "reply": clean_reply,
        "audio_speech": voice_summary,
        "voice_summary": voice_summary,
        "suggested_exercises": matched_exercises[:4],
        "beyond_app_habits": matched_habits,
        "quick_replies": [
            "और विस्तार से बताएं",
            "इसके साथ क्या सावधानियां रखनी चाहिए?",
            "दैनिक रूटीन कैसे सेट करें?"
        ]
    })


@ask_ai_bp.route('/lifestyle_assessment', methods=['POST'])
def lifestyle_assessment():
    """
    Generates a personalized daily wellness prescription and preventative posture plan:
    Body: {
      "occupation": "Software Engineer",
      "hours_sitting": 9,
      "pain_areas": ["neck", "lower_back"],
      "fitness_level": "beginner",
      "primary_goal": "posture_and_pain_relief"
    }
    """
    data = request.get_json(silent=True) or {}
    occupation = data.get("occupation", "Desk Professional")
    hours_sitting = int(data.get("hours_sitting", 8))
    pain_areas = data.get("pain_areas", ["neck", "lower_back"])
    fitness_level = data.get("fitness_level", "beginner")
    primary_goal = data.get("primary_goal", "posture_and_pain_relief")

    # Determine risk factors
    risk_factors = []
    if hours_sitting >= 8:
        risk_factors.append({
            "title": "लंबे समय तक बैठना (Prolonged Sedentary Time)",
            "severity": "High",
            "disease_risk": "ग्लूट एमनीशिया, मेटाबॉलिक सिंड्रोम और साइटिका नर्व संपीड़न",
            "counter_measure": "हर 45 मिनट में 2 मिनट खड़े होकर शोल्डर ओपनर करें।"
        })
    if "neck" in pain_areas:
        risk_factors.append({
            "title": "टेक्स्ट-नेक व सर्वाइकल स्ट्रेस (Cervical Compression)",
            "severity": "Moderate",
            "disease_risk": "सर्वाइकल स्पॉन्डिलाइटिस और क्रोनिक तनाव सिरदर्द",
            "counter_measure": "चिन टक्स (Chin Tucks) और 20-20-20 आई/पोस्चर ब्रेक अपनाएं।"
        })
    if "lower_back" in pain_areas:
        risk_factors.append({
            "title": "L5-S1 लम्बर डिस्क शियर स्ट्रेस (Lumbar Shear)",
            "severity": "High",
            "disease_risk": "हर्निएटेड डिस्क और लोअर बैक स्पैज़्म",
            "counter_measure": "कोर प्लैंक और भुजंगासन से एंटी-एक्सटेंशन स्ट्रेंथ बनाएं।"
        })

    # Curate personalized morning, workday, and evening protocol
    prescribed_exercises = []
    if hours_sitting >= 6:
        prescribed_exercises.append(SYSTEM_EXERCISES["desk_posture"])
    if "lower_back" in pain_areas or hours_sitting >= 7:
        prescribed_exercises.append(SYSTEM_EXERCISES["cobra"])
    prescribed_exercises.append(SYSTEM_EXERCISES["suryanamaskar"])
    prescribed_exercises.append(SYSTEM_EXERCISES["squat"])

    routine_plan = {
        "morning": {
            "title": "🌅 प्रातःकालीन पुनर्जीवन (10 मिनट)",
            "description": "रीढ़ को सक्रिय करने और श्वास प्रवाह बढ़ाने के लिए सूर्य नमस्कार व ताड़ासन।",
            "recommended_exercise": SYSTEM_EXERCISES["suryanamaskar"]
        },
        "workday": {
            "title": "💼 कार्यस्थल डेस्क रीसेट (5 मिनट)",
            "description": "स्क्रीन के सामने सही पोस्चर और सर्वाइकल गर्दन खिंचाव से राहत।",
            "recommended_exercise": SYSTEM_EXERCISES["desk_posture"]
        },
        "evening": {
            "title": "🌙 सायंकालीन स्पाइनल डीकंप्रेशन (8 मिनट)",
            "description": "दिनभर के बैठने के तनाव को भुजंगासन व ग्लूट ब्रिज से रिलीज करें।",
            "recommended_exercise": SYSTEM_EXERCISES["cobra"]
        }
    }

    summary_text = (
        f"आपके {occupation} प्रोफेशन ({hours_sitting} घंटे दैनिक सिटिंग) के आधार पर आपका पर्सनलाइज्ड लाइफस्टाइल "
        f"हेल्थ प्लान तैयार किया गया है। यह प्लान सर्वाइकल और लम्बर जोड़ों को सुरक्षित रखते हुए आपको दिनभर ऊर्जावान रखेगा।"
    )

    return jsonify({
        "status": "success",
        "occupation": occupation,
        "hours_sitting": hours_sitting,
        "summary_text": summary_text,
        "risk_factors": risk_factors,
        "routine_plan": routine_plan,
        "prescribed_exercises": prescribed_exercises,
    })


@ask_ai_bp.route('/quick_prompts', methods=['GET'])
def quick_prompts():
    """Returns curated starter prompts categorized for fast click interaction."""
    return jsonify({
        "categories": [
            {
                "title": "💼 डेस्क व सिटिंग लाइफस्टाइल",
                "prompts": [
                    "मैं 9 घंटे रोज़ लैपटॉप पर बैठता हूँ, पीठ और गर्दन के दर्द से कैसे बचूँ?",
                    "स्टडी और कोडिंग करते समय सही बैठने का पोस्चर क्या होना चाहिए?",
                    "लंबे समय तक बैठने से होने वाले टेक्स्ट-नेक को कैसे ठीक करें?"
                ]
            },
            {
                "title": "🧘 योग व समग्र तंदुरुस्ती",
                "prompts": [
                    "शुरुआती अभ्यासियों के लिए 10-मिनट का सुबह का योग रूटीन बताएं।",
                    "सूर्य नमस्कार के 12 चरणों का सही क्रम और श्वास तालमेल क्या है?",
                    "दिनभर की मानसिक थकान और तनाव को दूर करने के लिए कौन सा योग करें?"
                ]
            },
            {
                "title": "🛡️ जोड़ों का दर्द व बीमारी से बचाव",
                "prompts": [
                    "कमर के निचले हिस्से (Lower Back L5-S1) को मजबूत कैसे रखें?",
                    "घुटनों के दर्द या कमज़ोरी में कौन से व्यायाम सुरक्षित हैं?",
                    "अंटीरियर पेल्विक टिल्ट (Anterior Pelvic Tilt) को कैसे ठीक करें?"
                ]
            }
        ]
    })
