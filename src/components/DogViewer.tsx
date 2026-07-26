"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Grid,
  OrbitControls,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { DogGenome } from "@/types";

interface DogViewerProps {
  genome: DogGenome;
  animate?: boolean;
  className?: string;
  onInteractingChange?: (interacting: boolean) => void;
}

const MODEL_URL = "/models/low_poly_dog_pack/scene.gltf";
// The pack only ships KHR_materials_pbrSpecularGlossiness materials, which three
// no longer supports: the loader hands back a default black metal material with
// no map. So the basset's diffuse/normal maps get applied by hand.
const DIFFUSE_URL = "/models/low_poly_dog_pack/textures/Material.005_diffuse.png";
const NORMAL_URL = "/models/low_poly_dog_pack/textures/Material.005_normal.png";
// Normalized dog height in world units; camera framing below assumes it.
const TARGET_HEIGHT = 1.8;
// Static yaw so the hound presents at a three-quarter angle to the camera.
const PRESENT_YAW = -0.55;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
function easeOutBack(t: number) {
  const c = 1.7;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}

useGLTF.preload(MODEL_URL);

// ------------------------------------------------------------------ the basset

/**
 * The pack GLTF holds five dogs plus lamps/ground planes as siblings under
 * `Root`. Clone (SkeletonUtils, so skinned meshes get their own skeleton),
 * detach every sibling whose name does not contain "basset", then recenter and
 * uniform-scale what is left so the hound is TARGET_HEIGHT tall and stands on
 * y = 0. Detaching rather than hiding matters because Box3.setFromObject
 * ignores `visible` and would measure the whole pack.
 */
function useBasset(coatColor: string) {
  const { scene } = useGLTF(MODEL_URL);
  const [diffuse, normal] = useTexture([DIFFUSE_URL, NORMAL_URL]);

  return useMemo(() => {
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.flipY = false;
    normal.flipY = false;

    const root = cloneSkeleton(scene);

    let packRoot: THREE.Object3D = root;
    root.traverse((o) => {
      if (o.name === "Root") packRoot = o;
    });

    for (const child of [...packRoot.children]) {
      if (!child.name.toLowerCase().includes("basset")) packRoot.remove(child);
    }

    // One fresh material per instance, tinted subtly by the genome's coat color
    // so the diffuse texture still reads through.
    const material = new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      metalness: 0,
      roughness: 0.72,
      color: new THREE.Color(0xffffff).lerp(new THREE.Color(coatColor), 0.3),
    });
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh || (o as THREE.SkinnedMesh).isSkinnedMesh) {
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = size.y > 1e-6 ? TARGET_HEIGHT / size.y : 1;

    root.scale.setScalar(s);
    root.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    root.updateMatrixWorld(true);

    return root;
  }, [scene, coatColor, diffuse, normal]);
}

/**
 * Entrance: pops up from scale 0 with an ease-out-back overshoot while spinning
 * one full turn and dropping the last bit into place (~1.5s). Then it keeps the
 * turntable spin forever at ~12 deg/s. With `animate` false everything is
 * settled on the first frame, but the turntable still runs. Orbit interaction
 * pauses both motions immediately, and reduced motion settles the dog in place.
 */
function DogRig({
  genome,
  animate,
  runId,
  interacting,
  reducedMotion,
}: {
  genome: DogGenome;
  animate: boolean;
  runId: number;
  interacting: boolean;
  reducedMotion: boolean;
}) {
  const model = useBasset(genome.coatColor);
  const rig = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const idleYaw = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    idleYaw.current = 0;
    const g = rig.current;
    if (g && (!animate || reducedMotion)) {
      g.scale.setScalar(1);
      g.position.y = 0;
      g.rotation.y = 0;
    }
  }, [animate, reducedMotion, runId]);

  useFrame((_, delta) => {
    const g = rig.current;
    if (!g) return;

    if (reducedMotion) {
      g.scale.setScalar(1);
      g.position.y = 0;
      g.rotation.y = 0;
      return;
    }

    // Accumulating only while idle avoids a snap when OrbitControls hands the
    // scene back, and prevents the model from fighting a pointer gesture.
    if (!interacting) {
      const step = Math.min(delta, 1 / 20);
      elapsed.current += step;
      idleYaw.current += step * 0.21;
    }

    if (!animate) {
      g.scale.setScalar(1);
      g.position.y = 0;
      g.rotation.y = idleYaw.current;
      return;
    }

    const pop = clamp01(elapsed.current / 0.85);
    g.scale.setScalar(pop <= 0 ? 0.0001 : Math.max(0.0001, easeOutBack(pop)));

    const drop = easeOutCubic(clamp01(elapsed.current / 1.15));
    g.position.y = (1 - drop) * 0.6;

    const spin = 1 - easeOutCubic(clamp01(elapsed.current / 1.5));
    g.rotation.y = idleYaw.current + spin * Math.PI * 2;
  });

  return (
    <group
      ref={rig}
      scale={animate && !reducedMotion ? 0.0001 : 1}
    >
      <group rotation={[0, PRESENT_YAW, 0]}>
        <primitive object={model} />
      </group>
    </group>
  );
}

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[DogViewer] failed to load", MODEL_URL, error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// -------------------------------------------------------- camera + environment

