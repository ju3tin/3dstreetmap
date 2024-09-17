import Pass from './Pass';
import * as RG from "~/lib/render-graph";
import RenderPassResource from '../render-graph/resources/RenderPassResource';
import RenderPassResourceDescriptor from '../render-graph/resource-descriptors/RenderPassResourceDescriptor';
import TextureResourceDescriptor, {TextureResourceType} from '../render-graph/resource-descriptors/TextureResourceDescriptor';
import {RendererTypes} from '~/lib/renderer/RendererTypes';
import PassManager from '../PassManager';
import Shaders from '../shaders/Shaders';
import AbstractMaterial from '~/lib/renderer/abstract-renderer/AbstractMaterial';
import AbstractTexture2D from '~/lib/renderer/abstract-renderer/AbstractTexture2D';
import FullScreenTriangle from '../../objects/FullScreenTriangle';

export default class TAAPass extends Pass<{
	Source: {
		type: RG.InternalResourceType.Input;
		resource: RenderPassResource;
	};
	GBuffer: {
		type: RG.InternalResourceType.Input;
		resource: RenderPassResource;
	};
	History: {
		type: RG.InternalResourceType.Local;
		resource: RenderPassResource;
	};
	Output: {
		type: RG.InternalResourceType.Output;
		resource: RenderPassResource;
	};
}> {
	private taaMaterial: AbstractMaterial;
	private fullScreenTriangle: FullScreenTriangle;

	public constructor(manager: PassManager) {
		super('TAAPass', manager, {
			Source: {type: RG.InternalResourceType.Input, resource: manager.getSharedResource('HDR')},
			GBuffer: {type: RG.InternalResourceType.Input, resource: manager.getSharedResource('GBufferRenderPass')},
			History: {type: RG.InternalResourceType.Local, resource: manager.getSharedResource('TAAHistory')},
			Output: {type: RG.InternalResourceType.Output, resource: manager.getSharedResource('HDRAntialiased')}
		});

		this.init();
	}

	private init(): void {
		this.taaMaterial = this.renderer.createMaterial({
			name: 'TAA material',
			uniforms: [
				{
					name: 'tNew',
					block: null,
					type: RendererTypes.UniformType.Texture2D,
					value: null
				}, {
					name: 'tAccum',
					block: null,
					type: RendererTypes.UniformType.Texture2D,
					value: null
				}, {
					name: 'tMotion',
					block: null,
					type: RendererTypes.UniformType.Texture2D,
					value: null
				}
			],
			primitive: {
				frontFace: RendererTypes.FrontFace.CCW,
				cullMode: RendererTypes.CullMode.None
			},
			depth: {
				depthWrite: false,
				depthCompare: RendererTypes.DepthCompare.LessEqual
			},
			blend: {
				color: {
					operation: RendererTypes.BlendOperation.Add,
					srcFactor: RendererTypes.BlendFactor.One,
					dstFactor: RendererTypes.BlendFactor.Zero
				},
				alpha: {
					operation: RendererTypes.BlendOperation.Add,
					srcFactor: RendererTypes.BlendFactor.One,
					dstFactor: RendererTypes.BlendFactor.Zero
				}
			},
			vertexShaderSource: Shaders.taa.vertex,
			fragmentShaderSource: Shaders.taa.fragment
		});

		this.fullScreenTriangle = new FullScreenTriangle(this.renderer);
	}

	public render(): void {
		const colorTexture = <AbstractTexture2D>this.getPhysicalResource('Source').colorAttachments[0].texture;
		const motionTexture = <AbstractTexture2D>this.getPhysicalResource('GBuffer').colorAttachments[3].texture;
		const accumTexture = <AbstractTexture2D>this.getPhysicalResource('History').colorAttachments[0].texture;

		this.taaMaterial.getUniform('tNew').value = colorTexture;
		this.taaMaterial.getUniform('tAccum').value = accumTexture;
		this.taaMaterial.getUniform('tMotion').value = motionTexture;

		this.renderer.beginRenderPass(this.getPhysicalResource('Output'));
		this.renderer.useMaterial(this.taaMaterial);

		this.fullScreenTriangle.mesh.draw();

		this.getPhysicalResource('Output').copyColorAttachmentToTexture(0, accumTexture);
	}

	public setSize(width: number, height: number): void {

	}
}