import {VectorTile} from "~/lib/tile-processing/vector/providers/pbf/VectorTile";

const buildingExceptions: string[] = [
	'roof',
	'stadium',
	'houseboat',
	'castle',
	'greenhouse',
	'storage_tank',
	'silo',
	'stadium',
	'ship',
	'bridge',
	'digester',
	'water_tower',
	'shed'
];

export default function isBuildingSupportsDefaultRoof(tags: VectorTile.FeatureTags): boolean {
	const defaultRoofTag = <boolean>tags.defaultRoof;

	if (defaultRoofTag !== undefined) {
		return defaultRoofTag;
	}

	return !buildingExceptions.includes(<string>tags.buildingType);
}