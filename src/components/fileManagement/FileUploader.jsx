import { useRef } from 'react';
import FileListItem from './FileListItem';

const FileUploader = ({ 
  files, 
  fileProgress, 
  handleFiles, 
  currentlyPlaying, 
  togglePlayback 
}) => {
  const fileInputRef = useRef(null);
  const uploadAreaRef = useRef(null);

  // Generate a unique ID for a file
  const getFileId = (file) => `${file.name}-${file.lastModified}`;

  // Handle file input change
  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  // Handle drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    uploadAreaRef.current.classList.add('dragging');
  };

  const handleDragLeave = () => {
    uploadAreaRef.current.classList.remove('dragging');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    uploadAreaRef.current.classList.remove('dragging');
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="file-upload-container">
      <div 
        ref={uploadAreaRef}
        className="upload-area"
        onClick={() => fileInputRef.current.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag and drop MP3 files here, or click to select files</p>
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".mp3" 
          multiple
          onChange={handleFileInputChange}
        />
      </div>
      
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file) => (
            <FileListItem 
              key={getFileId(file)}
              file={file}
              fileId={getFileId(file)}
              progress={fileProgress[getFileId(file)] || 0}
              isPlaying={currentlyPlaying === file.name}
              togglePlayback={togglePlayback}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;

