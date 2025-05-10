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
  private liquidShader: THREE.ShaderMaterial | null = null;
  private causticTexture: THREE.Texture | null = null;
  private rippleMapRT: THREE.WebGLRenderTarget | null = null;
  private noiseTexture: THREE.Texture | null = null;
  private dropPositions: THREE.Vector3[] = [];
  
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
      alpha: true,
      precision: 'highp'
    });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0); // transparent background
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Append to container
    this.container.appendChild(this.renderer.domElement);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Add directional light for highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0.5, 1, 2);
    this.scene.add(directionalLight);

    // Create noise texture for ripple effects
    this.loadNoiseTexture();

    // Create button container with liquid
    this.createButtonContainer();
    
    // Start animation loop
    this.animate();
    
    if (options.onReady) {
      options.onReady();
    }
  }

  private loadNoiseTexture() {
    const noiseSize = 256;
    const data = new Uint8Array(noiseSize * noiseSize * 4);
    
    for (let i = 0; i < noiseSize * noiseSize * 4; i += 4) {
      const val = Math.random() * 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    
    const noiseTexture = new THREE.DataTexture(data, noiseSize, noiseSize);
    noiseTexture.format = THREE.RGBAFormat;
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.needsUpdate = true;
    
    this.noiseTexture = noiseTexture;
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

    // Create the liquid shader
    const liquidShader = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(this.wineColor) },
        uLevel: { value: 0.0 },
        uNoiseTexture: { value: this.noiseTexture },
        uPouringActive: { value: 0.0 },
        uRippleStrength: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        uniform float uLevel;
        uniform float uPouringActive;
        uniform sampler2D uNoiseTexture;
        uniform float uRippleStrength;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Calculate height based on wave pattern and time
          float waveX = sin(uv.x * 10.0 + uTime * 2.0) * 0.01;
          float waveY = cos(uv.y * 8.0 + uTime * 1.7) * 0.01;
          float wave = waveX + waveY;
          
          // Add noise-based ripples
          vec2 noiseUV = uv * 3.0 + uTime * 0.1;
          float noise = texture2D(uNoiseTexture, noiseUV).r * 2.0 - 1.0;
          
          // Apply ripples only at the top of the liquid level
          float heightField = position.y + wave * uPouringActive;
          if (abs(position.y - uLevel * 0.65) < 0.05) {
            heightField += noise * 0.02 * uRippleStrength * uPouringActive;
          }
          
          // Calculate final position 
          vec3 newPosition = vec3(position.x, heightField, position.z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uLevel;
        uniform float uPouringActive;
        uniform sampler2D uNoiseTexture;
        
        void main() {
          // Base color
          vec3 color = uColor;
          
          // Add subtle depth variation based on Y position
          float depthGradient = smoothstep(-0.35, uLevel * 0.65, vPosition.y);
          color = mix(color * 0.7, color, depthGradient);
          
          // Add highlights at the top surface
          float surfaceHighlight = smoothstep(uLevel * 0.65 - 0.05, uLevel * 0.65, vPosition.y) * uPouringActive;
          color = mix(color, vec3(1.0, 0.8, 0.8) * color, surfaceHighlight * 0.3);
          
          // Add caustic-like effect using noise
          vec2 causticUV = vUv * 5.0 + uTime * 0.05;
          float caustic = texture2D(uNoiseTexture, causticUV).r;
          causticUV = vUv * 3.0 - uTime * 0.03;
          caustic *= texture2D(uNoiseTexture, causticUV).r;
          
          // Apply caustics more to deeper areas
          float causticMask = 1.0 - depthGradient;
          color += vec3(1.0, 0.6, 0.4) * caustic * causticMask * 0.15 * uPouringActive;
          
          // Add a subtle rim lighting effect
          float rim = 1.0 - abs(dot(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0)));
          color += vec3(1.0, 0.2, 0.3) * rim * 0.1;
          
          // Apply final color with some translucency
          gl_FragColor = vec4(color, 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    this.liquidShader = liquidShader;
    
    // Create liquid mesh (initially empty/flat)
    // We'll use a plane with subdivisions for the liquid surface
    const liquidGeometry = new THREE.PlaneGeometry(buttonWidth - 0.05, buttonHeight - 0.05, 32, 16);
    liquidGeometry.rotateX(-Math.PI / 2); // Make it horizontal
    
    this.liquidMesh = new THREE.Mesh(liquidGeometry, liquidShader);
    
    // Position at the bottom of the button
    this.liquidMesh.position.y = -buttonHeight/2 + 0.005; // Slightly above the bottom
    this.liquidMesh.position.z = 0; // Center in z
    this.scene.add(this.liquidMesh);
    
    // Create pour effect (visible when pouring)
    this.pourEffect = new THREE.Group();
    this.scene.add(this.pourEffect);
    
    // Pre-generate some drop positions for pour effect
    this.generateDropPositions();
  }

  private generateDropPositions() {
    // Pre-generate some positions for drops
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 1.8; // Spread across button width
      const y = Math.random() * 1.5 + 0.5;   // Above the button
      const z = (Math.random() - 0.5) * 0.2; // Small z variation
      
      this.dropPositions.push(new THREE.Vector3(x, y, z));
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
      new THREE.Vector3(0, pourHeight/6, 0),       // End point 2
      new THREE.Vector3(0, 0, 0)                   // End point at the button surface
    );
    
    const pourGeometry = new THREE.TubeGeometry(curve, 20, pourWidth * 0.25, 8, false);
    
    // Create a shader material for the pour stream with animated flow
    const pourShader = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(this.wineColor) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Add subtle movement to the pour stream
          float wave = sin(uv.y * 30.0 + uTime * 10.0) * 0.01;
          vec3 newPosition = position;
          newPosition.x += wave;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform vec3 uColor;
        uniform float uTime;
        
        void main() {
          vec3 color = uColor;
          
          // Add flowing animation along the stream
          float flow = fract(vUv.y - uTime);
          
          // Add highlights
          float highlight = smoothstep(0.3, 0.7, flow) * smoothstep(0.7, 0.3, flow);
          color = mix(color, color * 1.2, highlight * 0.3);
          
          // Add edge highlights
          float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          color = mix(color, color * 1.3, (1.0 - edge) * 0.4);
          
          gl_FragColor = vec4(color, 0.85);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    
    const pourMesh = new THREE.Mesh(pourGeometry, pourShader);
    this.pourEffect.add(pourMesh);
    
    // Add droplets around the pour point (as particles)
    this.createPourDroplets();
    
    // Hide initially
    this.pourEffect.visible = false;
  }
  
  private createPourDroplets() {
    // Create particles for small droplets around the pouring stream
    const dropCount = 50;
    const dropPositions = new Float32Array(dropCount * 3);
    const dropSizes = new Float32Array(dropCount);
    const dropVelocities = new Float32Array(dropCount * 3);
    
    for (let i = 0; i < dropCount; i++) {
      const i3 = i * 3;
      const pos = this.dropPositions[i % this.dropPositions.length];
      
      // Copy pre-generated positions
      dropPositions[i3] = pos.x;
      dropPositions[i3 + 1] = pos.y;
      dropPositions[i3 + 2] = pos.z;
      
      // Random sizes for droplets
      dropSizes[i] = Math.random() * 3 + 1;
      
      // Initial velocities (mostly downward)
      dropVelocities[i3] = (Math.random() - 0.5) * 0.05;
      dropVelocities[i3 + 1] = -Math.random() * 0.2 - 0.1;
      dropVelocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    
    const dropGeometry = new THREE.BufferGeometry();
    dropGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
    dropGeometry.setAttribute('size', new THREE.BufferAttribute(dropSizes, 1));
    
    // Store velocities in a separate buffer for animation
    dropGeometry.setAttribute('velocity', new THREE.BufferAttribute(dropVelocities, 3));
    
    // Create a shader material for the droplets
    const dropShader = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.wineColor) },
        uPixelRatio: { value: window.devicePixelRatio }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        
        void main() {
          vColor = vec3(0.7, 0.1, 0.2);
          
          // Calculate size based on perspective
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float cameraDist = length(mvPosition.xyz);
          
          gl_PointSize = size * uPixelRatio * (300.0 / cameraDist);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create a circular droplet shape
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Add highlight to make it look more like a sphere
          float highlight = smoothstep(0.5, 0.0, dist);
          vec3 color = mix(vColor, vec3(1.0), highlight * 0.6);
          
          gl_FragColor = vec4(color, smoothstep(0.5, 0.2, dist));
        }
      `,
      transparent: true,
      depthWrite: false
    });
    
    const droplets = new THREE.Points(dropGeometry, dropShader);
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
    const splashVelocities = new Float32Array(splashCount * 3);
    
    for (let i = 0; i < splashCount; i++) {
      const i3 = i * 3;
      
      // Position them at the impact point with more horizontal spread
      splashPositions[i3] = (Math.random() - 0.5) * 0.3;     // x - wider spread
      splashPositions[i3 + 1] = Math.random() * 0.1;         // y - small height
      splashPositions[i3 + 2] = (Math.random() - 0.5) * 0.3; // z - wider spread
      
      splashSizes[i] = Math.random() * 2 + 1;
      
      // Initial velocities (mostly outward and upward)
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.2 + 0.1;
      splashVelocities[i3] = Math.cos(angle) * speed;
      splashVelocities[i3 + 1] = Math.random() * 0.2 + 0.05; // Upward
      splashVelocities[i3 + 2] = Math.sin(angle) * speed;
    }
    
    const splashGeometry = new THREE.BufferGeometry();
    splashGeometry.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
    splashGeometry.setAttribute('size', new THREE.BufferAttribute(splashSizes, 1));
    splashGeometry.setAttribute('velocity', new THREE.BufferAttribute(splashVelocities, 3));
    
    // Create a shader material for the splash particles
    const splashShader = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.wineColor) },
        uPixelRatio: { value: window.devicePixelRatio }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        
        void main() {
          vColor = vec3(0.7, 0.1, 0.2);
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float cameraDist = length(mvPosition.xyz);
          
          gl_PointSize = size * uPixelRatio * (300.0 / cameraDist);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float highlight = smoothstep(0.5, 0.0, dist);
          vec3 color = mix(vColor, vec3(1.0), highlight * 0.5);
          
          gl_FragColor = vec4(color, smoothstep(0.5, 0.3, dist) * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    
    const splash = new THREE.Points(splashGeometry, splashShader);
    splash.visible = false; // Hide initially
    (splash as any).lifespan = 0; // For controlling animation
    
    this.splashParticles.push(splash);
    this.scene.add(splash);
  }

  public setHovered(hovered: boolean) {
    this.hovered = hovered;
    this.targetLiquidLevel = hovered ? 1.0 : 0.0;
    
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
    
    // Update shader time uniforms for pour effect
    this.pourEffect.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        child.material.uniforms.uTime.value = this.clock.elapsedTime;
      }
    });
    
    // Update pour effect position (e.g., make it wiggle slightly)
    const wiggleAmount = Math.sin(elapsedTime * 10) * 0.01;
    this.pourEffect.position.x = wiggleAmount;
    
    // Update droplets
    this.updateDroplets(deltaTime);
    
    // Create splashes at random intervals
    if (Math.random() < deltaTime * 7) {
      this.triggerSplash();
    }
    
    // Increase ripple strength when pouring
    if (this.liquidShader) {
      // Oscillate ripple strength for more dynamic effect
      const rippleStrength = 0.5 + Math.sin(elapsedTime * 5) * 0.5;
      this.liquidShader.uniforms.uRippleStrength.value = rippleStrength;
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
      splash.position.y = this.liquidLevel * 0.65 - 0.35 + 0.01;
      splash.position.x = (Math.random() - 0.5) * 1.5; // Randomize x position a bit
    }
    
    // Activate splash
    splash.visible = true;
    (splash as any).active = true;
    (splash as any).lifespan = 1.0; // Will fade over 1 second
    
    // Reset the positions and velocities for a new splash
    if (splash.geometry instanceof THREE.BufferGeometry) {
      const positions = splash.geometry.attributes.position.array as Float32Array;
      const velocities = splash.geometry.attributes.velocity.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Center around splash position with slight variation
        positions[i] = splash.position.x + (Math.random() - 0.5) * 0.2;
        positions[i + 1] = splash.position.y;
        positions[i + 2] = (Math.random() - 0.5) * 0.2;
        
        // Outward and upward velocities
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.2 + 0.1;
        velocities[i] = Math.cos(angle) * speed;
        velocities[i + 1] = Math.random() * 0.15 + 0.05;
        velocities[i + 2] = Math.sin(angle) * speed;
      }
      
      splash.geometry.attributes.position.needsUpdate = true;
      splash.geometry.attributes.velocity.needsUpdate = true;
    }
  }
  
  private updateDroplets(deltaTime: number) {
    // Update droplet particles
    for (let i = 0; i < this.dropsParticles.length; i++) {
      const drops = this.dropsParticles[i];
      
      if (drops.geometry instanceof THREE.BufferGeometry) {
        const positions = drops.geometry.attributes.position.array as Float32Array;
        const velocities = drops.geometry.attributes.velocity.array as Float32Array;
        
        for (let j = 0; j < positions.length; j += 3) {
          // Apply velocity to position
          positions[j] += velocities[j] * deltaTime;
          positions[j + 1] += velocities[j + 1] * deltaTime;
          positions[j + 2] += velocities[j + 2] * deltaTime;
          
          // Apply gravity to y velocity
          velocities[j + 1] -= deltaTime * 0.2; // gravity
          
          // Reset droplets that go below the liquid level or out of the area
          if (positions[j + 1] < this.liquidLevel * 0.65 - 0.35 || 
              Math.abs(positions[j]) > 2.0 || 
              Math.abs(positions[j + 2]) > 1.0) {
            const pos = this.dropPositions[Math.floor(Math.random() * this.dropPositions.length)];
            positions[j] = pos.x + (Math.random() - 0.5) * 0.1;
            positions[j + 1] = pos.y;
            positions[j + 2] = pos.z;
            
            // Reset velocity
            velocities[j] = (Math.random() - 0.5) * 0.05;
            velocities[j + 1] = -Math.random() * 0.2 - 0.1;
            velocities[j + 2] = (Math.random() - 0.5) * 0.05;
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
        
        // Update particle positions based on velocities
        if (splash.geometry instanceof THREE.BufferGeometry) {
          const positions = splash.geometry.attributes.position.array as Float32Array;
          const velocities = splash.geometry.attributes.velocity.array as Float32Array;
          
          for (let j = 0; j < positions.length; j += 3) {
            // Apply velocity
            positions[j] += velocities[j] * deltaTime;
            positions[j + 1] += velocities[j + 1] * deltaTime;
            positions[j + 2] += velocities[j + 2] * deltaTime;
            
            // Apply gravity
            velocities[j + 1] -= deltaTime * 0.3;
          }
          
          splash.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update opacity to fade out
        if (splash.material instanceof THREE.ShaderMaterial) {
          splash.material.opacity = (splash as any).lifespan;
        }
        
        // Hide when done
        if ((splash as any).lifespan <= 0) {
          splash.visible = false;
          (splash as any).active = false;
        }
      }
    }
  }

  private animate() {
    if (this.isDestroyed) return;
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.elapsedTime;
    
    // Smooth interpolation for liquid level
    this.liquidLevel = THREE.MathUtils.lerp(
      this.liquidLevel, 
      this.targetLiquidLevel,
      deltaTime * 2
    );
    
    // Update liquid shader uniforms
    if (this.liquidShader && this.liquidMesh) {
      this.liquidShader.uniforms.uTime.value = elapsedTime;
      this.liquidShader.uniforms.uLevel.value = this.liquidLevel;
      this.liquidShader.uniforms.uPouringActive.value = this.isPouringActive ? 1.0 : 0.0;
      
      // Update liquid position to match filling level
      // Instead of scaling, we'll keep the mesh flat and move it up
      this.liquidMesh.position.y = -0.35 + (this.liquidLevel * 0.65);
    }
    
    // Update the pour animation
    this.updatePourAnimation(deltaTime);
    
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
    
    // Update pixel ratio uniform for particles if present
    this.dropsParticles.forEach(drops => {
      if (drops.material instanceof THREE.ShaderMaterial) {
        if (drops.material.uniforms.uPixelRatio) {
          drops.material.uniforms.uPixelRatio.value = window.devicePixelRatio;
        }
      }
    });
    
    this.splashParticles.forEach(splash => {
      if (splash.material instanceof THREE.ShaderMaterial) {
        if (splash.material.uniforms.uPixelRatio) {
          splash.material.uniforms.uPixelRatio.value = window.devicePixelRatio;
        }
      }
    });
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
    
    // Dispose render targets
    if (this.rippleMapRT) {
      this.rippleMapRT.dispose();
    }
    
    // Clear references
    this.liquidMesh = null;
    this.pourEffect = null;
    this.dropsParticles = [];
    this.splashParticles = [];
    this.liquidRipples = [];
    this.liquidShader = null;
  }
}
