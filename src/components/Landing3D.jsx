import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, useGLTF } from "@react-three/drei"
import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"

export default function Landing3D({ onEnter }) {
  const [voltageData, setVoltageData] = useState(null)
  
  // Load voltage JSON
  useEffect(() => {
    fetch("/voltage_data.json")
      .then(res => res.json())
      .then(setVoltageData)
  }, [])

  return (
    <div className="w-screen h-screen relative bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Neuron voltageData={voltageData} />
        <OrbitControls enablePan={false} />
      </Canvas>

      <motion.button
        onClick={onEnter}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-2xl shadow-lg hover:bg-gray-200"
        whileHover={{ scale: 1.05 }}
      >
        Enter Site
      </motion.button>
    </div>
  )
}

function Neuron({ voltageData }) {
  const { scene, nodes } = useGLTF("//neuron_final_2.glb")
  const meshRefs = useRef([])
  const frameRef = useRef(0)

  // Set up meshes
  useEffect(() => {
    meshRefs.current = Object.values(nodes).filter(n => n.type === "Mesh")
  }, [nodes])

  useFrame(() => {
    if (!voltageData) return
    const frame = frameRef.current
    meshRefs.current.forEach((mesh, i) => {
      const avgVoltage = voltageData[i][frame] // assuming voltageData[i] is array per frame
      const color = voltageToRGB(avgVoltage)
      mesh.material.color.setRGB(color.r, color.g, color.b)
    })
    frameRef.current = (frameRef.current + 1) % voltageData[0].length
  })

  return <primitive object={scene} />
}

// Convert voltage to RGB using the rocket palette approximation
function voltageToRGB(v, vMin=-60, vMax=-55) {
  const norm = Math.min(1, Math.max(0, (v - vMin) / (vMax - vMin)))
  const h = 0.6 * (1 - norm) // hue blue->red
  const c = hsvToRgb(h, 1, 1)
  return { r: c[0], g: c[1], b: c[2] }
}

function hsvToRgb(h, s, v) {
  let r, g, b
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch(i % 6){
    case 0: r=v, g=t, b=p; break
    case 1: r=q, g=v, b=p; break
    case 2: r=p, g=v, b=t; break
    case 3: r=p, g=q, b=v; break
    case 4: r=t, g=p, b=v; break
    case 5: r=v, g=p, b=q; break
  }
  return [r, g, b]
}

