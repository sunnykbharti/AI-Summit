"""
Muscle Group Activation Estimation Engine.
Estimates real-time neuromuscular recruitment percentages (0-100%) based on
instantaneous joint angles, kinematic velocities, and gravity resistance vectors.
Helps users consciously engage targeted prime movers (Mind-Muscle Connection).
"""

from typing import Dict, Any, Optional
import numpy as np


class MuscleActivationEstimator:
    """
    Computes muscular recruitment intensity curves across major anatomical muscle groups.
    """

    @staticmethod
    def estimate_activation(
        exercise_type: str,
        metrics: Dict[str, Any],
        keypoints: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Estimates percentage activation (0-100%) for major muscle groups.
        """
        ex = exercise_type.lower().replace(" ", "_")
        stage = str(metrics.get("stage", "")).lower()
        knee_angle = metrics.get("knee_angle")
        elbow_angle = metrics.get("elbow_angle")
        body_angle = metrics.get("body_angle")

        # Baseline muscle activation levels (resting tone ~ 5-15%)
        activations = {
            "quadriceps": 12,
            "glutes": 10,
            "hamstrings": 10,
            "core": 20,
            "erector_spinae": 20,
            "pectoralis": 10,
            "deltoids": 15,
            "calves": 15,
        }
        primary_muscle = "Core"
        mind_muscle_cue = "संतुलित श्वास व स्थिरता बनाए रखें"

        # -------------------------------------------------------------
        # 1. SQUATS
        # -------------------------------------------------------------
        if "squat" in ex:
            # Knee flexion drives quads and glutes
            ka = knee_angle if knee_angle is not None else 140.0
            # Deeper angle (lower degrees) increases activation
            depth_factor = float(np.clip((170.0 - ka) / 80.0, 0.0, 1.0))
            
            activations["quadriceps"] = int(25 + depth_factor * 70)
            activations["glutes"] = int(20 + depth_factor * 75)
            activations["hamstrings"] = int(15 + depth_factor * 45)
            activations["core"] = int(35 + depth_factor * 45)
            activations["erector_spinae"] = int(30 + depth_factor * 50)
            activations["calves"] = int(20 + depth_factor * 30)

            if depth_factor > 0.6:
                primary_muscle = "Gluteus Maximus & Quads"
                mind_muscle_cue = "एड़ियों से फर्श को नीचे धकेलें, ऊपर उठते समय ग्लूट्स को कसें"
            else:
                primary_muscle = "Quadriceps"
                mind_muscle_cue = "नियंत्रित गति से नीचे बैठें, जांघों पर तनाव महसूस करें"

        # -------------------------------------------------------------
        # 2. PUSHUPS
        # -------------------------------------------------------------
        elif "pushup" in ex:
            ea = elbow_angle if elbow_angle is not None else 130.0
            push_depth = float(np.clip((160.0 - ea) / 75.0, 0.0, 1.0))

            activations["pectoralis"] = int(35 + push_depth * 60)
            activations["deltoids"] = int(30 + push_depth * 55)
            activations["core"] = int(50 + push_depth * 35)      # Anti-extension core engagement
            activations["glutes"] = int(30 + push_depth * 25)
            activations["erector_spinae"] = int(30 + push_depth * 25)

            if push_depth > 0.5:
                primary_muscle = "Pectoralis Major (छाती)"
                mind_muscle_cue = "छाती को सिकोड़ते हुए फर्श से ऊपर धकेलें"
            else:
                primary_muscle = "Anterior Deltoids & Triceps"
                mind_muscle_cue = "कोर टाइट रखें और कोहनियों को 45° पर मोड़ें"

        # -------------------------------------------------------------
        # 3. PLANK
        # -------------------------------------------------------------
        elif "plank" in ex:
            activations["core"] = 92
            activations["erector_spinae"] = 55
            activations["glutes"] = 65
            activations["deltoids"] = 50
            activations["quadriceps"] = 40
            primary_muscle = "Transverse Abdominis (डीप कोर)"
            mind_muscle_cue = "नाभि को रीढ़ की तरफ खींचें, ग्लूट्स को टाइट रखें"

        # -------------------------------------------------------------
        # 4. LUNGES
        # -------------------------------------------------------------
        elif "lunge" in ex:
            ka = knee_angle if knee_angle is not None else 130.0
            lunge_depth = float(np.clip((160.0 - ka) / 70.0, 0.0, 1.0))

            activations["quadriceps"] = int(35 + lunge_depth * 58)
            activations["glutes"] = int(40 + lunge_depth * 55)
            activations["hamstrings"] = int(25 + lunge_depth * 45)
            activations["calves"] = int(30 + lunge_depth * 30)
            activations["core"] = int(40 + lunge_depth * 35)
            primary_muscle = "Gluteus Medius & Quads"
            mind_muscle_cue = "आगे वाले पैर की एड़ी पर 70% वजन रखें और धड़ सीधा रखें"

        # -------------------------------------------------------------
        # 5. SURYA NAMASKAR
        # -------------------------------------------------------------
        elif "surya" in ex:
            step_num = metrics.get("current_step_number", 1)
            if step_num in [2, 7]:  # Hasta Uttanasana, Bhujangasana (Backbends)
                activations["erector_spinae"] = 85
                activations["glutes"] = 60
                activations["core"] = 65
                activations["deltoids"] = 70
                primary_muscle = "Spinal Extensors & Thoracic Spine"
                mind_muscle_cue = "रीढ़ को पसलियों से ऊपर खींचें और छाती को सामने खोलें"
            elif step_num in [3, 8, 10]:  # Padahastasana, Downward Dog (Forward folds)
                activations["hamstrings"] = 85
                activations["calves"] = 75
                activations["core"] = 60
                activations["erector_spinae"] = 45
                primary_muscle = "Hamstrings & Posterior Kinetic Chain"
                mind_muscle_cue = "सांस छोड़ते हुए टेलबोन को छत की ओर उठाएं"
            elif step_num in [4, 9]:  # Ashwa Sanchalanasana (Equestrian)
                activations["glutes"] = 75
                activations["quadriceps"] = 70
                activations["core"] = 60
                primary_muscle = "Hip Flexors & Glutes"
                mind_muscle_cue = "पेल्विस को धीरे-धीरे नीचे दबाएं"
            else:
                activations["core"] = 60
                activations["quadriceps"] = 45
                activations["erector_spinae"] = 50
                primary_muscle = "Full Body Postural Alignment"
                mind_muscle_cue = "रीढ़ लंबी रखें और दोनों पैरों पर बराबर वजन रखें"

        # -------------------------------------------------------------
        # 6. DESK POSTURE & REACTION
        # -------------------------------------------------------------
        elif "desk" in ex or "reaction" in ex:
            activations["core"] = 55
            activations["erector_spinae"] = 65
            activations["deltoids"] = 25
            primary_muscle = "Postural Rhomboids & Erector Spinae"
            mind_muscle_cue = "कंधों को पीछे व नीचे छोड़ें, रीढ़ को सीधा लंबा रखें"

        return {
            "muscle_activations": activations,
            "primary_muscle": primary_muscle,
            "mind_muscle_cue": mind_muscle_cue,
            "peak_activation_pct": max(activations.values()),
        }
