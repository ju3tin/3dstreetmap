import {VectorAreaDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";
import getRoofTypeFromOSMRoofShape
	from "~/lib/tile-processing/vector/qualifiers/factories/osm/helpers/getRoofTypeFromOSMRoofShape";
import getRoofMaterialFromOSMMaterial
	from "~/lib/tile-processing/vector/qualifiers/factories/osm/helpers/getRoofMaterialFromOSMMaterial";
import {parseColor} from "~/lib/tile-processing/vector/qualifiers/factories/osm/helpers/tagHelpers";
import isBuildingSupportsDefaultRoof
	from "~/lib/tile-processing/vector/qualifiers/factories/osm/helpers/isBuildingSupportsDefaultRoof";

export default function getRoofParamsFromTags(tags: Record<string, string>): {
	type: VectorAreaDescriptor['buildingRoofType'];
	material: VectorAreaDescriptor['buildingRoofMaterial'];
	color: number;
} {
	const type = getRoofTypeFromOSMRoofShape(tags['roof:shape'], 'flat');
	const noDefault = !isBuildingSupportsDefaultRoof(tags) || type !== 'flat';

	const materialTagValue = tags['roof:material'];
	const colorTagValue = tags['roof:colour'];

	let material = getRoofMaterialFromOSMMaterial(materialTagValue, 'default');
	let color = parseColor(colorTagValue, null);

	if ((color !== null || noDefault) && material === 'default') {
		material = 'concrete';
	}

	if (color === null) {
		switch (material) {
			case 'concrete': {
				color = 0xBBBBBB;
				break;
			}
			case 'metal': {
				color = materialTagValue === 'copper' ? 0xA3CABD : 0xC3D2DD;
				break;
			}
			case 'tiles': {
				color = materialTagValue === 'slate' ? 0x8C8C97 : 0xCB7D64;
				break;
			}
			default: {
				color = 0xffffff;
			}
		}
	}

	return {
		type: type,
		material: material,
		color: color
	};
}