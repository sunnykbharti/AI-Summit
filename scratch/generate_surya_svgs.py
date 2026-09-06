import os

output_dir = "/Users/sunnykumarbharti/Desktop/AI SUMMIT SHOWCASE/frontend/public/surya"
os.makedirs(output_dir, exist_ok=True)

steps = [
    {
        "num": 1,
        "name_en": "Pranamasana (Prayer Pose)",
        "name_hi": "प्रणामासन",
        "breath": "सांस: सामान्य (Normal)",
        "cue": "सीधे खड़े हों, दोनों हथेलियों को छाती के सामने जोड़ें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="60" y="240" width="280" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Standing Figure (Vertical Alignment) -->
            <!-- Head -->
            <circle cx="200" cy="72" r="16" fill="#0284c7"/>
            <!-- Neck -->
            <line x1="200" y1="88" x2="200" y2="100" stroke="#0369a1" stroke-width="6" stroke-linecap="round"/>
            <!-- Torso -->
            <line x1="200" y1="100" x2="200" y2="160" stroke="#0284c7" stroke-width="14" stroke-linecap="round"/>
            <!-- Arms / Prayer Hands at Chest -->
            <path d="M 188 108 L 175 130 L 196 130" stroke="#0369a1" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M 212 108 L 225 130 L 204 130" stroke="#0369a1" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Anjali Mudra Palms -->
            <ellipse cx="200" cy="128" rx="6" ry="10" fill="#38bdf8"/>
            <!-- Hips to Legs -->
            <line x1="195" y1="160" x2="195" y2="238" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
            <line x1="205" y1="160" x2="205" y2="238" stroke="#0369a1" stroke-width="11" stroke-linecap="round"/>
            <!-- Feet -->
            <ellipse cx="192" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <ellipse cx="208" cy="240" rx="9" ry="4" fill="#0284c7"/>
            <!-- Alignment Plumb Line (dashed) -->
            <line x1="200" y1="50" x2="200" y2="245" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4" opacity="0.6"/>
            <!-- Heart Chakra glow -->
            <circle cx="200" cy="128" r="14" fill="#38bdf8" opacity="0.25"/>
        """
    },
    {
        "num": 2,
        "name_en": "Hasta Uttanasana (Raised Arms)",
        "name_hi": "हस्त उत्तानासन",
        "breath": "सांस: अंदर लें (Inhale)",
        "cue": "सांस लेते हुए दोनों बाहें ऊपर उठाएं और हल्का सा backbend करें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="60" y="240" width="280" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Backbend curve -->
            <!-- Head arching back -->
            <circle cx="178" cy="68" r="16" fill="#0284c7"/>
            <!-- Torso arched -->
            <path d="M 184 84 C 188 115, 198 140, 202 165" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <!-- Arms raised overhead arching back -->
            <path d="M 188 94 Q 170 60, 160 38" stroke="#0369a1" stroke-width="8" stroke-linecap="round" fill="none"/>
            <path d="M 188 94 Q 176 56, 170 36" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" fill="none"/>
            <!-- Legs (straight, supporting weight) -->
            <line x1="198" y1="165" x2="198" y2="238" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
            <line x1="206" y1="165" x2="206" y2="238" stroke="#0369a1" stroke-width="11" stroke-linecap="round"/>
            <!-- Feet -->
            <ellipse cx="196" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <ellipse cx="208" cy="240" rx="9" ry="4" fill="#0284c7"/>
            <!-- Arch indicator arrow -->
            <path d="M 215 80 Q 235 55, 205 32" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" fill="none" stroke-dasharray="3 3"/>
            <polygon points="200,34 208,28 207,37" fill="#f59e0b"/>
            <!-- Sun burst subtle glow -->
            <circle cx="165" cy="35" r="18" fill="#fef08a" opacity="0.3"/>
        """
    },
    {
        "num": 3,
        "name_en": "Padahastasana (Forward Fold)",
        "name_hi": "पादहस्तासन",
        "breath": "सांस: बाहर छोड़ें (Exhale)",
        "cue": "सांस छोड़ते हुए कमर से आगे झुकें, हाथ पैरों के पास रखें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="60" y="240" width="280" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Legs standing straight -->
            <line x1="225" y1="140" x2="225" y2="238" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
            <!-- Hips apex -->
            <circle cx="225" cy="140" r="10" fill="#0369a1"/>
            <!-- Torso folding down along legs -->
            <path d="M 225 140 L 205 185 L 195 215" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <!-- Head hanging by shins -->
            <circle cx="192" cy="225" r="15" fill="#0284c7"/>
            <!-- Arms reaching to feet -->
            <path d="M 205 180 L 205 238" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" fill="none"/>
            <path d="M 212 180 L 215 238" stroke="#0369a1" stroke-width="7" stroke-linecap="round" fill="none"/>
            <!-- Hands beside feet -->
            <ellipse cx="205" cy="240" rx="6" ry="3" fill="#38bdf8"/>
            <ellipse cx="226" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <!-- Fold arrow -->
            <path d="M 255 125 Q 260 170, 238 205" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" fill="none" stroke-dasharray="3 3"/>
            <polygon points="234,209 243,205 236,198" fill="#06b6d4"/>
        """
    },
    {
        "num": 4,
        "name_en": "Ashwa Sanchalanasana (Right Leg Back)",
        "name_hi": "अश्व संचालनासन",
        "breath": "सांस: अंदर लें (Inhale)",
        "cue": "दायां पैर पीछे ले जाएं, बायां घुटना 90° पर रखें, छाती ऊपर उठाएं।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="40" y="240" width="320" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Right leg extended back -->
            <path d="M 185 185 Q 240 205, 305 238" stroke="#0369a1" stroke-width="11" stroke-linecap="round" fill="none"/>
            <ellipse cx="308" cy="240" rx="8" ry="4" fill="#0369a1"/>
            <!-- Left front leg bent 90 degrees -->
            <path d="M 185 185 L 140 185 L 140 238" stroke="#0284c7" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <ellipse cx="140" cy="240" rx="10" ry="4" fill="#0284c7"/>
            <!-- Torso arched upward -->
            <path d="M 185 185 C 180 155, 172 135, 170 115" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <!-- Head lifted looking up/forward -->
            <circle cx="170" cy="95" r="15" fill="#0284c7"/>
            <!-- Hands touching ground beside front foot -->
            <path d="M 174 135 L 155 190 L 150 238" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" fill="none"/>
            <ellipse cx="150" cy="240" rx="6" ry="3" fill="#38bdf8"/>
            <!-- Gaze indicator arrow -->
            <path d="M 160 85 L 130 65" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 3"/>
            <polygon points="125,62 133,68 135,60" fill="#f59e0b"/>
        """
    },
    {
        "num": 5,
        "name_en": "Dandasana (Plank Pose)",
        "name_hi": "दंडासन (प्लैंक)",
        "breath": "सांस: रोकें (Retain/Exhale)",
        "cue": "शरीर को सिर से एड़ी तक एक सीधी रेखा में रखें, कोर को tight रखें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="40" y="240" width="320" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Straight alignment line from head to heels -->
            <line x1="100" y1="140" x2="310" y2="235" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4" opacity="0.6"/>
            <!-- Head -->
            <circle cx="100" cy="135" r="15" fill="#0284c7"/>
            <!-- Torso and Hips -->
            <line x1="108" y1="142" x2="195" y2="182" stroke="#0284c7" stroke-width="13" stroke-linecap="round"/>
            <!-- Arms supporting vertically -->
            <line x1="125" y1="148" x2="125" y2="238" stroke="#0369a1" stroke-width="9" stroke-linecap="round"/>
            <line x1="135" y1="152" x2="135" y2="238" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
            <ellipse cx="125" cy="240" rx="8" ry="3" fill="#0369a1"/>
            <ellipse cx="135" cy="240" rx="8" ry="3" fill="#38bdf8"/>
            <!-- Legs straight back -->
            <line x1="195" y1="182" x2="305" y2="234" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
            <!-- Toes tucked -->
            <ellipse cx="308" cy="238" rx="7" ry="4" fill="#0369a1"/>
            <!-- Core stability ring -->
            <circle cx="195" cy="182" r="14" fill="#06b6d4" opacity="0.25"/>
        """
    },
    {
        "num": 6,
        "name_en": "Ashtanga Namaskara (8-Limbed Pose)",
        "name_hi": "अष्टांग नमस्कार",
        "breath": "सांस: बाहर छोड़ें (Exhale)",
        "cue": "8 अंग जमीन पर: दो पैर, दो घुटने, दो हथेलियां, छाती और ठुड्डी।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="40" y="240" width="320" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Feet (1, 2) -->
            <ellipse cx="310" cy="238" rx="7" ry="4" fill="#0284c7"/>
            <!-- Knees on mat (3, 4) -->
            <ellipse cx="230" cy="238" rx="8" ry="5" fill="#0284c7"/>
            <line x1="310" y1="236" x2="230" y2="236" stroke="#0284c7" stroke-width="10" stroke-linecap="round"/>
            <!-- Hips elevated off mat -->
            <path d="M 230 236 L 205 190 L 165 230" stroke="#0284c7" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Palms on ground (5, 6) -->
            <ellipse cx="150" cy="238" rx="8" ry="4" fill="#0369a1"/>
            <line x1="165" y1="210" x2="150" y2="238" stroke="#0369a1" stroke-width="8" stroke-linecap="round"/>
            <!-- Chest on mat (7) -->
            <circle cx="138" cy="236" r="6" fill="#38bdf8"/>
            <!-- Chin on mat (8) & Head -->
            <circle cx="108" cy="225" r="14" fill="#0284c7"/>
            <ellipse cx="118" cy="238" rx="6" ry="3" fill="#38bdf8"/>
            <!-- 8 contact point callouts -->
            <circle cx="310" cy="238" r="4" fill="#f59e0b"/>
            <circle cx="230" cy="238" r="4" fill="#f59e0b"/>
            <circle cx="150" cy="238" r="4" fill="#f59e0b"/>
            <circle cx="138" cy="238" r="4" fill="#f59e0b"/>
            <circle cx="118" cy="238" r="4" fill="#f59e0b"/>
            <!-- Elevated hips badge -->
            <path d="M 205 175 L 205 160" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
            <polygon points="205,155 201,162 209,162" fill="#10b981"/>
        """
    },
    {
        "num": 7,
        "name_en": "Bhujangasana (Cobra Pose)",
        "name_hi": "भुजंगासन",
        "breath": "सांस: अंदर लें (Inhale)",
        "cue": "सांस लेते हुए छाती को ऊपर उठाएं, नाभि जमीन पर और कंधे पीछे रखें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="40" y="240" width="320" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Legs flat on mat -->
            <line x1="190" y1="234" x2="310" y2="236" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
            <ellipse cx="312" cy="238" rx="8" ry="3" fill="#0369a1"/>
            <!-- Pelvis down, spine arching up -->
            <path d="M 190 234 C 170 230, 145 190, 135 140" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <!-- Head lifted, neck arched back -->
            <circle cx="128" cy="115" r="15" fill="#0284c7"/>
            <!-- Arms supporting curve -->
            <path d="M 145 165 L 140 205 L 140 238" stroke="#0369a1" stroke-width="8" stroke-linecap="round" fill="none"/>
            <ellipse cx="140" cy="240" rx="8" ry="3" fill="#0369a1"/>
            <!-- Chest lift arrows -->
            <path d="M 115 150 Q 100 130, 115 110" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" fill="none" stroke-dasharray="3 3"/>
            <polygon points="118,106 111,112 118,116" fill="#f59e0b"/>
            <!-- Radiant chest glow -->
            <circle cx="142" cy="148" r="16" fill="#38bdf8" opacity="0.25"/>
        """
    },
    {
        "num": 8,
        "name_en": "Adho Mukha Svanasana (Downward Dog)",
        "name_hi": "अधोमुख श्वानासन",
        "breath": "सांस: बाहर छोड़ें (Exhale)",
        "cue": "Hips को ऊपर उठाएं, शरीर से उल्टा 'V' बनाएं, एड़ियों को जमीन की ओर दबाएं।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="40" y="240" width="320" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Inverted V Shape apex at Hips -->
            <!-- Hands on mat -->
            <ellipse cx="110" cy="240" rx="8" ry="3" fill="#0369a1"/>
            <!-- Arms and Torso in straight line to Hips -->
            <line x1="110" y1="238" x2="200" y2="120" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
            <!-- Head relaxed between biceps -->
            <circle cx="138" cy="200" r="14" fill="#0369a1"/>
            <!-- Hip vertex -->
            <circle cx="200" cy="120" r="10" fill="#0284c7"/>
            <!-- Legs straight down to mat -->
            <line x1="200" y1="120" x2="290" y2="238" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
            <!-- Feet pressing down -->
            <ellipse cx="292" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <!-- Spine straightness guide line -->
            <line x1="100" y1="250" x2="200" y2="120" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4" opacity="0.5"/>
            <!-- Upward hip push arrow -->
            <path d="M 200 105 L 200 85" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
            <polygon points="200,80 195,88 205,88" fill="#10b981"/>
        """
    },
    {
        "num": 9,
        "name_en": "Ashwa Sanchalanasana (Left Leg Forward)",
        "name_hi": "अश्व संचालनासन",
        "breath": "सांस: अंदर लें (Inhale)",
        "cue": "बायां पैर आगे लाएं, दायां पैर पीछे सीधा रखें, दृष्टि सामने की ओर।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="40" y="240" width="320" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Back right leg extended -->
            <path d="M 215 185 Q 260 205, 310 238" stroke="#0369a1" stroke-width="11" stroke-linecap="round" fill="none"/>
            <ellipse cx="312" cy="240" rx="8" ry="4" fill="#0369a1"/>
            <!-- Front left leg 90 degrees -->
            <path d="M 215 185 L 160 185 L 160 238" stroke="#0284c7" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <ellipse cx="160" cy="240" rx="10" ry="4" fill="#0284c7"/>
            <!-- Torso & Chest lifted -->
            <path d="M 215 185 C 210 155, 202 135, 200 115" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <circle cx="200" cy="95" r="15" fill="#0284c7"/>
            <!-- Hands framing front foot -->
            <path d="M 204 135 L 180 190 L 175 238" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" fill="none"/>
            <ellipse cx="175" cy="240" rx="6" ry="3" fill="#38bdf8"/>
            <!-- Gaze arrow -->
            <path d="M 190 85 L 150 65" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 3"/>
            <polygon points="145,62 153,68 155,60" fill="#f59e0b"/>
        """
    },
    {
        "num": 10,
        "name_en": "Padahastasana (Forward Fold Return)",
        "name_hi": "पादहस्तासन",
        "breath": "सांस: बाहर छोड़ें (Exhale)",
        "cue": "दोनों पैर पास लाएं, सांस छोड़ते हुए आगे झुकें और माथा घुटनों के पास लाएं।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="60" y="240" width="280" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Legs standing straight -->
            <line x1="225" y1="140" x2="225" y2="238" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
            <circle cx="225" cy="140" r="10" fill="#0369a1"/>
            <!-- Deep fold -->
            <path d="M 225 140 L 205 185 L 195 215" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <circle cx="192" cy="225" r="15" fill="#0284c7"/>
            <path d="M 205 180 L 205 238" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" fill="none"/>
            <ellipse cx="205" cy="240" rx="6" ry="3" fill="#38bdf8"/>
            <ellipse cx="226" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <!-- Pulse ring -->
            <circle cx="192" cy="225" r="18" fill="#06b6d4" opacity="0.2"/>
        """
    },
    {
        "num": 11,
        "name_en": "Hasta Uttanasana (Raised Arms Return)",
        "name_hi": "हस्त उत्तानासन",
        "breath": "सांस: अंदर लें (Inhale)",
        "cue": "सांस लेते हुए सीधे ऊपर उठें, बाहें फैलाएं और हल्का backbend करें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="60" y="240" width="280" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Head arching back -->
            <circle cx="178" cy="68" r="16" fill="#0284c7"/>
            <!-- Torso arched -->
            <path d="M 184 84 C 188 115, 198 140, 202 165" stroke="#0284c7" stroke-width="13" stroke-linecap="round" fill="none"/>
            <!-- Arms sweeping overhead -->
            <path d="M 188 94 Q 170 60, 160 38" stroke="#0369a1" stroke-width="8" stroke-linecap="round" fill="none"/>
            <path d="M 188 94 Q 176 56, 170 36" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" fill="none"/>
            <!-- Legs -->
            <line x1="198" y1="165" x2="198" y2="238" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
            <line x1="206" y1="165" x2="206" y2="238" stroke="#0369a1" stroke-width="11" stroke-linecap="round"/>
            <ellipse cx="196" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <ellipse cx="208" cy="240" rx="9" ry="4" fill="#0284c7"/>
            <!-- Rising energy arrows -->
            <path d="M 140 180 L 140 110" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 3"/>
            <polygon points="140,105 135,113 145,113" fill="#10b981"/>
        """
    },
    {
        "num": 12,
        "name_en": "Pranamasana (Prayer Pose Return)",
        "name_hi": "प्रणामासन (समापन)",
        "breath": "सांस: बाहर छोड़ें (Exhale)",
        "cue": "सांस छोड़ते हुए हथेलियां छाती के सामने लाएं, शांत व स्थिर खड़े रहें।",
        "figure_svg": """
            <!-- Mat -->
            <rect x="60" y="240" width="280" height="8" rx="4" fill="#cbd5e1"/>
            <!-- Head -->
            <circle cx="200" cy="72" r="16" fill="#0284c7"/>
            <line x1="200" y1="88" x2="200" y2="100" stroke="#0369a1" stroke-width="6" stroke-linecap="round"/>
            <!-- Torso -->
            <line x1="200" y1="100" x2="200" y2="160" stroke="#0284c7" stroke-width="14" stroke-linecap="round"/>
            <!-- Prayer hands -->
            <path d="M 188 108 L 175 130 L 196 130" stroke="#0369a1" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M 212 108 L 225 130 L 204 130" stroke="#0369a1" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <ellipse cx="200" cy="128" rx="6" ry="10" fill="#38bdf8"/>
            <!-- Legs -->
            <line x1="195" y1="160" x2="195" y2="238" stroke="#0284c7" stroke-width="11" stroke-linecap="round"/>
            <line x1="205" y1="160" x2="205" y2="238" stroke="#0369a1" stroke-width="11" stroke-linecap="round"/>
            <ellipse cx="192" cy="240" rx="9" ry="4" fill="#0369a1"/>
            <ellipse cx="208" cy="240" rx="9" ry="4" fill="#0284c7"/>
            <!-- Golden halo / complete cycle blessing -->
            <circle cx="200" cy="72" r="28" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 4" fill="none" opacity="0.7"/>
            <circle cx="200" cy="128" r="18" fill="#38bdf8" opacity="0.3"/>
        """
    }
]

for s in steps:
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 290" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-grad-{s['num']}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="60%" stop-color="#f0f9ff" />
      <stop offset="100%" stop-color="#e0f2fe" />
    </linearGradient>
    <filter id="shadow-{s['num']}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0284c7" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Card Background -->
  <rect width="400" height="290" rx="24" fill="url(#bg-grad-{s['num']})" stroke="#bae6fd" stroke-width="1.5"/>

  <!-- Subtle Sun Aura Pattern -->
  <circle cx="200" cy="140" r="110" fill="#38bdf8" opacity="0.05" />
  <circle cx="200" cy="140" r="75" fill="#0284c7" opacity="0.04" />

  <!-- Top Badge: Step Number & Breath -->
  <g transform="translate(16, 16)">
    <rect width="90" height="26" rx="8" fill="#0284c7" />
    <text x="45" y="17" fill="#ffffff" font-size="11" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">
      STEP {s['num']} / 12
    </text>
  </g>

  <g transform="translate(250, 16)">
    <rect width="134" height="26" rx="8" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1"/>
    <text x="67" y="17" fill="#0369a1" font-size="10.5" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">
      {s['breath']}
    </text>
  </g>

  <!-- Dynamic Pose Figure -->
  <g filter="url(#shadow-{s['num']})">
    {s['figure_svg']}
  </g>

  <!-- Bottom Banner: Hindi & English Name -->
  <g transform="translate(16, 252)">
    <text x="184" y="12" fill="#0f172a" font-size="14" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">
      {s['name_hi']} • {s['name_en'].split('(')[0].strip()}
    </text>
    <text x="184" y="26" fill="#0369a1" font-size="10.5" font-weight="600" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">
      {s['cue']}
    </text>
  </g>
</svg>
'''
    filename = f"step{s['num']}.svg"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated {filepath}")

print("All 12 Surya Namaskar step SVGs successfully created!")
