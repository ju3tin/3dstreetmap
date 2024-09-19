import React, { useEffect, useRef } from 'react';
import styles from './AudioPlayer.scss'; // Import your CSS module
import audioFile from './audio/1.mp3'; // Import the audio file



const AudioPlayer: React.FC<{ src: string }> = ({ src }): JSX.Element => { // Added return type
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (): void => { // Added return type
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const pauseAudio = (): void => { // Added return type
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Automatically play audio on component mount
  useEffect(() => {
    playAudio(); // Call playAudio when the component mounts

    // Optional: Pause audio when the component unmounts
    return () => {
      pauseAudio();
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className={styles.audioPlayer}>
      <audio ref={audioRef} src={src} />
      <button onClick={playAudio}>Play</button>
      <button onClick={pauseAudio}>Pause</button>
    </div>
  );
};

export default AudioPlayer;