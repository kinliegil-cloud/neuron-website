import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import * as THREE from "three";

// ----------------------
// Component inside Canvas
// ----------------------
function NeuronScene({ glbPath = "/neuron_final_2.glb", jsonPath = "/voltage_data.json", frameRate = 30 }) {
  const { scene } = useGLTF(glbPath);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [voltages, setVoltages] = useState({});
  const frameRef = useRef(0);
  const clockRef = useRef(0);
  const [vMin, setVMin] = useState(-70);
  const [vMax, setVMax] = useState(-40);

  // Detect GLB load
  useEffect(() => {
    if (scene) {
      setSceneLoaded(true);
      console.log("✅ GLB loaded", scene);

      // Optional: log mesh names for labeling
      scene.traverse(child => {
        if (child.isMesh) console.log("Mesh:", child.name);
      });
    }
  }, [scene]);

  // Load voltage JSON
  useEffect(() => {
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => {
        setVoltages(data);

        // Compute min/max voltage for color mapping
        const allVoltages = Object.values(data).flat();
        if (allVoltages.length > 0) {
          setVMin(Math.min(...allVoltages));
          setVMax(Math.max(...allVoltages));
          console.log("Voltage range:", Math.min(...allVoltages), Math.max(...allVoltages));
        }

        console.log("✅ Voltage JSON loaded", Object.keys(data));
      })
      .catch(err => console.error("❌ Error loading voltage JSON", err));
  }, [jsonPath]);

  // Voltage → color mapping
  function voltageToColor(v) {
    const norm = Math.min(Math.max((v - vMin) / (vMax - vMin), 0), 1);
    return new THREE.Color().setHSL(0.66 * (1 - norm), 1, 0.5);
  }

  // Animate neuron
  useFrame((_, delta) => {
    if (!sceneLoaded || !Object.keys(voltages).length) return;

    clockRef.current += delta;
    const frameDuration = 1 / frameRate;
    if (clockRef.current > frameDuration) {
      clockRef.current -= frameDuration;
      frameRef.current = (frameRef.current + 1);

      // Wrap around based on first mesh's frame length
      const firstMeshName = Object.keys(voltages)[0];
      const totalFrames = voltages[firstMeshName]?.length || 1;
      frameRef.current = frameRef.current % totalFrames;
    }

    const currentFrame = frameRef.current;

    scene.traverse(child => {
      if (child.isMesh) {
        const meshName = child.name;
        const meshVoltages = voltages[meshName];
        if (meshVoltages && meshVoltages[currentFrame] !== undefined) {
          const color = voltageToColor(meshVoltages[currentFrame]);
          if (child.material) {
            child.material.emissive.copy(color);
            child.material.emissiveIntensity = 1.5;
            child.material.needsUpdate = true;
          }
        }
      }
    });
  });

  // Labels for exact meshes (place at far end of each mesh)
  const labels = [];
  if (sceneLoaded) {
    // ensure world matrices are up-to-date
    scene.updateMatrixWorld(true);

    const labelMap = {
      soma: "soma",
      dendrite: "dend_5",
      axon: "apic_55",
      axonHillock: "apic_112"
    };

    const somaMesh = scene.getObjectByName(labelMap.soma);
    const somaWorld = new THREE.Vector3(0, 0, 0);
    if (somaMesh) somaMesh.getWorldPosition(somaWorld);

    Object.entries(labelMap).forEach(([label, meshName]) => {
      const mesh = scene.getObjectByName(meshName);
      if (!mesh) {
        console.warn(`Mesh not found for label: ${label} (${meshName})`);
        return;
      }

      // Bounding box to place label at the farthest corner from soma
      const bbox = new THREE.Box3().setFromObject(mesh);
      const min = bbox.min.clone();
      const max = bbox.max.clone();
      const chosen = max.distanceTo(somaWorld) >= min.distanceTo(somaWorld) ? max : min;
      const labelPos = chosen.clone();
      labelPos.y += 0.2; // bump up so text floats above mesh

      labels.push(
        <Html
          key={mesh.uuid}
          position={[labelPos.x, labelPos.y, labelPos.z]}
          center
          style={{ color: "white", fontSize: "42px", fontWeight: "bold" }}
        >
          {label}
        </Html>
      );
    });
  }

  // Fallback cube until everything loads
  if (!sceneLoaded || !Object.keys(voltages).length) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    );
  }

  return (
    <>
      <primitive object={scene} />
      {labels}
    </>
  );
}

// ----------------------
// App wraps the Canvas
// ----------------------
export default function App() {
  return (
    <Canvas
      style={{ width: "100vw", height: "100vh" }}
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={Math.min(window.devicePixelRatio, 1.5)}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <Suspense fallback={<Html center>Loading neuron...</Html>}>
        <NeuronScene />
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
