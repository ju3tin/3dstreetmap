import React, { useEffect, useRef } from 'react';
import styles from './Audio.scss'; // Import your CSS module
import audioFile from './audio/1.mp3'; // Import the audio file



const Audio: React.FC<{ src: string }> = ({ src }): JSX.Element => {
return (
    <div className={styles.audio}>
<audio controls>
  <source src="https://github.com/ju3tin/3dstreetmap/raw/main/public/music/1.mp3" type="audio/mpeg" />
</audio>
</div>
  );

};

export default Audio;