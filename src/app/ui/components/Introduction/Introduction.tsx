import React, { useRef } from 'react';
import styles from './Introduction.scss';

interface IntroductionProps {
  onClose: () => void; // Function to handle closing the introduction
}

const Introduction: React.FC<IntroductionProps> = ({ onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null); // Create a ref for the audio element

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.play(); // Play audio on close
    }
    onClose(); // Call the onClose function
  };

  return (
    <div className={styles.introduction}>
    <div className={styles.backgroundImages} /> 
      <h2>Welcome to the Application!</h2>
      <p>This is an introduction to the features and functionalities.</p>
      <button onClick={handleClose}>Close</button>
      <audio ref={audioRef} src="https://github.com/ju3tin/3dstreetmap/raw/main/public/music/1.mp3" /> {/* Add your audio file path */}
    </div>
  );
};

export default Introduction;