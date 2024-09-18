import React, {useContext} from "react";
import {useRecoilValue} from "recoil";
import styles from './DebugInfo.scss';
import {AtomsContext} from "~/app/ui/UI";

const DebugInfo: React.FC<{showRenderGraph: () => void}> = ({showRenderGraph}) => {
	const atoms = useContext(AtomsContext);
	const fps = useRecoilValue(atoms.fps);
	const frameTime = useRecoilValue(atoms.frameTime);

	return (
		<div className={styles.debugInfo}>
		</div>
	);
};

export default React.memo(DebugInfo);