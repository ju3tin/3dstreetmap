import Object3D from "~/lib/core/Object3D";
import PerspectiveCamera from "~/lib/core/PerspectiveCamera";
import Vec3 from "~/lib/math/Vec3";
import Frustum from "~/lib/core/Frustum";
import CSMCascadeCamera from "./CSMCascadeCamera";
import Config from "../Config";
import Mat4 from "~/lib/math/Mat4";
import AABB3D from "~/lib/math/AABB3D";

const ShadowCameraTopOffset = 2000;
const FadeOffsetFactor = 250;

export default class CSM extends Object3D {
	private readonly camera: PerspectiveCamera;
	public near: number;
	public far: number;
	public cascades: number;
	public resolution: number;
	private readonly shadowBias: number;
	private readonly shadowNormalBias: number;
	public biasScale: number = 1;
	public direction: Vec3;
	public intensity: number = 0;
	public cascadeCameras: CSMCascadeCamera[];
	private mainFrustum: Frustum;
	private frustums: Frustum[];
	private breaks: number[][];
	private fadeOffsets: number[];

	public constructor(
		{
			camera,
			near,
			far,
			cascades,
			resolution,
			shadowBias,
			shadowNormalBias,
			direction = new Vec3(-1, -1, -1)
		}: {
			camera: PerspectiveCamera;
			near: number;
			far: number;
			cascades: number;
			resolution: number;
			shadowBias: number;
			shadowNormalBias: number;
			direction?: Vec3;
		}
	) {
		super();

		this.camera = camera;
		this.near = near;
		this.far = far;
		this.cascades = cascades;
		this.resolution = resolution;
		this.shadowBias = shadowBias;
		this.shadowNormalBias = shadowNormalBias;
		this.direction = direction;

		this.updateCascades();
	}

	public updateCascades(): void {
		this.createCameras();
		this.updateBreaks();
		this.updateFrustums();
	}

	private createCameras(): void {
		this.remove(...this.children);
		this.cascadeCameras = [];

		for (let i = 0; i < this.cascades; i++) {
			const camera = new CSMCascadeCamera({
				size: 0,
				near: Config.CSMShadowCameraNear,
				far: Config.CSMShadowCameraFar
			});

			this.add(camera);
			this.cascadeCameras.push(camera);
		}
	}

	private updateFrustums(): void {
		this.mainFrustum = new Frustum(this.camera.fov, this.camera.aspect, this.near, this.far);
		this.mainFrustum.updateViewSpaceVertices();

		const newFrustumsVertices = this.mainFrustum.split(this.breaks);

		this.frustums = [];

		for (const vertices of newFrustumsVertices) {
			const frustum = new Frustum();

			frustum.setVertices(vertices);
			this.frustums.push(frustum);
		}

		this.updateShadowBounds();
	}

	private updateBreaks(): void {
		const breaks = CSM.practicalSplit(this.cascades, this.near, this.far, 0.5);

		this.breaks = [];
		this.fadeOffsets = [];

		for (let i = 0; i < breaks.length; i++) {
			const prevBreak = i === 0 ? 0 : breaks[i - 1];

			this.fadeOffsets.push(breaks[i] * FadeOffsetFactor);
			this.breaks.push([prevBreak, breaks[i] + this.fadeOffsets[i] / (this.far - this.near)])
		}
	}

	private updateShadowBounds(): void {
		for (let i = 0; i < this.frustums.length; i++) {
			const frustum = this.frustums[i];

			const nearVerts = frustum.vertices.near;
			const farVerts = frustum.vertices.far;

			const maxSize = Math.max(
				Vec3.distance(farVerts[0], farVerts[2]),
				Vec3.distance(farVerts[0], nearVerts[2]),
			);

			const cascadeCamera = this.cascadeCameras[i];

			cascadeCamera.left = -maxSize / 2;
			cascadeCamera.right = maxSize / 2;
			cascadeCamera.top = maxSize / 2;
			cascadeCamera.bottom = -maxSize / 2;

			cascadeCamera.updateProjectionMatrix();
		}
	}

	private checkForCameraChanges(): void {
		if (this.mainFrustum.fov !== this.camera.fov || this.mainFrustum.aspect !== this.camera.aspect) {
			this.updateFrustums();
		}
	}

	private fixDirection(): void {
		this.direction = Vec3.normalize(this.direction);

		if (this.direction.equals(Vec3.Empty)) {
			this.direction.x = 1;
		}
	}

