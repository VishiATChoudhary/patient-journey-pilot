
import * as THREE from 'three';

interface WineGlassSimulationOptions {
  containerId: string;
  width: number;
  height: number;
  onReady?: () => void;
}

export class WineGlassSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private glass: THREE.Group | null = null;
  private wine: THREE.Mesh | null = null;
  private bubbles: THREE.Mesh[] = [];
  private wineLevel: number = 0;
  private targetWineLevel: number = 0;
  private container: HTMLElement;
  private isAnimating: boolean = false;
  private isDestroyed: boolean = false;
  private clock = new THREE.Clock();
  private frameId: number | null = null;
  private hovered: boolean = false;

  constructor(options: WineGlassSimulationOptions) {
    const { containerId, width, height } = options;
    
    // Get container
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id ${containerId} not found`);
    }

    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 5;
    
    // Create renderer with alpha transparency
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0); // transparent background
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Append to container
    this.container.appendChild(this.renderer.domElement);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Add directional light for better highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    this.scene.add(directionalLight);

    // Create wine glass
    this.createWineGlass();
    
    // Start animation loop
    this.animate();
    
    if (options.onReady) {
      options.onReady();
    }
  }

  private createWineGlass() {
    this.glass = new THREE.Group();
    
    // Create wine glass bowl
    const bowlGeometry = new THREE.SphereGeometry(1.0, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    // Scale to make it more like a wine glass - wider than tall
    bowlGeometry.scale(1.5, 1.0, 1.5);
    
    // Create glass material - transparent with slight blue tint
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      roughness: 0.1,
      metalness: 0,
      reflectivity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transmission: 0.95,
    });
    
    const bowl = new THREE.Mesh(bowlGeometry, glassMaterial);
    bowl.position.y = 0.5;
    this.glass.add(bowl);
    
    // Create wine glass stem
    const stemGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 32);
    const stem = new THREE.Mesh(stemGeometry, glassMaterial);
    stem.position.y = -0.5;
    this.glass.add(stem);
    
    // Create wine glass base
    const baseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32);
    const base = new THREE.Mesh(baseGeometry, glassMaterial);
    base.position.y = -1.3;
    this.glass.add(base);
    
    // Create wine liquid (initially empty)
    const wineGeometry = new THREE.SphereGeometry(0.99, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    wineGeometry.scale(1.5, 1.0, 1.5);
    
    // Deep burgundy with some transparency
    const wineMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8e0c25,
      transparent: true,
      opacity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.2,
    });
    
    this.wine = new THREE.Mesh(wineGeometry, wineMaterial);
    this.wine.position.y = -2; // Start below the glass
    this.glass.add(this.wine);
    
    // Add the glass to the scene
    this.scene.add(this.glass);

    // Tilt the glass slightly
    this.glass.rotation.x = -0.1;
    this.glass.rotation.z = 0.1;
  }

  private createBubble() {
    // Create a small sphere for a bubble
    const bubbleGeometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 8);
    const bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6 + Math.random() * 0.2,
      roughness: 0,
      transmission: 0.9,
    });
    
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    
    // Position the bubble randomly within the wine
    const theta = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.8;
    bubble.position.x = radius * Math.cos(theta);
    bubble.position.z = radius * Math.sin(theta);
    
    // Start at the bottom of the wine
    bubble.position.y = -1 + Math.random() * 0.2;
    
    // Add random velocity for animation
    (bubble as any).velocity = {
      x: Math.random() * 0.002 - 0.001,
      y: 0.003 + Math.random() * 0.004,
      z: Math.random() * 0.002 - 0.001
    };
    
    // Add to bubbles array and scene
    this.bubbles.push(bubble);
    this.glass?.add(bubble);
    
    return bubble;
  }

  private animateBubbles(deltaTime: number) {
    // Update existing bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      const velocity = (bubble as any).velocity;
      
      bubble.position.x += velocity.x;
      bubble.position.y += velocity.y;
      bubble.position.z += velocity.z;
      
      // Remove bubbles that have reached the top
      if (bubble.position.y > 0.8) {
        this.glass?.remove(bubble);
        this.bubbles.splice(i, 1);
      }
    }
    
    // Create new bubbles randomly if wine is visible
    if (this.wine && this.wine.position.y > -1 && Math.random() < 0.1 * deltaTime * 60 && this.hovered) {
      this.createBubble();
    }
  }

  private animateWineLegs(deltaTime: number) {
    // Wine legs animation would be very complex in Three.js
    // This is a simplified version for demonstration
    if (this.wine && this.wine.material instanceof THREE.MeshPhysicalMaterial) {
      // Subtle pulsing effect for the wine material
      const material = this.wine.material;
      if (this.hovered) {
        // Increase transmission and decrease roughness when hovered
        material.transmission = THREE.MathUtils.lerp(material.transmission, 0.3, deltaTime * 2);
        material.roughness = THREE.MathUtils.lerp(material.roughness, 0.1, deltaTime * 2);
      } else {
        // Decrease transmission and increase roughness when not hovered
        material.transmission = THREE.MathUtils.lerp(material.transmission, 0.2, deltaTime * 2);
        material.roughness = THREE.MathUtils.lerp(material.roughness, 0.2, deltaTime * 2);
      }
      material.needsUpdate = true;
    }
  }

  public setHovered(hovered: boolean) {
    this.hovered = hovered;
    this.targetWineLevel = hovered ? 0.5 : -2;
  }

  private animate() {
    if (this.isDestroyed) return;
    
    const deltaTime = this.clock.getDelta();
    
    // Animate wine level
    if (this.wine) {
      // Smoothly animate the wine level
      this.wineLevel += (this.targetWineLevel - this.wineLevel) * 0.05;
      this.wine.position.y = this.wineLevel;
      
      // Add subtle wobbling effect when filling or emptying
      if (Math.abs(this.targetWineLevel - this.wineLevel) > 0.01) {
        const wobble = Math.sin(this.clock.elapsedTime * 10) * 0.01;
        this.wine.position.y += wobble;
        this.wine.rotation.x = Math.sin(this.clock.elapsedTime * 2) * 0.02;
      } else {
        this.wine.rotation.x = THREE.MathUtils.lerp(this.wine.rotation.x, 0, deltaTime * 2);
      }
    }
    
    // Animate bubbles
    this.animateBubbles(deltaTime);
    
    // Animate wine legs effect
    this.animateWineLegs(deltaTime);
    
    // Subtle glass movement
    if (this.glass) {
      const glassMovement = Math.sin(this.clock.elapsedTime * 0.7) * 0.01;
      this.glass.rotation.z = 0.1 + glassMovement;
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Request next frame
    this.frameId = requestAnimationFrame(() => this.animate());
  }

  public resize(width: number, height: number) {
    if (this.isDestroyed) return;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Stop animation loop
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    
    // Remove from DOM
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    // Dispose all geometries and materials
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    // Clear references
    this.glass = null;
    this.wine = null;
    this.bubbles = [];
  }
}
