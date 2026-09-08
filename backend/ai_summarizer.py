import os
import json
import urllib.request
import urllib.parse
import threading
import time

class AISummarizer:
    """
    AI Summarizer Engine for AuraTrek / Nirmaya platform.
    Parses real-time live feed telemetry (YOLO pose keypoints, joint angles, rep performance, form errors)
    and generates natural language AI insights and detailed session summaries.
    Uses local Ollama AI model (qwen2.5:latest) or Google Gemini API.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
        
        self.cached_insight = {}          # keyed by exercise_type
        self.cached_accuracy = {}         # last accuracy when cache was written
        self.is_generating_live = False
        self.last_live_generate_time = 0

    def _compute_form_quality(self, accuracy: float, issues: list) -> str:
        """Derive form_quality deterministically from live metrics (never rely on stale AI value)."""
        has_critical = bool(issues)
        if accuracy >= 80 and not has_critical:
            return "Optimal"
        elif accuracy >= 50 or (accuracy >= 30 and not has_critical):
            return "Needs Attention"
        else:
            return "Critical Correction"

    def generate_live_feed_insight(self, exercise_type: str, metrics: dict, rep_history: list = None) -> dict:
        """
        Parses live feed telemetry per frame / interval and returns micro AI feedback & form score using Ollama AI model.
        Uses background async thread execution to eliminate webcam frame lag.
        """
        stage = metrics.get("stage", "detecting")
        total_reps = metrics.get("total_reps", 0)
        correct_reps = metrics.get("correct_reps", 0)
        incorrect_reps = metrics.get("incorrect_reps", 0)
        feedback = metrics.get("feedback", "")
        accuracy = metrics.get("accuracy", 0.0)
        issues = metrics.get("issues", [])

        rep_history = list(rep_history) if rep_history else []
        recent_errors = []
        for rep in rep_history[-3:]:
            if isinstance(rep, dict) and "errors" in rep:
                recent_errors.extend(rep.get("errors", []))

        # Invalidate cache if accuracy shifted significantly (>15 pp) since last generation
        cached_acc = self.cached_accuracy.get(exercise_type)
        accuracy_shifted = cached_acc is not None and abs(accuracy - cached_acc) > 15

        # Check if we should launch background Ollama AI generation
        now = time.time()
        if not self.is_generating_live and (now - self.last_live_generate_time > 2.5 or accuracy_shifted):
            if accuracy_shifted:
                # Invalidate stale cache immediately so wrong text isn't shown
                self.cached_insight.pop(exercise_type, None)
            self.is_generating_live = True
            threading.Thread(
                target=self._async_ollama_live_worker,
                args=(exercise_type, metrics, recent_errors),
                daemon=True
            ).start()

        # Return cached insight with live metric overrides
        if self.cached_insight.get(exercise_type):
            res = dict(self.cached_insight[exercise_type])
            res["stage"] = stage
            res["total_reps"] = total_reps
            res["accuracy"] = accuracy
            # Always recompute form_quality from live metrics — never use stale AI value
            res["form_quality"] = self._compute_form_quality(accuracy, issues)
            return res

        # Check if Gemini API key exists as secondary option
        if self.api_key:
            try:
                insight = self._call_gemini_live_insight(exercise_type, metrics, recent_errors)
                if insight:
                    insight["form_quality"] = self._compute_form_quality(accuracy, issues)
                    return insight
            except Exception as e:
                print(f"[AISummarizer] Gemini Live API call error: {e}")

        # Check if Gemini API key exists as secondary option
        if self.api_key:
            try:
                insight = self._call_gemini_live_insight(exercise_type, metrics, recent_errors)
                if insight:
                    insight["form_quality"] = self._compute_form_quality(accuracy, issues)
                    return insight
            except Exception as e:
                print(f"[AISummarizer] Gemini Live API call error: {e}")

        # Real-time Telemetry State — reflects active YOLO tracking and analyzer feedback without fake canned text
        ex_label = exercise_type.replace("_", " ").title()
        primary_issue = issues[0].replace("_", " ").title() if issues else (recent_errors[0].replace("_", " ").title() if recent_errors else None)
        return {
            "summary": f"AI Neural Engine actively tracking {ex_label} kinematics ({accuracy}% accuracy).",
            "coaching_tip": feedback or (f"Focus on correcting {primary_issue}." if primary_issue else "Maintain cadence and joint stability."),
            "live_speech": feedback or (f"Watch {primary_issue}." if primary_issue else f"Steady {ex_label} tracking."),
            "form_quality": self._compute_form_quality(accuracy, issues),
            "focus_joint": primary_issue or "Kinetic Alignment",
            "stage": stage,
            "total_reps": total_reps,
            "accuracy": accuracy,
            "is_analyzing": True,
        }

    def _async_ollama_live_worker(self, exercise_type: str, metrics: dict, recent_errors: list):
        try:
            insight = self._call_ollama_live_insight(exercise_type, metrics, recent_errors)
            if insight:
                accuracy = metrics.get("accuracy", 0.0)
                issues = metrics.get("issues", [])
                insight["form_quality"] = self._compute_form_quality(accuracy, issues)
                self.cached_insight[exercise_type] = insight
                self.cached_accuracy[exercise_type] = accuracy
        except Exception as e:
            print(f"[AISummarizer] Async Ollama worker error: {e}")
        finally:
            self.last_live_generate_time = time.time()
            self.is_generating_live = False

    def generate_immediate_diagnostic(self, exercise_type: str, summary_data: dict) -> dict:
        """
        Generates instantaneous (<2ms) deterministic kinematic AI diagnosis directly from session telemetry in Hindi.
        Contains detailed breakdown:
        1. क्या-क्या किया (What you did: Reps, sets, accuracy, time, muscles)
        2. क्या-क्या गलतियां हुईं (Mistakes observed & biomechanical causes)
        3. सुधार के लिए छोटी-छोटी एक्सरसाइज (Corrective micro-exercises with sets & steps)
        4. सुरक्षा व रिकवरी सलाह (Safety & recovery protocol)
        """
        total_reps = summary_data.get("total_reps", 0)
        correct_reps = summary_data.get("correct_reps", 0)
        incorrect_reps = summary_data.get("incorrect_reps", 0)
        accuracy = round(float(summary_data.get("accuracy", 0.0)), 1)
        rep_log = summary_data.get("rep_log", [])

        all_errors = []
        min_angles = []
        for rep in rep_log:
            if isinstance(rep, dict):
                all_errors.extend(rep.get("errors", []))
                if "min_angle" in rep and rep["min_angle"] is not None:
                    min_angles.append(rep["min_angle"])

        # Hindi Title & Muscle Groups Mapping
        titles_map = {
            "squat": "स्क्वाट (Squats)",
            "pushup": "पुश-अप (Push-ups)",
            "desk_posture": "स्टडी व डेस्क पोस्चर (Desk Ergonomics)",
            "suryanamaskar": "सूर्य नमस्कार (Surya Namaskar)",
            "surya_namaskar": "सूर्य नमस्कार (Surya Namaskar)",
            "tree_pose": "वृक्षासन (Tree Pose)",
            "lunges": "लंजेस (Lunges)",
            "plank": "प्लैंक होल्ड (Plank Hold)",
            "reaction": "रिएक्शन व इमोशन (Reaction AI)",
            "warrior_two": "वीरभद्रासन II (Warrior II)",
            "triangle": "त्रिकोणासन (Triangle Pose)",
            "downward_dog": "अधोमुख श्वानासन (Downward Dog)",
            "cobra": "भुजंगासन (Cobra Pose)",
            "tadasana": "ताड़ासन (Mountain Pose)",
            "posture": "पोस्चर असेसमेंट (Posture Assessment)",
        }
        muscles_map = {
            "squat": "Quadriceps (जांघें), Gluteus Maximus (हिप्स), Hamstrings, और Core Stabilizers",
            "pushup": "Pectoralis Major (चेस्ट), Triceps Brachii, Anterior Deltoids (कंधे), और Core",
            "desk_posture": "Cervical Spine (गर्दन), Upper Trapezius, Rhomboids, और Thoracic Extensors",
            "suryanamaskar": "Full Body Kinetic Chain, Hamstrings, स्पाइनल फ्लेक्सिबिलिटी, और चेस्ट",
            "tree_pose": "Ankle Stabilizers, Calves, Gluteus Medius (संतुलन), और Deep Core",
            "lunges": "Quadriceps, Glutes, Hamstrings, और Pelvic Stabilizers",
            "plank": "Rectus Abdominis, Transverse Abdominis, Glutes, और Serratus Anterior",
            "reaction": "Facial Blendshapes, Blink Rate, और न्यूरोमस्कुलर फोकस",
        }

        ex_title = titles_map.get(exercise_type, exercise_type.replace("_", " ").title())
        target_muscles = muscles_map.get(exercise_type, "Core और Kinetic Chain Stabilizers")

        grade = "A+" if accuracy >= 90 else ("A" if accuracy >= 80 else ("B" if accuracy >= 65 else ("C" if accuracy >= 50 else "D")))
        headline = f"{ex_title} बायोमैकेनिक्स रिपोर्ट: ग्रेड {grade}"
        score_text = f"ग्रेड {grade} • {accuracy}% बायोमैकेनिकल सटीकता"

        # 1. क्या-क्या किया (What all you did)
        if exercise_type == "reaction":
            what_you_did_text = (
                f"आपने {ex_title} का लाइव असेसमेंट पूरा किया। सत्र के दौरान आपकी चेहरे की मांसपेशियों की सतर्कता, "
                f"ब्लिंक फ्रीक्वेंसी (Blink Rate) और इमोशनल बैलेंस का विश्लेषण हुआ। कुल सटीकता स्कोर {accuracy}% रहा।"
            )
        elif exercise_type == "desk_posture":
            what_you_did_text = (
                f"आपने {ex_title} सत्र के दौरान गर्दन, रीढ़ (Spine) और बैठने की एर्गोनॉमिक्स की लाइव निगरानी की। "
                f"कुल {accuracy}% समय तक आपका पोस्चर सुरक्षित कार्य-दायरे में रहा।"
            )
        else:
            what_you_did_text = (
                f"आपने कुल {total_reps} {ex_title} रेप्स पूरे किए। इनमें से {correct_reps} रेप्स उत्तम बायोमैकेनिकल फॉर्म और निर्धारित डेप्थ "
                f"(Kinematic Depth) के साथ पूरे हुए, जबकि {incorrect_reps} रेप्स में फॉर्म डिसबैलेंस दर्ज हुआ। सत्र की कुल सटीकता {accuracy}% रही।"
            )

        # 2. क्या-क्या गलतियां हुईं (Mistakes analysis & causes)
        unique_errors = list(set(all_errors))
        mistakes_list = []
        error_explanations = {
            "both_knees_inward": {
                "name": "घुटनों का अंदर की ओर झुकना (Knee Valgus Collapse)",
                "reason": "नीचे झुकते और ऊपर उठते समय दोनों घुटने अंदर धंसे। इसका मुख्य कारण Gluteus Medius (हिप एब्डक्टर्स) की निष्क्रियता और सीमित एंकल मोबिलिटी (Ankle Dorsiflexion) है, जिससे घुटने के लिगामेंट्स (ACL/MCL) पर दबाव बढ़ता है।"
            },
            "left_knee_inward": {
                "name": "बायां घुटना अंदर झुकना (Left Knee Valgus)",
                "reason": "बायां घुटना अंदर की ओर दबा, जिससे बाईं पेल्विक साइड में अनबैलेंस लोड पड़ा।"
            },
            "right_knee_inward": {
                "name": "दायां घुटना अंदर झुकना (Right Knee Valgus)",
                "reason": "दायां घुटना अंदर की ओर दबा, जिससे दाईं पेल्विक साइड में अनबैलेंस लोड पड़ा।"
            },
            "shallow_squat": {
                "name": "अधूरी गहराई (Shallow Depth - Min Angle > 110°)",
                "reason": "स्क्वाट में हिप क्रीज घुटनों के समानांतर (Parallel Depth) नहीं पहुंच पाई। इससे जांघों और ग्लूट्स का पूरा एक्टिवेशन नहीं हो सका।"
            },
            "forward_lean": {
                "name": "धड़ का अत्यधिक आगे झुकना (Excessive Forward Torso Lean)",
                "reason": "कमर सीधी रखने के बजाय धड़ बहुत आगे झुका। यह टाइट हिप फ्लेक्सर्स और कमजोर स्पाइनल इरेक्टर्स (Erector Spinae) के कारण होता है।"
            },
            "back_rounding": {
                "name": "पीठ का गोल होना (Lumbar Spine Rounding)",
                "reason": "लोअर बैक का न्यूट्रल आर्च खो गया। इससे लंबर वर्टिब्रि पर अनावश्यक तनाव आता है।"
            },
            "elbow_flare": {
                "name": "कोहनियों का 90° पर बाहर फैलना (Elbow Flaring > 70°)",
                "reason": "पुश-अप्स में कोहनियां छाती के पास 45° पर रहने की बजाय कंधों की सीध में बाहर फैलीं। इससे Rotator Cuff और शोल्डर जॉइंट्स पर हानिकारक घर्षण पड़ता है।"
            },
            "hip_sag": {
                "name": "कमर व हिप्स का नीचे लटकना (Hip Sagging / Anterior Pelvic Tilt)",
                "reason": "कोर (Core) ढीला पड़ने से कमर नीचे झूल गई और Lumbar Spine पर अत्यधिक लोड पड़ा।"
            },
            "neck_forward": {
                "name": "गर्दन का आगे झुकना ('Text Neck' Forward Head Tilt > 25°)",
                "reason": "सिर रीढ़ की प्राकृतिक न्यूट्रल लाइन से 20-30° आगे झुक गया, जिससे सर्वाइकल स्पाइन पर सिर का वजन 3 गुना बढ़ गया।"
            },
            "slouching": {
                "name": "कंधों और छाती का कूबड़ की तरह झुकना (Thoracic Slouching)",
                "reason": "कुर्सी के बैक सपोर्ट का उपयोग न करने से अपर बैक और पेक्टोरल मसल्स में तनाव बढ़ा और फेफड़ों का विस्तार सीमित हुआ।"
            },
            "knee_past_toes": {
                "name": "घुटने का पंजों से बहुत आगे निकलना (Excessive Knee Translation)",
                "reason": "वजन हील्स की बजाय पंजों पर शिफ्ट होने से Patellar Tendon पर अतिरिक्त लोड आया।"
            },
        }

        for err in unique_errors:
            if err in error_explanations:
                mistakes_list.append(error_explanations[err])
            else:
                mistakes_list.append({
                    "name": err.replace("_", " ").title(),
                    "reason": "मूवमेंट के पीक लोड पर जॉइंट अलाइनमेंट में विचलन दर्ज हुआ।"
                })

        if not mistakes_list:
            mistakes_list.append({
                "name": "कोई गंभीर बायोमैकेनिकल त्रुटि नहीं मिली",
                "reason": "आपकी रीढ़ की हड्डी (Spinal Neutrality), जॉइंट सिमेट्री और पेल्विक अलाइनमेंट पूरे सत्र के दौरान अत्यधिक संतुलित और स्थिर रही।"
            })

        # 3. सुधार के लिए छोटी-छोटी एक्सरसाइज (Corrective Micro-Exercises)
        corrective_drills = []
        has_valgus = any("knee_inward" in e for e in unique_errors)
        has_shallow = "shallow_squat" in unique_errors
        has_neck = any(k in unique_errors for k in ["neck_forward", "slouching"]) or exercise_type == "desk_posture"
        has_elbow = "elbow_flare" in unique_errors
        has_hip_sag = "hip_sag" in unique_errors

        if exercise_type == "squat" or has_valgus or has_shallow:
            if has_valgus:
                corrective_drills.append({
                    "name": "बैंडेड क्लैमशेल्स (Banded Clamshells)",
                    "sets": "3 सेट्स x 15 रेप्स (प्रति पैर)",
                    "instruction": "घुटनों के ऊपर मिनी रेजिस्टेंस बैंड पहनकर करवट लेकर लेटें। पंजों को जोड़े रखते हुए ऊपर वाले घुटने को खोलें और ग्लूट्स को 2 सेकंड टाइट रखें। इससे Gluteus Medius सक्रिय होगा और घुटने अंदर नहीं दबेंगे।"
                })
            corrective_drills.append({
                "name": "बॉक्स स्क्वाट विथ पॉज़ (Box Squats with 2s Pause)",
                "sets": "3 सेट्स x 10 रेप्स",
                "instruction": "पीछे एक कुर्सी या स्टूल रखें। नीचे बैठते समय घुटनों को बाहर की तरफ फैलाएं और 2 सेकंड कुर्सी को छूकर हील्स से ऊपर उठें। इससे सही 90° डेप्थ की मसल मेमोरी बनती है।"
            })
            corrective_drills.append({
                "name": "वॉल एंकल मोबिलाइजेशन (Wall Ankle Mobilization)",
                "sets": "2 मिनट (प्रति पैर)",
                "instruction": "दीवार से 4 इंच दूर पैर रखें और बिना हील उठाए घुटने को दीवार से छुएं। यह Ankle Dorsiflexion बढ़ाकर हील्स को जमीन से उठने से रोकता है।"
            })
        elif exercise_type == "pushup" or has_elbow or has_hip_sag:
            corrective_drills.append({
                "name": "स्कैपुलर पुश-अप्स (Scapular Push-ups)",
                "sets": "3 सेट्स x 12 रेप्स",
                "instruction": "प्लैंक पोजीशन में बिना कोहनियां मोड़े केवल शोल्डर ब्लेड्स को आपस में मिलाएं और अलग करें। यह Serratus Anterior को मजबूत करके कंधों को सुरक्षित रखता है।"
            })
            corrective_drills.append({
                "name": "इंकलाइन एरो पुश-अप्स (Incline Push-ups 45°)",
                "sets": "3 सेट्स x 10 रेप्स",
                "instruction": "हाथों को किसी टेबल पर रखें। कोहनियों को शरीर के साथ 45 डिग्री (तीर के आकार) पर रखकर छाती नीचे लाएं ताकि कोहनियां बाहर न फैलें।"
            })
            corrective_drills.append({
                "name": "डेडबग कोर ड्रिल (Deadbug Core Anti-Extension)",
                "sets": "3 सेट्स x 10 रेप्स (प्रति साइड)",
                "instruction": "पीठ के बल लेटें और कमर को फर्श से दबाकर रखें। विपरीत हाथ और पैर को सीधा करें ताकि प्लैंक में कमर नीचे न झूले।"
            })
        elif exercise_type in ["suryanamaskar", "surya_namaskar", "tree_pose", "warrior_two", "triangle", "downward_dog", "cobra"]:
            corrective_drills.append({
                "name": "मार्जरीआसन-बिटिलासन (Cat-Cow Pose)",
                "sets": "10 गहरे सांस चक्र (2 मिनट)",
                "instruction": "चौपाये की मुद्रा में सांस लेते हुए पेट नीचे और नजर ऊपर करें; सांस छोड़ते हुए रीढ़ को गोल करके नाभि अंदर खींचें। रीढ़ का लचीलापन और प्रवाह सुधरेगा।"
            })
            corrective_drills.append({
                "name": "सिंगल लेग दृष्टि बैलेंस (Single-Leg Drishti Stance)",
                "sets": "45 सेकंड (प्रति पैर)",
                "instruction": "एक पैर पर सीधे खड़े होकर सामने किसी स्थिर बिंदु पर नजर टिकाएं और पेट टाइट रखें। इससे एंकल प्रोप्रियोसेप्टर्स और न्यूरोमस्कुलर बैलेंस मजबूत होता है।"
            })
        elif has_neck or exercise_type == "desk_posture":
            corrective_drills.append({
                "name": "चिन टक्स (Chin Tucks for Text Neck)",
                "sets": "3 सेट्स x 10 रेप्स (5 सेकंड होल्ड)",
                "instruction": "सीधे बैठकर सिर को बिना झुकाए ठुड्डी को पीछे की ओर खींचें जैसे डबल चिन बना रहे हों। 5 सेकंड रोकें। यह डीप सर्वाइकल फ्लेक्सर्स को मजबूत करता है।"
            })
            corrective_drills.append({
                "name": "वॉल एंजेल्स (Wall Angels / Thoracic Opener)",
                "sets": "3 सेट्स x 12 रेप्स",
                "instruction": "दीवार से पीठ और कोहनियां सटाकर हाथों को 'W' से 'Y' आकार में ऊपर-नीचे स्लाइड करें। इससे दबे हुए कंधे और छाती खुलती है।"
            })
            corrective_drills.append({
                "name": "20-20-20 पोस्चर रीसेट ब्रेक",
                "sets": "हर 25 मिनट काम के बाद 30 सेकंड",
                "instruction": "स्क्रीन से नजर हटाकर 20 फीट दूर देखें, खड़े होकर हाथों को पीछे ले जाकर शोल्डर ब्लेड्स को 10 सेकंड स्क्वीज करें।"
            })
        else:
            corrective_drills.append({
                "name": "ग्लूट ब्रिज विथ पेल्विक ब्रेस (Glute Bridge)",
                "sets": "3 सेट्स x 12 रेप्स",
                "instruction": "पीठ के बल लेटकर घुटने मोड़ें। पेट टाइट रखते हुए हिप्स को ऊपर उठाएं और ग्लूट्स को 3 सेकंड स्क्वीज करें।"
            })
            corrective_drills.append({
                "name": "बर्ड-डॉग स्पाइनल स्टेबलाइजेशन (Bird-Dog)",
                "sets": "3 सेट्स x 10 रेप्स (प्रति साइड)",
                "instruction": "विपरीत हाथ और पैर को सीधा फैलाकर 3 सेकंड रोकें। रीढ़ को स्थिर रखने की क्षमता बढ़ेगी।"
            })

        # 4. सुरक्षा व रिकवरी
        safety = (
            "हमेशा जोड़ों (Joints) को वार्म-अप के बाद ही लोड करें। यदि घुटने या लोअर बैक में कोई तीखा दर्द महसूस हो, "
            "तो तुरंत रेंज-ऑफ-मोशन कम करें और न्यूट्रल स्पाइनल अलाइनमेंट बनाए रखें।"
        )
        recovery = (
            f"लक्षित मांसपेशियों ({target_muscles}) के लिए 5 मिनट का कूलडाउन करें। "
            "भरपूर पानी पिएं और मांसपेशियों की रिकवरी के लिए 30 सेकंड का स्टैटिक स्ट्रेचिंग रूटीन अपनाएं।"
        )

        step_analysis = summary_data.get("step_analysis", [])

        # Dynamic Key Strengths based on actual performance
        strengths_bullets = []
        if exercise_type in ["suryanamaskar", "surya_namaskar"] and step_analysis:
            perfect_steps = [s["name"] for s in step_analysis if s.get("status") == "correct" and s.get("accuracy", 0) >= 70]
            if perfect_steps:
                strengths_bullets.append(f"सटीक आसन मुद्रा: {', '.join(perfect_steps[:3])} में आपने उत्तम संतुलन और बायोमैकेनिकल स्थिरता बनाई।")
            completed_count = len([s for s in step_analysis if not s.get("is_skipped")])
            strengths_bullets.append(f"अनुक्रम प्रवाह: 12 में से {completed_count} आसनों का सफल प्रवाह पूरा किया।")
            strengths_bullets.append("श्वास-प्रश्वास (Breath Sync) और रीढ़ के विस्तार में प्राकृतिक गतिशीलता दर्ज हुई।")
        else:
            if correct_reps > 0:
                strengths_bullets.append(f"सटीक बायोमैकेनिक्स: कुल {correct_reps} रेप्स पूर्ण फॉर्म और निर्धारित जॉइंट सिमेट्री के साथ पूरे किए गए।")
            if accuracy >= 75:
                strengths_bullets.append(f"काइनेटिक स्थिरता: {accuracy}% सटीकता (ग्रेड {grade}) के साथ बॉडी अलाइनमेंट संतुलित रहा।")
            else:
                strengths_bullets.append("दृढ़ता और एकाग्रता: पूरे सेट के दौरान आपने सही फॉर्म प्राप्त करने का सतत प्रयास बनाए रखा।")
            primary_muscle = target_muscles.split(",")[0] if target_muscles else "Core Muscles"
            strengths_bullets.append(f"मसल एक्टिवेशन: लक्षित मांसपेशियों ({primary_muscle}) में प्रभावी न्यूरोमस्कुलर लोड दर्ज हुआ।")
            strengths_bullets.append("नियंत्रित गति: मूवमेंट के दौरान अचानक झटके के बजाय स्थिर और सुरक्षित टेम्पो बनाए रखा।")

        # Dynamic Focus Areas (Where you should focus upon)
        focus_areas = []
        if exercise_type in ["suryanamaskar", "surya_namaskar"] and step_analysis:
            skipped_steps = [s["name"] for s in step_analysis if s.get("is_skipped")]
            faulty_steps = [s for s in step_analysis if s.get("status") == "needs_improvement"]
            if skipped_steps:
                focus_areas.append(f"छूटे हुए चरण (Skipped): {', '.join(skipped_steps[:3])} को स्किप न करें ताकि 12 आसनों का पूर्ण शारीरिक व कार्डियोवैस्कुलर लाभ मिले।")
            for fs in faulty_steps[:3]:
                err_text = ", ".join(fs.get("issues", [])) or "अलाइनमेंट सुधार"
                focus_areas.append(f"{fs['name']}: {err_text} पर ध्यान दें।")
            if not focus_areas:
                focus_areas.append("अगले सत्र में प्रत्येक आसन में 3-5 सेकंड की गहरी सांस के साथ होल्ड समय (Hold Duration) बढ़ाएं।")
        else:
            for m in mistakes_list:
                if m["name"] != "कोई गंभीर बायोमैकेनिकल त्रुटि नहीं मिली":
                    focus_areas.append(f"{m['name']}: {m['reason'].split('.')[0]}।")
            if not focus_areas:
                focus_areas.append("आपका फॉर्म अत्यधिक संतुलित है! अगले वर्कआउट में रेप्स की संख्या या होल्ड ड्यूरेशन 15% बढ़ाने पर ध्यान दें।")

        # Formatted Markdown in Hindi
        mistakes_markdown = "\n".join(
            f"• **{m['name']}**: {m['reason']}" for m in mistakes_list
        )
        drills_markdown = "\n".join(
            f"• **{d['name']}** ({d['sets']}): {d['instruction']}" for d in corrective_drills
        )
        strengths_markdown = "\n".join(
            f"• {s}" for s in strengths_bullets
        )
        focus_markdown = "\n".join(
            f"• {f}" for f in focus_areas
        )

        formatted_text = (
            f"🎯 **{headline}**\n\n"
            f"📊 **स्कोर व सटीकता**: {score_text}\n\n"
            f"📋 **1. आपने क्या-क्या किया (What You Did)**:\n"
            f"{what_you_did_text}\n"
            f"• **लक्षित मांसपेशियां**: {target_muscles}\n\n"
            f"🌟 **2. आपकी ताकत और मजबूत पक्ष (Key Strengths)**:\n"
            f"{strengths_markdown}\n\n"
            f"⚠️ **3. क्या-क्या गलतियां हुईं और उनके कारण (Mistakes Observed)**:\n"
            f"{mistakes_markdown}\n\n"
            f"🔍 **4. अगले सत्र के लिए मुख्य फोकस (Where You Should Focus)**:\n"
            f"{focus_markdown}\n\n"
            f"🛠️ **5. सुधार के लिए छोटी-छोटी सुधारात्मक एक्सरसाइज (Corrective Micro-Drills)**:\n"
            f"{drills_markdown}\n\n"
            f"🛡️ **सुरक्षा सलाह (Safety Note)**: {safety}\n\n"
            f"🧘 **रिकवरी व कूलडाउन (Recovery Protocol)**: {recovery}"
        )

        return {
            "headline": headline,
            "form_grade": grade,
            "score_text": score_text,
            "overview": what_you_did_text,
            "what_you_did": {
                "exercise_name": ex_title,
                "summary_text": what_you_did_text,
                "total_reps": total_reps,
                "correct_reps": correct_reps,
                "incorrect_reps": incorrect_reps,
                "accuracy": accuracy,
                "target_muscles": target_muscles,
            },
            "mistakes_analysis": {
                "has_mistakes": bool(unique_errors),
                "mistakes_list": mistakes_list,
            },
            "corrective_exercises": {
                "drills": corrective_drills,
            },
            "key_strengths": strengths_bullets,
            "areas_for_improvement": focus_areas,
            "focus_areas": focus_areas,
            "step_analysis": step_analysis,
            "safety_note": safety,
            "recovery_recommendation": recovery,
            "formatted_text": formatted_text,
            "accuracy": accuracy,
            "total_reps": total_reps,
            "correct_reps": correct_reps,
            "incorrect_reps": incorrect_reps,
            "is_enriched": False,
        }

    def generate_session_summary(self, exercise_type: str, summary_data: dict, wait_for_llm: bool = False) -> dict:
        """
        Parses full exercise session telemetry and generates structured AI summary.
        Default wait_for_llm=False returns instant (<2ms) kinematic diagnosis without blocking HTTP requests.
        """
        if not wait_for_llm:
            return self.generate_immediate_diagnostic(exercise_type, summary_data)

        total_reps = summary_data.get("total_reps", 0)
        correct_reps = summary_data.get("correct_reps", 0)
        incorrect_reps = summary_data.get("incorrect_reps", 0)
        accuracy = summary_data.get("accuracy", 0.0)
        rep_log = summary_data.get("rep_log", [])

        # Collect all errors across session
        all_errors = []
        min_angles = []
        for rep in rep_log:
            if isinstance(rep, dict):
                all_errors.extend(rep.get("errors", []))
                if "min_angle" in rep and rep["min_angle"] is not None:
                    min_angles.append(rep["min_angle"])

        # 1. Ollama (qwen2.5:latest) local model
        try:
            ollama_summary = self._call_ollama_session_summary(exercise_type, summary_data, all_errors, min_angles)
            if ollama_summary:
                ollama_summary["is_enriched"] = True
                return ollama_summary
        except Exception as e:
            print(f"[AISummarizer] Ollama Session API call error: {e}")

        # 2. Gemini API as cloud option if key exists
        if self.api_key:
            try:
                gemini_summary = self._call_gemini_session_summary(exercise_type, summary_data, all_errors, min_angles)
                if gemini_summary:
                    gemini_summary["is_enriched"] = True
                    return gemini_summary
            except Exception as e:
                print(f"[AISummarizer] Gemini Session API call error: {e}")

        # Fallback to deterministic diagnosis
        return self.generate_immediate_diagnostic(exercise_type, summary_data)

    def async_enrich_session_summary(self, session_id: int, exercise_type: str, summary_data: dict, app=None):
        """
        Runs in a background thread to enrich the database record with deep LLM insights.
        Does not delay the user or hold open frontend HTTP sockets.
        """
        def _worker():
            try:
                rep_log = summary_data.get("rep_log", [])
                all_errors = []
                min_angles = []
                for rep in rep_log:
                    if isinstance(rep, dict):
                        all_errors.extend(rep.get("errors", []))
                        if "min_angle" in rep and rep["min_angle"] is not None:
                            min_angles.append(rep["min_angle"])

                enriched = None
                try:
                    enriched = self._call_ollama_session_summary(exercise_type, summary_data, all_errors, min_angles)
                except Exception as e:
                    print(f"[AISummarizer Background] Ollama error: {e}")

                if not enriched and self.api_key:
                    try:
                        enriched = self._call_gemini_session_summary(exercise_type, summary_data, all_errors, min_angles)
                    except Exception as e:
                        print(f"[AISummarizer Background] Gemini error: {e}")

                if enriched and session_id:
                    enriched["is_enriched"] = True
                    if app:
                        with app.app_context():
                            from models import db, MovementSession
                            session = db.session.get(MovementSession, session_id)
                            if session:
                                session.ai_summary = json.dumps(enriched, ensure_ascii=False)
                                db.session.commit()
                                # Invalidate caches
                                try:
                                    from routes.dashboard import invalidate_dashboard_cache
                                    from routes.sessions import invalidate_sessions_cache
                                    invalidate_dashboard_cache()
                                    invalidate_sessions_cache()
                                except Exception:
                                    pass
                                print(f"[AISummarizer Background] Session {session_id} successfully enriched.")
            except Exception as e:
                print(f"[AISummarizer Background] Worker exception: {e}")

        t = threading.Thread(target=_worker, daemon=True)
        t.start()

    def _call_ollama_live_insight(self, exercise_type: str, metrics: dict, recent_errors: list) -> dict:
        accuracy = metrics.get("accuracy", 0.0)
        total_reps = metrics.get("total_reps", 0)
        correct_reps = metrics.get("correct_reps", 0)
        incorrect_reps = metrics.get("incorrect_reps", 0)
        score = metrics.get("score", 100)
        issues = metrics.get("issues", [])

        err_list = recent_errors if recent_errors else issues

        if accuracy >= 80 and not err_list:
            tone_instruction = "Tone: Encouraging and praising excellent form."
        elif accuracy >= 50:
            tone_instruction = "Tone: Constructive and motivating. Clearly state the mechanical correction needed."
        else:
            tone_instruction = (
                f"Tone: Direct, urgent corrective coaching. Accuracy is {accuracy}%. "
                f"Do not use praise words. State the exact postural error and required joint adjustment."
            )

        prompt = (
            f"You are an expert AI Biomechanics & Posture Coach analyzing live camera telemetry.\n"
            f"Exercise/Movement: {exercise_type.replace('_', ' ').title()}\n"
            f"Current Stage: {metrics.get('stage')}\n"
            f"Posture Health Score: {score}/100\n"
            f"Accuracy: {accuracy}%\n"
            f"Repetition Stats: Total={total_reps}, Correct={correct_reps}, Incorrect={incorrect_reps}\n"
            f"Active Posture Errors/Issues: {', '.join(err_list) if err_list else 'None'}\n\n"
            f"{tone_instruction}\n\n"
            f"Provide a structured JSON response with EXACTLY these keys:\n"
            f"1. 'summary': 1 concise sentence evaluating current posture and joint alignment.\n"
            f"2. 'coaching_tip': 1 specific, high-yield kinetic correction tip.\n"
            f"3. 'live_speech': 1 short punchy voice phrase (4-8 words) for real-time Text-To-Speech audio guidance.\n"
            f"4. 'focus_joint': The primary anatomical area of focus (e.g. 'Spine', 'Knees', 'Hips', 'Shoulders', 'Core').\n"
            f"Respond ONLY with valid JSON. No markdown backticks, no extra text."
        )

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_predict": 120,
                "temperature": 0.2
            }
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.ollama_url, data=data_bytes, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                text_out = res_data.get("response", "").strip()
                if text_out.startswith("```"):
                    text_out = text_out.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                try:
                    return json.loads(text_out)
                except json.JSONDecodeError:
                    import ast
                    try:
                        return ast.literal_eval(text_out)
                    except Exception:
                        return None
        return None

    def _call_ollama_session_summary(self, exercise_type: str, summary_data: dict, all_errors: list, min_angles: list) -> dict:
        accuracy = summary_data.get("accuracy", 0.0)
        total_reps = summary_data.get("total_reps", 0)
        correct_reps = summary_data.get("correct_reps", 0)
        incorrect_reps = summary_data.get("incorrect_reps", 0)
        ex_label = exercise_type.replace("_", " ").title()

        prompt = (
            f"You are a Senior AI Biomechanics & Sports Science Specialist creating a comprehensive post-workout diagnostic report in Hindi (keep anatomical and biomechanical technical terms in English).\n"
            f"Exercise: {ex_label}\n"
            f"Total Repetitions: {total_reps}, Correct Reps: {correct_reps}, Incorrect Reps: {incorrect_reps}\n"
            f"Kinematic Accuracy: {accuracy}%\n"
            f"Observed Posture Faults: {', '.join(set(all_errors)) if all_errors else 'None'}\n"
            f"Joint Angle Range: {min(min_angles) if min_angles else 'N/A'}° to {max(min_angles) if min_angles else 'N/A'}°\n\n"
            f"Generate a rigorous, clinical JSON summary in Hindi with EXACTLY these keys:\n"
            f"1. 'headline': Eye-catching Hindi diagnostic headline (e.g. '{ex_label} बायोमैकेनिक्स रिपोर्ट: ग्रेड A+').\n"
            f"2. 'form_grade': Letter grade string ('A+', 'A', 'B', 'C', or 'D').\n"
            f"3. 'score_text': E.g. 'ग्रेड A+ • {accuracy}% बायोमैकेनिकल सटीकता'.\n"
            f"4. 'overview': 2-3 sentence sophisticated Hindi analysis of what was done (क्या-क्या किया, कुल रेप्स, सटीकता).\n"
            f"5. 'key_strengths': Array of 2 distinct biomechanical strengths observed (in Hindi).\n"
            f"6. 'areas_for_improvement': Array of 2 specific postural errors observed and why they happened mechanically (क्या गलतियां हुईं और उनके बायोमैकेनिकल कारण) (in Hindi).\n"
            f"7. 'corrective_drills': Array of 2 small corrective micro-exercises to improve form (सुधार के लिए छोटी-छोटी एक्सरसाइज जैसे Banded Clamshells, Chin Tucks, Box Squats) with sets and instructions (in Hindi).\n"
            f"8. 'safety_note': 1 clinical injury prevention note in Hindi.\n"
            f"9. 'recovery_recommendation': 1 targeted cooldown and stretching protocol in Hindi.\n"
            f"Respond ONLY with valid JSON. No surrounding markdown."
        )

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_predict": 120,
                "num_ctx": 1024,
                "temperature": 0.2
            }
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.ollama_url, data=data_bytes, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                text_out = res_data.get("response", "").strip()
                if text_out.startswith("```"):
                    text_out = text_out.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                try:
                    res_json = json.loads(text_out)
                except json.JSONDecodeError:
                    import ast
                    try:
                        res_json = ast.literal_eval(text_out)
                    except Exception:
                        return None

                grade = res_json.get("form_grade") or ("A" if accuracy >= 80 else ("B" if accuracy >= 60 else "C"))
                res_json["form_grade"] = grade
                res_json["accuracy"] = accuracy
                res_json["total_reps"] = total_reps
                res_json["correct_reps"] = correct_reps
                res_json["incorrect_reps"] = incorrect_reps

                if "formatted_text" not in res_json:
                    res_json["formatted_text"] = (
                        f"🎯 **{res_json.get('headline', f'{ex_label} AI Diagnostic')}**\n\n"
                        f"📊 **Score**: {res_json.get('score_text', f'Grade {grade}')}\n"
                        f"📝 **AI Overview**: {res_json.get('overview', '')}\n\n"
                        f"✅ **Key Strengths**:\n• " + "\n• ".join(res_json.get('key_strengths', [])) + "\n\n"
                        f"💡 **Areas for Improvement**:\n• " + "\n• ".join(res_json.get('areas_for_improvement', [])) + "\n\n"
                        f"🛡️ **Safety Note**: {res_json.get('safety_note', '')}\n\n"
                        f"🧘 **Recovery**: {res_json.get('recovery_recommendation', '')}"
                    )
                return res_json
        return None

    def _call_gemini_live_insight(self, exercise_type: str, metrics: dict, recent_errors: list) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        prompt = (
            f"You are an expert AI Biomechanics & Posture Coach giving real-time telemetry guidance.\n"
            f"Exercise: {exercise_type}\n"
            f"Current Stage: {metrics.get('stage')}\n"
            f"Accuracy: {metrics.get('accuracy', 0)}%\n"
            f"Reps Completed: {metrics.get('total_reps', 0)} (Correct: {metrics.get('correct_reps', 0)}, Incorrect: {metrics.get('incorrect_reps', 0)})\n"
            f"Recent posture errors: {', '.join(recent_errors) if recent_errors else 'None'}\n\n"
            f"Provide a concise JSON response with keys:\n"
            f"1. 'summary': 1 sentence biomechanical evaluation.\n"
            f"2. 'coaching_tip': specific kinetic adjustment.\n"
            f"3. 'live_speech': short punchy voice phrase (4-8 words) for Text-To-Speech.\n"
            f"4. 'form_quality': 'Optimal', 'Needs Attention', or 'Critical Correction'.\n"
            f"5. 'focus_joint': Primary joint/region ('Spine', 'Knees', 'Hips', 'Shoulders', etc.).\n"
            f"Respond ONLY with valid JSON."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
        return None

    def _call_gemini_session_summary(self, exercise_type: str, summary_data: dict, all_errors: list, min_angles: list) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        accuracy = summary_data.get("accuracy", 0.0)
        total_reps = summary_data.get("total_reps", 0)
        correct_reps = summary_data.get("correct_reps", 0)
        incorrect_reps = summary_data.get("incorrect_reps", 0)
        ex_label = exercise_type.replace("_", " ").title()

        prompt = (
            f"You are a Clinical & Athletic Posture Specialist analyzing complete exercise session telemetry.\n"
            f"Exercise: {ex_label}\n"
            f"Total Reps: {total_reps}, Correct: {correct_reps}, Incorrect: {incorrect_reps}\n"
            f"Accuracy: {accuracy}%\n"
            f"Observed posture errors: {all_errors}\n"
            f"Joint Angle Range: {min(min_angles) if min_angles else 'N/A'}° to {max(min_angles) if min_angles else 'N/A'}°\n\n"
            f"Provide a structured JSON response with:\n"
            f"1. 'headline': Professional AI diagnostic headline.\n"
            f"2. 'form_grade': 'A+', 'A', 'B', 'C', or 'D'.\n"
            f"3. 'score_text': E.g. 'Grade A+ • Exceptional Movement Symmetry'.\n"
            f"4. 'overview': Detailed 2-3 sentence synthesis of movement quality and biomechanical consistency.\n"
            f"5. 'key_strengths': List of 2 strengths observed.\n"
            f"6. 'areas_for_improvement': List of 2 critical corrections required.\n"
            f"7. 'safety_note': Joint safety and injury prevention guidance.\n"
            f"8. 'recovery_recommendation': Cooldown and muscle recovery advice.\n"
            f"Respond ONLY with valid JSON."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["candidates"][0]["content"]["parts"][0]["text"]
                res_json = json.loads(content)
                grade = res_json.get("form_grade") or ("A" if accuracy >= 80 else ("B" if accuracy >= 60 else "C"))
                res_json["form_grade"] = grade
                res_json["accuracy"] = accuracy
                res_json["total_reps"] = total_reps
                res_json["correct_reps"] = correct_reps
                res_json["incorrect_reps"] = incorrect_reps

                if "formatted_text" not in res_json:
                    res_json["formatted_text"] = (
                        f"🎯 **{res_json.get('headline', f'{ex_label} AI Diagnostic')}**\n\n"
                        f"📊 **Score**: {res_json.get('score_text', f'Grade {grade}')}\n"
                        f"📝 **AI Overview**: {res_json.get('overview', '')}\n\n"
                        f"✅ **Key Strengths**:\n• " + "\n• ".join(res_json.get('key_strengths', [])) + "\n\n"
                        f"💡 **Areas for Improvement**:\n• " + "\n• ".join(res_json.get('areas_for_improvement', [])) + "\n\n"
                        f"🛡️ **Safety Note**: {res_json.get('safety_note', '')}\n\n"
                        f"🧘 **Recovery**: {res_json.get('recovery_recommendation', '')}"
                    )
                return res_json
        return None

# Global singleton instance
ai_summarizer = AISummarizer()
