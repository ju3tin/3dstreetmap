import React, {useCallback, useContext, useEffect, useState} from "react";
import {useRecoilValue} from "recoil";
import DebugInfo from "~/app/ui/components/DebugInfo";
import SelectionPanel from "~/app/ui/components/SelectionPanel";
import {ActionsContext, AtomsContext} from "~/app/ui/UI";
import RenderGraphViewer from "~/app/ui/components/RenderGraphViewer";
import SearchPanel from "~/app/ui/components/SearchPanel";
import TimePanel from "~/app/ui/components/TimePanel";
import styles from './MainScreen.scss';
import SavedPlacesModalPanel from "~/app/ui/components/SavedPlacesModalPanel";
import DataTimestamp from "~/app/ui/components/DataTimestamp";

const MainScreen: React.FC = () => {
	const atoms = useContext(AtomsContext);
	const actions = useContext(ActionsContext);

	const [isRenderGraphVisible, setIsRenderGraphVisible] = useState<boolean>(false);
	const loadingProgress = useRecoilValue(atoms.resourcesLoadingProgress);
	const [activeModalWindow, setActiveModalWindow] = useState<string>('');
	const [isUIVisible, setIsUIVisible] = useState<boolean>(true);

	const showRenderGraph = useCallback((): void => setIsRenderGraphVisible(true), []);
	const hideRenderGraph = useCallback((): void => setIsRenderGraphVisible(false), []);

	const closeModal = useCallback((): void => setActiveModalWindow(''), []);

	useEffect(() => {
		const handler = (e: KeyboardEvent): void => {
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
			window.removeEventListener('keydown', handler)
		};
	}, [isUIVisible]);

	let containerClassNames = styles.mainScreen;

	if (!isUIVisible || loadingProgress < 1.) {
		containerClassNames += ' ' + styles['mainScreen--hidden'];
	}

	return (
		<div className={containerClassNames}>
			<SearchPanel/>
			
			<DebugInfo showRenderGraph={showRenderGraph}/>
			<DataTimestamp/>
			<TimePanel/>
			<SelectionPanel/>
		
			
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
