
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
  private liquid!: {
    mesh: THREE.Mesh;
    heightMap1: THREE.WebGLRenderTarget;
    heightMap2: THREE.WebGLRenderTarget;
    surfaceMaterial: THREE.ShaderMaterial;
    simulationMaterial: THREE.ShaderMaterial;
  };
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
  private causticTexture: THREE.Texture | null = null;
  private buttonWidth: number;
  private buttonHeight: number;
  private glassContainer: THREE.Mesh | null = null;
  
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
    
    // Create renderer with advanced options
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
    
    // Add lights
    this.setupLights();

    // Create the button container, glass, and liquid
    this.createButtonContainer();
    
    // Generate caustic texture
    this.generateCausticTexture();
    
    // Initialize liquid simulation
    this.initLiquidSimulation();
    
    // Create pour stream and particles
    this.createPourEffects();
    
    // Start animation loop
    this.animate();
    
    if (options.onReady) {
      options.onReady();
    }
  }

  private setupLights() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    // Key light (main light source)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1, 2, 3);
    this.scene.add(keyLight);
    
    // Fill light (softer, from opposite side)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, 1, 1);
    this.scene.add(fillLight);
    
    // Back light (rim light)
    const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
    backLight.position.set(0, -1, -2);
    this.scene.add(backLight);
  }

  private createButtonContainer() {
    // Create transparent glass container
    const containerGeometry = new THREE.BoxGeometry(this.buttonWidth, this.buttonHeight, 0.2);
    const containerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      roughness: 0.1,
      transmission: 0.95, // Glass-like transmission
      thickness: 0.05,
      ior: 1.5, // Glass IOR
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    
    this.glassContainer = new THREE.Mesh(containerGeometry, containerMaterial);
    this.scene.add(this.glassContainer);
    
    // Add subtle edge highlights to the glass
    const edgeGeometry = new THREE.EdgesGeometry(containerGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.2 
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.glassContainer.add(edges);
  }
  
  private generateCausticTexture() {
    // Create a procedural caustic texture
    const size = 512;
    const data = new Float32Array(size * size * 4);
    
    for (let i = 0; i < data.length; i += 4) {
      // Generate procedural caustic-like pattern
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      
      const r1 = Math.sin(nx * 20 + ny * 15) * 0.5 + 0.5;
      const r2 = Math.cos(nx * 15 - ny * 20) * 0.5 + 0.5;
      const r3 = Math.sin((nx + ny) * 25) * 0.5 + 0.5;
      
      const caustic = (r1 + r2 + r3) / 3;
      
      // Wine color with caustic intensity
      const intensity = caustic * 0.6 + 0.4;
      data[i] = this.wineColor.r * intensity;
      data[i + 1] = this.wineColor.g * intensity; 
      data[i + 2] = this.wineColor.b * intensity;
      data[i + 3] = 1.0;
    }
    
    const texture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    
    this.causticTexture = texture;
  }
  
  private initLiquidSimulation() {
    // Create render targets for heightmap ping-pong
    const simulationResolution = { width: 128, height: 128 };
    const heightMap1 = this.createRenderTarget(simulationResolution.width, simulationResolution.height);
    const heightMap2 = this.createRenderTarget(simulationResolution.width, simulationResolution.height);
    
    // Create liquid surface geometry
    const surfaceGeometry = new THREE.PlaneGeometry(
      this.buttonWidth - 0.05,
      this.buttonHeight - 0.05,
      64, 
      32
    );
    
    // Simulation material for updating the heightmap
    const simulationMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uHeightmap: { value: null },
        uTime: { value: 0 },
        uDelta: { value: 0.016 },
        uInteraction: { value: new THREE.Vector3(0, 0, 0) }, // x, y, radius
        uLiquidLevel: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uHeightmap;
        uniform float uTime;
        uniform float uDelta;
        uniform vec3 uInteraction;
        uniform float uLiquidLevel;
        
        varying vec2 vUv;
        
        void main() {
          // Don't simulate if below liquid level
          if (vUv.y > uLiquidLevel) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          
          // Read neighbor pixels for the wave equation
          vec2 texel = 1.0 / vec2(textureSize(uHeightmap, 0));
          
          float north = texture2D(uHeightmap, vUv + vec2(0.0, texel.y)).r;
          float south = texture2D(uHeightmap, vUv + vec2(0.0, -texel.y)).r;
          float east = texture2D(uHeightmap, vUv + vec2(texel.x, 0.0)).r;
          float west = texture2D(uHeightmap, vUv + vec2(-texel.x, 0.0)).r;
          
          float current = texture2D(uHeightmap, vUv).r;
          float previous = texture2D(uHeightmap, vUv).g;
          
          // Wave equation
          float c = 0.15;  // Wave speed constant (lower = more viscous like wine)
          float damping = 0.995;  // Damping factor (wine is more damped than water)
          float result = (north + south + east + west - 4.0 * current) * c * c + 2.0 * current - previous;
          result *= damping;
          
          // Add interaction (drops/ripples)
          float interactionForce = 0.0;
          vec2 interactionPos = uInteraction.xy;
          float radius = uInteraction.z;
          
          if (radius > 0.0) {
            float dist = distance(vUv, interactionPos);
            if (dist < radius) {
              float force = (1.0 - dist / radius);
              force *= force;
              interactionForce = force * 0.05;
            }
          }
          
          // Store current as previous, and result as current
          gl_FragColor = vec4(result + interactionForce, current, 0.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    });
    
    // Surface material for rendering the liquid
    const surfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uHeightmap: { value: null },
        uCausticTexture: { value: this.causticTexture },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(this.wineColor) },
        uLevel: { value: 0.0 },
        uLightDir: { value: new THREE.Vector3(1.0, 1.0, 1.0).normalize() }
      },
      vertexShader: `
        uniform sampler2D uHeightmap;
        uniform float uLevel;
        
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        varying float vHeight;
        varying vec3 vWorldPosition;
        
        void main() {
          vUv = uv;
          
          // Normalize the Y UV to be relative to the current liquid level
          float normalizedY = (position.y + ${this.buttonHeight/2}.0) / ${this.buttonHeight}.0;
          
          // Only displace if below the liquid level
          float height = 0.0;
          if (normalizedY <= uLevel) {
            height = texture2D(uHeightmap, vUv).r * 0.15;
          }
          
          // Store the height for fragment shader
          vHeight = height;
          
          // Calculate perturbed position
          vec3 newPosition = position;
          newPosition.z += height;
          
          // Calculate normals for lighting based on height gradient
          vec2 texelSize = 1.0 / vec2(textureSize(uHeightmap, 0));
          float heightRight = texture2D(uHeightmap, vUv + vec2(texelSize.x, 0.0)).r * 0.15;
          float heightUp = texture2D(uHeightmap, vUv + vec2(0.0, texelSize.y)).r * 0.15;
          
          vec3 tangent = normalize(vec3(1.0, 0.0, heightRight - height));
          vec3 bitangent = normalize(vec3(0.0, 1.0, heightUp - height));
          vNormal = normalize(cross(tangent, bitangent));
          
          // Calculate view position for reflections
          vec4 viewPosition = modelViewMatrix * vec4(newPosition, 1.0);
          vViewPosition = viewPosition.xyz;
          
          // World position for caustics
          vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;
          
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform sampler2D uCausticTexture;
        uniform vec3 uLightDir;
        uniform float uLevel;
        
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        varying float vHeight;
        varying vec3 vWorldPosition;
        
        void main() {
          // Normalize the Y UV to be relative to the current liquid level
          float normalizedY = (vWorldPosition.y + ${this.buttonHeight/2}.0) / ${this.buttonHeight}.0;
          
          // Only render if below liquid level
          if (normalizedY > uLevel) {
            discard;
          }
          
          // Base color
          vec3 color = uColor;
          
          // Calculate depth
          float depth = 1.0 - ((normalizedY / uLevel) * 0.7);
          color *= mix(1.0, 0.7, depth); // Deeper areas are darker
          
          // Add caustics
          vec2 causticUV = vWorldPosition.xz * 0.5 + vec2(uTime * 0.02, uTime * 0.03);
          vec3 causticColor = texture2D(uCausticTexture, causticUV).rgb;
          
          // Apply normal mapping for reflections/refractions
          vec3 normal = normalize(vNormal);
          
          // Calculate Fresnel reflection factor
          vec3 viewDir = normalize(-vViewPosition);
          float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.0);
          
          // Add surface highlights at the top of the liquid
          float surfaceHighlight = smoothstep(uLevel - 0.05, uLevel, normalizedY) * fresnel;
          color = mix(color, vec3(1.0, 0.9, 0.9), surfaceHighlight * 0.4);
          
          // Add caustics with normal-based distortion
          float causticsIntensity = max(0.0, dot(normal, normalize(uLightDir)));
          color += causticColor * causticsIntensity * 0.3;
          
          // Add reflections
          color = mix(color, vec3(1.0) * 0.8, fresnel * 0.2);
          
          // Add subtle movement to the color
          float colorShift = sin(vWorldPosition.x * 10.0 + vWorldPosition.y * 5.0 + uTime) * 0.05;
          color = mix(color, color * (1.0 + colorShift), 0.5);
          
          gl_FragColor = vec4(color, 0.94);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Create liquid surface mesh
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    
    // Store all liquid-related objects
    this.liquid = {
      mesh: surfaceMesh,
      heightMap1,
      heightMap2,
      surfaceMaterial,
      simulationMaterial
    };
    
    // Add to scene
    this.scene.add(surfaceMesh);
  }
  
  private createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    });
  }
  
  private createPourEffects() {
    // Create pour stream
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
          
          // Gradient transparency toward the edges
          float alpha = smoothstep(0.5, 0.3, distance(vec2(0.5), vec2(vUv.x, 0.5)));
          
          gl_FragColor = vec4(color, alpha * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false
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
    const offsets = new Float32Array(dropCount); // For staggered animation
    
    for (let i = 0; i < dropCount; i++) {
      const i3 = i * 3;
      
      // Initial positions above the container
      positions[i3] = (Math.random() - 0.5) * this.buttonWidth * 0.6;
      positions[i3 + 1] = Math.random() * 2 + 1; // Above the container
      positions[i3 + 2] = (Math.random() - 0.5) * 0.2;
      
      sizes[i] = Math.random() * 3 + 1;
      
      velocities[i3] = (Math.random() - 0.5) * 0.05;
      velocities[i3 + 1] = -Math.random() * 0.2 - 0.1;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
      
      offsets[i] = Math.random() * 2.0; // Staggered animation
    }
    
    const dropGeometry = new THREE.BufferGeometry();
    dropGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dropGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    dropGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    dropGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
    
    const dropMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.wineColor) },
        uPixelRatio: { value: window.devicePixelRatio },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 velocity;
        attribute float offset;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        varying vec3 vColor;
        varying float vFlow;
        
        void main() {
          vColor = vec3(0.7, 0.1, 0.2);
          
          // Use offset for varied animation
          vFlow = fract(uTime * 0.5 + offset);
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float cameraDist = length(mvPosition.xyz);
          
          gl_PointSize = size * uPixelRatio * (300.0 / cameraDist);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vFlow;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Droplet shape with highlight
          float highlight = smoothstep(0.5, 0.0, dist);
          vec3 color = mix(vColor, vec3(1.0), highlight * 0.5);
          
          // Flow animation affects opacity
          float alpha = smoothstep(0.5, 0.3, dist) * 0.8;
          
          gl_FragColor = vec4(color, alpha);
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
    const lifespans = new Float32Array(splashCount);
    
    for (let i = 0; i < splashCount; i++) {
      const i3 = i * 3;
      
      // Initial positions at the surface
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
      
      lifespans[i] = 1.0; // Full lifespan
    }
    
    const splashGeometry = new THREE.BufferGeometry();
    splashGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    splashGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    splashGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    splashGeometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));
    
    const splashMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.wineColor) },
        uPixelRatio: { value: window.devicePixelRatio },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float lifespan;
        
        uniform float uPixelRatio;
        
        varying vec3 vColor;
        varying float vLifespan;
        
        void main() {
          vColor = vec3(0.7, 0.1, 0.2);
          vLifespan = lifespan;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float cameraDist = length(mvPosition.xyz);
          
          gl_PointSize = size * uPixelRatio * (300.0 / cameraDist) * lifespan;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifespan;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          // Droplet shape with highlight
          float highlight = smoothstep(0.5, 0.0, dist);
          vec3 color = mix(vColor, vec3(1.0), highlight * 0.5);
          
          float alpha = smoothstep(0.5, 0.3, dist) * 0.8 * vLifespan;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    
    const splash = new THREE.Points(splashGeometry, splashMaterial);
    splash.visible = false;
    (splash as any).active = false;
    
    this.splashParticles.push(splash);
    this.scene.add(splash);
  }

  private triggerRipple(x: number, y: number, force: number = 0.05) {
    if (!this.liquid) return;
    
    // Convert world space to UV coordinates (0-1)
    const uvX = ((x + this.buttonWidth / 2) / this.buttonWidth) * 0.92 + 0.04;
    const uvY = ((y + this.buttonHeight / 2) / this.buttonHeight) * 0.92 + 0.04;
    
    // Set ripple in the simulation material
    this.liquid.simulationMaterial.uniforms.uInteraction.value.set(
      uvX, 
      uvY, 
      0.05 // Radius in UV space
    );
    
    // Reset after a few frames
    setTimeout(() => {
      if (this.liquid && !this.isDestroyed) {
        this.liquid.simulationMaterial.uniforms.uInteraction.value.z = 0;
      }
    }, 100);
  }

  public setHovered(hovered: boolean) {
    if (this.hovered === hovered) return;
    
    this.hovered = hovered;
    this.targetLiquidLevel = hovered ? 0.95 : 0.0;
    
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
    if (!this.liquid) return;
    
    // Smoothly interpolate liquid level
    this.liquidLevel = THREE.MathUtils.lerp(
      this.liquidLevel,
      this.targetLiquidLevel,
      deltaTime * 1.0
    );
    
    // Update heightmap simulation
    this.simulateHeightmap(deltaTime);
    
    // Update liquid shader uniforms
    this.liquid.surfaceMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
    this.liquid.surfaceMaterial.uniforms.uLevel.value = this.liquidLevel;
    
    // Position the liquid mesh correctly based on current level
    // Center vertically based on liquid level
    this.liquid.mesh.position.y = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight / 2;
    // Scale the mesh to match the current liquid level
    this.liquid.mesh.scale.y = this.liquidLevel;
  }
  
  private simulateHeightmap(deltaTime: number) {
    if (!this.liquid || this.liquidLevel <= 0.1) return;
    
    const { renderer } = this;
    const { heightMap1, heightMap2, simulationMaterial } = this.liquid;
    
    // Update simulation uniforms
    simulationMaterial.uniforms.uDelta.value = Math.min(deltaTime, 0.04);
    simulationMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
    simulationMaterial.uniforms.uLiquidLevel.value = this.liquidLevel;
    
    // Save current viewport and set to heightmap size
    const currentRenderTarget = renderer.getRenderTarget();
    
    // Ping-pong between height maps
    simulationMaterial.uniforms.uHeightmap.value = heightMap1.texture;
    renderer.setRenderTarget(heightMap2);
    renderer.render(new THREE.Scene(), new THREE.Camera());
    
    // Swap the heightmaps
    const temp = heightMap1;
    this.liquid.heightMap1 = heightMap2;
    this.liquid.heightMap2 = temp;
    
    // Update the surface material with the new heightmap
    this.liquid.surfaceMaterial.uniforms.uHeightmap.value = heightMap2.texture;
    
    // Restore renderer state
    renderer.setRenderTarget(currentRenderTarget);
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
    this.updateDroplets(deltaTime, elapsedTime);
    
    // Create splashes at random intervals when liquid level is above 0
    if (this.liquidLevel > 0.1 && Math.random() < deltaTime * 8) {
      this.triggerSplash();
    }
    
    // Create ripples at random intervals
    if (this.liquidLevel > 0.1 && Math.random() < deltaTime * 5) {
      const x = (Math.random() - 0.5) * this.buttonWidth * 0.8;
      const y = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
      this.triggerRipple(x, y);
    }
  }
  
  private triggerSplash() {
    // Find an available splash particle system
    let splash = this.splashParticles[0];
    
    for (let i = 0; i < this.splashParticles.length; i++) {
      if (!(this.splashParticles[i] as any).active) {
        splash = this.splashParticles[i];
        break;
      }
    }
    
    // Position at the liquid surface
    const yPosition = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
    const xPosition = (Math.random() - 0.5) * this.buttonWidth * 0.7;
    
    splash.position.set(xPosition, yPosition, 0);
    
    // Trigger ripple at splash location
    this.triggerRipple(xPosition, yPosition, 0.08);
    
    // Activate splash
    splash.visible = true;
    (splash as any).active = true;
    (splash as any).startTime = this.clock.getElapsedTime();
    
    // Reset particle positions
    if (splash.geometry instanceof THREE.BufferGeometry) {
      const positions = splash.geometry.attributes.position.array as Float32Array;
      const velocities = splash.geometry.attributes.velocity.array as Float32Array;
      const lifespans = splash.geometry.attributes.lifespan.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = xPosition + (Math.random() - 0.5) * 0.1;
        positions[i + 1] = yPosition;
        positions[i + 2] = (Math.random() - 0.5) * 0.1;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.2 + 0.1;
        velocities[i] = Math.cos(angle) * speed;
        velocities[i + 1] = Math.random() * 0.15 + 0.05;
        velocities[i + 2] = Math.sin(angle) * speed;
        
        lifespans[i/3] = 1.0;
      }
      
      splash.geometry.attributes.position.needsUpdate = true;
      splash.geometry.attributes.lifespan.needsUpdate = true;
    }
  }

  private updateDroplets(deltaTime: number, elapsedTime: number) {
    // Update drop particles
    this.dropParticles.forEach(drops => {
      if (drops.geometry instanceof THREE.BufferGeometry) {
        const positions = drops.geometry.attributes.position.array as Float32Array;
        const velocities = drops.geometry.attributes.velocity.array as Float32Array;
        const offsets = drops.geometry.attributes.offset.array as Float32Array;
        
        // Update material time
        if (drops.material instanceof THREE.ShaderMaterial) {
          drops.material.uniforms.uTime.value = elapsedTime;
        }
        
        for (let i = 0; i < positions.length; i += 3) {
          const offset = offsets[i/3];
          
          // Only update drops after their offset time
          if (elapsedTime > offset) {
            // Apply velocity
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;
            
            // Apply gravity
            velocities[i + 1] -= deltaTime * 1.0; // Stronger gravity for side view
            
            // Reset drops that go below liquid or out of bounds
            const yLimit = -this.buttonHeight/2 + this.liquidLevel * this.buttonHeight;
            
            if (positions[i + 1] < yLimit || 
                Math.abs(positions[i]) > this.buttonWidth/2 ||
                positions[i + 1] < -this.buttonHeight/2) {
                  
              // Create ripple effect when drop hits liquid
              if (positions[i + 1] < yLimit && positions[i + 1] > -this.buttonHeight/2) {
                this.triggerRipple(positions[i], yLimit);
              }
              
              // Reset drop to top
              positions[i] = (Math.random() - 0.5) * this.buttonWidth * 0.6;
              positions[i + 1] = Math.random() * 2 + 1;
              positions[i + 2] = (Math.random() - 0.5) * 0.2;
              
              velocities[i] = (Math.random() - 0.5) * 0.05;
              velocities[i + 1] = -Math.random() * 0.2 - 0.1;
              velocities[i + 2] = (Math.random() - 0.5) * 0.05;
              
              // Reset offset for staggered animation
              offsets[i/3] = Math.random() * 2.0 + elapsedTime;
            }
          }
        }
        
        drops.geometry.attributes.position.needsUpdate = true;
        drops.geometry.attributes.offset.needsUpdate = true;
      }
    });
    
    // Update splash particles
    this.splashParticles.forEach(splash => {
      if ((splash as any).active) {
        const splashAge = this.clock.getElapsedTime() - (splash as any).startTime;
        const splashDuration = 1.5;
        
        if (splashAge >= splashDuration) {
          splash.visible = false;
          (splash as any).active = false;
          return;
        }
        
        // Calculate lifespan (1.0 to 0.0)
        const lifespan = 1.0 - (splashAge / splashDuration);
        
        if (splash.geometry instanceof THREE.BufferGeometry) {
          const positions = splash.geometry.attributes.position.array as Float32Array;
          const velocities = splash.geometry.attributes.velocity.array as Float32Array;
          const lifespans = splash.geometry.attributes.lifespan.array as Float32Array;
          
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
                this.triggerRipple(positions[i], yLimit);
              }
            }
            
            // Update lifespan
            lifespans[i/3] = lifespan;
          }
          
          splash.geometry.attributes.position.needsUpdate = true;
          splash.geometry.attributes.lifespan.needsUpdate = true;
        }
      }
    });
  }

  private animate() {
    if (this.isDestroyed) return;
    
    const deltaTime = Math.min(0.05, this.clock.getDelta());
    
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
    
    // Dispose render targets
    if (this.liquid) {
      this.liquid.heightMap1.dispose();
      this.liquid.heightMap2.dispose();
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
    
    // Dispose textures
    if (this.causticTexture) {
      this.causticTexture.dispose();
    }
    
    // Clear references
    this.pourStream = null;
    this.dropParticles = [];
    this.splashParticles = [];
    this.ripples = [];
  }
}
