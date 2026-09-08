"""
Biomechanical Risk Warning & Joint Safety Assessment Engine.
Analyzes kinetic joint angles, structural alignment, ligament load, and spinal shear forces
across exercises to prevent acute injuries (ACL tears, lumbar disc herniation, rotator cuff impingement).
"""

from typing import Dict, Any, List, Optional
import numpy as np


class BiomechanicalRiskEvaluator:
    """
    Evaluates real-time frame and cumulative session biomechanical injury risks.
    """

    @staticmethod
    def evaluate_frame_risk(
        exercise_type: str,
        metrics: Dict[str, Any],
        rep_log: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Calculates immediate biomechanical risk level and vulnerable joint structures for a frame.
        """
        ex = (exercise_type or "squats").lower().replace(" ", "_")
        issues = list(metrics.get("issues", []))
        feedback = str(metrics.get("feedback", "")).lower()

        # Extract recent rep errors
        recent_errors = []
        if rep_log:
            for rep in rep_log[-3:]:
                if isinstance(rep, dict) and "errors" in rep:
                    recent_errors.extend(rep.get("errors", []))

        all_current_issues = set(issues + recent_errors)

        risk_score = 10  # Baseline safe score (0 - 100)
        vulnerable_joints = []
        primary_warning_hi = ""
        primary_warning_en = ""
        immediate_action = "फॉर्म सामान्य और सुरक्षित है"

        # -------------------------------------------------------------
        # 1. SQUATS BIOMECHANICAL RISKS
        # -------------------------------------------------------------
        if "squat" in ex:
            knee_angle = metrics.get("knee_angle")
            valgus_both = (
                "both_knees_inward" in all_current_issues
                or "घुटने अंदर" in feedback
                or "valgus" in feedback
            )
            valgus_left = "left_knee_inward" in all_current_issues
            valgus_right = "right_knee_inward" in all_current_issues

            if valgus_both:
                risk_score = max(risk_score, 85)
                primary_warning_hi = "🚨 उच्च ACL/MCL तनाव: दोनों घुटने अंदर दब रहे हैं (Knee Valgus)! घुटनों को पंजों की सीध में बाहर धकेलें।"
                primary_warning_en = "High ACL/MCL Strain: Bilateral knee valgus collapse detected! Push knees outward over toes."
                immediate_action = "घुटने बाहर धकेलें"
                vulnerable_joints.append({
                    "joint": "Knees",
                    "joint_hi": "घुटने (Knees)",
                    "structure": "ACL & MCL Ligaments, Meniscus Cartilage",
                    "severity": "HIGH",
                    "cause": "Gluteus Medius निष्क्रियता व पंजों पर वजन का अंदर झुकना",
                    "prevention": "घुटनों को हमेशा दूसरे व तीसरे पंजे (Toes) की दिशा में बाहर रखें।"
                })
            elif valgus_left or valgus_right:
                risk_score = max(risk_score, 65)
                side_str = "बायां" if valgus_left else "दायां"
                primary_warning_hi = f"⚠️ एकतरफा नी-स्ट्रेन: {side_str} घुटना अंदर झुक रहा है! दोनों पैरों पर वजन बराबर रखें।"
                primary_warning_en = "Unilateral Knee Strain: Knee caving inward. Distribute weight evenly across both feet."
                immediate_action = f"{side_str} घुटना बाहर रखें"
                vulnerable_joints.append({
                    "joint": "Knees",
                    "joint_hi": f"{side_str} घुटना (Knee)",
                    "structure": "Medial Collateral Ligament (MCL)",
                    "severity": "MODERATE",
                    "cause": "असममित पेल्विक स्टेबिलिटी व टाइट एडक्टर्स",
                    "prevention": "एड़ियों को जमीन पर मजबूती से टिकाएं।"
                })

            if "shallow_squat" in all_current_issues and risk_score < 40:
                risk_score = max(risk_score, 25)

        # -------------------------------------------------------------
        # 2. PUSHUPS & PLANKS BIOMECHANICAL RISKS
        # -------------------------------------------------------------
        elif "pushup" in ex or "plank" in ex:
            hips_sagging = (
                "hips_sagging" in all_current_issues
                or "कमर नीचे" in feedback
                or "लटक" in feedback
                or "sag" in feedback
            )
            hips_piked = "hips_piked" in all_current_issues or "कूल्हे ऊपर" in feedback
            elbow_angle = metrics.get("elbow_angle")

            if hips_sagging:
                risk_score = max(risk_score, 80)
                primary_warning_hi = "🚨 लंबर स्पाइन कंप्रेशन: कमर नीचे लटक रही है! नाभि को रीढ़ की ओर खींचें और हिप्स को ऊपर उठाएं।"
                primary_warning_en = "Lumbar Spine Compression: Lower back sagging! Engage abdominal core and elevate pelvis."
                immediate_action = "कोर टाइट करें, हिप्स उठाएं"
                vulnerable_joints.append({
                    "joint": "Lumbar Spine",
                    "joint_hi": "लोअर बैक (Lumbar Spine - L4/L5)",
                    "structure": "L4-S1 Intervertebral Discs & Facet Joints",
                    "severity": "HIGH",
                    "cause": "पेट (Transverse Abdominis) की कमजोरी जिससे लंबर लॉर्डोसिस हाइपर-एक्सटेंड हो रहा है",
                    "prevention": "हिप्स को कंधों से एड़ी तक एक सीधी तख्ती (Plank Line) में रखें।"
                })
            elif hips_piked:
                risk_score = max(risk_score, 45)
                primary_warning_hi = "⚠️ शोल्डर ओवरलोड: कूल्हे ज्यादा ऊपर उठने से कंधों पर अनावश्यक दबाव आ रहा है।"
                primary_warning_en = "Shoulder Overload: Hips elevated excessively, increasing anterior shoulder load."
                immediate_action = "शरीर को सीधी रेखा में लाएं"
                vulnerable_joints.append({
                    "joint": "Shoulders",
                    "joint_hi": "कंधे (Shoulders)",
                    "structure": "Rotator Cuff & Anterior Deltoid",
                    "severity": "MODERATE",
                    "cause": "बॉडी अलाइनमेंट में संतुलन न होना",
                    "prevention": "कूल्हों को थोड़ा नीचे लाकर न्यूट्रल स्पाइन बनाएं।"
                })

            if elbow_angle is not None and elbow_angle < 65:
                risk_score = max(risk_score, 55)
                vulnerable_joints.append({
                    "joint": "Elbows",
                    "joint_hi": "कोहनियां (Elbows)",
                    "structure": "Triceps Tendon & Ulnar Collateral Ligament",
                    "severity": "MODERATE",
                    "cause": "अत्यधिक डीप बेंड जिससे कोहनी पर भारी शीयर लोड पड़ता है",
                    "prevention": "कोहनी को 90° तक मोड़ना पर्याप्त और सुरक्षित है।"
                })

        # -------------------------------------------------------------
        # 3. LUNGES BIOMECHANICAL RISKS
        # -------------------------------------------------------------
        elif "lunge" in ex:
            leaning_fwd = (
                "leaning_forward" in all_current_issues
                or "आगे" in feedback
                or "lean" in feedback
            )
            knee_angle = metrics.get("knee_angle")

            if leaning_fwd:
                risk_score = max(risk_score, 70)
                primary_warning_hi = "⚠️ पटेला व स्पाइनल तनाव: धड़ आगे गिर रहा है! छाती को गर्व से सीधा रखें और वजन हील्स पर डालें।"
                primary_warning_en = "Patella & Spine Strain: Excessive forward trunk lean! Maintain upright torso."
                immediate_action = "छाती सीधी करें"
                vulnerable_joints.append({
                    "joint": "Patellar Tendon",
                    "joint_hi": "पटेला टेंडन व कमर",
                    "structure": "Patellar Tendon & Thoracolumbar Fascia",
                    "severity": "HIGH",
                    "cause": "आगे झुकने से घुटने पर शीयर फोर्स 200% बढ़ जाती है",
                    "prevention": "गर्दन और छाती को लंबवत (Vertical) रखें।"
                })
            elif knee_angle is not None and knee_angle < 75:
                risk_score = max(risk_score, 60)
                primary_warning_hi = "⚠️ अत्यधिक डीप लंज: अगला घुटना टखने से बहुत आगे झुक रहा है।"
                primary_warning_en = "Over-flexed Knee: Front knee translating past ankle."
                immediate_action = "घुटना 90° पर रोकें"
                vulnerable_joints.append({
                    "joint": "Knees",
                    "joint_hi": "अगला घुटना (Front Knee)",
                    "structure": "Patellofemoral Joint",
                    "severity": "MODERATE",
                    "cause": "छोटा कदम रखने से घुटने पर भार",
                    "prevention": "लंबा कदम रखें ताकि घुटना टखने (Ankle) की सीध में रहे।"
                })

        # -------------------------------------------------------------
        # 4. DESK POSTURE & REACTION BIOMECHANICAL RISKS
        # -------------------------------------------------------------
        elif "desk" in ex or "reaction" in ex:
            slouching = any("slouch" in str(i).lower() or "झुक" in str(i) for i in issues)
            forward_neck = any("neck" in str(i).lower() or "गर्दन" in str(i) for i in issues)
            shoulder_tilt = any("tilt" in str(i).lower() or "कंधे" in str(i) for i in issues)

            if slouching and forward_neck:
                risk_score = max(risk_score, 75)
                primary_warning_hi = "🚨 सर्वाइकल स्पाइन ओवरलोड: गर्दन व पीठ में कूबड़ बन रहा है! रीढ़ पर सिर का भार 27 किलो के बराबर बढ़ गया है।"
                primary_warning_en = "Cervical Spine Overload: Severe forward head & thoracic hunching. Perform chin tuck."
                immediate_action = "कंधे पीछे करें, ठुड्डी अंदर खींचें"
                vulnerable_joints.append({
                    "joint": "Cervical Spine",
                    "joint_hi": "गर्दन (Cervical Spine C1-C7)",
                    "structure": "Cervical Discs & Upper Trapezius",
                    "severity": "HIGH",
                    "cause": "आगे झुकने से सर्वाइकal वर्टिब्रि पर सिर का वजन 4 गुना बढ़ता है",
                    "prevention": "स्क्रीन को आंखों के स्तर (Eye Level) पर लाएं और बैक सपोर्ट लें।"
                })
            elif forward_neck:
                risk_score = max(risk_score, 55)
                primary_warning_hi = "⚠️ टेक्स्ट-नेक अलर्ट: गर्दन आगे झुकी हुई है। ठुड्डी को हल्का पीछे (Chin Tuck) रखें।"
                primary_warning_en = "Text Neck Alert: Forward head posture detected. Tuck chin."
                immediate_action = "ठुड्डी पीछे रखें"
                vulnerable_joints.append({
                    "joint": "Neck",
                    "joint_hi": "गर्दन (Neck)",
                    "structure": "Levator Scapulae & Suboccipitals",
                    "severity": "MODERATE",
                    "cause": "स्क्रीन नीचे होने से गर्दन का अत्यधिक खिंचाव",
                    "prevention": "लैपटॉप को स्टैंड पर रखें।"
                })
            elif shoulder_tilt:
                risk_score = max(risk_score, 40)
                primary_warning_hi = "⚠️ कंधे असमान हैं: एक कंधे पर ज्यादा वजन है, रीढ़ को सीधा करें।"
                primary_warning_en = "Shoulder Imbalance: Asymmetric shoulder elevation."
                immediate_action = "दोनों कंधे बराबर रखें"
                vulnerable_joints.append({
                    "joint": "Shoulders",
                    "joint_hi": "कंधे (Shoulders)",
                    "structure": "Thoracic Spine & Rhomboids",
                    "severity": "LOW",
                    "cause": "एक तरफ झुककर बैठने की आदत",
                    "prevention": "कुर्सी पर दोनों हिप्स पर बराबर वजन रखें।"
                })

        # -------------------------------------------------------------
        # 5. SURYA NAMASKAR BIOMECHANICAL RISKS
        # -------------------------------------------------------------
        elif "surya" in ex:
            form_issues = metrics.get("form_issues", [])
            quality = metrics.get("pose_quality", 85.0)

            if quality < 50 and form_issues:
                risk_score = max(risk_score, 65)
                issue_first = form_issues[0]
                primary_warning_hi = f"⚠️ आसन अलाइनमेंट जोखिम: {issue_first}। रीढ़ या जोड़ों पर झटका न दें, सहज गति रखें।"
                primary_warning_en = f"Asana Alignment Risk: {issue_first}. Smooth movement without joint hyperextension."
                immediate_action = "आसन का अलाइनमेंट सुधारें"
                vulnerable_joints.append({
                    "joint": "Spine & Knees",
                    "joint_hi": "रीढ़ व घुटने",
                    "structure": "Spinal Column & Hamstring Insertions",
                    "severity": "MODERATE",
                    "cause": "जल्दबाजी या अत्यधिक खिंचाव से मांसपेशियों पर अनियंत्रित तनाव",
                    "prevention": "गहरी सांस के साथ आसन में प्रवेश करें, जबरन न झुकें।"
                })

        # Determine Risk Level Category
        if risk_score >= 65:
            risk_level = "HIGH"
            badge_color = "rose"
            is_warning_active = True
            is_critical = True
        elif risk_score >= 35:
            risk_level = "MODERATE"
            badge_color = "amber"
            is_warning_active = True
            is_critical = False
        else:
            risk_level = "LOW"
            badge_color = "emerald"
            is_warning_active = False
            is_critical = False
            primary_warning_hi = "✅ बायोमैकेनिक्स सुरक्षित: सभी जोड़ों का अलाइनमेंट संतुलित और इष्टतम है।"
            primary_warning_en = "Biomechanical Safety Optimal: Joint alignment balanced and safe."
            immediate_action = "उत्तम फॉर्म बनाए रखें"

        return {
            "risk_level": risk_level,
            "risk_score": int(risk_score),
            "safety_score": int(max(0, 100 - risk_score)),
            "is_warning_active": is_warning_active,
            "is_critical": is_critical,
            "badge_color": badge_color,
            "primary_warning_hi": primary_warning_hi,
            "primary_warning_en": primary_warning_en,
            "immediate_action": immediate_action,
            "vulnerable_joints": vulnerable_joints,
        }

    @staticmethod
    def compile_session_risk_report(
        exercise_type: str,
        cumulative_telemetry: Dict[str, Any],
        unique_errors: List[str]
    ) -> Dict[str, Any]:
        """
        Creates a post-workout clinical biomechanical risk report for the Stop AI summary modal.
        """
        peak_score = cumulative_telemetry.get("peak_risk_score", 15)
        high_frames = cumulative_telemetry.get("high_risk_frames", 0)
        total_frames = max(1, cumulative_telemetry.get("total_frames", 1))
        vulnerable_joints_set = cumulative_telemetry.get("vulnerable_joints", set())

        high_risk_ratio = high_frames / total_frames

        if high_risk_ratio > 0.20 or peak_score >= 75:
            overall_rating = "उच्च जोखिम (High Risk)"
            rating_color = "rose"
            overall_status = "high"
            summary_msg = (
                "सत्र के दौरान जोड़ों पर उच्च बायोमैकेनिकल तनाव दर्ज किया गया। "
                "विशेष रूप से लक्षित जोड़ों पर अनावश्यक लोड पड़ा, जिससे लिगामेंट या डिस्क क्षति का खतरा हो सकता है।"
            )
        elif high_risk_ratio > 0.05 or peak_score >= 40:
            overall_rating = "मध्यम जोखिम (Moderate Risk)"
            rating_color = "amber"
            overall_status = "moderate"
            summary_msg = (
                "सत्र के अधिकांश हिस्से में फॉर्म सुरक्षित रहा, किंतु थकान के क्षणों में जोड़ों में हल्का विचलन हुआ।"
            )
        else:
            overall_rating = "सुरक्षित (Low Risk / Safe)"
            rating_color = "emerald"
            overall_status = "low"
            summary_msg = (
                "उत्कृष्ट बायोमैकेनिक्स! पूरे सत्र के दौरान आपकी रीढ़, घुटनों और कंधों का अलाइनमेंट अत्यंत सुरक्षित और स्थिर रहा।"
            )

        # Build list of joint risks based on exercise & errors
        joint_cards = []
        has_valgus = any("inward" in e or "valgus" in e for e in unique_errors)
        has_hip_sag = any("sag" in e for e in unique_errors)
        has_lean = any("lean" in e or "slouch" in e for e in unique_errors)
        has_neck = any("neck" in e for e in unique_errors)

        if has_valgus or "Knees" in vulnerable_joints_set:
            joint_cards.append({
                "joint_name": "घुटने (Knees - ACL/MCL)",
                "risk_tier": "HIGH" if has_valgus else "MODERATE",
                "concern": "Knee Valgus (घुटनों का अंदर दबना)",
                "impact": "Anterior Cruciate Ligament (ACL) और मेनिस्कस कार्टिलेज पर मरोड़ (Torsion load) बढ़ता है।",
                "remedy": "स्क्वाट/लंज में घुटनों को हमेशा बाहर पंजों की ओर धकेलें। ग्लूट मीडियस मजबूत करने के लिए क्लैमशेल्स करें।"
            })

        if has_hip_sag or "Lumbar Spine" in vulnerable_joints_set:
            joint_cards.append({
                "joint_name": "लोअर बैक (Lumbar Spine - L4/L5)",
                "risk_tier": "HIGH",
                "concern": "Hip Sagging (कमर का नीचे लटकना)",
                "impact": "L4-S1 लंबर डिस्क पर शीयर स्ट्रेस पड़ता है और नसों पर दबाव आ सकता है।",
                "remedy": "प्लैंक और पुश-अप में कोर को अंदर खींचें और पेल्विक न्यूट्रल रखें।"
            })

        if has_lean or has_neck or "Cervical Spine" in vulnerable_joints_set:
            joint_cards.append({
                "joint_name": "गर्दन व सर्वाइकल स्पाइन (Neck / Spine)",
                "risk_tier": "MODERATE",
                "concern": "Forward Head & Slouching (आगे झुकना)",
                "impact": "सर्वाइकल वर्टिब्रि पर सिर का वजन 3-4 गुना बढ़ जाता है, जिससे स्पॉन्डिलाइटिस का जोखिम होता है।",
                "remedy": "चिन-टक (Chin Tuck) एक्सरसाइज करें और स्क्रीन को आई-लेवल पर रखें।"
            })

        if not joint_cards:
            joint_cards.append({
                "joint_name": "समस्त जोड़ व काइनेटिक चेन (All Major Joints)",
                "risk_tier": "LOW",
                "concern": "कोई गंभीर बायोमैकेनिकल त्रुटि नहीं",
                "impact": "जोड़ों के कार्टिलेज और लिगामेंट्स सुरक्षित सीमा में रहे।",
                "remedy": "इसी प्रकार नियंत्रित टेम्पो और स्थिरता के साथ वर्कआउट जारी रखें।"
            })

        safety_index = max(10, min(99, int(100 - (peak_score * 0.6 + high_risk_ratio * 40))))

        return {
            "overall_rating": overall_rating,
            "overall_status": overall_status,
            "rating_color": rating_color,
            "safety_index": safety_index,
            "summary_msg": summary_msg,
            "high_risk_frames": high_frames,
            "peak_risk_score": int(peak_score),
            "joint_cards": joint_cards,
        }
