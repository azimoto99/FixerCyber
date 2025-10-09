// Enhanced 2D Canvas renderer with cyberpunk styling
export class Renderer {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: { x: number; y: number; zoom: number } = {
    x: 0,
    y: 0,
    zoom: 1,
  };
  private viewport: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } = { left: 0, right: 0, top: 0, bottom: 0 };
  private renderQueue: RenderObject[] = [];
  private effects: VisualEffect[] = [];
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.updateViewport();
  }

  private setupCanvas() {
    // Set canvas size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Set rendering properties
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  clear() {
    this.time += 16; // ~60fps

    // Realistic city ground color - concrete/asphalt
    this.ctx.fillStyle = '#454545'; // Dark gray asphalt/concrete
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add subtle texture variation to ground
    this.drawGroundTexture();

    // Clear render queue
    this.renderQueue = [];

    // Update viewport for culling
    this.updateViewport();
  }

  renderWorld(worldState: any, playerPosition?: { x: number; y: number }) {
    if (!worldState) return;

    // Draw realistic city ground
    this.drawCityGround();

    // Draw world chunks (with viewport culling)
    if (worldState.chunks) {
      worldState.chunks.forEach((chunk: any) => {
        if (this.isChunkInViewport(chunk)) {
          this.renderChunk(chunk, playerPosition);
        }
      });
    }

    // Process render queue (for depth sorting)
    this.processRenderQueue();

    // Render effects
    this.renderEffects();
  }

  renderPlayers(players: any[]) {
    if (!players) return;

    players.forEach(player => {
      this.renderPlayer(player);
    });
  }

  renderProjectiles(projectiles: any[]) {
    if (!projectiles || projectiles.length === 0) return;

    projectiles.forEach(projectile => {
      this.renderProjectile(projectile);
    });
  }

  private renderProjectile(projectile: any) {
    const screenPos = this.worldToScreen(projectile.position);
    const size = 4 * this.camera.zoom;

    // Projectile trail effect
    this.ctx.save();
    this.ctx.shadowColor = this.getProjectileColor(projectile.weapon);
    this.ctx.shadowBlur = 10;

    // Main projectile
    this.ctx.fillStyle = this.getProjectileColor(projectile.weapon);
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Bright center
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private getProjectileColor(weapon: string): string {
    const colors = {
      pistol: '#ffff00',
      rifle: '#ff6b35',
      smg: '#ff0080',
      cyber: '#00ffff',
    };
    return colors[weapon as keyof typeof colors] || '#ffffff';
  }

  renderUI() {
    // Render UI elements
    this.drawEnhancedCrosshair();
    this.drawScanLines();
  }

  private drawCityGround() {
    // Draw subtle urban ground details - no bright grid!
    this.drawSubtleGroundPattern();
  }

  private drawGroundTexture() {
    // Add very subtle texture variation to make ground look more realistic
    this.ctx.save();
    this.ctx.globalAlpha = 0.1;

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const size = 1 + Math.random() * 2;

      this.ctx.fillStyle = Math.random() < 0.5 ? '#3a3a3a' : '#505050';
      this.ctx.fillRect(x, y, size, size);
    }

    this.ctx.restore();
  }

  private drawSubtleGroundPattern() {
    // Very subtle ground pattern - barely visible
    const patternSize = 100 * this.camera.zoom;
    const offsetX = this.camera.x % patternSize;
    const offsetY = this.camera.y % patternSize;

    this.ctx.save();
    this.ctx.globalAlpha = 0.05;
    this.ctx.strokeStyle = '#3a3a3a';
    this.ctx.lineWidth = 0.5;

    // Very subtle pattern lines
    for (
      let x = -offsetX;
      x < this.canvas.width + patternSize;
      x += patternSize
    ) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (
      let y = -offsetY;
      y < this.canvas.height + patternSize;
      y += patternSize
    ) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private renderChunk(chunk: any, playerPosition?: { x: number; y: number }) {
    if (!chunk.generatedData) return;

    const { buildings, roads, npcs, infrastructure } = chunk.generatedData;

    // Render roads first (behind everything)
    if (roads) {
      roads.forEach((road: any) => {
        this.renderRoad(road);
      });
    }

    // Render infrastructure (streetlights, signs, etc.)
    if (infrastructure) {
      infrastructure.forEach((item: any) => {
        this.renderInfrastructure(item);
      });
    }

    // Render buildings with 3D effect
    if (buildings) {
      buildings.forEach((building: any) => {
        this.renderBuilding3D(building, playerPosition);
      });
    }

    // Render NPCs
    if (npcs) {
      npcs.forEach((npc: any) => {
        this.renderNPC(npc, playerPosition);
      });
    }
  }

  // New 3D building rendering method
  private renderBuilding3D(
    building: any,
    playerPosition?: { x: number; y: number }
  ) {
    const screenPos = this.worldToScreen(building.position);
    const screenSize = {
      x: building.size.x * this.camera.zoom,
      y: building.size.y * this.camera.zoom,
    };

    // Check if player is near this building for interaction feedback
    let isNearby = false;
    if (playerPosition) {
      const dx = playerPosition.x - (building.position.x + building.size.x / 2);
      const dy = playerPosition.y - (building.position.y + building.size.y / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      isNearby = distance <= 50; // Within interaction range
    }

    if (!this.isInViewport(screenPos, screenSize)) return;

    // Calculate 3D projection
    const height = (building.height || 40) * this.camera.zoom * 0.5;
    const offsetX = height * 0.3;
    const offsetY = height * 0.3;

    // Render building with 3D effect
    const buildingColor = this.getBuildingColor(building);

    // Top face (isometric top)
    this.ctx.fillStyle = this.lightenColor(buildingColor.fill, 0.3);
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y - offsetY);
    this.ctx.lineTo(screenPos.x + screenSize.x, screenPos.y - offsetY);
    this.ctx.lineTo(
      screenPos.x + screenSize.x + offsetX,
      screenPos.y - offsetY - offsetX
    );
    this.ctx.lineTo(screenPos.x + offsetX, screenPos.y - offsetY - offsetX);
    this.ctx.closePath();
    this.ctx.fill();

    // Right face (side)
    this.ctx.fillStyle = this.darkenColor(buildingColor.fill, 0.2);
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x + screenSize.x, screenPos.y - offsetY);
    this.ctx.lineTo(
      screenPos.x + screenSize.x + offsetX,
      screenPos.y - offsetY - offsetX
    );
    this.ctx.lineTo(
      screenPos.x + screenSize.x + offsetX,
      screenPos.y + screenSize.y - offsetY - offsetX
    );
    this.ctx.lineTo(
      screenPos.x + screenSize.x,
      screenPos.y + screenSize.y - offsetY
    );
    this.ctx.closePath();
    this.ctx.fill();

    // Front face (main face)
    this.ctx.fillStyle = buildingColor.fill;
    this.ctx.fillRect(
      screenPos.x,
      screenPos.y - offsetY,
      screenSize.x,
      screenSize.y
    );

    // Add windows to the front face
    this.drawBuildingWindows3D(screenPos, screenSize, building, offsetY);

    // Building outline
    this.ctx.strokeStyle = buildingColor.outline;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      screenPos.x,
      screenPos.y - offsetY,
      screenSize.x,
      screenSize.y
    );

    // Hackable building subtle indicator
    if (building.hackable) {
      this.ctx.save();
      // Much more subtle orange glow instead of bright pink
      this.ctx.shadowColor = '#ff8800';
      this.ctx.shadowBlur = 8 + Math.sin(this.time * 0.003) * 3;
      this.ctx.strokeStyle = '#cc6600'; // Muted orange
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.6; // Make it translucent
      this.ctx.strokeRect(
        screenPos.x - 1,
        screenPos.y - offsetY - 1,
        screenSize.x + 2,
        screenSize.y + 2
      );
      this.ctx.restore();
    }

    // Building type label
    if (screenSize.x > 40 && screenSize.y > 40) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `${Math.max(10, screenSize.y * 0.08)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = '#000000';
      this.ctx.shadowBlur = 2;

      const label = building.type || 'BUILDING';
      this.ctx.fillText(
        label.toUpperCase(),
        screenPos.x + screenSize.x / 2,
        screenPos.y - offsetY + screenSize.y / 2
      );
    }

    // Interaction feedback when nearby
    if (isNearby && (building.hackable || building.type === 'entrance')) {
      this.drawInteractionPrompt(
        { x: screenPos.x, y: screenPos.y - offsetY },
        screenSize,
        building
      );
    }
  }

  private renderRoad(road: any) {
    // Handle multi-point roads (curved streets)
    if (road.points && road.points.length > 2) {
      this.renderMultiPointRoad(road);
      return;
    }

    // Handle simple two-point roads
    const start = this.worldToScreen(road.start);
    const end = this.worldToScreen(road.end);
    const roadWidth = Math.max(road.width * this.camera.zoom, 8); // Minimum width for visibility

    this.ctx.save();

    // Road base (wider, darker for depth)
    this.ctx.strokeStyle = '#1a1a1a'; // Very dark base
    this.ctx.lineWidth = roadWidth + 8;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Main road surface - more visible asphalt
    this.ctx.strokeStyle = '#3a3a3a'; // Lighter asphalt for better visibility
    this.ctx.lineWidth = roadWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    this.ctx.restore();

    // Add lane markings for wider roads
    if (roadWidth > 15) {
      this.drawLaneMarkings(start, end, roadWidth, road.type);
    }

    // Add sidewalks for main roads
    if (road.type === 'main' || road.type === 'secondary') {
      this.drawSidewalks(start, end, roadWidth);
    }

    // Add street lighting for main roads
    if (road.type === 'main' && roadWidth > 25) {
      this.addStreetLights(start, end, roadWidth);
    }
  }

  private renderMultiPointRoad(road: any) {
    if (!road.points || road.points.length < 2) return;

    const roadWidth = Math.max(road.width * this.camera.zoom, 6);
    const points = road.points.map((p: any) => this.worldToScreen(p));

    this.ctx.save();

    // Road base
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = roadWidth + 6;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();

    // Main road surface
    this.ctx.strokeStyle = '#3a3a3a';
    this.ctx.lineWidth = roadWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }

  private addStreetLights(
    start: { x: number; y: number },
    end: { x: number; y: number },
    roadWidth: number
  ) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    const lightSpacing = 80 * this.camera.zoom;
    const numLights = Math.floor(length / lightSpacing);

    if (numLights < 2) return;

    // Calculate perpendicular offset for light placement
    const offsetX = (dy / length) * (roadWidth / 2 + 12);
    const offsetY = (-dx / length) * (roadWidth / 2 + 12);

    this.ctx.save();

    for (let i = 1; i < numLights; i++) {
      const t = i / numLights;
      const lightX = start.x + dx * t;
      const lightY = start.y + dy * t;

      // Street light poles (both sides)
      this.ctx.fillStyle = '#666666';
      this.ctx.fillRect(lightX + offsetX - 1, lightY + offsetY - 8, 2, 16); // Left pole
      this.ctx.fillRect(lightX - offsetX - 1, lightY - offsetY - 8, 2, 16); // Right pole

      // Light glow effect
      this.ctx.fillStyle = '#ffff88';
      this.ctx.globalAlpha = 0.3;
      this.ctx.beginPath();
      this.ctx.arc(lightX + offsetX, lightY + offsetY - 8, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(lightX - offsetX, lightY - offsetY - 8, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    this.ctx.restore();
  }

  private drawLaneMarkings(
    start: { x: number; y: number },
    end: { x: number; y: number },
    _roadWidth: number,
    roadType: string
  ) {
    // Draw center lane markings
    this.ctx.save();
    this.ctx.strokeStyle = '#ffff88'; // Yellow lane markings
    this.ctx.lineWidth = 2;

    if (roadType === 'main') {
      // Solid double yellow line for main roads
      this.ctx.setLineDash([]);

      // Calculate perpendicular offset for double lines
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const offsetX = (dy / length) * 1;
      const offsetY = (-dx / length) * 1;

      // First yellow line
      this.ctx.beginPath();
      this.ctx.moveTo(start.x + offsetX, start.y + offsetY);
      this.ctx.lineTo(end.x + offsetX, end.y + offsetY);
      this.ctx.stroke();

      // Second yellow line
      this.ctx.beginPath();
      this.ctx.moveTo(start.x - offsetX, start.y - offsetY);
      this.ctx.lineTo(end.x - offsetX, end.y - offsetY);
      this.ctx.stroke();
    } else {
      // Dashed white line for secondary roads
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.setLineDash([10, 10]);
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawSidewalks(
    start: { x: number; y: number },
    end: { x: number; y: number },
    roadWidth: number
  ) {
    this.ctx.save();

    // Calculate perpendicular direction for sidewalks
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      this.ctx.restore();
      return;
    }

    const offsetX = (dy / length) * (roadWidth / 2 + 8);
    const offsetY = (-dx / length) * (roadWidth / 2 + 8);

    // Sidewalk color - light gray concrete
    this.ctx.strokeStyle = '#6a6a6a';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'butt';

    // Left sidewalk
    this.ctx.beginPath();
    this.ctx.moveTo(start.x + offsetX, start.y + offsetY);
    this.ctx.lineTo(end.x + offsetX, end.y + offsetY);
    this.ctx.stroke();

    // Right sidewalk
    this.ctx.beginPath();
    this.ctx.moveTo(start.x - offsetX, start.y - offsetY);
    this.ctx.lineTo(end.x - offsetX, end.y - offsetY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderNPC(npc: any, playerPosition?: { x: number; y: number }) {
    const screenPos = this.worldToScreen(npc.position);
    const size = 10 * this.camera.zoom; // Slightly bigger

    // Check if player is near this NPC for interaction feedback
    let isNearby = false;
    if (playerPosition) {
      const dx = playerPosition.x - npc.position.x;
      const dy = playerPosition.y - npc.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      isNearby = distance <= 40; // Within interaction range
    }

    // NPC body with better visibility
    this.ctx.fillStyle = this.getNPCColor(npc.type);
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
    this.ctx.fill();

    // NPC outline - stronger for visibility
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Interaction indicator when nearby
    if (isNearby) {
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, size + 5, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // NPC type label
    if (size > 8) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        npc.type.toUpperCase(),
        screenPos.x,
        screenPos.y - size - 8
      );
    }
  }

  private renderPlayer(player: any) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const scale = this.camera.zoom;

    // Draw cyberpunk character sprite
    this.drawCyberpunkPlayer(centerX, centerY, player, scale);

    // Health bar
    this.drawHealthBar(centerX, centerY - 35 * scale, player.health);

    // Player name tag
    this.drawPlayerNameTag(centerX, centerY - 50 * scale, player);
  }

  private drawCyberpunkPlayer(
    x: number,
    y: number,
    _player: any,
    scale: number = 1
  ) {
    this.ctx.save();

    const size = 16 * scale;

    // Player body (torso) - cyberpunk jacket
    this.ctx.fillStyle = '#2a4d3a'; // Dark green cyber jacket
    this.ctx.fillRect(x - size / 3, y - size / 4, size * 0.66, size * 0.8);

    // Cyber jacket highlights
    this.ctx.fillStyle = '#00ff88';
    this.ctx.fillRect(x - size / 3, y - size / 4, size * 0.1, size * 0.8); // Left stripe
    this.ctx.fillRect(x + size / 4, y - size / 4, size * 0.1, size * 0.8); // Right stripe

    // Player head
    this.ctx.fillStyle = '#d4a574'; // Skin tone
    this.ctx.beginPath();
    this.ctx.arc(x, y - size / 2, size / 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Cyberpunk hair/helmet
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.beginPath();
    this.ctx.arc(x, y - size / 2, size / 3, Math.PI, 2 * Math.PI); // Top half circle for hair
    this.ctx.fill();

    // Cyber implant (glowing eye)
    this.ctx.fillStyle = '#00ffff';
    this.ctx.beginPath();
    this.ctx.arc(x + size / 6, y - size / 2, size / 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Glowing effect for cyber eye
    this.ctx.save();
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = 8 * scale;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x + size / 6, y - size / 2, size / 20, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Player legs
    this.ctx.fillStyle = '#1a1a1a'; // Dark pants
    this.ctx.fillRect(x - size / 4, y + size / 4, size / 6, size / 2); // Left leg
    this.ctx.fillRect(x + size / 12, y + size / 4, size / 6, size / 2); // Right leg

    // Cyber boots
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(x - size / 4, y + size * 0.65, size / 5, size / 4); // Left boot
    this.ctx.fillRect(x + size / 12, y + size * 0.65, size / 5, size / 4); // Right boot

    // Boot glow strips
    this.ctx.fillStyle = '#00ff88';
    this.ctx.fillRect(x - size / 5, y + size * 0.7, size / 8, size / 8); // Left boot glow
    this.ctx.fillRect(x + size / 8, y + size * 0.7, size / 8, size / 8); // Right boot glow

    // Player arms
    this.ctx.fillStyle = '#2a4d3a'; // Same as jacket
    this.ctx.fillRect(x - size / 2, y - size / 8, size / 4, size / 2); // Left arm
    this.ctx.fillRect(x + size / 4, y - size / 8, size / 4, size / 2); // Right arm

    // Cyber weapon/tool in hand
    this.ctx.fillStyle = '#666666';
    this.ctx.fillRect(x + size / 3, y, size / 6, size / 3); // Weapon/tool

    // Weapon glow
    this.ctx.fillStyle = '#ff4444';
    this.ctx.fillRect(
      x + size / 3 + size / 12,
      y + size / 6,
      size / 12,
      size / 12
    );

    // Player outline for better visibility
    this.ctx.strokeStyle = '#00ffff';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.globalAlpha = 0.8;
    this.ctx.strokeRect(x - size / 2, y - size, size, size * 1.5);

    this.ctx.restore();
  }

  private drawPlayerNameTag(x: number, y: number, player: any) {
    if (!player.username) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 30, y - 8, 60, 16);

    this.ctx.fillStyle = '#00ff88';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(player.username, x, y);
    this.ctx.restore();
  }

  private drawHealthBar(x: number, y: number, health: number) {
    const width = 40;
    const height = 4;

    // Background
    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(x - width / 2, y, width, height);

    // Health
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(x - width / 2, y, (health / 100) * width, height);
  }

  private drawEnhancedCrosshair() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const pulse = Math.sin(this.time * 0.008) * 0.3 + 0.7;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00ffff';
    this.ctx.shadowBlur = 8;

    // Main crosshair
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 15, centerY);
    this.ctx.lineTo(centerX - 5, centerY);
    this.ctx.moveTo(centerX + 5, centerY);
    this.ctx.lineTo(centerX + 15, centerY);
    this.ctx.moveTo(centerX, centerY - 15);
    this.ctx.lineTo(centerX, centerY - 5);
    this.ctx.moveTo(centerX, centerY + 5);
    this.ctx.lineTo(centerX, centerY + 15);
    this.ctx.stroke();

    // Center dot
    this.ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.8})`;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private worldToScreen(worldPos: { x: number; y: number }) {
    return {
      x:
        (worldPos.x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y:
        (worldPos.y - this.camera.y) * this.camera.zoom +
        this.canvas.height / 2,
    };
  }

  private getNPCColor(type: string): string {
    // More realistic clothing colors
    const colors = {
      guard: '#4a4a4a', // Dark gray uniform
      civilian: '#6a5a4a', // Brown/tan civilian clothes
      fixer: '#3a3a3a', // Black/dark gray
      dealer: '#5a4a3a', // Dark brown jacket
      thug: '#4a3a2a', // Dirty brown clothes
      executive: '#5a5a5a', // Gray business suit
    };
    return colors[type as keyof typeof colors] || '#555555';
  }

  // Camera controls
  setCamera(x: number, y: number, zoom: number = 1) {
    this.camera = { x, y, zoom };
  }

  getCamera() {
    return this.camera;
  }

  // Utility methods
  addChunk(chunk: any) {
    // Add chunk to render queue
    console.log('Added chunk to renderer:', chunk.id);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.updateViewport();
  }

  // New enhanced methods
  private updateViewport() {
    const padding = 100;
    this.viewport = {
      left: this.camera.x - this.canvas.width / 2 / this.camera.zoom - padding,
      right: this.camera.x + this.canvas.width / 2 / this.camera.zoom + padding,
      top: this.camera.y - this.canvas.height / 2 / this.camera.zoom - padding,
      bottom:
        this.camera.y + this.canvas.height / 2 / this.camera.zoom + padding,
    };
  }

  private isChunkInViewport(chunk: any): boolean {
    const chunkSize = 1000; // Assumed chunk size
    const chunkLeft = chunk.x * chunkSize;
    const chunkRight = (chunk.x + 1) * chunkSize;
    const chunkTop = chunk.y * chunkSize;
    const chunkBottom = (chunk.y + 1) * chunkSize;

    return !(
      chunkRight < this.viewport.left ||
      chunkLeft > this.viewport.right ||
      chunkBottom < this.viewport.top ||
      chunkTop > this.viewport.bottom
    );
  }

  private isInViewport(
    pos: { x: number; y: number },
    size?: { x: number; y: number }
  ): boolean {
    const worldPos = this.screenToWorld(pos);
    const sizeX = size ? size.x / this.camera.zoom : 0;
    const sizeY = size ? size.y / this.camera.zoom : 0;

    return !(
      worldPos.x + sizeX < this.viewport.left ||
      worldPos.x > this.viewport.right ||
      worldPos.y + sizeY < this.viewport.top ||
      worldPos.y > this.viewport.bottom
    );
  }

  private screenToWorld(screenPos: { x: number; y: number }) {
    return {
      x:
        (screenPos.x - this.canvas.width / 2) / this.camera.zoom +
        this.camera.x,
      y:
        (screenPos.y - this.canvas.height / 2) / this.camera.zoom +
        this.camera.y,
    };
  }

  private processRenderQueue() {
    // Sort render queue by depth (y-position for isometric-style depth)
    this.renderQueue.sort((a, b) => a.depth - b.depth);

    // Render sorted objects
    this.renderQueue.forEach(obj => {
      obj.render(this.ctx);
    });
  }

  private renderEffects() {
    this.effects.forEach((effect, index) => {
      effect.update();
      effect.render(this.ctx);

      if (effect.isComplete()) {
        this.effects.splice(index, 1);
      }
    });
  }

  private getBuildingColor(building: any) {
    const districtColors = {
      corporate: {
        fill: '#6a6a6a', // Light gray concrete
        outline: '#8a8a8a', // Lighter gray outline
        innerBorder: '#5a5a5a', // Darker gray accent
      },
      residential: {
        fill: '#7a6a5a', // Warm brown brick
        outline: '#9a8a7a', // Light brown outline
        innerBorder: '#6a5a4a', // Dark brown accent
      },
      industrial: {
        fill: '#5a5a5a', // Dark gray metal
        outline: '#7a7a7a', // Medium gray outline
        innerBorder: '#4a4a4a', // Very dark accent
      },
      underground: {
        fill: '#4a4a4a', // Very dark concrete
        outline: '#6a6a6a', // Medium gray outline
        innerBorder: '#3a3a3a', // Almost black accent
      },
      wasteland: {
        fill: '#6a5a4a', // Weathered brown
        outline: '#8a7a6a', // Faded brown outline
        innerBorder: '#5a4a3a', // Dark weathered accent
      },
    };

    return (
      districtColors[building.district as keyof typeof districtColors] || {
        fill: '#5a5a5a',
        outline: '#7a7a7a',
        innerBorder: '#4a4a4a',
      }
    );
  }

  private drawInteractionPrompt(
    pos: { x: number; y: number },
    size: { x: number; y: number },
    building: any
  ) {
    const centerX = pos.x + size.x / 2;
    const promptY = pos.y - 15;

    this.ctx.save();

    // Pulsing background
    const pulseAlpha = 0.5 + Math.sin(this.time * 0.005) * 0.3;
    this.ctx.fillStyle = `rgba(0, 255, 0, ${pulseAlpha})`;
    this.ctx.fillRect(centerX - 30, promptY - 8, 60, 16);

    // Interaction text
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const action = building.hackable ? '[E] HACK' : '[E] ENTER';
    this.ctx.fillText(action, centerX, promptY);

    this.ctx.restore();
  }

  // Infrastructure rendering
  private renderInfrastructure(item: any) {
    const screenPos = this.worldToScreen(item.position);

    if (!this.isInViewport(screenPos)) return;

    switch (item.type) {
      case 'streetlight':
        this.renderStreetlight(screenPos, item);
        break;
      case 'sign':
      case 'billboard':
        this.renderSign(screenPos, item);
        break;
      case 'debris':
        this.renderDebris(screenPos, item);
        break;
    }
  }

  private renderStreetlight(screenPos: { x: number; y: number }, light: any) {
    const height = (light.height || 20) * this.camera.zoom * 0.8;

    // Streetlight pole - realistic metal color
    this.ctx.strokeStyle = '#555555';
    this.ctx.lineWidth = 3 * this.camera.zoom;
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y);
    this.ctx.lineTo(screenPos.x, screenPos.y - height);
    this.ctx.stroke();

    // Light fixture - darker metal
    this.ctx.fillStyle = '#3a3a3a';
    this.ctx.fillRect(screenPos.x - 6, screenPos.y - height - 8, 12, 8);

    // Realistic warm street lighting
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.ctx.shadowColor = '#ffa500'; // Warm orange/yellow street light
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = '#ffcc66'; // Warm light color
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y - height - 4, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderSign(screenPos: { x: number; y: number }, sign: any) {
    const width = (sign.size?.x || 30) * this.camera.zoom;
    const height = (sign.size?.y || 15) * this.camera.zoom;

    // Realistic sign colors
    this.ctx.fillStyle = sign.type === 'billboard' ? '#4a4a4a' : '#2a2a2a'; // Dark gray backgrounds
    this.ctx.fillRect(
      screenPos.x - width / 2,
      screenPos.y - height / 2,
      width,
      height
    );

    // Sign border - realistic metal frame
    this.ctx.strokeStyle = '#6a6a6a';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      screenPos.x - width / 2,
      screenPos.y - height / 2,
      width,
      height
    );

    // Sign text - warm white/yellow lighting
    if (sign.text && width > 20) {
      this.ctx.fillStyle = '#ffcc88'; // Warm light color instead of pure white
      this.ctx.font = `${Math.max(8, height * 0.4)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(sign.text, screenPos.x, screenPos.y);
    }
  }

  private renderDebris(screenPos: { x: number; y: number }, debris: any) {
    const size = (debris.size || 4) * this.camera.zoom;

    this.ctx.fillStyle = debris.debrisType === 'trash' ? '#444444' : '#666666';
    this.ctx.fillRect(
      screenPos.x - size / 2,
      screenPos.y - size / 2,
      size,
      size
    );
  }

  // 3D window rendering for buildings
  private drawBuildingWindows3D(
    pos: { x: number; y: number },
    size: { x: number; y: number },
    building: any,
    offsetY: number
  ) {
    if (size.x < 30 || size.y < 30) return;

    // Realistic window colors - warm light from inside
    const windowColor = building.hackable ? '#ffa500' : '#ffd700'; // Orange or golden light
    const darkWindow = '#2a2a2a'; // Dark/unlit windows

    const windowSize = Math.max(2, 4 * this.camera.zoom);
    const windowSpacing = Math.max(8, 12 * this.camera.zoom);

    // Create window grid with realistic lighting
    for (
      let x = pos.x + windowSpacing;
      x < pos.x + size.x - windowSize;
      x += windowSpacing
    ) {
      for (
        let y = pos.y - offsetY + windowSpacing;
        y < pos.y - offsetY + size.y - windowSize;
        y += windowSpacing
      ) {
        const isLit = Math.random() > 0.3; // 70% of windows are lit

        if (isLit) {
          // Lit window - warm interior lighting
          this.ctx.fillStyle = windowColor;
          this.ctx.fillRect(x, y, windowSize, windowSize);

          // Window frame
          this.ctx.strokeStyle = '#4a4a4a';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(x, y, windowSize, windowSize);
        } else {
          // Dark window
          this.ctx.fillStyle = darkWindow;
          this.ctx.fillRect(x, y, windowSize, windowSize);

          // Window frame
          this.ctx.strokeStyle = '#3a3a3a';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(x, y, windowSize, windowSize);
        }
      }
    }
  }

  // Color manipulation helpers
  private lightenColor(color: string, _amount: number): string {
    // Simple color lightening - in a full implementation this would use proper color parsing
    const colors = {
      '#2a3d66': '#4a5d86',
      '#4a4a70': '#6a6a90',
      '#663d1a': '#865d3a',
      '#2a1f2a': '#4a3f4a',
      '#4d2f2f': '#6d4f4f',
    };
    return colors[color as keyof typeof colors] || color;
  }

  private darkenColor(color: string, _amount: number): string {
    // Simple color darkening
    const colors = {
      '#2a3d66': '#1a2d56',
      '#4a4a70': '#3a3a60',
      '#663d1a': '#562d0a',
      '#2a1f2a': '#1a0f1a',
      '#4d2f2f': '#3d1f1f',
    };
    return colors[color as keyof typeof colors] || color;
  }

  private drawScanLines() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.03;
    this.ctx.strokeStyle = '#00ffff';
    this.ctx.lineWidth = 1;

    for (let y = 0; y < this.canvas.height; y += 4) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // Effect system
  addEffect(effect: VisualEffect) {
    this.effects.push(effect);
  }

  createMuzzleFlash(worldPos: { x: number; y: number }) {
    const screenPos = this.worldToScreen(worldPos);
    this.addEffect(new MuzzleFlashEffect(screenPos.x, screenPos.y));
  }

  createExplosion(worldPos: { x: number; y: number }) {
    const screenPos = this.worldToScreen(worldPos);
    this.addEffect(new ExplosionEffect(screenPos.x, screenPos.y));
  }
}

// Type definitions and effect classes
interface RenderObject {
  depth: number;
  render(ctx: CanvasRenderingContext2D): void;
}

abstract class VisualEffect {
  protected x: number;
  protected y: number;
  protected life: number;
  protected maxLife: number;

  constructor(x: number, y: number, maxLife: number = 1000) {
    this.x = x;
    this.y = y;
    this.life = 0;
    this.maxLife = maxLife;
  }

  update() {
    this.life += 16; // ~60fps
  }

  isComplete(): boolean {
    return this.life >= this.maxLife;
  }

  abstract render(ctx: CanvasRenderingContext2D): void;
}

class MuzzleFlashEffect extends VisualEffect {
  constructor(x: number, y: number) {
    super(x, y, 100); // Very short duration
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - this.life / this.maxLife;
    const size = 20 - (this.life / this.maxLife) * 10;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class ExplosionEffect extends VisualEffect {
  private particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
  }[] = [];

  constructor(x: number, y: number) {
    super(x, y, 2000);

    // Create particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0,
      });
    }
  }

  update() {
    super.update();

    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.life += 16;
    });
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = Math.max(0, 1 - this.life / this.maxLife);

    ctx.save();

    this.particles.forEach(particle => {
      const particleAlpha = Math.max(0, alpha - particle.life / 1000);
      if (particleAlpha <= 0) return;

      ctx.globalAlpha = particleAlpha;
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
