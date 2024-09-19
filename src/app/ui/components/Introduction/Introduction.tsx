import React, { useRef } from 'react';
import styles from './Introduction.scss';

interface IntroductionProps {
  onClose: () => void; // Function to handle closing the introduction
  onPlayAudio: () => void; // Function to play audio from AudioPlayer
}

const Introduction: React.FC<IntroductionProps> = ({ onClose, onPlayAudio }): JSX.Element => { // Added return type
  const handleClose = (): void => { // Added return type
    onPlayAudio(); // Trigger audio play
    onClose(); // Call the onClose function
  };

  return (
    <div className={styles.introduction}>
      <div className={styles.backgroundImages} /> {/* Div for background images */}
      <h2>Welcome to the Application!</h2>
      <p>This is an introduction to the features and functionalities.</p>
      <button onClick={handleClose}>Close</button>
    </div>
  );
};

export default Introduction;