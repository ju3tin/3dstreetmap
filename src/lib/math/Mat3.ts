export default class Mat3 {
	public values: Float64Array;

	public constructor(values: Float64Array = new Float64Array(9)) {
		this.values = values;
	}
}
