import { Injectable } from '@nestjs/common';
import pointInPolygon from '@turf/boolean-point-in-polygon';
import overlaps from '@turf/boolean-overlap';
import within from '@turf/boolean-within';
import lineToPolygon from '@turf/line-to-polygon';
import * as geojsonExtent from '@mapbox/geojson-extent';
import getDistance from '@turf/distance';
import { lengthToDegrees, convertLength } from '@turf/helpers';
import { kdTree } from '../libraries/kd-tree';
import flatten from '@turf/flatten';
import simplify from '@turf/simplify';
import squareGrid from '@turf/square-grid';
import explode from '@turf/explode';
import bearing from '@turf/bearing';
import bboxPolygon from '@turf/bbox-polygon';

/**
 * Provides helped functions for geometry calculation
 */
@Injectable()
export class GeoService {
  /**
   * Returns all GeoJSON features within a given
   * @param features GeoJSON
   * @param area GeoJSON
   */

  /**
   * Returns the bounding box of a GeoJSON object.
   * @param geoJSON GeoJSON object
   * @returns [West, South, East, North] or [left, bottom, right, top]
   */
  public getBoundingBox(geoJSON) {
    return geojsonExtent(geoJSON);
  }

  /**
   * Get the distance between two points
   * @param a source point
   * @param b destination point
   */
  public getDistance(a, b) {
    return getDistance(a, b);
  }

  /**
   * Convert a number in km to degrees
   * @param distanceInKm
   */
  public distanceToDegrees(distanceInKm) {
    return lengthToDegrees(distanceInKm, 'kilometers');
  }

  /**
   * Determine whether a GeoJSON feature a falls within GeoJSON polygon b.
   * The requirements for being within a polygon is that any of the points
   * of a must be within b.
   *
   * @param {*} a A GeoJSON feature (may be a point, line, multiline, polygon, multipolygon)
   * @param {*} b A GeoJSON polygon or multipolygon
   */
  public isInPolygon(a, b) {
    if (a.geometry.type === 'Point') {
      return pointInPolygon(a, b);
    }

    if (
      a.geometry.type === 'LineString' ||
      a.geometry.type === 'MultiLineString'
    ) {
      a = lineToPolygon(a);
    }

    let bGeom = [b];

    if (b.geometry.type === 'MultiPolygon') {
      bGeom = flatten(b).features;
    }

    return bGeom.some(bg => overlaps(a, bg) || within(a, bg) || within(bg, a));
  }

  /**
   * Returns whether two bounding boxes overlap
   * @param a [left, bottom, right, top]
   * @param b [left, bottom, right, top]
   */
  public bboxesOverlap(a, b) {
    return !(b[0] > a[2] || b[2] < a[0] || b[3] < a[1] || b[1] > a[3]);
  }

  public createFastSearchDataset(features) {
    return new GeoSearchSet(features);
  }

  /**
   * Simplifies a GeoJSON geometry by removing points to a given tolerance.
   * Returns a new GeoJSON object - does not modify input object.
   * @param polygon The polygon to simplify
   * @param tolerance Lower = more detail
   */
  public simplifyGeometry(polygon, tolerance = 0.01) {
    return simplify(JSON.parse(JSON.stringify(polygon)), {
      mutate: true,
      tolerance,
      highQuality: false,
    });
  }

  /**
   * Partitions a polygon into square cells of given size. The cells
   * can overlap the boundary of the polygon.
   * @param polygon The polygon to partition
   * @param cellSizeKm The length of a cell's edge in kilometres
   */
  public partitionIntoGrid(polygon, cellSizeKm) {
    const cellSizeDeg = convertLength(cellSizeKm, 'kilometers', 'degrees');
    polygon = this.simplifyGeometry(polygon, cellSizeDeg);

    const bounds = this.getBoundingBox(polygon);
    let cellsFound = 0;
    const cells = squareGrid(bounds, cellSizeKm, {
      units: 'kilometers',
    }).features.filter(feature => {
      const isInPolygon = this.isInPolygon(feature, polygon);
      if (isInPolygon) {
        console.log('found', ++cellsFound);
      }
      return isInPolygon;
    });

    console.log('num cells: ', cells.length);
    return cells;
  }

  public flattenGeo(geoJSON) {
    return flatten(geoJSON);
  }
}

export class GeoSearchSet {
  private kd;
  constructor(features) {
    this.kd = new kdTree(
      features.reduce((points, feature) => {
        const featurePoints = explode(feature).features.map(point => {
          return {
            x: point.geometry.coordinates[0],
            y: point.geometry.coordinates[1],
          };
        });

        points.push(...featurePoints);
        return points;
      }, []),
      (a, b) =>
        Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)),
      ['x', 'y'],
    );
  }

  public getNearest(xLng: number, yLat: number) {
    const nearest = this.kd.nearest(
      {
        x: xLng,
        y: yLat,
      },
      1,
    );

    if (!nearest.length) {
      return {
        point: null,
        distance: null,
      };
    }

    const nearestPoint = nearest[0];

    return {
      point: nearestPoint[0],
      distance: convertLength(nearestPoint[1], 'degrees', 'kilometers'),
      getBearing: () => bearing([xLng, yLat], [nearestPoint[0].x, nearestPoint[0].y]),
    };
  }
}
