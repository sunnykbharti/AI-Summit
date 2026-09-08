import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Rotate3d,
  Maximize2,
  RefreshCw,
  Eye,
  Activity,
  Sparkles,
  Play,
  Pause,
  Compass,
  Zap,
} from "lucide-react";

export const EXERCISE_METADATA_3D = {
  squat: {
    title: "स्क्वैट्स (Squats 3D Demo)",
    focusJoint: "घुटने व हिप्स (Knees & Hips: 90° Target)",
    tempoText: "3.0s / रेप (2s Descent, 1s Ascent)",
    cue: "घुटनों को पंजों की सीध में रखें, हिप्स पीछे ले जाएं।",
  },
  pushup: {
    title: "पुश-अप (Push-ups 3D Demo)",
    focusJoint: "कोहनियां व रीढ़ (Elbows 45° & Rigid Plank)",
    tempoText: "2.5s / रेप (छाती फर्श से 2 इंच ऊपर)",
    cue: "कोर टाइट रखें, कोहनियों को 45° तीर के आकार में मोड़ें।",
  },
  suryanamaskar: {
    title: "सूर्य नमस्कार (Surya Namaskar Flow)",
    focusJoint: "रीढ़ व काइनेटिक चेन (Full Spinal Mobility)",
    tempoText: "श्वास चक्र के साथ गतिशील प्रवाह",
    cue: "प्रत्येक आसन में रीढ़ और श्वास का तालमेल बनाए रखें।",
  },
  plank: {
    title: "प्लैंक होल्ड (Plank 3D Demo)",
    focusJoint: "डीप कोर व पेल्विस (Neutral Spine)",
    tempoText: "आइसोमेट्रिक होल्ड (Hold Position)",
    cue: "सिर से एड़ियों तक शरीर को बिल्कुल सीधा रखें।",
  },
  lunges: {
    title: "लंजेस (Lunges 3D Demo)",
    focusJoint: "दोनों घुटने 90° (Unilateral Balance)",
    tempoText: "2.5s / रेप (Vertical Torso)",
    cue: "धड़ सीधा रखें, आगे वाले घुटने को पंजों से आगे न जाने दें।",
  },
  tree_pose: {
    title: "वृक्षासन (Tree Pose 3D Demo)",
    focusJoint: "टखना व पेल्विक अलाइनमेंट (Single Leg Balance)",
    tempoText: "स्थिर संतुलन (Steady Focus)",
    cue: "दृष्टि एक बिंदु पर टिकाएं, हिप्स चौकोर रखें।",
  },
  warrior: {
    title: "वीरभद्रासन II (Warrior II 3D Demo)",
    focusJoint: "फ्रंट नी 90°, आर्म्स पैरेलल (Warrior Stance)",
    tempoText: "शक्तिशाली ग्राउंडेड पोज़",
    cue: "आगे का घुटना 90° मोड़ें, बाहें कंधे के स्तर पर फैलाएं।",
  },
  triangle: {
    title: "त्रिकोणासन (Triangle Pose 3D Demo)",
    focusJoint: "लेटरल स्पाइन व हैमस्ट्रिंग्स (Open Chest)",
    tempoText: "लेटरल स्ट्रेच (Side Extension)",
    cue: "छाती को सामने खोलें, दोनों पैर सीधे रखें।",
  },
  cobra: {
    title: "भुजंगासन (Cobra Pose 3D Demo)",
    focusJoint: "स्पाइनल एक्सटेंशन (Chest Opener)",
    tempoText: "बैकबेंड स्ट्रेच",
    cue: "कंधे नीचे रोल करें, छाती आगे-ऊपर उठाएं।",
  },
  desk: {
    title: "स्टडी व इंटरव्यू पोस्चर (Ergonomic 3D)",
    focusJoint: "गर्दन 0° टिल्ट, एल्बो 90° (Upright Ergonomics)",
    tempoText: "आदर्श सिटिंग पोस्चर",
    cue: "स्क्रीन आंखों के स्तर पर रखें, रीढ़ सीधी रखें।",
  },
};

