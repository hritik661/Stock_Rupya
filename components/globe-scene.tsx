"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { useRef, useMemo } from "react"
import * as THREE from "three"

function GlobeGeometry() {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    // smaller radius so globe doesn't fill the entire card
    return new THREE.IcosahedronGeometry(1, 64)
  }, [])

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow scale={[0.95, 0.95, 0.95]}>
      <meshStandardMaterial
        color="#0f6f4e"
        metalness={0.1}
        roughness={0.4}
        transparent={true}
        opacity={0.95}
      />
    </mesh>
  )
}

function StarField() {
  const starsRef = useRef<THREE.Points>(null)

  useMemo(() => {
    const starGeometry = new THREE.BufferGeometry()
    const starCount = 1000
    const posArray = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 200
      posArray[i + 1] = (Math.random() - 0.5) * 200
      posArray[i + 2] = (Math.random() - 0.5) * 200
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3))

    return starGeometry
  }, [])

  return (
    <points ref={starsRef}>
      <bufferGeometry />
      <pointsMaterial size={0.1} color="white" sizeAttenuation={true} />
    </points>
  )
}

export default function GlobeScene() {
  return (
    <div className="w-full h-96 rounded-2xl overflow-hidden glass">
      <Canvas>
        {/* move camera slightly back to reduce apparent size */}
        <PerspectiveCamera makeDefault position={[0, 0, 6.5]} />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <GlobeGeometry />
        <StarField />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  )
}
