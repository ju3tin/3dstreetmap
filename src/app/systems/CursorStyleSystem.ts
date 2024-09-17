import System from "../System";

enum CursorStyle {
	Default = 'default',
	Grab = 'grab',
	Grabbing = 'grabbing',
	Pointer = 'pointer'
}

export default class CursorStyleSystem extends System {
	private element: HTMLElement;
	private grabbingEnabled = false;
	private pointerEnabled = false;

	public postInit(): void {
		this.element = <HTMLCanvasElement>document.getElementById('canvas');
	}

	public enableGrabbing(): void {
		this.grabbingEnabled = true;
		this.updateStyle();
	}

	public disableGrabbing(): void {
		this.grabbingEnabled = false;
		this.updateStyle();
	}

	public enablePointer(): void {
		this.pointerEnabled = true;
		this.updateStyle();
	}

	public disablePointer(): void {
		this.pointerEnabled = false;
		this.updateStyle();
	}

	private updateStyle(): void {
		if (this.grabbingEnabled) {
			this.element.style.cursor = CursorStyle.Grabbing;
			return;
		}

		if (this.pointerEnabled) {
			this.element.style.cursor = CursorStyle.Pointer;
			return;
		}

		this.element.style.cursor = CursorStyle.Grab;
	}

	public update(deltaTime: number): void {

	}
}