/**
 * 3D AI Kinematic Trainer Bot Viewer Component
 * Renders an interactive 3D WebGL humanoid bot right beside the camera feed.
 * Features 360° mouse drag rotation, view presets, real-time kinetic animation,
 * and holographic biomechanical target HUD.
 */
const Pose3DBotViewer = ({
  exercise = "squat",
  suryaStep = 1,
  className = "",
  onClose = null,
  muscleActivation = null,
}) => {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const isPlayingRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [viewAngle, setViewAngle] = useState("angle"); // "angle", "front", "side", "top"

  // Props tracked in refs so Three.js initializes ONCE and never tears down during navigation or prop updates
  const exerciseRef = useRef(exercise);
  const suryaStepRef = useRef(suryaStep);
  const speedRef = useRef(speedMultiplier);

  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  useEffect(() => {
    suryaStepRef.current = suryaStep;
  }, [suryaStep]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  const meta = useMemo(() => {
    return EXERCISE_METADATA_3D[exercise] || EXERCISE_METADATA_3D.squat;
  }, [exercise]);

  // Handle view preset buttons
  const setCameraPreset = (preset) => {
    setViewAngle(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (preset) {
      case "front":
        cam.position.set(0, 1.1, 2.7);
        ctrl.target.set(0, 0.9, 0);
        break;
      case "side":
        cam.position.set(2.7, 1.1, 0.05);
        ctrl.target.set(0, 0.9, 0);
        break;
      case "angle":
        cam.position.set(1.9, 1.3, 2.0);
        ctrl.target.set(0, 0.9, 0);
        break;
      case "top":
        cam.position.set(0.01, 3.2, 0.8);
        ctrl.target.set(0, 0.8, 0);
        break;
      default:
        break;
    }
    ctrl.update();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Three.js Scene, Camera, Renderer (Light Studio Mode) ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Crisp light slate background
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.04); // Soft depth fog

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 450;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 30);
    camera.position.set(1.9, 1.3, 2.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.0;
    controls.maxDistance = 5.5;
    controls.target.set(0, 0.9, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.08; // don't go below ground
    controlsRef.current = controls;
    controls.update();

    // --- 2. Studio Lighting for Light Background ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3.0, 5.0, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    scene.add(keyLight);

    const cyanFillLight = new THREE.DirectionalLight(0x0284c7, 1.4);
    cyanFillLight.position.set(-3.0, 2.5, 2.0);
    scene.add(cyanFillLight);

    const softBackLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    softBackLight.position.set(0, 3.0, -3.0);
    scene.add(softBackLight);

    // --- 3. Kinematic 3D Humanoid Bot Construction (High-Contrast Materials) ---
    // Deep midnight slate armor for razor-sharp visibility against light background
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.35,
      roughness: 0.25,
    });
    // Athletic cyan-blue chest plate
    const chestPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      metalness: 0.55,
      roughness: 0.2,
    });
    // Polished slate chrome joint hinges
    const chromeJointMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.15,
    });
    // Vibrant glowing cyan joints (high visibility!)
    const neonCyanGlow = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 1.0,
      metalness: 0.2,
      roughness: 0.2,
    });
    // Glowing core reactor
    const neonCoreGlow = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      metalness: 0.1,
      roughness: 0.1,
    });

    const botRoot = new THREE.Group();
    scene.add(botRoot);

    // Skeleton Nodes
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.95, 0);
    botRoot.add(pelvis);

    // Pelvis Mesh
    const pelvisGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.14, 16);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, armorMat);
    pelvisMesh.castShadow = true;
    pelvis.add(pelvisMesh);

    // Spine
    const spine = new THREE.Group();
    spine.position.set(0, 0.1, 0);
    pelvis.add(spine);

    const spineGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.18, 14);
    const spineMesh = new THREE.Mesh(spineGeo, armorMat);
    spineMesh.position.y = 0.09;
    spineMesh.castShadow = true;
    spine.add(spineMesh);

    // Chest
    const chest = new THREE.Group();
    chest.position.set(0, 0.22, 0);
    spine.add(chest);

    const chestGeo = new THREE.BoxGeometry(0.32, 0.26, 0.19);
    const chestMesh = new THREE.Mesh(chestGeo, chestPlateMat);
    chestMesh.position.y = 0.13;
    chestMesh.castShadow = true;
    chest.add(chestMesh);

    // Chest Core Nexus
    const coreGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const coreMesh = new THREE.Mesh(coreGeo, neonCoreGlow);
    coreMesh.position.set(0, 0.15, 0.10);
    chest.add(coreMesh);

    // Neck & Head
    const neck = new THREE.Group();
    neck.position.set(0, 0.28, 0);
    chest.add(neck);

    const neckGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.08, 12);
    const neckMesh = new THREE.Mesh(neckGeo, chromeJointMat);
    neckMesh.position.y = 0.04;
    neck.add(neckMesh);

    const head = new THREE.Group();
    head.position.set(0, 0.12, 0);
    neck.add(head);

    // Helmet
    const headGeo = new THREE.SphereGeometry(0.11, 20, 20);
    headGeo.scale(1.0, 1.15, 1.05);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Glowing Visor
    const visorGeo = new THREE.BoxGeometry(0.14, 0.04, 0.06);
    const visorMesh = new THREE.Mesh(visorGeo, neonCyanGlow);
    visorMesh.position.set(0, 0.02, 0.09);
    head.add(visorMesh);

    // --- ARMS ---
    const createArm = (isLeft) => {
      const sign = isLeft ? 1 : -1;
      const shoulder = new THREE.Group();
      shoulder.position.set(sign * 0.22, 0.22, 0);
      chest.add(shoulder);

      // Shoulder Sphere
      const shGeo = new THREE.SphereGeometry(0.06, 14, 14);
      const shMesh = new THREE.Mesh(shGeo, chromeJointMat);
      shoulder.add(shMesh);

      // Upper Arm
      const upperArm = new THREE.Group();
      shoulder.add(upperArm);

      const uArmGeo = new THREE.CylinderGeometry(0.048, 0.042, 0.22, 12);
      const uArmMesh = new THREE.Mesh(uArmGeo, armorMat);
      uArmMesh.position.y = -0.11;
      uArmMesh.castShadow = true;
      upperArm.add(uArmMesh);

      // Elbow
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.22, 0);
      upperArm.add(elbow);

      const elGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const elMesh = new THREE.Mesh(elGeo, neonCyanGlow);
      elbow.add(elMesh);

      // Forearm
      const forearm = new THREE.Group();
      elbow.add(forearm);

      const fArmGeo = new THREE.CylinderGeometry(0.042, 0.038, 0.20, 12);
      const fArmMesh = new THREE.Mesh(fArmGeo, armorMat);
      fArmMesh.position.y = -0.10;
      fArmMesh.castShadow = true;
      forearm.add(fArmMesh);

      // Hand
      const hand = new THREE.Group();
      hand.position.set(0, -0.21, 0);
      forearm.add(hand);

      const handGeo = new THREE.BoxGeometry(0.05, 0.07, 0.03);
      const handMesh = new THREE.Mesh(handGeo, chromeJointMat);
      handMesh.position.y = -0.03;
      hand.add(handMesh);

      return { shoulder, upperArm, elbow, forearm, hand };
    };

    const leftArm = createArm(true);
    const rightArm = createArm(false);

    // --- LEGS ---
    const createLeg = (isLeft) => {
      const sign = isLeft ? 1 : -1;
      const hip = new THREE.Group();
      hip.position.set(sign * 0.12, -0.06, 0);
      pelvis.add(hip);

      // Hip Joint
      const hipGeo = new THREE.SphereGeometry(0.065, 14, 14);
      const hipMesh = new THREE.Mesh(hipGeo, chromeJointMat);
      hip.add(hipMesh);

      // Thigh
      const thigh = new THREE.Group();
      hip.add(thigh);

      const thighGeo = new THREE.CylinderGeometry(0.062, 0.052, 0.36, 14);
      const thighMesh = new THREE.Mesh(thighGeo, armorMat);
      thighMesh.position.y = -0.18;
      thighMesh.castShadow = true;
      thigh.add(thighMesh);

      // Knee Joint (with neon highlight)
      const knee = new THREE.Group();
      knee.position.set(0, -0.36, 0);
      thigh.add(knee);

      const kneeGeo = new THREE.SphereGeometry(0.055, 14, 14);
      const kneeMesh = new THREE.Mesh(kneeGeo, neonCyanGlow);
      knee.add(kneeMesh);

      // Calf / Shin
      const calf = new THREE.Group();
      knee.add(calf);

      const calfGeo = new THREE.CylinderGeometry(0.052, 0.042, 0.36, 14);
      const calfMesh = new THREE.Mesh(calfGeo, armorMat);
      calfMesh.position.y = -0.18;
      calfMesh.castShadow = true;
      calf.add(calfMesh);

      // Ankle & Foot
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.36, 0);
      calf.add(ankle);

      const footGeo = new THREE.BoxGeometry(0.09, 0.05, 0.18);
      const footMesh = new THREE.Mesh(footGeo, armorMat);
      footMesh.position.set(0, -0.025, 0.05);
      footMesh.castShadow = true;
      ankle.add(footMesh);

      return { hip, thigh, knee, calf, ankle };
    };

    const leftLeg = createLeg(true);
    const rightLeg = createLeg(false);

    // --- 5. Real-Time Kinematic Procedural Animations ---
    let animClock = new THREE.Clock();
    let frameId;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      controls.update();

      if (!isPlayingRef.current) {
        renderer.render(scene, camera);
        return;
      }

      const curExercise = exerciseRef.current || "squat";
      const curSuryaStep = suryaStepRef.current || 1;
      const curSpeed = speedRef.current || 1.0;

      const t = animClock.getElapsedTime() * curSpeed;

      // Reset base transforms
      botRoot.position.set(0, 0, 0);
      botRoot.rotation.set(0, 0, 0);
      pelvis.position.set(0, 0.95, 0);
      pelvis.rotation.set(0, 0, 0);
      spine.rotation.set(0, 0, 0);
      chest.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);

      leftArm.upperArm.rotation.set(0, 0, 0);
      leftArm.elbow.rotation.set(0, 0, 0);
      rightArm.upperArm.rotation.set(0, 0, 0);
      rightArm.elbow.rotation.set(0, 0, 0);

      leftLeg.thigh.rotation.set(0, 0, 0);
      leftLeg.knee.rotation.set(0, 0, 0);
      leftLeg.ankle.rotation.set(0, 0, 0);
      rightLeg.thigh.rotation.set(0, 0, 0);
      rightLeg.knee.rotation.set(0, 0, 0);
      rightLeg.ankle.rotation.set(0, 0, 0);

      // --- EXERCISE KINEMATICS ---
      switch (curExercise) {
        case "squat": {
          // Smooth 3.2s cyclic squat motion with realistic 2s descent and 1s ascent
          const cycle = (Math.sin(t * 2.0) + 1) / 2; // 0 (standing) to 1 (full 90° squat)
          const smoothCycle = Math.pow(cycle, 1.4);

          // Pelvis drops backward and downward
          pelvis.position.y = 0.95 - smoothCycle * 0.38;
          pelvis.position.z = -smoothCycle * 0.18;

          // Hip flexion (thigh bends up)
          const hipAngle = smoothCycle * 1.55; // ~89 degrees
          leftLeg.thigh.rotation.x = -hipAngle;
          rightLeg.thigh.rotation.x = -hipAngle;

          // Track knees outward (Knee Valgus prevention demonstration!)
          leftLeg.thigh.rotation.z = smoothCycle * 0.18;
          rightLeg.thigh.rotation.z = -smoothCycle * 0.18;

          // Knee flexion (knee bends back)
          const kneeAngle = smoothCycle * 1.70; // ~97 degrees
          leftLeg.knee.rotation.x = kneeAngle;
          rightLeg.knee.rotation.x = kneeAngle;

          // Ankle dorsiflexion
          leftLeg.ankle.rotation.x = -smoothCycle * 0.35;
          rightLeg.ankle.rotation.x = -smoothCycle * 0.35;

          // Torso counter-balance (forward spine lean)
          spine.rotation.x = smoothCycle * 0.45;

          // Arms raise forward for balance
          leftArm.upperArm.rotation.x = -smoothCycle * 1.4;
          rightArm.upperArm.rotation.x = -smoothCycle * 1.4;
          leftArm.elbow.rotation.x = -smoothCycle * 0.2;
          rightArm.elbow.rotation.x = -smoothCycle * 0.2;
          break;
        }

        case "pushup": {
          // Horizontal body in rigid plank
          botRoot.rotation.x = -Math.PI / 2;
          botRoot.position.set(0, 0.45, 0.1);

          // Pushup descent & ascent loop
          const cycle = (Math.sin(t * 2.2) + 1) / 2;
          const pushDepth = Math.pow(cycle, 1.2);

          // Chest lowers toward floor
          botRoot.position.y = 0.45 - pushDepth * 0.24;

          // Elbows bend back at 45° arrow shape
          const elbowBend = pushDepth * 1.55;
          leftArm.upperArm.rotation.x = -0.3;
          leftArm.upperArm.rotation.z = 0.45;
          leftArm.elbow.rotation.x = elbowBend;

          rightArm.upperArm.rotation.x = -0.3;
          rightArm.upperArm.rotation.z = -0.45;
          rightArm.elbow.rotation.x = elbowBend;

          // Locked rigid plank spine & legs
          spine.rotation.x = 0;
          leftLeg.thigh.rotation.x = 0.05;
          rightLeg.thigh.rotation.x = 0.05;
          break;
        }

        case "plank": {
          // Isometric Rigid Forearm Plank
          botRoot.rotation.x = -Math.PI / 2;
          botRoot.position.set(0, 0.28, 0.1);

          // Forearms on ground
          leftArm.upperArm.rotation.x = 0.1;
          leftArm.upperArm.rotation.z = 0.2;
          leftArm.elbow.rotation.x = 1.57; // 90°

          rightArm.upperArm.rotation.x = 0.1;
          rightArm.upperArm.rotation.z = -0.2;
          rightArm.elbow.rotation.x = 1.57; // 90°

          // Subtle breathing respiration pulse
          const breath = Math.sin(t * 2.5) * 0.015;
          chest.scale.set(1 + breath, 1 + breath, 1 + breath);
          break;
        }

        case "lunges": {
          // Lunge cycle
          const cycle = (Math.sin(t * 2.0) + 1) / 2;
          const depth = Math.pow(cycle, 1.3);

          pelvis.position.y = 0.95 - depth * 0.28;

          // Front leg (left): step forward, bend to 90°
          leftLeg.thigh.position.z = depth * 0.15;
          leftLeg.thigh.rotation.x = -depth * 1.55;
          leftLeg.knee.rotation.x = depth * 1.57;

          // Back leg (right): stretched back, knee down
          rightLeg.thigh.position.z = -depth * 0.18;
          rightLeg.thigh.rotation.x = depth * 0.55;
          rightLeg.knee.rotation.x = depth * 1.65;

          // Torso stays vertical!
          spine.rotation.x = -depth * 0.05;

          // Natural running balance arms
          leftArm.upperArm.rotation.x = depth * 0.6;
          rightArm.upperArm.rotation.x = -depth * 0.6;
          break;
        }

        case "tree_pose": {
          // Single-leg balance posture
          // Left leg straight
          leftLeg.thigh.rotation.x = 0;
          leftLeg.knee.rotation.x = 0;

          // Right leg tucked to inner thigh (abducted 80°, knee bent)
          rightLeg.thigh.rotation.z = -1.2;
          rightLeg.thigh.rotation.x = -0.3;
          rightLeg.knee.rotation.x = 2.4;

          // Hands joined above head in prayer pose
          leftArm.upperArm.rotation.z = 2.8;
          leftArm.elbow.rotation.z = 0.3;
          rightArm.upperArm.rotation.z = -2.8;
          rightArm.elbow.rotation.z = -0.3;

          // Subtle natural micro-balance sway
          pelvis.rotation.z = Math.sin(t * 1.5) * 0.015;
          break;
        }

        case "warrior": {
          // Warrior II Pose
          // Legs wide
          leftLeg.thigh.rotation.z = 0.6;
          leftLeg.thigh.rotation.x = -0.7;
          leftLeg.knee.rotation.x = 1.57; // 90°

          rightLeg.thigh.rotation.z = -0.6;
          rightLeg.thigh.rotation.x = 0.2;
          rightLeg.knee.rotation.x = 0.1;

          pelvis.position.y = 0.80;

          // Arms outstretched parallel to ground
          leftArm.upperArm.rotation.z = 1.57;
          rightArm.upperArm.rotation.z = -1.57;

          // Head looks forward over left hand
          head.rotation.y = 0.8;
          break;
        }

        case "triangle": {
          // Trikonasana (Triangle Pose)
          leftLeg.thigh.rotation.z = 0.45;
          rightLeg.thigh.rotation.z = -0.45;

          // Lateral spine bend
          spine.rotation.z = 0.9;
          pelvis.position.y = 0.88;

          // Left hand down to ankle
          leftArm.upperArm.rotation.z = 0.6;
          // Right hand pointing straight up to sky
          rightArm.upperArm.rotation.z = -2.9;

          head.rotation.z = -0.5;
          break;
        }

        case "cobra": {
          // Bhujangasana (Cobra Pose)
          botRoot.rotation.x = -Math.PI / 2;
          botRoot.position.set(0, 0.15, 0);

          // Arch spine and chest upward
          spine.rotation.x = -0.85;
          chest.rotation.x = -0.35;
          head.rotation.x = 0.5;

          // Hands on ground supporting chest
          leftArm.upperArm.rotation.x = 0.6;
          leftArm.elbow.rotation.x = 1.2;
          rightArm.upperArm.rotation.x = 0.6;
          rightArm.elbow.rotation.x = 1.2;
          break;
        }

        case "desk": {
          // Ergonomic Study Posture (Seated 90° knees, 90° elbows, upright)
          pelvis.position.y = 0.65;
          leftLeg.thigh.rotation.x = -1.57;
          rightLeg.thigh.rotation.x = -1.57;
          leftLeg.knee.rotation.x = 1.57;
          rightLeg.knee.rotation.x = 1.57;

          // Arms resting on desk at 90°
          leftArm.upperArm.rotation.x = -0.4;
          leftArm.elbow.rotation.x = 1.57;
          rightArm.upperArm.rotation.x = -0.4;
          rightArm.elbow.rotation.x = 1.57;

          // Straight spine & neck
          spine.rotation.x = 0;
          head.rotation.x = 0;
          break;
        }

        case "suryanamaskar": {
          // Dynamic Pose based on current active surya step (1 to 12)
          switch (curSuryaStep) {
            case 1:
            case 12: // Pranamasana (Prayer Pose)
              leftArm.upperArm.rotation.x = -0.6;
              leftArm.upperArm.rotation.z = 0.5;
              leftArm.elbow.rotation.z = 1.4;
              rightArm.upperArm.rotation.x = -0.6;
              rightArm.upperArm.rotation.z = -0.5;
              rightArm.elbow.rotation.z = -1.4;
              break;

            case 2:
            case 11: // Hasta Uttanasana (Raised arms backbend)
              spine.rotation.x = -0.35;
              head.rotation.x = 0.3;
              leftArm.upperArm.rotation.x = -2.8;
              rightArm.upperArm.rotation.x = -2.8;
              break;

            case 3:
            case 10: // Padahastasana (Forward Fold)
              pelvis.position.y = 0.85;
              spine.rotation.x = 2.1; // Deep hip hinge
              leftLeg.knee.rotation.x = 0.1;
              rightLeg.knee.rotation.x = 0.1;
              leftArm.upperArm.rotation.x = 0.3;
              rightArm.upperArm.rotation.x = 0.3;
              break;

            case 4:
            case 9: // Ashwa Sanchalanasana (Lunge, head up)
              pelvis.position.y = 0.55;
              leftLeg.thigh.rotation.x = -1.57;
              leftLeg.knee.rotation.x = 1.57;
              rightLeg.thigh.rotation.x = 0.8;
              rightLeg.knee.rotation.x = 1.5;
              spine.rotation.x = -0.2;
              head.rotation.x = 0.4;
              break;

            case 5: // Dandasana (Plank)
              botRoot.rotation.x = -Math.PI / 2;
              botRoot.position.set(0, 0.4, 0.1);
              break;

            case 6: // Ashtanga Namaskara (8 Limbs on floor)
              botRoot.rotation.x = -Math.PI / 2;
              botRoot.position.set(0, 0.18, 0);
              pelvis.position.y = 1.1; // Hips slightly raised
              leftLeg.knee.rotation.x = 1.2;
              rightLeg.knee.rotation.x = 1.2;
              break;

            case 7: // Bhujangasana (Cobra)
              botRoot.rotation.x = -Math.PI / 2;
              botRoot.position.set(0, 0.15, 0);
              spine.rotation.x = -0.85;
              head.rotation.x = 0.4;
              break;

            case 8: // Adho Mukha Svanasana (Downward Dog - Inverted V)
              botRoot.position.set(0, 0.7, 0);
              pelvis.position.y = 1.35;
              spine.rotation.x = 1.6;
              leftArm.upperArm.rotation.x = -2.7;
              rightArm.upperArm.rotation.x = -2.7;
              break;

            default:
              break;
          }
          break;
        }

        default:
          break;
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- 6. Resize Observer ---
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 360;
      const newH = container.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- 7. Deep Cleanup on Unmount (Fast GPU context release, zero lingering memory) ---
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      try {
        controls.dispose();
      } catch (_) {}

      // Recursively dispose geometries and materials
      scene.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry) {
            try { obj.geometry.dispose(); } catch (_) {}
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                try { if (m && m.dispose) m.dispose(); } catch (_) {}
              });
            } else {
              try { if (obj.material.dispose) obj.material.dispose(); } catch (_) {}
            }
          }
        }
      });

      try {
        renderer.forceContextLoss();
        renderer.dispose();
      } catch (_) {}

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Mounts once: dynamic kinematics run at 60fps reading refs, zero WebGL rebuild delay

  return (
    <div
      className={`relative w-full h-full flex flex-col rounded-3xl border border-slate-200 bg-[#f8fafc] shadow-lg overflow-hidden ${className}`}
    >
      {/* Dynamic Mind-Muscle Activation HUD */}
      {muscleActivation && muscleActivation.primary_muscle && (
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/85 border border-cyan-500/40 px-2.5 py-1 backdrop-blur-md shadow-md text-white">
            <Zap size={13} className="text-cyan-400 animate-pulse" />
            <div className="text-[11px] font-bold flex items-center gap-1">
              <span className="text-cyan-300">{muscleActivation.primary_muscle}:</span>
              <span className="text-emerald-400 font-mono font-black">
                {muscleActivation.peak_activation_pct ?? 85}%
              </span>
            </div>
          </div>
          {muscleActivation.mind_muscle_cue && (
            <div className="hidden sm:block rounded-xl bg-slate-900/85 border border-slate-700/60 px-2.5 py-1 text-[10px] text-slate-300 font-medium backdrop-blur-md truncate max-w-[210px]">
              {muscleActivation.mind_muscle_cue}
            </div>
          )}
        </div>
      )}

      {/* Pure 3D Canvas Viewport - Only Bot */}
      <div
        ref={mountRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing bg-[#f8fafc]"
      />
    </div>
  );
};

export default React.memo(Pose3DBotViewer);
