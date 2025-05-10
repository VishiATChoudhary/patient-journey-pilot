
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
  private pourStream: THREE.Mesh | null = null;
  private dropParticles: THREE.Points[] = [];
  private splashParticles: THREE.Points[] = [];
  private container: HTMLElement;
  private clock = new THREE.Clock();
  private frameId: number | null = null;
  private hovered: boolean = false;
  private isDestroyed: boolean = false;
  private wineColor = new THREE.Color(0x8e0c25);
  private liquidLevel: number = 0;
  private targetLiquidLevel: number = 0;
  private isPouringActive: boolean = false;
  private pourStartTime: number = 0;
  private ripples: THREE.Mesh[] = [];
  private noiseTexture: THREE.DataTexture | null = null;
  private dropPositions: THREE.Vector3[] = [];
  private buttonWidth: number;
  private buttonHeight: number;
  
  constructor(options: WineGlassSimulationOptions) {
    const { containerId, width, height } = options;
    
    this.buttonWidth = 4;
    this.buttonHeight = 1.4;
    
    // Get container
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id ${containerId} not found`);
    }

    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera - positioned to view from the side
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.z = 5;
    this.camera.position.y = 0; // Side view
    
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
    directionalLight.position.set(1, 1, 2);
    this.scene.add(directionalLight);

    // Create noise texture for ripple effects
    this.createNoiseTexture();

    // Create drop positions
    this.generateDropPositions();

    // Create the button container and liquid
    this.createButtonContainer();
    
    // Start animation loop
    this.animate();
    
    if (options.onReady) {
      options.onReady();
    }
  }

  private createNoiseTexture() {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size * size * 4; i += 4) {
      const val = Math.random() * 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    
    const texture = new THREE.DataTexture(data, size, size);
    texture.format = THREE.RGBAFormat;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    
    this.noiseTexture = texture;
  }

  private generateDropPositions() {
    // Generate positions for wine drops
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * this.buttonWidth * 0.8;
      const y = 3 + Math.random() * 2; // Above the container
      const z = (Math.random() - 0.5) * 0.2;
      
      this.dropPositions.push(new THREE.Vector3(x, y, z));
    }
  }

  private createButtonContainer() {
    // Create transparent container
    const containerGeometry = new THREE.BoxGeometry(this.buttonWidth, this.buttonHeight, 0.1);
    const containerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.05,
      roughness: 0.2,
      metalness: 0.1
    });
    
    const containerMesh = new THREE.Mesh(containerGeometry, containerMaterial);
    this.scene.add(containerMesh);

    // Create liquid inside the container
    const liquidGeometry = new THREE.PlaneGeometry(this.buttonWidth - 0.05, this.buttonHeight - 0.05, 32, 32);
    
    // Create shader material for liquid
    const liquidMaterial = new THREE.ShaderMaterial({
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
          
          // Calculate height based on noise and time
          float noise = texture2D(uNoiseTexture, vUv * 2.0 + uTime * 0.05).r;
          
          // Apply wave patterns
          float waveX = sin(vUv.x * 10.0 + uTime * 2.0) * 0.005;
          float waveY = cos(vUv.y * 8.0 + uTime * 1.7) * 0.005;
          
          // Apply ripple effect at the surface
          float surfaceRipple = 0.0;
          float normalizedY = (position.y + 0.65) / 1.3; // Map to 0-1
          if (normalizedY > uLevel - 0.05 && normalizedY < uLevel + 0.05) {
            surfaceRipple = sin(uv.x * 20.0 + uTime * 3.0) * 
                           cos(uv.y * 15.0 + uTime * 2.5) * 
                           0.01 * uPouringActive * uRippleStrength;
          }
          
          // Apply all displacement effects
          vec3 newPosition = position;
          newPosition.z += (waveX + waveY + noise * 0.01 + surfaceRipple) * uPouringActive;
          
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
        
        void main() {
          // Calculate normalized position for the liquid
          float normalizedY = (vPosition.y + 0.65) / 1.3; // Map to 0-1
          
          // Only render pixels below the liquid level
          if (normalizedY > uLevel) {
            discard;
          }
          
          // Base color
          vec3 color = uColor;
          
          // Add depth variation
          float depthFactor = 1.0 - ((normalizedY / uLevel) * 0.5);
          color *= mix(1.0, 0.7, depthFactor);
          
          // Add surface highlights at the top of the liquid
          float surfaceHighlight = smoothstep(uLevel - 0.02, uLevel, normalizedY) * uPouringActive;
          color = mix(color, vec3(1.0, 0.6, 0.6), surfaceHighlight * 0.4);
          
          // Add caustic patterns
          float causticPattern = sin(vUv.x * 20.0 + uTime) * cos(vUv.y * 15.0 - uTime * 0.5) * 0.5 + 0.5;
          color += vec3(1.0, 0.4, 0.4) * causticPattern * 0.1 * uPouringActive;
          
          // Add edge highlights
          float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          color = mix(color, color * 1.2, (1.0 - edge) * 0.3);
          
          gl_FragColor = vec4(color, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    this.liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial);
    this.scene.add(this.liquidMesh);
    
    // Create pour stream
    this.createPourStream();
  }

  private createPourStream() {
    // Create the pour stream from above
    const pourGeometry = new THREE.CylinderGeometry(0.05, 0.1, 3, 8);
    pourGeometry.translate(0, 1.5, 0); // Position above the container
    
    const pourMaterial = new THREE.ShaderMaterial({
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
          
          // Add waviness to the stream
          float wave = sin(uv.y * 10.0 + uTime * 5.0) * 0.03;
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
          // Base color
          vec3 color = uColor;
          
          // Add flowing animation
          float flow = fract(vUv.y * 2.0 - uTime * 2.0);
          float flowHighlight = smoothstep(0.4, 0.6, flow) * smoothstep(0.8, 0.6, flow) * 0.3;
          color = mix(color, color * 1.3, flowHighlight);
          
          // Add edge highlights
          float edge = smoothstep(0.0, 0.2, distance(vec2(0.5), vec2(vUv.x, 0.5)));
          color = mix(color, color * 1.3, (1.0 - edge) * 0.4);
          
          gl_FragColor = vec4(color, 0.8);
        }
      `,
      transparent: true
    });
    
    this.pourStream = new THREE.Mesh(pourGeometry, pourMaterial);
    this.pourStream.visible = false;
    this.scene.add(this.pourStream);
    
    // Create drop particles
    this.createDropParticles();
    this.createSplashParticles();
  }
  
  private createDropParticles() {
    const dropCount = 50;
    const positions = new Float32Array(dropCount * 3);
    const sizes = new Float32Array(dropCount);
    const velocities = new Float32Array(dropCount * 3);
    
    for (let i = 0; i < dropCount; i++) {
      const i3 = i * 3;
      const pos = this.dropPositions[i % this.dropPositions.length];
      
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;
      
      sizes[i] = Math.random() * 3 + 1;
      
      velocities[i3] = (Math.random() - 0.5) * 0.05;
      velocities[i3 + 1] = -Math.random() * 0.2 - 0.1;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    
    const dropGeometry = new THREE.BufferGeometry();
    dropGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dropGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    dropGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const dropMaterial = new THREE.ShaderMaterial({
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
    
    const drops = new THREE.Points(dropGeometry, dropMaterial);
    drops.visible = false;
    this.dropParticles.push(drops);
    this.scene.add(drops);
  }

  private createSplashParticles() {
    const splashCount = 40;
    const positions = new Float32Array(splashCount * 3);
    const sizes = new Float32Array(splashCount);
    const velocities = new Float32Array(splashCount * 3);
    
    for (let i = 0; i < splashCount; i++) {
      const i3 = i * 3;
      
      // Position at the impact point
      positions[i3] = (Math.random() - 0.5) * 0.3;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.3;
      
      sizes[i] = Math.random() * 2 + 1;
      
      // Radial outward velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.2 + 0.1;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = Math.random() * 0.2 + 0.05; // Upward
      velocities[i3 + 2] = Math.sin(angle) * speed;
    }
    
    const splashGeometry = new THREE.BufferGeometry();
    splashGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    splashGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    splashGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const splashMaterial = new THREE.ShaderMaterial({
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
    
    const splash = new THREE.Points(splashGeometry, splashMaterial);
    splash.visible = false;
    (splash as any).lifespan = 0;
    
    this.splashParticles.push(splash);
    this.scene.add(splash);
  }

  private createRipple(x: number, strength: number = 1.0) {
    // Create a ripple effect at the surface of the liquid
    if (this.liquidLevel <= 0.1) return; // No ripples if hardly any liquid
    
    const size = 0.3 + Math.random() * 0.2;
    const geometry = new THREE.CircleGeometry(size, 16);
    
    const material = new THREE.MeshBasicMaterial({
      color: this.wineColor,
      transparent: true,
      opacity: 0.3 * strength,
      side: THREE.DoubleSide
    });
    
    const ripple = new THREE.Mesh(geometry, material);
    
    // Position at the liquid surface
    const yPosition = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
    ripple.position.set(x, yPosition, 0.01);
    ripple.rotation.x = Math.PI * 0.5; // Lay flat
    
    // Add metadata for animation
    (ripple as any).createdAt = this.clock.getElapsedTime();
    (ripple as any).lifetime = 1.0 + Math.random() * 0.5;
    (ripple as any).maxSize = size;
    
    this.scene.add(ripple);
    this.ripples.push(ripple);
  }

  public setHovered(hovered: boolean) {
    this.hovered = hovered;
    this.targetLiquidLevel = hovered ? 1.0 : 0.0;
    
    if (hovered && !this.isPouringActive) {
      // Start pouring effect
      this.isPouringActive = true;
      this.pourStartTime = this.clock.getElapsedTime();
      
      // Make pour effect visible
      if (this.pourStream) this.pourStream.visible = true;
      this.dropParticles.forEach(drops => drops.visible = true);
    }
  }

  private updateLiquid(deltaTime: number) {
    // Smoothly interpolate liquid level
    this.liquidLevel = THREE.MathUtils.lerp(
      this.liquidLevel,
      this.targetLiquidLevel,
      deltaTime * 1.5
    );
    
    // Update liquid shader uniforms
    if (this.liquidMesh) {
      const material = this.liquidMesh.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = this.clock.getElapsedTime();
      material.uniforms.uLevel.value = this.liquidLevel;
      material.uniforms.uPouringActive.value = this.isPouringActive ? 1.0 : 0.0;
      
      // Add ripple effect when filling
      const rippleStrength = Math.max(0, Math.min(1, 
        (this.liquidLevel > 0.1 ? 1.0 : 0) * (this.isPouringActive ? 1.0 : 0)
      ));
      material.uniforms.uRippleStrength.value = rippleStrength;
    }
  }

  private updatePourEffect(deltaTime: number) {
    if (!this.isPouringActive) return;
    
    const elapsedTime = this.clock.getElapsedTime() - this.pourStartTime;
    const pourDuration = 2.5;
    
    if (elapsedTime > pourDuration) {
      this.isPouringActive = false;
      if (this.pourStream) this.pourStream.visible = false;
      this.dropParticles.forEach(drops => drops.visible = false);
      return;
    }
    
    // Update pour stream shader
    if (this.pourStream) {
      const material = this.pourStream.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = this.clock.getElapsedTime();
      
      // Add slight movement
      this.pourStream.position.x = Math.sin(elapsedTime * 3) * 0.03;
    }
    
    // Update droplets
    this.updateDroplets(deltaTime);
    
    // Create splash at random intervals when liquid level is above 0
    if (this.liquidLevel > 0.1 && Math.random() < deltaTime * 8) {
      this.triggerSplash();
    }
    
    // Create ripples at random intervals
    if (this.liquidLevel > 0.1 && Math.random() < deltaTime * 5) {
      const x = (Math.random() - 0.5) * this.buttonWidth * 0.8;
      this.createRipple(x, Math.random() * 0.6 + 0.4);
    }
  }

  private updateDroplets(deltaTime: number) {
    // Update drop particles
    this.dropParticles.forEach(drops => {
      if (drops.geometry instanceof THREE.BufferGeometry) {
        const positions = drops.geometry.attributes.position.array as Float32Array;
        const velocities = drops.geometry.attributes.velocity.array as Float32Array;
        
        for (let i = 0; i < positions.length; i += 3) {
          // Apply velocity
          positions[i] += velocities[i] * deltaTime;
          positions[i + 1] += velocities[i + 1] * deltaTime;
          positions[i + 2] += velocities[i + 2] * deltaTime;
          
          // Apply gravity
          velocities[i + 1] -= deltaTime * 1.0; // Stronger gravity for side view
          
          // Reset drops that go below liquid or out of bounds
          const yLimit = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight + 0.05;
          
          if (positions[i + 1] < yLimit || 
              Math.abs(positions[i]) > this.buttonWidth/2 ||
              positions[i + 1] < -this.buttonHeight/2) {
                
            const pos = this.dropPositions[Math.floor(Math.random() * this.dropPositions.length)];
            positions[i] = pos.x;
            positions[i + 1] = pos.y;
            positions[i + 2] = pos.z;
            
            velocities[i] = (Math.random() - 0.5) * 0.05;
            velocities[i + 1] = -Math.random() * 0.2 - 0.1;
            velocities[i + 2] = (Math.random() - 0.5) * 0.05;
          }
        }
        
        drops.geometry.attributes.position.needsUpdate = true;
      }
    });
    
    // Update splash particles
    this.splashParticles.forEach(splash => {
      if ((splash as any).active && (splash as any).lifespan > 0) {
        (splash as any).lifespan -= deltaTime * 1.5;
        
        if (splash.geometry instanceof THREE.BufferGeometry) {
          const positions = splash.geometry.attributes.position.array as Float32Array;
          const velocities = splash.geometry.attributes.velocity.array as Float32Array;
          
          for (let i = 0; i < positions.length; i += 3) {
            // Apply velocity
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;
            
            // Apply gravity
            velocities[i + 1] -= deltaTime * 1.0;
            
            // Stop at liquid surface
            const yLimit = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
            if (positions[i + 1] < yLimit) {
              positions[i + 1] = yLimit;
              velocities[i + 1] *= -0.3; // Bounce with dampening
              
              // Create a ripple effect
              if (Math.random() < 0.1) {
                this.createRipple(positions[i], 0.5);
              }
            }
          }
          
          splash.geometry.attributes.position.needsUpdate = true;
        }
        
        // Fade out
        if (splash.material instanceof THREE.ShaderMaterial) {
          splash.material.opacity = (splash as any).lifespan;
        }
        
        // Hide when done
        if ((splash as any).lifespan <= 0) {
          splash.visible = false;
          (splash as any).active = false;
        }
      }
    });
    
    // Update ripples
    this.updateRipples(deltaTime);
  }

  private updateRipples(deltaTime: number) {
    const currentTime = this.clock.getElapsedTime();
    const ripplesToRemove: number[] = [];
    
    for (let i = 0; i < this.ripples.length; i++) {
      const ripple = this.ripples[i];
      const createdAt = (ripple as any).createdAt;
      const lifetime = (ripple as any).lifetime;
      const maxSize = (ripple as any).maxSize;
      
      // Calculate age as 0 to 1
      const age = (currentTime - createdAt) / lifetime;
      
      if (age >= 1) {
        // Mark for removal
        ripplesToRemove.push(i);
      } else {
        // Expand and fade
        const size = maxSize * (0.2 + age * 0.8);
        ripple.scale.set(size, size, 1);
        
        if (ripple.material instanceof THREE.MeshBasicMaterial) {
          ripple.material.opacity = 0.3 * (1 - age);
        }
        
        // Update ripple Y position if liquid level changes
        const yPosition = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
        ripple.position.y = yPosition + 0.01;
      }
    }
    
    // Remove expired ripples in reverse order
    for (let i = ripplesToRemove.length - 1; i >= 0; i--) {
      const index = ripplesToRemove[i];
      const ripple = this.ripples[index];
      
      this.scene.remove(ripple);
      if (ripple.geometry) ripple.geometry.dispose();
      if (ripple.material instanceof THREE.Material) ripple.material.dispose();
      
      this.ripples.splice(index, 1);
    }
  }

  private triggerSplash() {
    // Find an available splash or use the first one
    let splash = this.splashParticles[0];
    
    for (let i = 0; i < this.splashParticles.length; i++) {
      if (!(this.splashParticles[i] as any).active) {
        splash = this.splashParticles[i];
        break;
      }
    }
    
    // Position at the liquid surface
    const yPosition = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
    splash.position.y = yPosition;
    splash.position.x = (Math.random() - 0.5) * this.buttonWidth * 0.7;
    splash.position.z = 0;
    
    // Activate
    splash.visible = true;
    (splash as any).active = true;
    (splash as any).lifespan = 1.0;
    
    // Reset particle positions
    if (splash.geometry instanceof THREE.BufferGeometry) {
      const positions = splash.geometry.attributes.position.array as Float32Array;
      const velocities = splash.geometry.attributes.velocity.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = splash.position.x + (Math.random() - 0.5) * 0.2;
        positions[i + 1] = splash.position.y;
        positions[i + 2] = (Math.random() - 0.5) * 0.2;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.2 + 0.1;
        velocities[i] = Math.cos(angle) * speed;
        velocities[i + 1] = Math.random() * 0.15 + 0.05;
        velocities[i + 2] = Math.sin(angle) * speed;
      }
      
      splash.geometry.attributes.position.needsUpdate = true;
    }
  }

  private animate() {
    if (this.isDestroyed) return;
    
    const deltaTime = this.clock.getDelta();
    
    // Update simulation components
    this.updateLiquid(deltaTime);
    this.updatePourEffect(deltaTime);
    
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
    
    // Update pixel ratio for particles
    this.dropParticles.forEach(drops => {
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
    
    // Clear references
    this.liquidMesh = null;
    this.pourStream = null;
    this.dropParticles = [];
    this.splashParticles = [];
    this.ripples = [];
  }
}
