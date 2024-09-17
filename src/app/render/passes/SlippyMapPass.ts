import Pass from './Pass';
import * as RG from "~/lib/render-graph";
import RenderPassResource from '../render-graph/resources/RenderPassResource';
import PassManager from '../PassManager';
import AbstractMaterial from '~/lib/renderer/abstract-renderer/AbstractMaterial';
import {UniformMatrix4} from "~/lib/renderer/abstract-renderer/Uniform";
import SlippyMapSystem from "~/app/systems/SlippyMapSystem";
import FullScreenQuad from "~/app/objects/FullScreenQuad";
import SlippyTileMaterialContainer from "~/app/render/materials/SlippyTileMaterialContainer";
import AbstractTexture2D from "~/lib/renderer/abstract-renderer/AbstractTexture2D";
import Mat4 from "~/lib/math/Mat4";
import Object3D from "~/lib/core/Object3D";
import MathUtils from "~/lib/math/MathUtils";

export default class SlippyMapPass extends Pass<{
	SlippyMap: {
		type: RG.InternalResourceType.Output;
		resource: RenderPassResource;
	};
}> {
	private tileMaterial: AbstractMaterial;
	private quad: FullScreenQuad;

	public constructor(manager: PassManager) {
		super('SlippyMapPass', manager, {
			SlippyMap: {type: RG.InternalResourceType.Output, resource: manager.getSharedResource('SlippyMap')}
		});

		this.init();
	}

	private init(): void {
		this.tileMaterial = new SlippyTileMaterialContainer(this.renderer).material;
		this.quad = new FullScreenQuad(this.renderer);
	}

	public render(): void {
		const camera = this.manager.sceneSystem.objects.camera;
		const wrapper = this.manager.sceneSystem.objects.wrapper;
		const tiles = this.manager.systemManager.getSystem(SlippyMapSystem).getRenderedTiles();
		const height = this.manager.systemManager.getSystem(SlippyMapSystem).getCurrentWorldHeight();

		this.renderer.beginRenderPass(this.getPhysicalResource('SlippyMap'));

		if (tiles.length === 0) {
			return;
		}

		this.renderer.useMaterial(this.tileMaterial);

		this.tileMaterial.getUniform<UniformMatrix4>('projectionMatrix', 'PerMaterial').value = new Float32Array(camera.projectionMatrix.values);
		this.tileMaterial.updateUniformBlock('PerMaterial');

		const dummy = new Object3D();
		wrapper.add(dummy);

		for (const tile of tiles) {
			const tileSize = MathUtils.getTileSizeInMeters(tile.zoom);
			const tilePos = MathUtils.tile2meters(tile.x, tile.y, tile.zoom);

			dummy.position.set(
				tilePos.x,
				height,
				tilePos.y
			);
			dummy.scale.set(tileSize, tileSize, tileSize);
			dummy.rotation.x = Math.PI / 2;
			dummy.rotation.z = Math.PI / 2;

			dummy.updateMatrix();
			dummy.updateMatrixWorld();

			const mvMatrix = Mat4.multiply(camera.matrixWorldInverse, dummy.matrixWorld);

			this.tileMaterial.getUniform<UniformMatrix4>('modelViewMatrix', 'PerMesh').value = new Float32Array(mvMatrix.values);
			this.tileMaterial.updateUniformBlock('PerMesh');
			this.tileMaterial.getUniform('tMap').value = tile.texture as AbstractTexture2D;
			this.tileMaterial.updateUniform('tMap');

			this.quad.mesh.draw();
		}

		wrapper.remove(dummy);
	}

	public setSize(width: number, height: number): void {

	}
}