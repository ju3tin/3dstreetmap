import Object3D from "./Object3D";
import Mat4 from "../math/Mat4";
import Frustum from "./Frustum";
import Plane from "./Plane";
import Vec3 from "~/lib/math/Vec3";
import AABB3D from "~/lib/math/AABB3D";

const jitterOffsets: [number, number][] = [
	[-7 / 8, 1 / 8],
	[-5 / 8, -5 / 8],
	[-1 / 8, -3 / 8],
	[3 / 8, -7 / 8],
	[5 / 8, -1 / 8],
	[7 / 8, 7 / 8],
	[1 / 8, 3 / 8],
	[-3 / 8, 5 / 8]
];

export default abstract class Camera extends Object3D {
	public projectionMatrix: Mat4;
	public projectionMatrixInverse: Mat4;
	public jitteredProjectionMatrix: Mat4;
	public jitteredProjectionMatrixInverse: Mat4;
	public matrixWorldInverse: Mat4;
	public frustumPlanes: Plane[] = null;
	public zoomFactor: number = 1;

	protected constructor() {
		super();

		this.matrixWorldInverse = Mat4.identity();
		this.matrixOverwrite = false;
		this.frustumPlanes = null;
	}

	public updateMatrixWorldInverse(): void {
		this.matrixWorldInverse = Mat4.inverse(this.matrixWorld);
	}

	public updateProjectionMatrixInverse(): void {
		this.projectionMatrixInverse = Mat4.inverse(this.projectionMatrix);
	}

	public abstract updateProjectionMatrix(): void;

	public updateFrustum(): void {
		this.frustumPlanes = Frustum.getPlanes(Mat4.multiply(this.projectionMatrix, this.matrixWorldInverse));
	}

	public frustumContainsPoint(point: Vec3): boolean {
		const planes = this.frustumPlanes;

		for (let i = 0; i < 6; i++) {
			if (planes[i].distanceToPoint(point) < 0) {
				return false;
			}
		}

		return true;
	}

	public zoom(factor: number): void {
		this.zoomFactor = factor;
		this.updateProjectionMatrix();
	}

	public updateJitteredProjectionMatrix(frameIndex: number, width: number, height: number, factor: number = 1): void {
		const offsetX = jitterOffsets[frameIndex % jitterOffsets.length][0];
		const offsetY = jitterOffsets[frameIndex % jitterOffsets.length][1];

		this.jitteredProjectionMatrix = Mat4.copy(this.projectionMatrix);

		this.jitteredProjectionMatrix.values[8] = offsetX / width * factor;
		this.jitteredProjectionMatrix.values[9] = offsetY / height * factor;

		this.jitteredProjectionMatrixInverse = Mat4.inverse(this.jitteredProjectionMatrix);
	}

	public isFrustumIntersectsBoundingBox(boundingBox: AABB3D): boolean {
		const planes = this.frustumPlanes;

		for (let i = 0; i < 6; ++i) {
			const plane = planes[i];
			const point = new Vec3(
				plane.x > 0 ? boundingBox.max.x : boundingBox.min.x,
				plane.y > 0 ? boundingBox.max.y : boundingBox.min.y,
				plane.z > 0 ? boundingBox.max.z : boundingBox.min.z
			);

			if (plane.distanceToPoint(point) < 0) {
				return false;
			}
		}

		return true;
	}
}