// Fixed framing for the TARGET_HEIGHT-tall dog. Deliberately not bounds-fitted:
// a live fit measures the entrance animation's scale-0 dog and ends up inside it.
function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(2.85, 1.95, 3.95);
    camera.lookAt(0, 0.8, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

const HUD_POINTS: [number, number, number][] = [
  [-2.3, 0.03, -1.4],
  [-1.75, 0.03, 1.55],
  [-1.15, 0.03, -2.1],
  [-0.35, 0.03, 1.95],
  [0.65, 0.03, -2.15],
  [1.25, 0.03, 1.8],
  [1.95, 0.03, -1.25],
  [2.35, 0.03, 0.45],
];

function ScanPlane({ reducedMotion }: { reducedMotion: boolean }) {
  const scan = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!scan.current || reducedMotion) return;
    const travel = (clock.getElapsedTime() * 0.34) % 1;
    scan.current.position.x = THREE.MathUtils.lerp(-1.55, 1.55, travel);
  });

  return (
    <group ref={scan} position={[reducedMotion ? 0 : -1.55, 1.02, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]} renderOrder={2}>
        <planeGeometry args={[2.55, 2.18]} />
        <meshBasicMaterial
          color="#dff7ff"
          transparent
          opacity={reducedMotion ? 0.035 : 0.075}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 0, 0]} renderOrder={3}>
        <boxGeometry args={[0.018, 2.18, 2.55]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={reducedMotion ? 0.14 : 0.34}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function TechnicalEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <Grid
        args={[8, 8]}
        position={[0, -0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        cellSize={0.22}
        cellThickness={0.35}
        cellColor="#c9edff"
        sectionSize={1.1}
        sectionThickness={0.75}
        sectionColor="#ffffff"
        fadeDistance={4.8}
        fadeStrength={1.8}
        fadeFrom={0.2}
      />

      <ContactShadows
        position={[0, 0.018, 0]}
        scale={[4.2, 3.4]}
        opacity={0.24}
        blur={2.6}
        far={3.1}
        color="#315c8f"
        frames={reducedMotion ? 1 : 72}
        resolution={256}
      />

      {[1.15, 1.72, 2.28].map((radius, index) => (
        <mesh
          key={radius}
          position={[0, 0.015 + index * 0.002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[radius, radius + 0.012, 96]} />
          <meshBasicMaterial
            color={index === 1 ? "#ffdad7" : "#e9f8ff"}
            transparent
            opacity={index === 1 ? 0.26 : 0.2}
            depthWrite={false}
          />
        </mesh>
      ))}

      {HUD_POINTS.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[index % 3 === 0 ? 0.027 : 0.018, 10, 10]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? "#ffdad7" : "#f5fbff"}
            transparent
            opacity={0.72}
            depthWrite={false}
          />
        </mesh>
      ))}

      <ScanPlane reducedMotion={reducedMotion} />
    </>
  );
}

// ---------------------------------------------------------------- viewer

export default function DogViewer({
  genome,
  animate = false,
  className,
  onInteractingChange,
}: DogViewerProps) {
  const reduceMotion = useReducedMotion();
  const [interacting, setInteracting] = useState(false);

  const reportInteraction = (next: boolean) => {
    setInteracting(next);
    onInteractingChange?.(next);
  };

  // Bump a run id whenever animate flips false -> true so the entrance replays.
  const runId = useRef(0);
  const prevAnimate = useRef(animate);
  if (animate && !prevAnimate.current) runId.current += 1;
  prevAnimate.current = animate;

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [2.85, 1.95, 3.95], fov: 40 }}
        gl={{
          alpha: true,
          antialias: true,
        }}
        onCreated={({ gl, scene }) => {
          scene.background = null;
          gl.setClearColor(0x000000, 0);
        }}
        style={{ background: "transparent" }}
      >
        <CameraRig />
        <TechnicalEnvironment reducedMotion={Boolean(reduceMotion)} />
        <ModelBoundary>
          <Suspense fallback={null}>
            <DogRig
              genome={genome}
              animate={animate}
              runId={runId.current}
              interacting={interacting}
              reducedMotion={Boolean(reduceMotion)}
            />
          </Suspense>
        </ModelBoundary>
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 6, 3]} intensity={2.0} />
        <directionalLight position={[-4, 3, -3]} intensity={0.8} />
        <directionalLight position={[0, -3, 2]} intensity={0.3} />
        <spotLight
          position={[0.5, 5.5, 2.8]}
          angle={0.46}
          penumbra={0.9}
          intensity={1.15}
          color="#f4fbff"
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={14}
          minPolarAngle={Math.PI * 0.16}
          maxPolarAngle={Math.PI * 0.6}
          target={[0, 0.8, 0]}
          onStart={() => reportInteraction(true)}
          onEnd={() => reportInteraction(false)}
        />
      </Canvas>
    </div>
  );
}
