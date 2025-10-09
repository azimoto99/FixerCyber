import React, { useEffect, useState } from 'react';
import { LoadingProgress } from '../../game/systems/LoadingSystem';

interface LoadingScreenProps {
  progress: LoadingProgress;
  onCancel?: () => void;
  allowCancel?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  onCancel,
  allowCancel = false,
}) => {
  const [dots, setDots] = useState('');
  const [scanLines, setScanLines] = useState(0);

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Animate scan lines effect
  useEffect(() => {
    const interval = setInterval(() => {
      setScanLines(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return '< 1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressColor = (progress: number): string => {
    if (progress < 30) return '#ff6b6b';
    if (progress < 70) return '#feca57';
    return '#48dbfb';
  };

  const getStageIcon = (stage: string): string => {
    switch (stage) {
      case 'generating':
        return '🏗️';
      case 'finalizing':
        return '⚡';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      case 'cancelled':
        return '🛑';
      default:
        return '🌍';
    }
  };

  return (
    <div className="loading-screen">
      {/* Background */}
      <div className="loading-bg">
        <div className="circuit-pattern"></div>
        <div
          className="scan-lines"
          style={{ transform: `translateY(${scanLines}%)` }}
        ></div>
        <div className="cyber-grid"></div>
      </div>

      {/* Main Loading Content */}
      <div className="loading-content">
        {/* Header */}
        <div className="loading-header">
          <h1 className="loading-title">
            <span className="title-icon">🔧</span>
            FIXER
            <span className="title-version">v0.1.0</span>
          </h1>
          <div className="loading-subtitle">Initializing cyberpunk world</div>
        </div>

        {/* Progress Section */}
        <div className="loading-progress-section">
          <div className="progress-status">
            <span className="status-icon">{getStageIcon(progress.stage)}</span>
            <span className="status-text">
              {progress.message}
              {dots}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress.progress}%`,
                  backgroundColor: getProgressColor(progress.progress),
                }}
              ></div>
              <div className="progress-text">
                {progress.progress.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="loading-stats">
            <div className="stat-row">
              <span className="stat-label">Chunks Generated:</span>
              <span className="stat-value">
                {progress.chunksLoaded} / {progress.totalChunks}
              </span>
            </div>

            {progress.estimatedTimeRemaining > 0 && (
              <div className="stat-row">
                <span className="stat-label">Time Remaining:</span>
                <span className="stat-value">
                  {formatTime(progress.estimatedTimeRemaining)}
                </span>
              </div>
            )}

            <div className="stat-row">
              <span className="stat-label">Stage:</span>
              <span className="stat-value loading-stage">{progress.stage}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="loading-tips">
          <div className="tip-header">💡 Tips while you wait:</div>
          <div className="tip-content">
            <div className="tip-item">🎯 Use WASD keys to move around</div>
            <div className="tip-item">🔫 Left click to shoot, R to reload</div>
            <div className="tip-item">
              💰 Collect credits and buy better gear
            </div>
            <div className="tip-item">
              🏢 Explore different districts for unique loot
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        {allowCancel && onCancel && (
          <div className="loading-actions">
            <button
              className="cancel-button"
              onClick={onCancel}
              disabled={progress.stage === 'complete'}
            >
              Cancel Loading
            </button>
          </div>
        )}
      </div>

      {/* Loading Screen Styles */}
      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Courier New', monospace;
          color: #00ff41;
          overflow: hidden;
          z-index: 10000;
        }

        .loading-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.3;
        }

        .circuit-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(90deg, transparent 24%, rgba(0, 255, 65, 0.05) 25%, rgba(0, 255, 65, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 65, 0.05) 75%, rgba(0, 255, 65, 0.05) 76%, transparent 77%, transparent),
            linear-gradient(transparent 24%, rgba(0, 255, 65, 0.05) 25%, rgba(0, 255, 65, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 65, 0.05) 75%, rgba(0, 255, 65, 0.05) 76%, transparent 77%, transparent);
          background-size: 30px 30px;
          animation: circuitMove 20s linear infinite;
        }

        .scan-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 200%;
          background: linear-gradient(
            transparent 0%,
            rgba(0, 255, 65, 0.1) 50%,
            transparent 100%
          );
          pointer-events: none;
        }

        .cyber-grid {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(0, 255, 65, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(64, 224, 255, 0.1) 0%, transparent 50%);
          animation: gridPulse 4s ease-in-out infinite alternate;
        }

        @keyframes circuitMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 30px); }
        }

        @keyframes gridPulse {
          0% { opacity: 0.3; }
          100% { opacity: 0.1; }
        }

        .loading-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 600px;
          width: 90%;
          padding: 40px;
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid #00ff41;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        }

        .loading-header {
          margin-bottom: 40px;
        }

        .loading-title {
          font-size: 48px;
          font-weight: bold;
          margin: 0;
          text-shadow: 0 0 10px #00ff41;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .title-icon {
          font-size: 40px;
        }

        .title-version {
          font-size: 16px;
          color: #888;
          align-self: flex-end;
        }

        .loading-subtitle {
          font-size: 18px;
          color: #aaa;
          margin-top: 10px;
        }

        .loading-progress-section {
          margin-bottom: 30px;
        }

        .progress-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
          font-size: 18px;
        }

        .status-icon {
          font-size: 24px;
        }

        .progress-container {
          margin-bottom: 20px;
        }

        .progress-bar {
          position: relative;
          width: 100%;
          height: 30px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #00ff41;
          border-radius: 15px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #00ff41;
          transition: width 0.3s ease, background-color 0.3s ease;
          position: relative;
          border-radius: 15px;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 100%
          );
          animation: shine 2s ease-in-out infinite;
        }

        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: bold;
          color: #000;
          text-shadow: 0 0 2px #fff;
          z-index: 1;
        }

        .loading-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          color: #aaa;
        }

        .stat-value {
          color: #00ff41;
          font-weight: bold;
        }

        .loading-stage {
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .loading-tips {
          margin-top: 30px;
          text-align: left;
        }

        .tip-header {
          font-size: 16px;
          color: #00ff41;
          margin-bottom: 15px;
          text-align: center;
        }

        .tip-content {
          display: grid;
          gap: 8px;
        }

        .tip-item {
          font-size: 14px;
          color: #ccc;
          padding: 5px 0;
        }

        .loading-actions {
          margin-top: 30px;
        }

        .cancel-button {
          background: transparent;
          color: #ff6b6b;
          border: 1px solid #ff6b6b;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .cancel-button:hover:not(:disabled) {
          background: rgba(255, 107, 107, 0.1);
          box-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
        }

        .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .loading-content {
            padding: 20px;
          }

          .loading-title {
            font-size: 36px;
          }

          .tip-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
