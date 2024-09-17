import VectorArea, {VectorAreaRing, VectorAreaRingType} from "~/lib/tile-processing/vector/features/VectorArea";
import VectorNode from "~/lib/tile-processing/vector/features/VectorNode";
import {OSMReferenceType} from "~/lib/tile-processing/vector/features/OSMReference";
import {VectorAreaDescriptor} from "~/lib/tile-processing/vector/qualifiers/descriptors";

type RingInput = [number, number][];

export default class MapboxAreaHandler {
	private readonly rings: VectorAreaRing[] = [];
	private readonly descriptor: VectorAreaDescriptor;

	public constructor(descriptor: VectorAreaDescriptor) {
		this.descriptor = descriptor;
	}

	public addRing(ring: RingInput): void {
		if (!MapboxAreaHandler.validateRing(ring)) {
			throw new Error('Invalid MapBox ring');
		}

		const isClockwise = MapboxAreaHandler.isRingClockwise(ring);
		const type = isClockwise ? VectorAreaRingType.Outer : VectorAreaRingType.Inner;
		const nodes: VectorNode[] = ring.map(([x, y]) => {
			return {
				type: 'node',
				x,
				y,
				rotation: 0,
				osmReference: null,
				descriptor: null
			};
		})

		this.rings.push({type, nodes});
	}

	public getFeatures(): VectorArea[] {
		const areas: VectorArea[] = [];

		for (const ring of this.rings) {
			if (ring.type === VectorAreaRingType.Outer) {
				areas.push({
					type: 'area',
					rings: [ring],
					osmReference: {id: 0, type: OSMReferenceType.None},
					descriptor: this.descriptor
				});
			} else {
				if (!areas[areas.length - 1]) {
					throw new Error('Invalid MapBox ring order');
				}

				areas[areas.length - 1].rings.push(ring);
			}
		}

		return areas;
	}

	private static isRingClockwise(ring: RingInput): boolean {
		let sum = 0;

		for (let i = 0; i < ring.length; i++) {
			const point1 = ring[i];
			const point2 = ring[i + 1] ?? ring[0];
			sum += (point2[0] - point1[0]) * (point2[1] + point1[1]);
		}

		return sum < 0;
	}

	private static validateRing(ring: RingInput): boolean {
		const first = ring[0];
		const last = ring[ring.length - 1];

		return first[0] === last[0] && first[1] === last[1];
	}
}