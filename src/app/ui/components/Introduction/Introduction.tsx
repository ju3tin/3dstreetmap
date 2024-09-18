import React from 'react';
import styles from './Introduction.scss';

interface IntroductionProps {
  onClose: () => void; // Function to handle closing the introduction
}

const Introduction: React.FC<IntroductionProps> = ({ onClose }) => {
  return (
    <div {styles.introduction}>
      <h2>Welcome to the Application!</h2>
      <p>This is an introduction to the features and functionalities.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default Introduction;