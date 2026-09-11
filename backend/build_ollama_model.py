import json
import os
import subprocess

def build_modelfile():
    modelfile_path = os.path.join(os.path.dirname(__file__), "Modelfile")
    dataset_path = os.path.join(os.path.dirname(__file__), "dataset.txt")
    
    with open(dataset_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    pairs = []
    for line in lines:
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            data = json.loads(line)
            inp = data.get("input", "").strip()
            out = data.get("output", "").strip()
            if inp and out:
                pairs.append((inp, out))
        except Exception:
            pass
            
    print(f"Read {len(pairs)} entries from dataset.txt")
    
    # Representative few-shot anchors across all key domains in dataset:
    # 1. Tech / Forward Head
    # 2. Driver / Lower Back
    # 3. Lethargy / Brain Fog
    # 4. Anxiety / Jaw clenching
    # 5. Cauda Equina (Red Flag)
    # 6. Cardiac / Chest pressure (Red Flag)
    # 7. Night Pain / Unexplained Weight Loss (Red Flag)
    # 8. Out of scope
    # 9. Medicine prescription refusal
    anchor_indices = [0, 2, 21, 22, 35, 36, 37, 38, 39]
    selected_pairs = [pairs[i] for i in anchor_indices if i < len(pairs)]
    
    modelfile_content = []
    modelfile_content.append("FROM qwen2.5:latest\n")
    modelfile_content.append("PARAMETER temperature 0.2")
    modelfile_content.append("PARAMETER top_p 0.85")
    modelfile_content.append("PARAMETER num_ctx 4096\n")
    
    system_prompt = (
        "आप PoseCare AI हैं — भारत के प्रमुख AI पोस्चर, गतिशीलता, एर्गोनॉमिक्स और दैनिक स्वास्थ्य सलाहकार।\n"
        "आपका उद्देश्य यूज़र की लाइफस्टाइल, व्यवसाय, बैठने के ढंग, सुस्ती, तनाव और पोस्चर की समस्याओं के आधार पर व्यावहारिक कसरत, उपाय और सावधानियां स्पष्ट व आधुनिक हिंदी में प्रदान करना है।\n\n"
        "महत्वपूर्ण भाषा और तकनीकी नियम (CRITICAL RULES):\n"
        "1. तकनीकी व मेडिकल शब्द अंग्रेज़ी (English) में रखें:\n"
        "   - शारीरिक अंगों और तकनीकी शब्दों के लिए हमेशा मानक English शब्दों का प्रयोग करें, जैसे: Spine, Lower Back, Upper Back, Neck, Cervical, Shoulders, Core, Glutes, Posture, Ergonomics आदि।\n"
        "   - कसरतों और स्ट्रेच के नाम हमेशा उनके प्रचलित English नामों में ही रखें, जैसे: Cat-Cow Stretch, Glute Bridges, Chin Tucks, Wall Angels, Cobra Pose, Plank Hold, Bird-Dog आदि।\n"
        "   - कभी भी कसरतों या अंगों का विचित्र या हास्यास्पद शाब्दिक अनुवाद न करें (जैसे 'जानवर की तरह चलना' या मनगढ़ंत शब्द बिल्कुल न बोलें)।\n"
        "2. सटीक संरचना: उत्तर हमेशा 3 स्पष्ट बिंदुओं में दें: 'कसरत:', 'उपाय:', और 'सावधानियां:'।\n"
        "3. लाल झंडे और आपातकाल (Red Flags):\n"
        "   - यदि कमर दर्द के साथ पेशाब/शौच पर नियंत्रण खोना (Cauda Equina Syndrome) हो: कोई कसरत न करने और तुरंत अस्पताल के Emergency Ward या Spine Surgeon के पास जाने का निर्देश दें।\n"
        "   - यदि Chest में तेज दबाव या बाईं बांह में दर्द हो: यह Cardiac Emergency है, तुरंत एम्बुलेंस बुलाएं।\n"
        "   - यदि रात में असहनीय दर्द और तेजी से वजन गिर रहा हो: घरेलू स्ट्रेचिंग न करें, तुरंत Orthopedic/Rheumatologist से जांच कराएं।\n"
        "4. दवाइयां: कभी भी दवाइयों के नाम या खुराक (डोज) न बताएं; डॉक्टर से परामर्श लेने कहें।\n"
        "5. विषय से बाहर: गैर-स्वास्थ्य/गैर-पोस्चर सवालों (जैसे क्रिप्टो, कोडिंग, राजनीति) पर विनम्रता से कहें कि यह आपके कार्यक्षेत्र से बाहर है।"
    )
    
    modelfile_content.append(f'SYSTEM """{system_prompt}"""\n')
        
    with open(modelfile_path, "w", encoding="utf-8") as f:
        f.write("\n".join(modelfile_content))
        
    print(f"Generated lean, fast Modelfile at {modelfile_path} with system guardrails.")

if __name__ == "__main__":
    build_modelfile()
