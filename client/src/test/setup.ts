import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock HTMLCanvasElement for game engine tests
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Array(4) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      canvas: {} as HTMLCanvasElement,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt' as CanvasLineCap,
      lineJoin: 'miter' as CanvasLineJoin,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
      imageSmoothingEnabled: true,
      font: '10px sans-serif',
      textAlign: 'start' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      direction: 'inherit' as CanvasDirection,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      isPointInPath: vi.fn(() => false),
      isPointInStroke: vi.fn(() => false),
      createLinearGradient: vi.fn(),
      createRadialGradient: vi.fn(),
      createPattern: vi.fn(),
      getLineDash: vi.fn(() => []),
      setLineDash: vi.fn(),
      lineDashOffset: 0,
      miterLimit: 10,
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as any;

// Mock WebSocket for multiplayer tests
global.WebSocket = vi.fn(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
})) as any;

// Mock Audio for sound tests
global.Audio = vi.fn(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;
