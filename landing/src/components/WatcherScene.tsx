import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

const AMBER = 0xf59e0b
const LINE = 0xd4d4d8

function circlePoints(radius: number, segments: number): THREE.Vector3[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
  })
}

function ring(radius: number, color: number, opacity: number): THREE.LineLoop {
  const geometry = new THREE.BufferGeometry().setFromPoints(circlePoints(radius, 192))
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  return new THREE.LineLoop(geometry, material)
}

function dottedSphere(radius: number, count: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    positions[i * 3] = Math.cos(theta) * r * radius
    positions[i * 3 + 1] = y * radius
    positions[i * 3 + 2] = Math.sin(theta) * r * radius
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: LINE,
    size: 0.022,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.4
  })
  return new THREE.Points(geometry, material)
}

/**
 * A quiet armillary sphere. Thin rings drift slowly and the amber pupil
 * looks toward the cursor: Heimdall, the watcher. Pauses when off-screen or
 * hidden; draws a single still frame when the visitor prefers reduced motion.
 */
export const WatcherScene: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power'
      })
    } catch {
      return // No WebGL: the page simply shows without the scene.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    host.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
    camera.position.z = 8.5

    const eye = new THREE.Group()
    scene.add(eye)
    eye.add(dottedSphere(2.5, 900))

    const gyro = new THREE.Group()
    const r1 = ring(2.5, LINE, 0.34)
    const r2 = ring(2.5, LINE, 0.2)
    r2.rotation.x = Math.PI / 2
    const r3 = ring(2.5, AMBER, 0.45)
    r3.rotation.y = Math.PI / 2.6
    const r4 = ring(3.1, LINE, 0.12)
    r4.rotation.x = Math.PI / 2.4
    r4.rotation.y = Math.PI / 5
    gyro.add(r1, r2, r3, r4)
    eye.add(gyro)

    const pupil = new THREE.Group()
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 32, 32),
      new THREE.MeshBasicMaterial({ color: AMBER })
    )
    const halo = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(circlePoints(0.34, 96)),
      new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.55 })
    )
    pupil.add(core, halo)
    pupil.position.set(0, 0, 2.5)
    eye.add(pupil)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }

    const onPointer = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      target.x = THREE.MathUtils.clamp((e.clientX - cx) / (window.innerWidth / 2), -1, 1)
      target.y = THREE.MathUtils.clamp((e.clientY - cy) / (window.innerHeight / 2), -1, 1)
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    let frame = 0
    let last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      current.x += (target.x - current.x) * Math.min(dt * 3, 1)
      current.y += (target.y - current.y) * Math.min(dt * 3, 1)
      eye.rotation.y = current.x * 0.55
      eye.rotation.x = current.y * 0.4
      gyro.rotation.y += dt * 0.09
      gyro.rotation.z += dt * 0.04
      r4.rotation.z += dt * 0.05
      renderer.render(scene, camera)
      frame = requestAnimationFrame(draw)
    }

    let visible = true
    const start = () => {
      if (reduceMotion || frame) return
      last = performance.now()
      frame = requestAnimationFrame(draw)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }
    const sync = () => (visible && !document.hidden ? start() : stop())

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    io.observe(host)
    const ro = new ResizeObserver(() => {
      resize()
      if (reduceMotion) renderer.render(scene, camera)
    })
    ro.observe(host)
    document.addEventListener('visibilitychange', sync)
    if (!reduceMotion) window.addEventListener('pointermove', onPointer, { passive: true })

    resize()
    // Slight idle tilt so the still frame (reduced motion) is not flat.
    eye.rotation.set(-0.18, 0.3, 0)
    renderer.render(scene, camera)
    sync()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pointermove', onPointer)
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh
        o.geometry?.dispose()
        const m = o.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m?.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
}

export default WatcherScene
