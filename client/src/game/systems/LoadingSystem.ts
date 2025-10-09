// Loading system for pre-generating world chunks
import { WorldSystem } from './WorldSystem';
import { Vector2 } from '../../types/game';

export interface LoadingProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
  chunksLoaded: number;
  totalChunks: number;
  estimatedTimeRemaining: number;
}

export class LoadingSystem {
  private worldSystem: WorldSystem;
  private isLoading = false;
  private loadingProgress: LoadingProgress;
  private loadingStartTime = 0;
  private onProgressCallback?: (progress: LoadingProgress) => void;
  private onCompleteCallback?: () => void;

  constructor(worldSystem: WorldSystem) {
    this.worldSystem = worldSystem;
    this.loadingProgress = {
      stage: 'idle',
      progress: 0,
      message: 'Ready to load',
      chunksLoaded: 0,
      totalChunks: 0,
      estimatedTimeRemaining: 0,
    };
  }

  // Start loading world around player spawn point
  async startLoading(
    spawnPosition: Vector2 = { x: 0, y: 0 },
    radius: number = 3,
    onProgress?: (progress: LoadingProgress) => void,
    onComplete?: () => void
  ): Promise<void> {
    if (this.isLoading) {
      console.warn('LoadingSystem: Already loading!');
      return;
    }

    this.isLoading = true;
    this.loadingStartTime = performance.now();
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;

    try {
      console.log(
        `🌍 Starting world generation for ${radius} chunk radius around (${spawnPosition.x}, ${spawnPosition.y})`
      );

      // Calculate chunks to generate
      const chunkSize = 1000;
      const centerChunkX = Math.floor(spawnPosition.x / chunkSize);
      const centerChunkY = Math.floor(spawnPosition.y / chunkSize);

      const chunksToGenerate: { x: number; y: number }[] = [];
      for (let x = centerChunkX - radius; x <= centerChunkX + radius; x++) {
        for (let y = centerChunkY - radius; y <= centerChunkY + radius; y++) {
          chunksToGenerate.push({ x, y });
        }
      }

      this.loadingProgress.totalChunks = chunksToGenerate.length;
      this.updateProgress(
        'generating',
        0,
        `Generating ${this.loadingProgress.totalChunks} world chunks...`
      );

      // Generate chunks with progress updates
      await this.generateChunksWithProgress(chunksToGenerate);

      // Finalization stage
      this.updateProgress('finalizing', 95, 'Finalizing world state...');
      await this.sleep(500); // Brief pause for finalization

      // Complete loading
      this.updateProgress('complete', 100, 'World loaded successfully!');
      await this.sleep(200);

      this.isLoading = false;
      console.log(
        `✅ World generation complete! Generated ${this.loadingProgress.chunksLoaded} chunks in ${((performance.now() - this.loadingStartTime) / 1000).toFixed(1)}s`
      );

      this.onCompleteCallback?.();
    } catch (error) {
      console.error('❌ Loading failed:', error);
      this.loadingProgress.stage = 'error';
      this.loadingProgress.message = `Loading failed: ${error instanceof Error ? error.message : String(error)}`;
      this.isLoading = false;
      throw error;
    }
  }

