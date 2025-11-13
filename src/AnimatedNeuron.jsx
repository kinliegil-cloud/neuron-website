import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";

export default function AnimatedNeuron({
  glbPath = "/neuron_final_2.glb",
  jsonPath = "/voltage_data.json",
  frameRate = 30,
}) {
  const { scene } = useGLTF(glbPath); // safe, no callback
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [voltages, setVoltages] = useState([]);
  const frameRef = useRef(0);
  const clockRef = useRef(0);

  // Detect GLB load
  useEffect(() => {
    if (scene) {
      setSceneLoaded(true);
      console.log("✅ GLB scene loaded:", scene);
    }
  }, [scene]);

  // Load voltage JSON safely
  useEffect(() => {
    fetch(jsonPath)
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Raw voltage JSON loaded:", data);

        // Normalize to array-of-arrays
        let voltageArray;
        if (Array.isArray(data)) {
          voltageArray = data;
        } else if (typeof data === "object" && data !== null) {
          voltageArray = Object.values(data);
        } else {
          console.warn("⚠️ JSON is neither array nor object, using empty array");
          voltageArray = [];
        }

        // Check each mesh
        voltageArray.forEach((meshFrames, i) => {
          if (!Array.isArray(meshFrames)) {
            console.warn(`⚠️ Mesh ${i} frames not an array:`, meshFrames);
            voltageArray[i] = []; // prevent crash
          }
        });

        setVoltages(voltageArray);
        console.log("✅ Processed voltage array length:", voltageArray.length);
      })
      .catch((err) => console.error("❌ Error loading voltage JSON:", err));
  }, [jsonPath]);

  // Voltage → color mapping
  function voltageToColor(v, vMin = -60, vMax = -50) {
    const norm = Math.min(Math.max((v - vMin) / (vMax - vMin), 0), 1);
    const color = new THREE.Color();
    color.setHSL(0.66 * (1 - norm), 1, 0.5); // blue → red
    return color;
  }

  // Animate neuron
  useFrame((_, delta) => {
    if (!sceneLoaded || voltages.length === 0 || !voltages[0]?.length) return;

    clockRef.current += delta;
    const frameDuration = 1 / frameRate;
    if (clockRef.current > frameDuration) {
      clockRef.current -= frameDuration;
      frameRef.current = (frameRef.current + 1) % voltages[0].length;
    }

    const currentFrame = frameRef.current;
    let meshIdx = 0;

    scene.traverse((child) => {
      if (child.isMesh) {
        let color;

        if (meshIdx < voltages.length && voltages[meshIdx][currentFrame] !== undefined) {
          color = voltageToColor(voltages[meshIdx][currentFrame]);
        } else {
          color = new THREE.Color("red"); // highlight missing data
        }

        if (child.material) {
          child.material.emissive.copy(color);
          child.material.emissiveIntensity = 1.5;
          child.material.needsUpdate = true;
        }

        meshIdx++;
      }
    });
  });

  // Fallback cube until GLB + JSON ready
  if (!sceneLoaded || !voltages.length || !voltages[0]?.length) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    );
  }

  return <primitive object={scene} />;
}
