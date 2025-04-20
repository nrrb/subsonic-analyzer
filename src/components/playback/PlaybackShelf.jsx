// File: src/components/playback/PlaybackShelf.jsx
import React from 'react';

const PlaybackShelf = ({ 
  currentlyPlaying,
  duration,
  playbackProgress,
  showPlaybackShelf,
  formatCurrentTime,
  formatDuration,
  seekTo,
  togglePlayback
}) => {
  return (
    <div className={`playback-shelf ${showPlaybackShelf ? 'show' : 'hide'}`}>
      <div className="playback-shelf-content">
        <div className="playback-shelf-info">
          <div className="currently-playing-title">
            {currentlyPlaying || ''}
          </div>
          <div className="playback-shelf-times">
            <div className="playback-time">{formatCurrentTime()}</div>
            <div className="playback-duration">{formatDuration(duration)}</div>
          </div>
        </div>
        
        <div 
          className="playback-scrub-bar"
          onClick={seekTo}
        >
          <div 
            className="playback-progress" 
            style={{ width: `${playbackProgress}%` }}
          ></div>
        </div>
        
        <button 
          className="playback-shelf-close" 
          onClick={() => {
            if (currentlyPlaying) {
              togglePlayback(currentlyPlaying);
            } else {
              // Just hide the shelf if nothing is playing
              // This would need to be handled by the parent component
            }
          }}
        >
          {currentlyPlaying ? '⏹️' : '×'}
        </button>
      </div>
    </div>
  );
};

export default PlaybackShelf;

