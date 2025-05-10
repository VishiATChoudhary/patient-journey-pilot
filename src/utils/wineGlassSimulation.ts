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
  private liquidMesh: THREE.Mesh | null = null;
  private pourEffect: THREE.Group | null = null;
  private dropsParticles: THREE.Points[] = [];
  private splashParticles: THREE.Points[] = [];
  private liquidLevel: number = 0;
  private targetLiquidLevel: number = 0;
  private container: HTMLElement;
  private isAnimating: boolean = false;
  private isDestroyed: boolean = false;
  private clock = new THREE.Clock();
  private frameId: number | null = null;
  private hovered: boolean = false;
  private wineColor = new THREE.Color(0x8e0c25);
  private liquidRipples: THREE.Mesh[] = [];
  private isPouringActive: boolean = false;
  private pourStartTime: number = 0;
  
  constructor(options: WineGlassSimulationOptions) {
    const { containerId, width, height } = options;
    
    // Get container
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id ${containerId} not found`);
    }

    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera - orthographic for 2D view
    const aspect = width / height;
    const frustumSize = 2;
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
    
    // Add directional light to create highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 2);
    this.scene.add(directionalLight);

    // Create button container with liquid
    this.createButtonContainer();
    
    // Start animation loop
    this.animate();
    
    if (options.onReady) {
      options.onReady();
    }
  }

  private createButtonContainer() {
    // Create a container for our button (rectangular shape)
    const buttonWidth = 2;
    const buttonHeight = 0.7;
    const buttonDepth = 0.1;
    
    // Button background mesh (mostly transparent)
    const buttonGeometry = new THREE.BoxGeometry(buttonWidth, buttonHeight, buttonDepth);
    const buttonMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05,
      roughness: 0.2,
      metalness: 0.1,
    });
    
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    this.scene.add(buttonMesh);
    
    // Create liquid mesh (initially empty/flat)
    // We'll use a box that will grow in height as liquid pours in
    const liquidGeometry = new THREE.BoxGeometry(buttonWidth - 0.05, 0.01, buttonDepth - 0.05);
    
    // Deep burgundy with some transparency
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: this.wineColor,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.1,
    });
    
    this.liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial);
    
    // Position at the bottom of the button
    this.liquidMesh.position.y = -buttonHeight/2 + 0.005; // Slightly above the bottom
    this.scene.add(this.liquidMesh);
    
    // Create pour effect (visible when pouring)
    this.pourEffect = new THREE.Group();
    this.scene.add(this.pourEffect);
    
    // Create and add ripple pool (for when drops hit the surface)
    this.createRipplePool();
  }

  private createRipplePool() {
    // We'll create several ripple circles that we can animate independently
    for (let i = 0; i < 5; i++) {
      const rippleGeometry = new THREE.RingGeometry(0.01, 0.03, 32);
      const rippleMaterial = new THREE.MeshBasicMaterial({ 
        color: this.wineColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
      
      // Position at the center but hidden initially
      ripple.position.z = 0.06;
      ripple.rotation.x = -Math.PI / 2; // Lay flat
      ripple.visible = false;
      
      // Store ripple parameters for animation
      (ripple as any).params = {
        active: false,
        scale: 0,
        opacity: 0,
        position: new THREE.Vector2(0, 0),
        speed: 1 + Math.random() * 0.5
      };
      
      this.liquidRipples.push(ripple);
      this.scene.add(ripple);
    }
  }

  private createPourEffect() {
    // Clear previous pour effect
    if (this.pourEffect) {
      while (this.pourEffect.children.length > 0) {
        const child = this.pourEffect.children[0];
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        this.pourEffect.remove(child);
      }
    }
    
    // Create the wine stream geometry
    const pourHeight = 1.5; // Height of the pour stream
    const pourWidth = 0.1; // Width of the pour stream
    
    // Create a curved path for the pour
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, pourHeight/2 + 0.5, 0), // Start point above the button
      new THREE.Vector3(0, pourHeight/3 + 0.3, 0), // Control point 1
      new THREE.Vector3(0, pourHeight/6, 0),       // Control point 2
      new THREE.Vector3(0, 0, 0)                   // End point at the button surface
    );
    
    const pourGeometry = new THREE.TubeGeometry(curve, 20, pourWidth * 0.25, 8, false);
    const pourMaterial = new THREE.MeshPhysicalMaterial({
      color: this.wineColor,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      transmission: 0.2,
    });
    
    const pourMesh = new THREE.Mesh(pourGeometry, pourMaterial);
    this.pourEffect.add(pourMesh);
    
    // Add droplets around the pour point (as particles)
    this.createPourDroplets();
    
    // Hide initially
    this.pourEffect.visible = false;
  }
  
  private createPourDroplets() {
    // Create particles for small droplets around the pouring stream
    const dropCount = 30;
    const dropPositions = new Float32Array(dropCount * 3);
    const dropSizes = new Float32Array(dropCount);
    
    for (let i = 0; i < dropCount; i++) {
      const i3 = i * 3;
      
      // Random positions around the pour stream
      dropPositions[i3] = (Math.random() - 0.5) * 0.2; // x
      dropPositions[i3 + 1] = Math.random() * 0.5;     // y (above the surface)
      dropPositions[i3 + 2] = (Math.random() - 0.5) * 0.2; // z
      
      // Random sizes for droplets
      dropSizes[i] = Math.random() * 3 + 1;
    }
    
    const dropGeometry = new THREE.BufferGeometry();
    dropGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
    dropGeometry.setAttribute('size', new THREE.BufferAttribute(dropSizes, 1));
    
    const dropMaterial = new THREE.PointsMaterial({
      color: this.wineColor,
      transparent: true,
      opacity: 0.7,
      size: 0.02,
      sizeAttenuation: true,
    });
    
    const droplets = new THREE.Points(dropGeometry, dropMaterial);
    this.dropsParticles.push(droplets);
    this.pourEffect.add(droplets);
    
    // Create splash particles that appear when wine hits the surface
    this.createSplashParticles();
  }
  
  private createSplashParticles() {
    // Higher count for more detailed splash
    const splashCount = 40;
    const splashPositions = new Float32Array(splashCount * 3);
    const splashSizes = new Float32Array(splashCount);
    
    for (let i = 0; i < splashCount; i++) {
      const i3 = i * 3;
      
      // Position them at the impact point with more horizontal spread
      splashPositions[i3] = (Math.random() - 0.5) * 0.3;     // x - wider spread
      splashPositions[i3 + 1] = Math.random() * 0.1;         // y - small height
      splashPositions[i3 + 2] = (Math.random() - 0.5) * 0.3; // z - wider spread
      
      splashSizes[i] = Math.random() * 2 + 1;
    }
    
    const splashGeometry = new THREE.BufferGeometry();
    splashGeometry.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
    splashGeometry.setAttribute('size', new THREE.BufferAttribute(splashSizes, 1));
    
    const splashMaterial = new THREE.PointsMaterial({
      color: this.wineColor,
      transparent: true,
      opacity: 0.7,
      size: 0.015,
      sizeAttenuation: true,
    });
    
    const splash = new THREE.Points(splashGeometry, splashMaterial);
    splash.visible = false; // Hide initially
    (splash as any).lifespan = 0; // For controlling animation
    
    this.splashParticles.push(splash);
    this.scene.add(splash);
  }

  private updateRipples(deltaTime: number) {
    // For each ripple in our pool
    for (let i = 0; i < this.liquidRipples.length; i++) {
      const ripple = this.liquidRipples[i];
      const params = (ripple as any).params;
      
      if (params.active) {
        // Update size and opacity for active ripples
        params.scale += deltaTime * params.speed;
        params.opacity -= deltaTime * 1.2; // Fade out
        
        // Apply updates
        ripple.scale.set(params.scale, params.scale, 1);
        
        if (ripple.material instanceof THREE.MeshBasicMaterial) {
          ripple.material.opacity = Math.max(0, params.opacity);
        }
        
        // Deactivate when completely faded
        if (params.opacity <= 0) {
          params.active = false;
          ripple.visible = false;
        }
      }
    }
  }

  private triggerRipple(x: number, y: number) {
    // Find an inactive ripple
    for (let i = 0; i < this.liquidRipples.length; i++) {
      const ripple = this.liquidRipples[i];
      const params = (ripple as any).params;
      
      if (!params.active) {
        // Position at the given coordinates
        ripple.position.x = x;
        ripple.position.y = y;
        ripple.position.z = 0.06; // Slightly above liquid
        
        // Activate with initial parameters
        params.active = true;
        params.scale = 0.1;
        params.opacity = 0.7;
        params.speed = 0.8 + Math.random() * 1.0;
        
        // Make visible
        ripple.visible = true;
        ripple.scale.set(params.scale, params.scale, 1);
        
        if (ripple.material instanceof THREE.MeshBasicMaterial) {
          ripple.material.opacity = params.opacity;
        }
        
        break;
      }
    }
  }

  private updatePourAnimation(deltaTime: number) {
    if (!this.isPouringActive || !this.pourEffect) return;
    
    // Make pour effect visible
    this.pourEffect.visible = true;
    
    // Calculate animation progress based on time
    const elapsedTime = this.clock.elapsedTime - this.pourStartTime;
    const pourDuration = 2.5; // Total duration of pouring in seconds
    
    if (elapsedTime > pourDuration) {
      // End pouring effect after duration
      this.isPouringActive = false;
      this.pourEffect.visible = false;
      return;
    }
    
    // Update pour effect (e.g., make it wiggle slightly)
    const wiggleAmount = Math.sin(elapsedTime * 10) * 0.01;
    this.pourEffect.position.x = wiggleAmount;
    
    // Update droplets
    this.updateDroplets(deltaTime);
    
    // Create splashes at random intervals
    if (Math.random() < deltaTime * 7) {
      this.triggerSplash();
    }
    
    // Create ripples at random intervals
    if (Math.random() < deltaTime * 5) {
      const x = (Math.random() - 0.5) * 0.3; // Random x position near center
      this.triggerRipple(x, this.liquidMesh?.position.y ?? 0);
    }
  }
  
  private triggerSplash() {
    // Find an available splash particle system or use the first one
    let splash = this.splashParticles[0];
    
    for (let i = 0; i < this.splashParticles.length; i++) {
      if (!(this.splashParticles[i] as any).active) {
        splash = this.splashParticles[i];
        break;
      }
    }
    
    // Position the splash at the current liquid level
    if (this.liquidMesh) {
      splash.position.y = this.liquidMesh.position.y + 0.01;
      splash.position.x = (Math.random() - 0.5) * 0.2; // Randomize x position a bit
    }
    
    // Activate splash
    splash.visible = true;
    (splash as any).active = true;
    (splash as any).lifespan = 1.0; // Will fade over 1 second
    
    // If this is a points material, we can randomize the positions for more dynamics
    if (splash.geometry instanceof THREE.BufferGeometry) {
      const positions = splash.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        // Update x and z positions with more random spread
        positions[i] = (Math.random() - 0.5) * 0.4;     // x
        positions[i + 2] = (Math.random() - 0.5) * 0.4; // z
        
        // y position is small upward velocity
        positions[i + 1] = Math.random() * 0.15;
      }
      
      splash.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  private updateDroplets(deltaTime: number) {
    // Update droplet particles
    for (let i = 0; i < this.dropsParticles.length; i++) {
      const drops = this.dropsParticles[i];
      
      if (drops.geometry instanceof THREE.BufferGeometry) {
        const positions = drops.geometry.attributes.position.array as Float32Array;
        
        for (let j = 0; j < positions.length; j += 3) {
          // Move droplets downward
          positions[j + 1] -= deltaTime * (0.5 + Math.random() * 1.0);
          
          // Add slight horizontal movement
          positions[j] += (Math.random() - 0.5) * 0.01;
          positions[j + 2] += (Math.random() - 0.5) * 0.01;
          
          // Reset droplets that go below the surface
          if (positions[j + 1] < 0) {
            positions[j] = (Math.random() - 0.5) * 0.2;
            positions[j + 1] = Math.random() * 0.5 + 0.5; // Reset to above the pour point
            positions[j + 2] = (Math.random() - 0.5) * 0.2;
          }
        }
        
        drops.geometry.attributes.position.needsUpdate = true;
      }
    }
    
    // Update splash particles
    for (let i = 0; i < this.splashParticles.length; i++) {
      const splash = this.splashParticles[i];
      
      if ((splash as any).active && (splash as any).lifespan > 0) {
        (splash as any).lifespan -= deltaTime * 1.5;
        
        // Update positions to move particles outward and upward
        if (splash.geometry instanceof THREE.BufferGeometry) {
          const positions = splash.geometry.attributes.position.array as Float32Array;
          
          for (let j = 0; j < positions.length; j += 3) {
            // Move particles upward with gravity
            positions[j + 1] += deltaTime * (0.2 - positions[j + 1] * 2.0); // Slows as it goes up
            
            // Move particles outward from center
            const dirX = positions[j];
            const dirZ = positions[j + 2];
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
            
            if (length > 0) {
              positions[j] += (dirX / length) * deltaTime * 0.1;
              positions[j + 2] += (dirZ / length) * deltaTime * 0.1;
            }
          }
          
          splash.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update opacity to fade out
        if (splash.material instanceof THREE.PointsMaterial) {
          splash.material.opacity = (splash as any).lifespan * 0.7;
        }
        
        // Hide when done
        if ((splash as any).lifespan <= 0) {
          splash.visible = false;
          (splash as any).active = false;
        }
      }
    }
  }

  public setHovered(hovered: boolean) {
    this.hovered = hovered;
    this.targetLiquidLevel = hovered ? 0.6 : 0;
    
    if (hovered && !this.isPouringActive) {
      // Start pouring effect when hovering begins
      this.isPouringActive = true;
      this.pourStartTime = this.clock.elapsedTime;
      
      // Create the pour effect if it doesn't exist
      if (!this.pourEffect || this.pourEffect.children.length === 0) {
        this.createPourEffect();
      }
    }
  }

  private animate() {
    if (this.isDestroyed) return;
    
    const deltaTime = this.clock.getDelta();
    
    // Animate liquid level (filling or emptying)
    if (this.liquidMesh) {
      // Calculate current target height based on liquid level (max height is 0.6)
      const targetHeight = this.targetLiquidLevel * 0.6;
      
      // Current liquid height (assuming scale.y represents height)
      const currentHeight = this.liquidMesh.scale.y * this.liquidMesh.geometry.parameters.height;
      
      // Smoothly animate the liquid level
      const newHeight = THREE.MathUtils.lerp(currentHeight, targetHeight, deltaTime * 2);
      
      // Update mesh scale to represent new liquid height
      // We need to update both the scale and position to keep the bottom fixed
      this.liquidMesh.scale.y = newHeight / this.liquidMesh.geometry.parameters.height;
      
      // Update position to keep bottom of liquid fixed
      const newY = -0.35 + (newHeight / 2); // -0.35 is the bottom of the button
      this.liquidMesh.position.y = newY;
      
      // Add subtle wobbling effect when filling or emptying
      if (Math.abs(targetHeight - currentHeight) > 0.01) {
        const wobbleAmount = Math.sin(this.clock.elapsedTime * 10) * 0.008;
        // Apply subtle wave effect to liquid by adjusting position
        this.liquidMesh.position.y += wobbleAmount;
      }
    }
    
    // Update the pour animation
    this.updatePourAnimation(deltaTime);
    
    // Update ripple animations
    this.updateRipples(deltaTime);
    
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
      } else if (object instanceof THREE.Points) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      }
    });
    
    // Clear references
    this.liquidMesh = null;
    this.pourEffect = null;
    this.dropsParticles = [];
    this.splashParticles = [];
    this.liquidRipples = [];
  }
}
