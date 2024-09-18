import React, { useCallback, useContext, useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import DebugInfo from "~/app/ui/components/DebugInfo";
import SelectionPanel from "~/app/ui/components/SelectionPanel";
import { ActionsContext, AtomsContext } from "~/app/ui/UI";
import RenderGraphViewer from "~/app/ui/components/RenderGraphViewer";
import SearchPanel from "~/app/ui/components/SearchPanel";
import TimePanel from "~/app/ui/components/TimePanel";
import styles from './MainScreen.scss';
import DataTimestamp from "~/app/ui/components/DataTimestamp";
import AudioPlayer from "~/app/ui/components/AudioPlayer"; // Import the AudioPlayer component
import Audiofile from "~/resources/music/1.mp3";

const MainScreen: React.FC = (): JSX.Element => { // Added return type
  const atoms = useContext(AtomsContext);
  const actions = useContext(ActionsContext);

  const [isRenderGraphVisible, setIsRenderGraphVisible] = useState<boolean>(false);
  const loadingProgress = useRecoilValue(atoms.resourcesLoadingProgress);
  const [activeModalWindow, setActiveModalWindow] = useState<string>('');
  const [isUIVisible, setIsUIVisible] = useState<boolean>(true);

  const showRenderGraph = useCallback((): void => setIsRenderGraphVisible(true), []); // Added return type
  const hideRenderGraph = useCallback((): void => setIsRenderGraphVisible(false), []); // Added return type

  const closeModal = useCallback((): void => setActiveModalWindow(''), []); // Added return type

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { // Added return type
      if (e.code === 'KeyU' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsUIVisible(!isUIVisible);
      }

      if (e.code === 'Escape') {
        closeModal();
      }
    }

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [isUIVisible]);

  let containerClassNames = styles.mainScreen;

  if (!isUIVisible || loadingProgress < 1.) {
    containerClassNames += ' ' + styles['mainScreen--hidden'];
  }

  return (
    <div className={containerClassNames}>
      <SearchPanel />
      <DebugInfo showRenderGraph={showRenderGraph} />
      <DataTimestamp />
      <TimePanel />
      <SelectionPanel />
      
      <AudioPlayer src="/music/1.mp3" /> {/* Add the AudioPlayer component here */}
      
      {
        isRenderGraphVisible && (
          <RenderGraphViewer
            update={actions.updateRenderGraph}
            close={hideRenderGraph}
          />
        )
      }
    </div>
  );
}

export default MainScreen;