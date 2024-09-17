import AbstractMaterial from "~/lib/renderer/abstract-renderer/AbstractMaterial";
import {
	UniformFloat1,
	UniformFloat3,
	UniformFloat4,
	UniformInt1,
	UniformMatrix4,
	UniformTexture2DArray
} from "~/lib/renderer/abstract-renderer/Uniform";
import Tile from "../../objects/Tile";
import Mat4 from "~/lib/math/Mat4";
import Pass from "./Pass";
import RenderPassResource from "../render-graph/resources/RenderPassResource";
import {InternalResourceType} from '~/lib/render-graph/Pass';
import PassManager from '../PassManager';
import ExtrudedMeshMaterialContainer from "../materials/ExtrudedMeshMaterialContainer";
import SkyboxMaterialContainer from "../materials/SkyboxMaterialContainer";
import ProjectedMeshMaterialContainer from "../materials/ProjectedMeshMaterialContainer";
import FullScreenTriangle from "../../objects/FullScreenTriangle";
import TerrainMaterialContainer from "../materials/TerrainMaterialContainer";
import TreeMaterialContainer from "../materials/TreeMaterialContainer";
import Vec2 from "~/lib/math/Vec2";
import VehicleSystem from "../../systems/VehicleSystem";
import AircraftMaterialContainer from "../materials/AircraftMaterialContainer";
import AbstractTexture2D from "~/lib/renderer/abstract-renderer/AbstractTexture2D";
import MathUtils from "~/lib/math/MathUtils";
import Config from "../../Config";
import TerrainSystem from "../../systems/TerrainSystem";
import AbstractTexture2DArray from "~/lib/renderer/abstract-renderer/AbstractTexture2DArray";
import Camera from "~/lib/core/Camera";
import GenericInstanceMaterialContainer from "~/app/render/materials/GenericInstanceMaterialContainer";
import {
	InstanceStructure,
	Tile3DInstanceLODConfig,
	Tile3DInstanceType
} from "~/lib/tile-processing/tile3d/features/Tile3DInstance";
import AdvancedInstanceMaterialContainer from "~/app/render/materials/AdvancedInstanceMaterialContainer";
import {InstanceTextureIdList} from "~/app/render/textures/createInstanceTexture";
import MapTimeSystem from "~/app/systems/MapTimeSystem";
import {AircraftPartTextures} from "~/app/render/textures/createAircraftTexture";
import PerspectiveCamera from "~/lib/core/PerspectiveCamera";

