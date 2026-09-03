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

        rep_history = rep_history or []
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

        # Local Intelligent AI Fallback Engine — pass both rep errors and active issues
        all_errors_for_fallback = list(set(recent_errors + issues))
        local = self._build_local_live_insight(exercise_type, total_reps, correct_reps, incorrect_reps, stage, feedback, all_errors_for_fallback)
        local["form_quality"] = self._compute_form_quality(accuracy, issues)
        return local

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

    def generate_session_summary(self, exercise_type: str, summary_data: dict) -> dict:
        """
        Parses full exercise session telemetry and generates comprehensive structured AI summary using Ollama AI model.
        """
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

        # 1. Try Ollama (qwen2.5:latest) local model first!
        try:
            ollama_summary = self._call_ollama_session_summary(exercise_type, summary_data, all_errors, min_angles)
            if ollama_summary:
                return ollama_summary
        except Exception as e:
            print(f"[AISummarizer] Ollama Session API call error: {e}")

        # 2. Check if Gemini API key exists
        if self.api_key:
            try:
                gemini_summary = self._call_gemini_session_summary(exercise_type, summary_data, all_errors, min_angles)
                if gemini_summary:
                    return gemini_summary
            except Exception as e:
                print(f"[AISummarizer] Gemini Session API call error: {e}")

        # 3. Local Intelligent AI Fallback Engine
        return self._build_local_session_summary(exercise_type, total_reps, correct_reps, incorrect_reps, accuracy, all_errors, min_angles)

    def _call_ollama_live_insight(self, exercise_type: str, metrics: dict, recent_errors: list) -> dict:
        accuracy = metrics.get("accuracy", 0.0)
        total_reps = metrics.get("total_reps", 0)
        correct_reps = metrics.get("correct_reps", 0)
        incorrect_reps = metrics.get("incorrect_reps", 0)
        score = metrics.get("score", 100)
        issues = metrics.get("issues", [])

        err_list = recent_errors if recent_errors else issues

        if accuracy >= 80 and not err_list:
            tone_instruction = "Be encouraging and praise the user — their form is great."
        elif accuracy >= 50:
            tone_instruction = "Be constructive and motivating — briefly acknowledge effort but clearly name the error and how to fix it."
        else:
            tone_instruction = (
                f"IMPORTANT: Accuracy is critically low at {accuracy}%. "
                f"DO NOT say 'excellent', 'great', 'perfect', or any positive words. "
                f"Directly and politely describe the detected posture error and the exact correction needed."
            )

        prompt = (
            f"You are a friendly AI Fitness & Posture Coach giving REAL-TIME feedback in Hinglish "
            f"(a natural casual mix of Hindi and English — like how Indian gym trainers actually speak).\n"
            f"Examples of Hinglish style: 'Knees thodi bahar rakho yaar!', 'Back straight karo — bilkul sahi!', "
            f"'Core tight rakho aur breathe karo.', 'Posture kaafi achha hai, keep it up!'\n\n"
            f"Exercise/Mode: {exercise_type}\n"
            f"Current Stage: {metrics.get('stage')}\n"
            f"Posture Health Score: {score}/100\n"
            f"Accuracy Rate: {accuracy}%\n"
            f"Reps/Frames Stats: Total={total_reps}, Correct={correct_reps}, Incorrect={incorrect_reps}\n"
            f"Active Errors/Issues: {', '.join(err_list) if err_list else 'None'}\n\n"
            f"Tone: {tone_instruction}\n\n"
            f"Provide a JSON response with EXACTLY these keys:\n"
            f"1. 'summary': 1 sentence Hinglish evaluation of current posture — must reflect actual accuracy and errors.\n"
            f"2. 'coaching_tip': 1 specific Hinglish correction tip or encouragement (conversational, not formal).\n"
            f"3. 'live_speech': 1 short Hinglish voice phrase (5-9 words) for Text-To-Speech — punchy and natural.\n"
            f"Respond ONLY with valid JSON. No markdown, no extra text."
        )

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_predict": 100,
                "temperature": 0.3
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
                    return json.loads(text_out)
                except json.JSONDecodeError:
                    # Fallback: replace single quotes with double quotes and attempt parsing
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

        prompt = (
            f"You are a friendly AI Fitness & Posture Coach writing a post-session report in Hinglish "
            f"(natural casual mix of Hindi and English, like Indian fitness trainers speak).\n"
            f"Examples: 'Aaj ki session mein form kaafi solid thi!', 'Knees thodi bahar rakho next time', "
            f"'Core engagement achha tha, keep it up!'\n\n"
            f"Exercise: {exercise_type.upper()}\n"
            f"Total Reps/Frames: {total_reps}, Correct: {correct_reps}, Incorrect: {incorrect_reps}\n"
            f"Accuracy: {accuracy}%\n"
            f"Observed posture errors: {all_errors}\n\n"
            f"Provide a structured JSON response in Hinglish with:\n"
            f"1. 'headline': Short punchy session headline in Hinglish.\n"
            f"2. 'overview': 2-3 sentence Hinglish summary of movement quality and posture.\n"
            f"3. 'key_strengths': List of 2 Hinglish strengths from this session.\n"
            f"4. 'areas_for_improvement': List of 2 Hinglish corrections for next time.\n"
            f"5. 'safety_note': 1 Hinglish safety tip to avoid injury.\n"
            f"6. 'score_text': e.g. 'Grade A - Ekdum solid form!' or 'Grade C - Thodi practice aur chahiye'\n"
            f"Respond ONLY with valid JSON."
        )

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_predict": 250,
                "temperature": 0.3
            }
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.ollama_url, data=data_bytes, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                text_out = res_data.get("response", "").strip()
                if text_out.startswith("```"):
                    text_out = text_out.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                try:
                    res_json = json.loads(text_out)
                except json.JSONDecodeError:
                    # Fallback parsing for malformed JSON (e.g., single quotes)
                    import ast
                    try:
                        res_json = ast.literal_eval(text_out)
                    except Exception:
                        return None
                if "formatted_text" not in res_json:
                    res_json["formatted_text"] = (
                        f"🎯 **{res_json.get('headline', '')}**\n\n"
                        f"📊 **Score**: {res_json.get('score_text', '')}\n"
                        f"📝 **AI Overview**: {res_json.get('overview', '')}\n\n"
                        f"✅ **Key Strengths**:\n• " + "\n• ".join(res_json.get('key_strengths', [])) + "\n\n"
                        f"💡 **Areas for Improvement**:\n• " + "\n• ".join(res_json.get('areas_for_improvement', [])) + "\n\n"
                        f"🛡️ **Safety Note**: {res_json.get('safety_note', '')}"
                    )
                return res_json
        return None

    def _call_gemini_live_insight(self, exercise_type: str, metrics: dict, recent_errors: list) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        prompt = (
            f"You are a polite, encouraging AI Biomechanics Coach giving real-time live voice guidance in clear, refined Hindi.\n"
            f"Exercise: {exercise_type}\n"
            f"Current Stage: {metrics.get('stage')}\n"
            f"Reps Completed: {metrics.get('total_reps', 0)} (Correct: {metrics.get('correct_reps', 0)}, Incorrect: {metrics.get('incorrect_reps', 0)})\n"
            f"Recent posture errors detected: {', '.join(recent_errors) if recent_errors else 'None'}\n\n"
            f"Provide a concise JSON response with keys:\n"
            f"1. 'summary': 1 sentence summary in refined Hindi.\n"
            f"2. 'coaching_tip': polite and refined Hindi biomechanical advice.\n"
            f"3. 'live_speech': polite, refined, encouraging Hindi voice phrase (4-8 words) for Text-To-Speech (e.g. 'कृपया अपने घुटनों को थोड़ा बाहर रखें', 'बहुत बढ़िया! इसी तरह नियंत्रण बनाए रखें'). Avoid blunt or direct commands.\n"
            f"4. 'form_quality': 'Optimal', 'Needs Attention', or 'Critical Correction'.\n"
            f"Respond ONLY with valid JSON."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
        return None

    def _call_gemini_session_summary(self, exercise_type: str, summary_data: dict, all_errors: list, min_angles: list) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        prompt = (
            f"You are an AI Clinical & Athletic Posture Specialist analyzing complete live exercise feed session data.\n"
            f"Exercise: {exercise_type.upper()}\n"
            f"Total Reps: {summary_data.get('total_reps')}, Correct: {summary_data.get('correct_reps')}, Incorrect: {summary_data.get('incorrect_reps')}\n"
            f"Accuracy: {summary_data.get('accuracy')}%\n"
            f"Observed posture errors: {all_errors}\n"
            f"Joint Angle Range: {min(min_angles) if min_angles else 'N/A'}° to {max(min_angles) if min_angles else 'N/A'}°\n\n"
            f"Provide a structured JSON response in refined Hindi with:\n"
            f"1. 'headline': Eye-catching AI diagnostic headline.\n"
            f"2. 'overview': Detailed natural language synthesis of movement quality and biomechanical consistency.\n"
            f"3. 'key_strengths': List of 2 strengths observed during live feed.\n"
            f"4. 'areas_for_improvement': List of 2 critical corrections required.\n"
            f"5. 'safety_note': Guidance on avoiding injury or strain.\n"
            f"6. 'score_text': e.g. 'Grade A - उत्कृष्ट संतुलन'\n"
            f"Respond ONLY with valid JSON."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=6) as response:
            if response.status == 200:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
        return None

    def _build_local_live_insight(self, exercise_type: str, total: int, correct: int, incorrect: int, stage: str, feedback: str, errors: list) -> dict:
        ex_name = exercise_type.replace("_", " ").title()
        
        # Comprehensive exercise-specific optimal feedback library (Hinglish)
        EXERCISE_OPTIMAL = {
            "squat": {
                "summary": "Squat form ekdum solid hai! Knees aur spine ka alignment perfect chal raha hai.",
                "coaching_tip": "Heels se ground push karo aur core tight rakho — bahut badhiya!",
                "live_speech": "Solid squat form! Heels se push karo.",
            },
            "pushup": {
                "summary": "Push-up form kaafi achhi hai! Head se toes tak body ek seedhi line mein hai.",
                "coaching_tip": "Elbows 45 degree pe rakho aur chest ko control ke saath neeche lao.",
                "live_speech": "Great push-up! Control maintain karo.",
            },
            "plank": {
                "summary": "Plank hold strong hai! Spine aur hips ka balance ekdum tight chal raha hai.",
                "coaching_tip": "Core ko kasa ke rakho aur normally breathe karte raho.",
                "live_speech": "Strong plank! Core tight rakho.",
            },
            "lunges": {
                "summary": "Lunge position achhi hai! Front knee 90 degree pe stable hai.",
                "coaching_tip": "Torso ko bilkul seedha rakho aur balance center mein maintain karo.",
                "live_speech": "Great lunge form! Balance banaye rakho.",
            },
            "desk_posture": {
                "summary": "Study posture ekdum sahi hai! Back straight, neck relaxed, screen distance safe hai.",
                "coaching_tip": "Shoulders ko loose rakho aur spine ko support deke baitho — fatigue nahi hogi.",
                "live_speech": "Great study posture! Back aur neck balanced hai.",
            },
            "posture": {
                "summary": "Posture balance ekdum solid hai! Dono shoulders aur torso straight hain.",
                "coaching_tip": "Weight dono paon pe equally distribute rakho.",
                "live_speech": "Posture balance ekdum solid chal raha hai!",
            },
            "tree_pose": {
                "summary": "Tree pose ka balance behtareen hai! Foot grip aur focus strong hai.",
                "coaching_tip": "Kisi ek point pe gaze fix karo aur breathe normally karte raho.",
                "live_speech": "Tree pose mein beautiful balance!",
            },
            "tadasana": {
                "summary": "Tadasana posture sahi hai! Spine straight aur body tall hai.",
                "coaching_tip": "Breath lete waqt body ko upar ki taraf stretch karo aur feet firmly ground karo.",
                "live_speech": "Tadasana posture ekdum achha!",
            },
            "warrior_two": {
                "summary": "Warrior Two mein strong stability hai! Arms horizontal hain.",
                "coaching_tip": "Front knee 90 degree pe rakho aur gaze front fingers pe rakho.",
                "live_speech": "Warrior Two mein great stability!",
            },
            "triangle": {
                "summary": "Triangle pose ka stretch achha chal raha hai! Legs aur spine aligned hain.",
                "coaching_tip": "Chest ko front ki taraf open rakho aur upper arm ko straight stretch karo.",
                "live_speech": "Triangle pose ka beautiful stretch!",
            },
            "downward_dog": {
                "summary": "Downward Dog posture sahi hai! Hips upar hain aur spine long hai.",
                "coaching_tip": "Palms se ground push karo aur heels ko ground ki taraf jaane do.",
                "live_speech": "Downward Dog ka behtareen stretch!",
            },
            "cobra": {
                "summary": "Cobra pose ekdum achha hai! Chest open hai aur shoulders back hain.",
                "coaching_tip": "Shoulders ko ears se door rakho aur upper spine se stretch lo.",
                "live_speech": "Cobra pose beautiful lag raha hai!",
            },
            "suryanamaskar": {
                "summary": "Surya Namaskar flow solid hai! Movements mein achha balance aur rhythm hai.",
                "coaching_tip": "Har asana ke saath breath ka coordination maintain karo.",
                "live_speech": "Surya Namaskar flow ekdum solid!",
            },
        }

        # Compute accuracy from reps if not already available
        computed_acc = round((correct / total * 100) if total > 0 else 0.0, 1)

        # Determine corrective messages from errors list (errors is the issues list or rep errors)
        has_errors = bool(errors)

        # Build contextual correction hint from detected errors
        unique_errs = list(set(errors))
        err_desc = ", ".join([e.replace("_", " ") for e in unique_errs])

        if has_errors:
            if "knee_valgus" in unique_errs or "knees" in err_desc.lower():
                coaching_tip = "Knees thodi bahar ki taraf rakho — joints pe unnecessary pressure mat dalo."
                live_speech = "Knees thoda bahar ki taraf rakho!"
            elif "slouch" in err_desc.lower() or "झुककर" in err_desc:
                coaching_tip = "Back ko straight karo yaar — chair ki backrest ka support lo."
                live_speech = "Back straight karo, jhukna mat!"
            elif "neck" in err_desc.lower() or "गर्दन" in err_desc or "forward neck" in err_desc.lower():
                coaching_tip = "Neck thodi peeche lao aur screen ko eye level pe rakho."
                live_speech = "Neck peeche karo, screen eye level pe rakho!"
            elif "shoulder" in err_desc.lower() or "कंधे" in err_desc:
                coaching_tip = "Dono shoulders ek hi level pe seedhe rakho — ek side mat jhuko."
                live_speech = "Shoulders ko equal level pe rakho!"
            elif "screen" in err_desc.lower() or "स्क्रीन" in err_desc:
                coaching_tip = "Screen se kam se kam 20 inch ki distance banao — aankhon ke liye zaroori hai."
                live_speech = "Screen se thoda peeche hato!"
            elif "hips_sagging" in unique_errs or "sagging" in err_desc:
                coaching_tip = "Core muscles ko tight karo aur hips ko straight rakho — bilkul!"
                live_speech = "Core tight karo, kamar mat jhukne do!"
            elif "depth" in err_desc or "shallow" in err_desc:
                coaching_tip = "Thodi aur depth lo — heels ko ground pe tika ke aur neeche jao."
                live_speech = "Heels pe tik ke aur neeche jao!"
            elif "elbow" in err_desc:
                coaching_tip = "Elbows ko body ke paas rakho — shoulder pe sahi balance aayega."
                live_speech = "Elbows thoda body ke paas rakho!"
            else:
                coaching_tip = f"{ex_name} mein pose ka balance thoda aur improve karo."
                live_speech = f"{ex_name} mein apna pose balance improve karo!"

            summary = f"AI ne {ex_name} mein issue detect kiya: {err_desc or 'pose imbalance'}. Please correct karo!"
        else:
            # No active issues — show optimal feedback
            opt_data = EXERCISE_OPTIMAL.get(exercise_type, {
                "summary": f"Live AI tracking active hai. {ex_name} mein pose balance achha lag raha hai!",
                "coaching_tip": "Bahut badhiya! Puri session mein breath aur balance maintain karo.",
                "live_speech": f"{ex_name} form achha chal raha hai!",
            })
            summary = opt_data["summary"]
            coaching_tip = opt_data["coaching_tip"]
            live_speech = opt_data["live_speech"]

        return {
            "summary": summary,
            "coaching_tip": coaching_tip,
            "live_speech": live_speech,
            "form_quality": self._compute_form_quality(computed_acc, errors),
            "stage": stage,
            "total_reps": total,
            "accuracy": computed_acc,
        }

    def _build_local_session_summary(self, exercise_type: str, total: int, correct: int, incorrect: int, accuracy: float, all_errors: list, min_angles: list) -> dict:
        ex_name = exercise_type.replace("_", " ").title()
        
        if total == 0:
            return {
                "headline": f"Short {ex_name} Session Completed",
                "overview": "The live feed recorded a brief camera session without complete repetition tracking.",
                "key_strengths": ["Quick posture check initialized.", "Camera tracking remained active."],
                "areas_for_improvement": ["Complete full range-of-motion reps to enable complete AI joint scoring."],
                "safety_note": "Position yourself fully in frame with proper lighting.",
                "score_text": "Session Incomplete",
                "formatted_text": f"Short {ex_name} Session. Position yourself fully in frame to complete full reps."
            }

        # Error frequency calculation
        err_counts = {}
        for e in all_errors:
            clean_e = e.replace("_", " ").title()
            err_counts[clean_e] = err_counts.get(clean_e, 0) + 1

        top_errors = sorted(err_counts.items(), key=lambda x: x[1], reverse=True)

        if accuracy >= 85:
            headline = f"Excellent {ex_name} Performance! 🌟"
            score_text = "Grade A+ • Outstanding Biomechanics"
            overview = (
                f"AI live feed analysis confirmed top-tier performance for your {ex_name} session. "
                f"You completed {correct} out of {total} reps ({accuracy}%) with consistent joint symmetry "
                f"and smooth movement velocity."
            )
            strengths = [
                f"High movement accuracy ({accuracy}% correct reps).",
                "Excellent joint alignment and depth stability throughout sets."
            ]
            improvements = [
                "Keep pace steady to avoid sudden acceleration on peak strain.",
                "Focus on breathing rhythm during transition phases."
            ]
            safety = "Great form! Continue maintaining smooth transitions to keep stress off ligaments."
        elif accuracy >= 60:
            headline = f"Solid {ex_name} Session with Key Focus Areas 🎯"
            score_text = f"Grade B • {accuracy}% Form Compliance"
            most_common = top_errors[0][0] if top_errors else "posture strain"
            overview = (
                f"During your live feed {ex_name} session, AI tracked {total} total reps with {correct} clean reps. "
                f"The primary error detected across live frames was '{most_common}'."
            )
            strengths = [
                f"Completed {total} full repetitions.",
                "Strong effort maintaining cadence under repetition workload."
            ]
            improvements = [
                f"Primary correction needed: reduce instances of {most_common}.",
                "Control movement tempo to prevent joint sway at peak flex."
            ]
            safety = "Pay extra attention when fatigue sets in, as joint alignment tends to break down."
        else:
            headline = f"{ex_name} Form Correction Recommended ⚠️"
            score_text = f"Grade C • Focus on Form over Rep Count"
            most_common = top_errors[0][0] if top_errors else "posture instability"
            overview = (
                f"AI telemetry live parsing flagged multiple posture inconsistencies during this {ex_name} session. "
                f"Only {correct} of {total} reps met safety threshold standards ({accuracy}% accuracy). "
                f"Frequent issue detected: {most_common}."
            )
            strengths = [
                "Good camera positioning and full detection tracking achieved.",
                "High engagement throughout the live stream session."
            ]
            improvements = [
                f"Address frequent issue: {most_common}.",
                "Slow down movement to focus strictly on joint angle control over speed."
            ]
            safety = "Consider lowering reps or doing assisted warmups until posture alignment stabilizes."

        formatted_text = (
            f"🎯 **{headline}**\n\n"
            f"📊 **Score**: {score_text}\n"
            f"📝 **AI Overview**: {overview}\n\n"
            f"✅ **Key Strengths**:\n• " + "\n• ".join(strengths) + "\n\n"
            f"💡 **Areas for Improvement**:\n• " + "\n• ".join(improvements) + "\n\n"
            f"🛡️ **Safety Note**: {safety}"
        )

        return {
            "headline": headline,
            "overview": overview,
            "key_strengths": strengths,
            "areas_for_improvement": improvements,
            "safety_note": safety,
            "score_text": score_text,
            "formatted_text": formatted_text,
            "accuracy": accuracy,
            "total_reps": total,
            "correct_reps": correct,
            "incorrect_reps": incorrect,
        }

# Global singleton instance
ai_summarizer = AISummarizer()
