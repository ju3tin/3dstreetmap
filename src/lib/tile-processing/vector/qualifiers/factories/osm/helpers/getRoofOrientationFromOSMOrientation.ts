import {VectorAreaDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";

export default function getRoofOrientationFromOSMOrientation(str: string): VectorAreaDescriptor['buildingRoofOrientation'] {
	if (str === 'along' || str === 'across') {
		return str;
	}

	return null;
}