  // Generate chunks with progress updates and yielding to prevent blocking
  private async generateChunksWithProgress(
    chunks: { x: number; y: number }[]
  ): Promise<void> {
    const batchSize = 3; // Generate 3 chunks at a time to prevent blocking

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      // Generate batch of chunks
      for (const { x, y } of batch) {
        try {
          const chunkGenStartTime = performance.now();
          this.updateProgress(
            'generating',
            0,
            `Generating chunk (${x}, ${y})...`
          );

          // Generate the chunk
          const chunk = this.worldSystem.generateChunkIfNeeded(x, y);
          if (chunk) {
            this.loadingProgress.chunksLoaded++;

            const chunkGenTime = performance.now() - chunkGenStartTime;
            console.log(
              `📦 Generated chunk (${x}, ${y}) in ${chunkGenTime.toFixed(1)}ms`
            );
          }

          // Update progress
          const progress =
            (this.loadingProgress.chunksLoaded /
              this.loadingProgress.totalChunks) *
            90; // 90% for chunk generation
          this.updateProgress(
            'generating',
            progress,
            `Generated ${this.loadingProgress.chunksLoaded}/${this.loadingProgress.totalChunks} chunks`
          );
        } catch (error) {
          console.warn(`⚠️ Failed to generate chunk (${x}, ${y}):`, error);
          // Continue with other chunks even if one fails
        }
      }

      // Yield to prevent blocking the UI
      await this.sleep(50); // Small delay between batches
    }
  }

  // Update loading progress and notify callbacks
  private updateProgress(
    stage: string,
    progress: number,
    message: string
  ): void {
    const currentTime = performance.now();
    const elapsedTime = currentTime - this.loadingStartTime;

    // Estimate time remaining based on current progress
    let estimatedTimeRemaining = 0;
    if (progress > 5) {
      const timePerPercent = elapsedTime / progress;
      estimatedTimeRemaining = timePerPercent * (100 - progress);
    }

    this.loadingProgress = {
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      chunksLoaded: this.loadingProgress.chunksLoaded,
      totalChunks: this.loadingProgress.totalChunks,
      estimatedTimeRemaining,
    };

    this.onProgressCallback?.(this.loadingProgress);
  }

  // Helper method to create delays without blocking
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current loading progress
  getProgress(): LoadingProgress {
    return { ...this.loadingProgress };
  }

  // Check if currently loading
  isCurrentlyLoading(): boolean {
    return this.isLoading;
  }

  // Cancel loading (if possible)
  cancelLoading(): void {
    if (this.isLoading) {
      console.log('🛑 Cancelling world loading...');
      this.isLoading = false;
      this.loadingProgress.stage = 'cancelled';
      this.loadingProgress.message = 'Loading cancelled';
    }
  }

  // Pre-load additional chunks around a position (for extending the world)
  async preloadChunksAround(
    position: Vector2,
    radius: number = 1
  ): Promise<void> {
    if (this.isLoading) {
      console.warn(
        'LoadingSystem: Cannot preload while main loading is active'
      );
      return;
    }

    const chunkSize = 1000;
    const centerChunkX = Math.floor(position.x / chunkSize);
    const centerChunkY = Math.floor(position.y / chunkSize);

    const chunksToGenerate: { x: number; y: number }[] = [];
    for (let x = centerChunkX - radius; x <= centerChunkX + radius; x++) {
      for (let y = centerChunkY - radius; y <= centerChunkY + radius; y++) {
        const chunkId = `chunk_${x}_${y}`;
        if (!this.worldSystem.getChunk(chunkId)) {
          chunksToGenerate.push({ x, y });
        }
      }
    }

    if (chunksToGenerate.length === 0) {
      console.log('📦 All chunks already loaded in area');
      return;
    }

    console.log(
      `🔄 Preloading ${chunksToGenerate.length} additional chunks...`
    );

    // Generate chunks in background without progress UI
    for (const { x, y } of chunksToGenerate) {
      try {
        this.worldSystem.generateChunkIfNeeded(x, y);
        await this.sleep(10); // Small delay to prevent blocking
      } catch (error) {
        console.warn(`⚠️ Failed to preload chunk (${x}, ${y}):`, error);
      }
    }

    console.log(`✅ Preloaded ${chunksToGenerate.length} chunks`);
  }

  // Get loading statistics
  getLoadingStats() {
    const elapsedTime = performance.now() - this.loadingStartTime;
    return {
      isLoading: this.isLoading,
      elapsedTime: elapsedTime / 1000, // seconds
      chunksLoaded: this.loadingProgress.chunksLoaded,
      totalChunks: this.loadingProgress.totalChunks,
      chunksPerSecond:
        this.loadingProgress.chunksLoaded > 0
          ? this.loadingProgress.chunksLoaded / (elapsedTime / 1000)
          : 0,
      stage: this.loadingProgress.stage,
      progress: this.loadingProgress.progress,
    };
  }
}
