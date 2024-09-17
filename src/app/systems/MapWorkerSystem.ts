import MapWorker from "../world/worker/MapWorker";
import System from "../System";
import Config from "../Config";
import TerrainSystem from "~/app/systems/TerrainSystem";

export default class MapWorkerSystem extends System {
	private workers: MapWorker[] = [];

	public postInit(): void {
		const heightProvider = this.systemManager.getSystem(TerrainSystem).terrainHeightProvider;
		const getTerrainHeight = (positions: Float64Array): Float64Array => {
			const heights = new Float64Array(positions.length / 2);
			let isError: boolean = false;

			for (let i = 0; i < positions.length; i += 2) {
				const height = heightProvider.getHeightGlobalInterpolated(positions[i], positions[i + 1], false);

				if (height === null) {
					isError = true;
				}

				heights[i / 2] = height;
			}

			if (isError) {
				console.warn(`Couldn't sample height`);
			}

			return heights;
		};

		for (let i = 0; i < Config.WorkersCount; i++) {
			this.workers.push(new MapWorker(getTerrainHeight));
		}
	}

	public getFreeWorker(): MapWorker {
		for (let i = 0; i < this.workers.length; i++) {
			const worker = this.workers[i];

			if (worker.queueLength < Config.MaxTilesPerWorker) {
				return worker;
			}
		}

		return null;
	}

	public update(deltaTime: number): void {

	}
}