export default class GBufferPass extends Pass<{
	GBufferRenderPass: {
		type: InternalResourceType.Output;
		resource: RenderPassResource;
	};
	TerrainNormal: {
		type: InternalResourceType.Input;
		resource: RenderPassResource;
	};
	TerrainWater: {
		type: InternalResourceType.Input;
		resource: RenderPassResource;
	};
	TerrainWaterTileMask: {
		type: InternalResourceType.Input;
		resource: RenderPassResource;
	};
	TerrainRingHeight: {
		type: InternalResourceType.Input;
		resource: RenderPassResource;
	};
	TerrainUsage: {
		type: InternalResourceType.Input;
		resource: RenderPassResource;
	};
	TerrainUsageTileMask: {
		type: InternalResourceType.Input;
		resource: RenderPassResource;
	};
}> {
	private extrudedMeshMaterial: AbstractMaterial;
	private projectedMeshMaterial: AbstractMaterial;
	private huggingMeshMaterial: AbstractMaterial;
	private skyboxMaterial: AbstractMaterial;
	private terrainMaterial: AbstractMaterial;
	private treeMaterial: AbstractMaterial;
	private genericInstanceMaterial: AbstractMaterial;
	private advancedInstanceMaterial: AbstractMaterial;
	private aircraftMaterial: AbstractMaterial;
	private cameraMatrixWorldInversePrev: Mat4 = null;
	public objectIdBuffer: Uint32Array = new Uint32Array(1);
	public objectIdX = 0;
	public objectIdY = 0;
	private fullScreenTriangle: FullScreenTriangle;

	public constructor(manager: PassManager) {
		super('GBufferPass', manager, {
			GBufferRenderPass: {
				type: InternalResourceType.Output,
				resource: manager.getSharedResource('GBufferRenderPass')
			},
			TerrainNormal: {
				type: InternalResourceType.Input,
				resource: manager.getSharedResource('TerrainNormal')
			},
			TerrainWater: {
				type: InternalResourceType.Input,
				resource: manager.getSharedResource('TerrainWater')
			},
			TerrainWaterTileMask: {
				type: InternalResourceType.Input,
				resource: manager.getSharedResource('TerrainWaterTileMask')
			},
			TerrainRingHeight: {
				type: InternalResourceType.Input,
				resource: manager.getSharedResource('TerrainRingHeight')
			},
			TerrainUsage: {
				type: InternalResourceType.Input,
				resource: manager.getSharedResource('TerrainUsage')
			},
			TerrainUsageTileMask: {
				type: InternalResourceType.Input,
				resource: manager.getSharedResource('TerrainUsageTileMask')
			}
		});

		this.fullScreenTriangle = new FullScreenTriangle(this.renderer);

		this.createMaterials();
	}

	private createMaterials(): void {
		this.skyboxMaterial = new SkyboxMaterialContainer(this.renderer).material;
		this.terrainMaterial = new TerrainMaterialContainer(this.renderer).material;

		this.genericInstanceMaterial = new GenericInstanceMaterialContainer(this.renderer).material;
		this.genericInstanceMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('instance');

		this.advancedInstanceMaterial = new AdvancedInstanceMaterialContainer(this.renderer).material;
		this.advancedInstanceMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('instance');

		this.treeMaterial = new TreeMaterialContainer(this.renderer).material;
		this.treeMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('tree');

		this.projectedMeshMaterial = new ProjectedMeshMaterialContainer(this.renderer, false).material;
		this.projectedMeshMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('projectedMesh');

		this.huggingMeshMaterial = new ProjectedMeshMaterialContainer(this.renderer, true).material;
		this.huggingMeshMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('projectedMesh');

		this.extrudedMeshMaterial = new ExtrudedMeshMaterialContainer(this.renderer).material;
		this.extrudedMeshMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('extrudedMesh');

		this.aircraftMaterial = new AircraftMaterialContainer(this.renderer).material;
		this.aircraftMaterial.getUniform<UniformTexture2DArray>('tMap').value =
			<AbstractTexture2DArray>this.manager.texturePool.get('aircraft');
	}

	private updateMaterialsDefines(): void {
		const useHeight = this.manager.settings.get('terrainHeight').statusValue === 'on' ? '1' : '0';
		const materials = [
			this.huggingMeshMaterial,
			this.projectedMeshMaterial,
			this.terrainMaterial
		];

		for (const material of materials) {
			if (material.defines.USE_HEIGHT !== useHeight) {
				material.defines.USE_HEIGHT = useHeight;
				material.recompile();
			}
		}
	}

	private getTileNormalTexturesTransforms(tile: Tile): [Float32Array, Float32Array] {
		const terrainSystem = this.manager.systemManager.getSystem(TerrainSystem);
		const transform0 = new Float32Array(4);
		const transform1 = new Float32Array(4);

		terrainSystem.areaLoaders.height0.transformToArray(
			tile.position.x,
			tile.position.z,
			Config.TileSize,
			transform0
		);
		terrainSystem.areaLoaders.height1.transformToArray(
			tile.position.x,
			tile.position.z,
			Config.TileSize,
			transform1
		);

		return [transform0, transform1];
	}

	private getCameraPositionRelativeToTile(camera: Camera, tile: Tile): [number, number] {
		return [
			camera.position.x - tile.position.x + Config.TileSize / 2,
			camera.position.z - tile.position.z + Config.TileSize / 2
		];
	}

	private renderSkybox(): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const skybox = this.manager.sceneSystem.objects.skybox;
		const skyRotationMatrix = new Float32Array(this.manager.mapTimeSystem.skyDirectionMatrix.values);

		this.skyboxMaterial.getUniform('projectionMatrix', 'Uniforms').value =
			new Float32Array(camera.projectionMatrix.values);
		this.skyboxMaterial.getUniform('modelViewMatrix', 'Uniforms').value =
			new Float32Array(Mat4.multiply(camera.matrixWorldInverse, skybox.matrixWorld).values);
		this.skyboxMaterial.getUniform('viewMatrix', 'Uniforms').value = new Float32Array(camera.matrixWorld.values);
		this.skyboxMaterial.getUniform('skyRotationMatrix', 'Uniforms').value = skyRotationMatrix;
		this.skyboxMaterial.updateUniformBlock('Uniforms');

		this.renderer.useMaterial(this.skyboxMaterial);

		skybox.draw();
	}

	private renderExtrudedMeshes(): void {
		const windowLightThreshold = this.manager.systemManager.getSystem(MapTimeSystem).windowLightThreshold;
		const camera = this.manager.sceneSystem.objects.camera;
		const tiles = this.manager.sceneSystem.objects.tiles;

		this.renderer.useMaterial(this.extrudedMeshMaterial);

		this.extrudedMeshMaterial.getUniform('projectionMatrix', 'PerMaterial').value = new Float32Array(camera.jitteredProjectionMatrix.values);
		this.extrudedMeshMaterial.getUniform<UniformFloat1>('windowLightThreshold', 'PerMaterial').value[0] = windowLightThreshold;
		this.extrudedMeshMaterial.updateUniformBlock('PerMaterial');

		for (const tile of tiles) {
			if (!tile.extrudedMesh || !tile.extrudedMesh.inCameraFrustum(camera)) {
				continue;
			}

			const mvMatrix = Mat4.multiply(camera.matrixWorldInverse, tile.matrixWorld);
			const mvMatrixPrev = Mat4.multiply(this.cameraMatrixWorldInversePrev, tile.matrixWorld);

			this.extrudedMeshMaterial.getUniform('modelViewMatrix', 'PerMesh').value = new Float32Array(mvMatrix.values);
			this.extrudedMeshMaterial.getUniform('modelViewMatrixPrev', 'PerMesh').value = new Float32Array(mvMatrixPrev.values);
			this.extrudedMeshMaterial.getUniform<UniformFloat1>('tileId', 'PerMesh').value[0] = tile.localId;
			this.extrudedMeshMaterial.updateUniformBlock('PerMesh');

			tile.extrudedMesh.draw();
		}
	}

	private renderTerrain(): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const terrain = this.manager.sceneSystem.objects.terrain;
		const terrainNormal = <AbstractTexture2DArray>this.getPhysicalResource('TerrainNormal').colorAttachments[0].texture;
		const terrainWater = <AbstractTexture2DArray>this.getPhysicalResource('TerrainWater').colorAttachments[0].texture;
		const terrainWaterTileMask = <AbstractTexture2D>this.getPhysicalResource('TerrainWaterTileMask').colorAttachments[0].texture;
		const terrainUsage = <AbstractTexture2DArray>this.getPhysicalResource('TerrainUsage').colorAttachments[0].texture;
		const terrainUsageTileMask = <AbstractTexture2D>this.getPhysicalResource('TerrainUsageTileMask').colorAttachments[0].texture;
		const terrainRingHeight = <AbstractTexture2DArray>this.getPhysicalResource('TerrainRingHeight').colorAttachments[0].texture;
		const biomePos = MathUtils.meters2tile(camera.position.x, camera.position.z, 0);

		this.terrainMaterial.getUniform('tRingHeight').value = terrainRingHeight;
		this.terrainMaterial.getUniform('tNormal').value = terrainNormal;
		this.terrainMaterial.getUniform('tWater').value = terrainWater;
		this.terrainMaterial.getUniform('tWaterMask').value = terrainWaterTileMask;
		this.terrainMaterial.getUniform('tUsage').value = terrainUsage;
		this.terrainMaterial.getUniform('tUsageMask').value = terrainUsageTileMask;
		this.renderer.useMaterial(this.terrainMaterial);

		this.terrainMaterial.getUniform<UniformMatrix4>('projectionMatrix', 'PerMaterial').value =
			new Float32Array(camera.jitteredProjectionMatrix.values);
		this.terrainMaterial.getUniform('biomeCoordinates', 'PerMaterial').value = new Float32Array([biomePos.x, biomePos.y]);
		this.terrainMaterial.getUniform<UniformFloat1>('time', 'PerMaterial').value[0] = performance.now() * 0.001;
		// @ts-ignore
		this.terrainMaterial.getUniform<UniformFloat1>('usageRange', 'PerMaterial').value[0] = window.from ?? 0;
		// @ts-ignore
		this.terrainMaterial.getUniform<UniformFloat1>('usageRange', 'PerMaterial').value[1] = window.to ?? 0;
		this.terrainMaterial.updateUniformBlock('PerMaterial');

		for (let i = 0; i < terrain.children.length; i++) {
			const ring = terrain.children[i];
			const offsetSize = Config.TileSize * Config.TerrainDetailUVScale;
			const detailOffsetX = ring.position.x % offsetSize - ring.size / 2;
			const detailOffsetY = ring.position.z % offsetSize - ring.size / 2;

			this.terrainMaterial.getUniform<UniformMatrix4>('modelViewMatrix', 'PerMesh').value =
				new Float32Array(Mat4.multiply(camera.matrixWorldInverse, ring.matrixWorld).values);
			this.terrainMaterial.getUniform<UniformMatrix4>('modelViewMatrixPrev', 'PerMesh').value =
				new Float32Array(Mat4.multiply(this.cameraMatrixWorldInversePrev, ring.matrixWorld).values);
			this.terrainMaterial.getUniform<UniformFloat3>('transformNormal0', 'PerMesh').value = ring.heightTextureTransform0;
			this.terrainMaterial.getUniform<UniformFloat3>('transformNormal1', 'PerMesh').value = ring.heightTextureTransform1;
			this.terrainMaterial.getUniform<UniformFloat4>('transformWater0', 'PerMesh').value = ring.waterTextureTransform0;
			this.terrainMaterial.getUniform<UniformFloat4>('transformWater1', 'PerMesh').value = ring.waterTextureTransform1;
			this.terrainMaterial.getUniform<UniformFloat3>('transformMask', 'PerMesh').value = ring.maskTextureTransform;
			this.terrainMaterial.getUniform<UniformFloat1>('size', 'PerMesh').value[0] = ring.size;
			this.terrainMaterial.getUniform<UniformFloat1>('segmentCount', 'PerMesh').value[0] = ring.segmentCount * 2;
			this.terrainMaterial.getUniform('detailTextureOffset', 'PerMesh').value = new Float32Array([
				detailOffsetX,
				detailOffsetY
			]);
			this.terrainMaterial.getUniform('cameraPosition', 'PerMesh').value = new Float32Array([
				camera.position.x - ring.position.x, camera.position.z - ring.position.z
			]);
			this.terrainMaterial.getUniform<UniformInt1>('levelId', 'PerMesh').value[0] = i;
			this.terrainMaterial.updateUniformBlock('PerMesh');

			ring.draw();
		}
	}

	private getTileDetailTextureOffset(tile: Tile): Float32Array {
		const offsetSize = Config.TileSize * Config.TerrainDetailUVScale;
		const detailOffsetX = tile.position.x % offsetSize;
		const detailOffsetY = tile.position.z % offsetSize;

		return new Float32Array([detailOffsetX, detailOffsetY]);
	}

	private renderProjectedMeshes(): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const tiles = this.manager.sceneSystem.objects.tiles;
		const terrain = this.manager.sceneSystem.objects.terrain;

		const terrainNormal = <AbstractTexture2DArray>this.getPhysicalResource('TerrainNormal').colorAttachments[0].texture;
		const terrainRingHeight = <AbstractTexture2DArray>this.getPhysicalResource('TerrainRingHeight').colorAttachments[0].texture;

		this.projectedMeshMaterial.getUniform('tRingHeight').value = terrainRingHeight;
		this.projectedMeshMaterial.getUniform('tNormal').value = terrainNormal;

		this.renderer.useMaterial(this.projectedMeshMaterial);

		this.projectedMeshMaterial.getUniform<UniformMatrix4>('projectionMatrix', 'PerMaterial').value = new Float32Array(camera.jitteredProjectionMatrix.values);
		this.projectedMeshMaterial.updateUniformBlock('PerMaterial');

		for (const tile of tiles) {
			if (!tile.projectedMesh || !tile.projectedMesh.inCameraFrustum(camera)) {
				continue;
			}

			const tileParams = terrain.getTileParams(tile);

			if (!tileParams) {
				continue;
			}

			const {ring0, levelId, ring0Offset, ring1Offset} = tileParams;
			const normalTextureTransforms = this.getTileNormalTexturesTransforms(tile);
			const detailTextureOffset = this.getTileDetailTextureOffset(tile);

			const mvMatrix = Mat4.multiply(camera.matrixWorldInverse, tile.matrixWorld);
			const mvMatrixPrev = Mat4.multiply(this.cameraMatrixWorldInversePrev, tile.matrixWorld);
			const relativeCameraPosition = this.getCameraPositionRelativeToTile(camera, tile);

			this.projectedMeshMaterial.getUniform('modelViewMatrix', 'PerMesh').value = new Float32Array(mvMatrix.values);
			this.projectedMeshMaterial.getUniform('modelViewMatrixPrev', 'PerMesh').value = new Float32Array(mvMatrixPrev.values);
			this.projectedMeshMaterial.getUniform('transformNormal0', 'PerMesh').value = normalTextureTransforms[0];
			this.projectedMeshMaterial.getUniform('transformNormal1', 'PerMesh').value = normalTextureTransforms[1];
			this.projectedMeshMaterial.getUniform<UniformFloat1>('terrainRingSize', 'PerMesh').value[0] = ring0.size;
			this.projectedMeshMaterial.getUniform('terrainRingOffset', 'PerMesh').value = new Float32Array([
				ring0Offset.x, ring0Offset.y, ring1Offset.x, ring1Offset.y
			]);
			this.projectedMeshMaterial.getUniform<UniformFloat1>('terrainLevelId', 'PerMesh').value[0] = levelId;
			this.projectedMeshMaterial.getUniform<UniformFloat1>('segmentCount', 'PerMesh').value[0] = ring0.segmentCount * 2;
			this.projectedMeshMaterial.getUniform('cameraPosition', 'PerMesh').value = new Float32Array(relativeCameraPosition);
			this.projectedMeshMaterial.getUniform('detailTextureOffset', 'PerMesh').value = detailTextureOffset;
			this.projectedMeshMaterial.getUniform<UniformFloat1>('time', 'PerMaterial').value[0] = performance.now() * 0.001;

			this.projectedMeshMaterial.updateUniformBlock('PerMesh');

			tile.projectedMesh.draw();
		}
	}

	private renderHuggingMeshes(): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const tiles = this.manager.sceneSystem.objects.tiles;
		const terrain = this.manager.sceneSystem.objects.terrain;

		const terrainNormal = <AbstractTexture2DArray>this.getPhysicalResource('TerrainNormal').colorAttachments[0].texture;
		const terrainRingHeight = <AbstractTexture2DArray>this.getPhysicalResource('TerrainRingHeight').colorAttachments[0].texture;

		this.huggingMeshMaterial.getUniform('tRingHeight').value = terrainRingHeight;
		this.huggingMeshMaterial.getUniform('tNormal').value = terrainNormal;

		this.renderer.useMaterial(this.huggingMeshMaterial);

		this.huggingMeshMaterial.getUniform<UniformMatrix4>('projectionMatrix', 'PerMaterial').value = new Float32Array(camera.jitteredProjectionMatrix.values);
		this.huggingMeshMaterial.updateUniformBlock('PerMaterial');

		for (const tile of tiles) {
			if (!tile.huggingMesh || !tile.huggingMesh.inCameraFrustum(camera)) {
				continue;
			}

			const tileParams = terrain.getTileParams(tile);

			if (!tileParams) {
				continue;
			}

			const {ring0, levelId, ring0Offset, ring1Offset} = tileParams;
			const normalTextureTransforms = this.getTileNormalTexturesTransforms(tile);

			const mvMatrix = Mat4.multiply(camera.matrixWorldInverse, tile.matrixWorld);
			const mvMatrixPrev = Mat4.multiply(this.cameraMatrixWorldInversePrev, tile.matrixWorld);
			const relativeCameraPosition = this.getCameraPositionRelativeToTile(camera, tile);

			this.huggingMeshMaterial.getUniform('modelViewMatrix', 'PerMesh').value = new Float32Array(mvMatrix.values);
			this.huggingMeshMaterial.getUniform('modelViewMatrixPrev', 'PerMesh').value = new Float32Array(mvMatrixPrev.values);
			this.huggingMeshMaterial.getUniform('transformNormal0', 'PerMesh').value = normalTextureTransforms[0];
			this.huggingMeshMaterial.getUniform('transformNormal1', 'PerMesh').value = normalTextureTransforms[1];
			this.huggingMeshMaterial.getUniform<UniformFloat1>('terrainRingSize', 'PerMesh').value[0] = ring0.size;
			this.huggingMeshMaterial.getUniform('terrainRingOffset', 'PerMesh').value = new Float32Array([
				ring0Offset.x, ring0Offset.y, ring1Offset.x, ring1Offset.y
			]);
			this.huggingMeshMaterial.getUniform<UniformFloat1>('terrainLevelId', 'PerMesh').value[0] = levelId;
			this.huggingMeshMaterial.getUniform<UniformFloat1>('segmentCount', 'PerMesh').value[0] = ring0.segmentCount * 2;
			this.huggingMeshMaterial.getUniform('cameraPosition', 'PerMesh').value = new Float32Array(relativeCameraPosition);
			this.huggingMeshMaterial.getUniform<UniformFloat1>('time', 'PerMaterial').value[0] = performance.now() * 0.001;
			this.huggingMeshMaterial.updateUniformBlock('PerMesh');

			tile.huggingMesh.draw();
		}
	}

	private renderInstances(instancesOrigin: Vec2): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const tiles = this.manager.sceneSystem.objects.tiles;

		this.manager.sceneSystem.updateInstancedObjectsBuffers(tiles, camera, instancesOrigin);

		for (const [name, instancedObject] of this.manager.sceneSystem.objects.instancedObjects.entries()) {
			if (instancedObject.instanceCount === 0) {
				continue;
			}

			const materials: Record<InstanceStructure, AbstractMaterial> = {
				[InstanceStructure.Tree]: this.treeMaterial,
				[InstanceStructure.Generic]: this.genericInstanceMaterial,
				[InstanceStructure.Advanced]: this.advancedInstanceMaterial
			};

			const config = Tile3DInstanceLODConfig[name as Tile3DInstanceType];
			const material = materials[config.structure];
			const mvMatrixPrev = Mat4.multiply(this.cameraMatrixWorldInversePrev, instancedObject.matrixWorld);

			this.renderer.useMaterial(material);

			material.getUniform('projectionMatrix', 'MainBlock').value = new Float32Array(camera.jitteredProjectionMatrix.values);
			material.getUniform('modelMatrix', 'MainBlock').value = new Float32Array(instancedObject.matrixWorld.values);
			material.getUniform('viewMatrix', 'MainBlock').value = new Float32Array(camera.matrixWorldInverse.values);
			material.getUniform('modelViewMatrixPrev', 'MainBlock').value = new Float32Array(mvMatrixPrev.values);
			material.updateUniformBlock('MainBlock');

			const textureIdUniform = material.getUniform('textureId', 'PerInstanceType');

			if (textureIdUniform) {
				textureIdUniform.value = new Float32Array([InstanceTextureIdList[name as Tile3DInstanceType]]);
				material.updateUniformBlock('PerInstanceType');
			}

			instancedObject.mesh.draw();
		}
	}

	private renderAircraft(instancesOrigin: Vec2): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const aircraftObjects = this.manager.sceneSystem.objects.instancedAircraftParts;
		const vehicleSystem = this.manager.systemManager.getSystem(VehicleSystem);

		vehicleSystem.updateBuffers(instancesOrigin);

		const buffers = vehicleSystem.aircraftPartsBuffers;

		for (const [partType, buffer] of buffers.entries()) {
			const object = aircraftObjects.get(partType);

			if (!object) {
				continue;
			}

			const instanceCount = buffer.length / 6;

			object.position.set(instancesOrigin.x, 0, instancesOrigin.y);
			object.updateMatrix();
			object.updateMatrixWorld();
			object.setInstancesInterleavedBuffer(buffer, instanceCount);

			if (instanceCount === 0) {
				continue;
			}

			const texture = AircraftPartTextures[partType];
			const mvMatrixPrev = Mat4.multiply(this.cameraMatrixWorldInversePrev, object.matrixWorld);

			this.renderer.useMaterial(this.aircraftMaterial);

			this.aircraftMaterial.getUniform('projectionMatrix', 'MainBlock').value = new Float32Array(camera.jitteredProjectionMatrix.values);
			this.aircraftMaterial.getUniform('modelMatrix', 'MainBlock').value = new Float32Array(object.matrixWorld.values);
			this.aircraftMaterial.getUniform('viewMatrix', 'MainBlock').value = new Float32Array(camera.matrixWorldInverse.values);
			this.aircraftMaterial.getUniform('modelViewMatrixPrev', 'MainBlock').value = new Float32Array(mvMatrixPrev.values);
			this.aircraftMaterial.getUniform('textureId', 'MainBlock').value = new Float32Array([texture]);
			this.aircraftMaterial.updateUniformBlock('MainBlock');

			object.mesh.draw();
		}
	}

	private writeToObjectIdBuffer(): void {
		const mainRenderPass = this.getPhysicalResource('GBufferRenderPass');
		mainRenderPass.readColorAttachmentPixel(4, this.objectIdBuffer, this.objectIdX, this.objectIdY);
	}

	private getInstancesOrigin(camera: Camera): Vec2 {
		return new Vec2(
			Math.floor(camera.position.x / 10000) * 10000,
			Math.floor(camera.position.z / 10000) * 10000
		);
	}

	public render(): void {
		const camera = this.manager.sceneSystem.objects.camera;

		const instancesOrigin = this.getInstancesOrigin(camera);

		if (!this.cameraMatrixWorldInversePrev) {
			this.cameraMatrixWorldInversePrev = camera.matrixWorldInverse;
		} else {
			const pivotDelta = this.manager.sceneSystem.pivotDelta;

			this.cameraMatrixWorldInversePrev = Mat4.translate(
				this.cameraMatrixWorldInversePrev,
				pivotDelta.x,
				0,
				pivotDelta.y
			);
		}

		this.updateMaterialsDefines();

		const mainRenderPass = this.getPhysicalResource('GBufferRenderPass');
		this.renderer.beginRenderPass(mainRenderPass);

		this.renderSkybox();
		this.renderExtrudedMeshes();
		this.renderAircraft(instancesOrigin);
		this.renderTerrain();
		this.renderProjectedMeshes();
		this.renderHuggingMeshes();
		this.renderInstances(instancesOrigin);
		this.writeToObjectIdBuffer();

		this.saveCameraMatrixWorldInverse();
	}

	private saveCameraMatrixWorldInverse(): void {
		this.cameraMatrixWorldInversePrev = this.manager.sceneSystem.objects.camera.matrixWorldInverse;
	}

	public setSize(width: number, height: number): void {

	}
}