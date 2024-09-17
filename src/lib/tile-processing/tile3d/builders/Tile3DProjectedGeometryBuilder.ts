import Vec2 from "~/lib/math/Vec2";
import Tile3DProjectedGeometry from "~/lib/tile-processing/tile3d/features/Tile3DProjectedGeometry";
import Tile3DMultipolygon from "~/lib/tile-processing/tile3d/builders/Tile3DMultipolygon";
import Tile3DRing, {Tile3DRingType} from "~/lib/tile-processing/tile3d/builders/Tile3DRing";
import AABB3D from "~/lib/math/AABB3D";
import Vec3 from "~/lib/math/Vec3";
import SurfaceBuilder, {SurfaceBuilderOrientation} from "~/lib/tile-processing/tile3d/builders/SurfaceBuilder";
import RoadBuilder, {RoadSide} from "~/lib/tile-processing/tile3d/builders/RoadBuilder";
import {projectGeometryOnTerrain, projectLineOnTerrain} from "~/lib/tile-processing/tile3d/builders/utils";
import FenceBuilder from "~/lib/tile-processing/tile3d/builders/FenceBuilder";
import Tile3DTerrainMaskGeometry from "~/lib/tile-processing/tile3d/features/Tile3DTerrainMaskGeometry";
import {appendArrayInPlace} from "~/lib/tile-processing/utils";

export default class Tile3DProjectedGeometryBuilder {
	private readonly arrays: {
		position: number[];
		uv: number[];
		normal: number[];
		textureId: number[];
	} = {
		position: [],
		uv: [],
		normal: [],
		textureId: []
	};
	private readonly terrainMaskPositions: number[] = [];
	private readonly boundingBox: AABB3D = new AABB3D();
	private readonly multipolygon: Tile3DMultipolygon = new Tile3DMultipolygon();
	private zIndex: number = 0;

	public constructor(multipolygon?: Tile3DMultipolygon) {
		if (multipolygon) {
			this.multipolygon = multipolygon;
		}
	}

	public addRing(type: Tile3DRingType, nodes: Vec2[]): void {
		const ring = new Tile3DRing(type, nodes);
		this.multipolygon.addRing(ring);
	}

	public setZIndex(value: number): void {
		this.zIndex = value;
	}

	public addPolygon(
		{
			textureId,
			height,
			uvScale = 1,
			isOriented = false,
			stretch = false,
			orientation = SurfaceBuilderOrientation.Along,
			addUsageMask
		}: {
			height: number;
			textureId: number;
			uvScale?: number;
			isOriented?: boolean;
			stretch?: boolean;
			orientation?: SurfaceBuilderOrientation;
			addUsageMask?: boolean;
		}
	): void {
		const surface = SurfaceBuilder.build({
			multipolygon: this.multipolygon,
			isOriented: isOriented,
			orientation: orientation,
			stretch: stretch,
			uvScale: uvScale
		});

		this.projectAndAddGeometry({
			position: surface.position,
			uv: surface.uv,
			textureId: textureId,
			height: height
		});

		if (addUsageMask) {
			this.addMaskGeometry(surface.position);
		}
	}

	public addPath(
		{
			vertexAdjacentToStart = null,
			vertexAdjacentToEnd = null,
			width,
			uvFollowRoad,
			uvScale = 1,
			uvScaleY = 1,
			side = RoadSide.Both,
			uvMinX = 0,
			uvMaxX = 1,
			height = 0,
			textureId
		}: {
			vertexAdjacentToStart?: Vec2;
			vertexAdjacentToEnd?: Vec2;
			width: number;
			uvFollowRoad: boolean;
			uvScale?: number;
			uvScaleY?: number;
			side?: RoadSide;
			uvMinX?: number;
			uvMaxX?: number;
			height?: number;
			textureId: number;
		}
	): void {
		const road = RoadBuilder.build({
			vertices: this.multipolygon.rings[0].nodes,
			vertexAdjacentToStart,
			vertexAdjacentToEnd,
			width,
			uvFollowRoad,
			uvScale,
			uvScaleY,
			side,
			uvMinX,
			uvMaxX
		});

		this.projectAndAddGeometry({
			position: road.position,
			uv: road.uv,
			textureId,
			height
		});

		this.addMaskGeometry(road.position);
	}

