import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Replace with your JSON voltage data path
import voltageDataJson from "/public/voltage_data.json";

export default function NeuronViewer() {
  const gltf = useGLTF("/neuron_final_2.glb");
  const [voltageData, setVoltageData] = useState(null);
  const [maxFrames, setMaxFrames] = useState(0);
  const [frame, setFrame] = useState(0);
  const lastUpdate = useRef(Date.now());
  const colorCache = useRef({}); // store previous colors for smoothing

  // Map voltage to color using Rocket palette
  const colorMap = (v) => {
    // Example normalization: adjust min/max to your data
    const vMin = -70;
    const vMax = 40;
    const norm = Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin)));
    const color = new THREE.Color();
    color.setHSL(0.6 * (1 - norm), 1.0, 0.5); // blue -> red
    return color;
  };

  useEffect(() => {
    // Load voltage data
    setVoltageData(voltageDataJson);

    // Determine max frames from first mesh
    const firstKey = Object.keys(voltageDataJson)[0];
    setMaxFrames(voltageDataJson[firstKey].length);
  }, []);

  useFrame(() => {
    if (!voltageData) return;

    const now = Date.now();
    const delta = (now - lastUpdate.current) / 1000; // seconds
    lastUpdate.current = now;

    const meshes = gltf.scene.children;

    Object.entries(voltageData).forEach(([name, voltages]) => {
      const voltage = voltages[frame % voltages.length];
      const targetColor = colorMap(voltage);
      const mesh = meshes.find((m) => m.name === name);

      if (mesh && mesh.material) {
        // Previous color or initialize
        const prev = colorCache.current[name] || targetColor.clone();

        // Interpolation: exponential smoothing
        const speedFactor = 5.0; // adjust for faster/slower transitions
        prev.lerp(targetColor, 1 - Math.exp(-speedFactor * delta));
        colorCache.current[name] = prev;

        mesh.material.color.copy(prev);
        if (mesh.material.emissive) mesh.material.emissive.copy(prev);
      }
    });

    setFrame((f) => (f + 1) % maxFrames);
  });

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 3, 3]} intensity={1} />
      <primitive object={gltf.scene} />
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
