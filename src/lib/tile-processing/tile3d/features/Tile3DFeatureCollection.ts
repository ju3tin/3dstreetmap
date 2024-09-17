import Tile3DExtrudedGeometry from "~/lib/tile-processing/tile3d/features/Tile3DExtrudedGeometry";
import Tile3DProjectedGeometry from "~/lib/tile-processing/tile3d/features/Tile3DProjectedGeometry";
import Tile3DInstance from "~/lib/tile-processing/tile3d/features/Tile3DInstance";
import Tile3DHuggingGeometry from "~/lib/tile-processing/tile3d/features/Tile3DHuggingGeometry";
import Tile3DLabel from "~/lib/tile-processing/tile3d/features/Tile3DLabel";
import Tile3DTerrainMaskGeometry from "~/lib/tile-processing/tile3d/features/Tile3DTerrainMaskGeometry";

export default interface Tile3DFeatureCollection {
	x: number;
	y: number;
	zoom: number;
	extruded: Tile3DExtrudedGeometry[];
	projected: Tile3DProjectedGeometry[];
	hugging: Tile3DHuggingGeometry[];
	terrainMask: Tile3DTerrainMaskGeometry[];
	labels: Tile3DLabel[];
	instances: Tile3DInstance[];
}