	public addFence(
		{
			minHeight,
			height,
			width,
			textureId
		}: {
			minHeight: number;
			height: number;
			width: number;
			textureId: number;
		}
	): void {
		const ring = this.multipolygon.rings[0];
		const projectedPolylines = projectLineOnTerrain(ring.nodes);

		for (const polyline of projectedPolylines) {
			const fence = FenceBuilder.build({
				vertices: polyline.vertices,
				minHeight: minHeight,
				height: height,
				uvWidth: width,
				uvHeight: 1,
				uvHorizontalOffset: polyline.startProgress
			});

			this.addGeometry({
				position: fence.position,
				normal: fence.normal,
				uv: fence.uv,
				textureId: textureId,
			});
		}
	}

	public addExtrudedPath(
		{
			width,
			height,
			textureId,
			textureScaleX,
			textureScaleY
		}: {
			width: number;
			height: number;
			textureId: number;
			textureScaleX: number;
			textureScaleY: number;
		}
	): void {
		const road = RoadBuilder.build({
			vertices: this.multipolygon.rings[0].nodes,
			width: width,
			uvFollowRoad: true,
			uvScaleY: textureScaleY,
			uvMinX: 0,
			uvMaxX: width / textureScaleX
		});

		this.projectAndAddGeometry({
			position: road.position,
			uv: road.uv,
			textureId: textureId,
			height: height
		});

		const projectedPolylines = projectLineOnTerrain(road.border);

		for (const polyline of projectedPolylines) {
			const fence = FenceBuilder.build({
				vertices: polyline.vertices,
				minHeight: 0,
				height: height,
				uvWidth: textureScaleX,
				uvHeight: height / textureScaleY,
				uvHorizontalOffset: polyline.startProgress
			});

			this.addGeometry({
				position: fence.position,
				normal: fence.normal,
				uv: fence.uv,
				textureId: textureId,
			});
		}
	}

	private projectAndAddGeometry(
		{
			position,
			uv,
			textureId,
			height = 0
		}: {
			position: number[];
			uv: number[];
			textureId: number;
			height?: number;
		}
	): void {
		const projected = projectGeometryOnTerrain({position, uv, height});

		appendArrayInPlace(this.arrays.position, projected.position);
		appendArrayInPlace(this.arrays.uv, projected.uv);
		this.addVerticesToBoundingBox(projected.position);

		const vertexCount = projected.position.length / 3;

		for (let i = 0; i < vertexCount; i++) {
			this.arrays.normal.push(0, 1, 0);
			this.arrays.textureId.push(textureId);
		}
	}

	private addGeometry(
		{
			position,
			normal,
			uv,
			textureId
		}: {
			position: number[];
			normal: number[];
			uv: number[];
			textureId: number;
		}
	): void {
		appendArrayInPlace(this.arrays.position, position);
		appendArrayInPlace(this.arrays.normal, normal);
		appendArrayInPlace(this.arrays.uv, uv);
		this.addVerticesToBoundingBox(position);

		const vertexCount = position.length / 3;

		for (let i = 0; i < vertexCount; i++) {
			this.arrays.textureId.push(textureId);
		}
	}

	private addMaskGeometry(position: number[]): void {
		for (let i = 0; i < position.length; i += 3) {
			this.terrainMaskPositions.push(position[i], position[i + 2]);
		}
	}

	private addVerticesToBoundingBox(vertices: number[]): void {
		const tempVec3 = new Vec3();

		for (let i = 0; i < vertices.length; i += 3) {
			tempVec3.set(vertices[i], vertices[i + 1], vertices[i + 2]);
			this.boundingBox.includePoint(tempVec3);
		}
	}

	public getGeometry(): Tile3DProjectedGeometry {
		return {
			type: 'projected',
			zIndex: this.zIndex,
			boundingBox: this.boundingBox,
			positionBuffer: new Float32Array(this.arrays.position),
			normalBuffer: new Float32Array(this.arrays.normal),
			uvBuffer: new Float32Array(this.arrays.uv),
			textureIdBuffer: new Uint8Array(this.arrays.textureId)
		};
	}

	public getTerrainMaskGeometry(): Tile3DTerrainMaskGeometry {
		return {
			type: 'mask',
			positionBuffer: new Float32Array(this.terrainMaskPositions)
		};
	}
}