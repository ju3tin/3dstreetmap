import React from "react";
import Panel from "~/app/ui/components/Panel";
import styles from './LegalAttributionPanel.scss';

const LegalAttribution: React.FC = () => {
	return <Panel className={styles.attributionPanel}>
		<span></span>
	</Panel>
}

export default React.memo(LegalAttribution);