	public update(): void {
		this.checkForCameraChanges();
		this.fixDirection();

		for (let i = 0; i < this.frustums.length; i++) {
			const worldSpaceFrustum = this.frustums[i].toSpace(this.camera.matrix);
			const cascadeCamera = this.cascadeCameras[i];

			const lightOrientationMatrix = Mat4.lookAt(new Vec3(), this.direction, new Vec3(0, 1, 0));
			const lightOrientationMatrixInverse = Mat4.inverse(lightOrientationMatrix);

			const texelSize = (cascadeCamera.right - cascadeCamera.left) / this.resolution;

			const lightSpaceFrustum = worldSpaceFrustum.toSpace(lightOrientationMatrixInverse);
			const bbox = AABB3D.fromFrustum(lightSpaceFrustum);

			let bboxCenter = bbox.getCenter();

			bboxCenter.z = bbox.max.z + ShadowCameraTopOffset;
			bboxCenter.x = Math.floor(bboxCenter.x / texelSize) * texelSize;
			bboxCenter.y = Math.floor(bboxCenter.y / texelSize) * texelSize;

			bboxCenter = Vec3.applyMatrix4(bboxCenter, lightOrientationMatrix);

			cascadeCamera.position.set(bboxCenter.x, bboxCenter.y, bboxCenter.z);

			const target = Vec3.add(bboxCenter, this.direction);

			cascadeCamera.lookAt(target);

			cascadeCamera.updateMatrixWorld();
			cascadeCamera.updateMatrixWorldInverse();
			cascadeCamera.updateFrustum();
		}
	}

	private getBreaksForUniform(): Float32Array {
		const worldSpaceBreaks = [];

		for (let i = 0; i < this.breaks.length; i++) {
			worldSpaceBreaks.push(this.breaks[i][0] * (this.far - this.near));
			worldSpaceBreaks.push(this.breaks[i][1] * (this.far - this.near));
			worldSpaceBreaks.push(0, 0);
		}

		return new Float32Array(worldSpaceBreaks);
	}

	public getUniformsBuffers(): Record<string, Float32Array> {
		const arrays: Record<string, number[]> = {
			CSMSplits: [],
			CSMResolution: [],
			CSMSize: [],
			CSMBias: [],
			CSMMatrixWorldInverse: [],
			CSMFadeOffset: []
		};

		for (let i = 0; i < this.cascades; i++) {
			arrays.CSMMatrixWorldInverse.push(...this.cascadeCameras[i].matrixWorldInverse.values);
			arrays.CSMResolution.push(this.resolution, 0, 0, 0);
			arrays.CSMSize.push(this.cascadeCameras[i].top, 0, 0, 0);
			arrays.CSMBias.push(
				this.shadowBias * this.cascadeCameras[i].top * this.biasScale,
				this.shadowNormalBias * this.cascadeCameras[i].top * this.biasScale,
				0,
				0
			);
			arrays.CSMFadeOffset.push(this.fadeOffsets[i], 0, 0, 0);
		}

		arrays.CSMSplits.push(...this.getBreaksForUniform());

		return {
			CSMLightDirectionAndIntensity: new Float32Array([...Vec3.toArray(this.direction), this.intensity]),
			'CSMSplits[0]': new Float32Array(arrays.CSMSplits),
			'CSMResolution[0]': new Float32Array(arrays.CSMResolution),
			'CSMSize[0]': new Float32Array(arrays.CSMSize),
			'CSMBias[0]': new Float32Array(arrays.CSMBias),
			'CSMMatrixWorldInverse[0]': new Float32Array(arrays.CSMMatrixWorldInverse),
			'CSMFadeOffset[0]': new Float32Array(arrays.CSMFadeOffset)
		};
	}

	private static uniformSplit(splits: number, near: number, far: number): number[] {
		const r = [];

		for (let i = 1; i < splits; i++) {
			r.push((near + (far - near) * i / splits) / far);
		}

		r.push(1);

		return r;
	}

	private static logarithmicSplit(splits: number, near: number, far: number): number[] {
		const r = [];

		for (let i = 1; i < splits; i++) {
			r.push((near * (far / near) ** (i / splits)) / far);
		}

		r.push(1);

		return r;
	}

	private static practicalSplit(splits: number, near: number, far: number, lambda: number): number[] {
		const log = CSM.logarithmicSplit(splits, near, far);
		const uni = CSM.uniformSplit(splits, near, far);
		const r = [];

		for (let i = 1; i < splits; i++) {
			r.push(lambda * log[i - 1] + (1 - lambda) * uni[i - 1]);
		}

		r.push(1);

		return r;
	}
}