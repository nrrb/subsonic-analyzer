import PlaybackButton from '../playback/PlaybackButton';

const FileListItem = ({ file, fileId, progress, isPlaying, togglePlayback }) => {
  return (
    <div className={`file-item ${isPlaying ? 'is-playing' : ''}`}>
      <div 
        className={`progress-bar ${progress === -1 ? 'progress-error' : ''}`}
        style={{ width: `${progress === -1 ? 100 : progress}%` }}
      ></div>
      
      <div className="file-content">
        <span className="filename">{file.name}</span>
        <span className="status">
          {progress < 100 ? 
            (progress === -1 ? 'Error' : `${progress}%`) : 
            'Complete'}
        </span>
        
        {/* Play button for completed files */}
        {progress === 100 && (
          <PlaybackButton 
            isPlaying={isPlaying}
            onClick={togglePlayback}
            fileName={file.name}
          />
        )}
      </div>
    </div>
  );
};

export default FileListItem;