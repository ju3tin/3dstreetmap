import React, { useEffect, useRef } from 'react';
import styles from './AudioPlayer.scss'; // Import your CSS module
import audioFile from './audio/1.mp3'; // Import the audio file



const Audio: React.FC<{ src: string }> = ({ src }): JSX.Element => {
return (
    <div>
<audio controls>
  <source src="/music/1.mp3" type="audio/mpeg" />
</audio>
</div>
  );

};

export default Audio;