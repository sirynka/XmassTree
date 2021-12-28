import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.127/build/three.module.js'
// import * as dat from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.7/build/dat.gui.module.js'
import Stats from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/libs/stats.module.js'
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.14.0/dist/lil-gui.esm.min.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/postprocessing/UnrealBloomPass.js'

let renderer, scene, camera, stats, particles
let bloomComposer, finalComposer, bloomPass


const options = {
    exposure: 0.9,
    bloomThreshold: 0,
    bloomStrength: 8,
    bloomRadius: 0,
    wraps: ~~(Math.random() * 50),
    pow: 1.5,
}

THREE.MOUSE.NONE = -1

init()
guiInit()
animate()
updateParticles()

function init() {
    window.THREE = THREE
    renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    stats = new Stats()
    document.body.appendChild(stats.domElement)

    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(
        - window.innerWidth / 2, + window.innerWidth / 2,
        + window.innerHeight / 2, - window.innerHeight / 2,
        -100, 100)

    camera.position.z = 1
    camera.zoom = 0.8 * Math.min(window.innerWidth, window.innerHeight)
    camera.updateProjectionMatrix()

    const controls = new OrbitControls(camera, renderer.domElement)

    renderer.toneMapping = THREE.ReinhardToneMapping
    renderer.toneMappingExposure = Math.pow(options.exposure, 4.0)

    const renderScene = new RenderPass(scene, camera)

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85)

    bloomPass.threshold = options.bloomThreshold
    bloomPass.strength = options.bloomStrength
    bloomPass.radius = options.bloomRadius

    bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(renderScene)
    bloomComposer.addPass(bloomPass)

    const vertexShaderElement = document.querySelector('#vertexshader')
    const fragmentShaderElement = document.querySelector('#fragmentshader')

    const shaderMaterialOptions = {
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: vertexShaderElement.textContent,
        fragmentShader: fragmentShaderElement.textContent,
        defines: {}
    }

    const shaderMaterial = new THREE.ShaderMaterial(shaderMaterialOptions)
    const finalPass = new ShaderPass(shaderMaterial, "baseTexture")
    finalPass.needsSwap = true

    finalComposer = new EffectComposer(renderer)
    finalComposer.addPass(renderScene)
    finalComposer.addPass(finalPass)

    window.addEventListener('resize', onWindowResize)
}

function animate() {
    stats.begin()
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    bloomComposer.render()
    finalComposer.render()
    stats.end()
}

function guiInit() {
    const gui = new GUI()

    const updateExposure       = exposure =>  renderer.toneMappingExposure = Math.pow(exposure, 4.0)
    const updateBloomThreshold = threshold => bloomPass.threshold = threshold
    const updateBloomStrength  = strength =>  bloomPass.strength = strength
    const updateBloomRadius    = radius =>    bloomPass.radius = radius
    const updatePow            = pow =>       updateParticles()
    
    const bloomFolder = gui.addFolder('bloom')
    const treeFolder = gui.addFolder('tree')

    bloomFolder.add(options, 'exposure',       0.1, 2.0).onChange(updateExposure)
    bloomFolder.add(options, 'bloomThreshold', 0.0, 1.0).onChange(updateBloomThreshold)
    bloomFolder.add(options, 'bloomStrength',  0.0, 10.).onChange(updateBloomStrength)
    bloomFolder.add(options, 'bloomRadius',    0.0, 1.0).onChange(updateBloomRadius)

    treeFolder.add(options, 'wraps',           0.0, 50.).onChange(updatePow)
    treeFolder.add(options, 'pow',             0.0, 5.0).onChange(updatePow)

    bloomFolder.open()
    treeFolder.open()
}

function updateParticles(count = 250) {
    const randomRange = (min, max) => Math.random() * (max - min) + min
    const randomColor = () => randomRange(0.1, 1)
    const randomSize = () => randomRange(0.002, 0.01)
    const lerp = (start, end, pos) => start + (end - start) * pos

    const wraps = options.wraps
    const radius = new THREE.Vector2(0.5, 0)
    const height = new THREE.Vector2(-0.5, 0.5)
    const angle = new THREE.Vector2(0, 2 * Math.PI * wraps)

    const updateParticle = (particle, idx) => {
        const i = Math.pow(idx / count, options.pow)
        const y = lerp(height.x, height.y, i)
        const r = lerp(radius.x, radius.y, i)
        const a = lerp(angle.x, angle.y, i)
        const x = r * Math.cos(a)
        const z = r * Math.sin(a)
        particle.position.set(x, y, z)
    }

    const addParticle = (particle, idx) => {
        const color = (new THREE.Color())
        .fromArray([randomColor(), randomColor(), randomColor()])
        const geometry = new THREE.IcosahedronGeometry(randomSize(), 0)
        const material = new THREE.MeshBasicMaterial({ color })
        const mesh = new THREE.Mesh(geometry, material)
        updateParticle(mesh, idx)
        scene.add(mesh)
        return mesh
    }

    if (particles && particles.length) particles.forEach(updateParticle)
    else particles = new Array(count).fill(0).map(addParticle)
    window.particles = particles
}

function onWindowResize() {
    camera.left = - window.innerWidth / 2
    camera.right = + window.innerWidth / 2
    camera.top = - window.innerHeight / 2
    camera.bottom = + window.innerHeight / 2
    camera.zoom = 0.8 * Math.min(window.innerWidth, window.innerHeight)
    renderer.setSize(window.innerWidth, window.innerHeight)
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
    finalComposer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix()
}
