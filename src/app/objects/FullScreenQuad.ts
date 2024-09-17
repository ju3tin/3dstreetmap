import Object3D from "~/lib/core/Object3D";
import AbstractMesh from "~/lib/renderer/abstract-renderer/AbstractMesh";
import AbstractRenderer from "~/lib/renderer/abstract-renderer/AbstractRenderer";
import {RendererTypes} from "~/lib/renderer/RendererTypes";

export default class FullScreenQuad extends Object3D {
	private renderer: AbstractRenderer;
	public mesh: AbstractMesh;

	public constructor(renderer: AbstractRenderer) {
		super();

		this.renderer = renderer;

		this.createMesh();
	}

	private createMesh(): void {
		this.mesh = this.renderer.createMesh({
			attributes: [
				this.renderer.createAttribute({
					name: 'position',
					size: 3,
					type: RendererTypes.AttributeType.Float32,
					format: RendererTypes.AttributeFormat.Float,
					normalized: false,
					buffer: this.renderer.createAttributeBuffer({
						data: new Float32Array([
							0, 1, 0,
							0, 0, 0,
							1, 1, 0,
							0, 0, 0,
							1, 0, 0,
							1, 1, 0
						])
					})
				}),
				this.renderer.createAttribute({
					name: 'uv',
					size: 2,
					type: RendererTypes.AttributeType.Float32,
					format: RendererTypes.AttributeFormat.Float,
					normalized: true,
					buffer: this.renderer.createAttributeBuffer({
						data: new Float32Array([
							0, 1,
							0, 0,
							1, 1,
							0, 0,
							1, 0,
							1, 1
						])
					})
				})
			]
		});
	}
}