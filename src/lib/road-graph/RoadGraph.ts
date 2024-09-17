import Vec2 from "~/lib/math/Vec2";
import Road from "~/lib/road-graph/Road";
import Intersection from "~/lib/road-graph/Intersection";
import LinkedVertex from "~/lib/road-graph/LinkedVertex";
import SegmentGroup from "~/lib/road-graph/SegmentGroup";
import RBush from 'rbush';

interface Group {
	roads: Road[];
	intersections: Intersection[];
}

export default class RoadGraph {
	private groups: Map<number, Group> = new Map();
	private segmentGroups: Map<number, SegmentGroup> = new Map();

	public addRoad(vertices: Vec2[], width: number, groupId: number): Road {
		const group = this.getGroup(groupId);
		const road = new Road(vertices, width);
		group.roads.push(road);

		const segmentGroup = this.getSegmentGroup(groupId);
		segmentGroup.addSegmentsFromVertices(vertices);

		return road;
	}

	private getGroup(id: number): Group {
		if (!this.groups.has(id)) {
			this.groups.set(id, {
				roads: [],
				intersections: []
			});
		}

		return this.groups.get(id);
	}

	private getSegmentGroup(id: number): SegmentGroup {
		if (!this.segmentGroups.has(id)) {
			this.segmentGroups.set(id, new SegmentGroup());
		}

		return this.segmentGroups.get(id);
	}

	public initIntersections(): void {
		for (const group of this.groups.values()) {
			const tree: RBush<{
				minX: number;
				minY: number;
				maxX: number;
				maxY: number;
				data: [LinkedVertex, Road][];
			}> = new RBush();

			for (const road of group.roads) {
				for (const vertex of road.vertices) {
					const pos = vertex.vector;
					const query = tree.search({
						minX: pos.x - 0.01,
						minY: pos.y - 0.01,
						maxX: pos.x + 0.01,
						maxY: pos.y + 0.01
					});

					if (query.length > 0) {
						const data = query[0].data;
						data.push([vertex, road]);
					} else {
						tree.insert({
							minX: pos.x,
							minY: pos.y,
							maxX: pos.x,
							maxY: pos.y,
							data: [[vertex, road]]
						});
					}
				}
			}

			for (const treeNode of tree.all()) {
				const point = treeNode.data;

				if (point.length < 2) {
					continue;
				}

				const center = point[0][0].vector;
				const intersection = new Intersection(center);

				for (const [vertex, road] of point) {
					const next = vertex.next;
					const prev = vertex.prev;

					if (next) {
						intersection.addDirection(road, next);
					}
					if (prev) {
						intersection.addDirection(road, prev);
					}

					vertex.setIntersection(intersection);
				}

				if (intersection.directions.length > 1) {
					group.intersections.push(intersection);
				}
			}
		}
	}

	public buildIntersectionPolygons(groupId: number): {
		intersection: Intersection;
		polygon: Vec2[];
	}[] {
		const group = this.getGroup(groupId);
		const polygons: {intersection: Intersection; polygon: Vec2[]}[] = [];

		for (const intersection of group.intersections) {
			if (intersection.directions.length > 2) {
				polygons.push({intersection, polygon: intersection.getPolygon()});
			}
		}

		return polygons;
	}

	private getClosestProjectionGlobal(point: Vec2): Vec2 {
		let closest: Vec2 = null;
		let closestDistance = Infinity;

		for (const group of this.segmentGroups.values()) {
			const projection = group.getClosestProjection(point);

			if (!projection) {
				continue;
			}

			const distance = Vec2.distance(point, projection);

			if (distance < closestDistance) {
				closest = projection;
				closestDistance = distance;
			}
		}

		return closest;
	}

	public getClosestProjection(point: Vec2, groupId?: number): Vec2 {
		if (groupId !== undefined) {
			const segmentGroup = this.getSegmentGroup(groupId);

			if (!segmentGroup) {
				return null;
			}

			return segmentGroup.getClosestProjection(point);
		}

		return this.getClosestProjectionGlobal(point);
	}
}