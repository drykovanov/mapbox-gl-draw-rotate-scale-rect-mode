import MapboxDraw from '@mapbox/mapbox-gl-draw';

import * as Constants from '@mapbox/mapbox-gl-draw/src/constants';
import doubleClickZoom from '@mapbox/mapbox-gl-draw/src/lib/double_click_zoom';
import createSupplementaryPoints from '@mapbox/mapbox-gl-draw/src/lib/create_supplementary_points';
import {
    isOfMetaType,
    isActiveFeature,
    isShiftDown,
    noTarget,
    isInactiveFeature
} from '@mapbox/mapbox-gl-draw/src/lib/common_selectors';
import moveFeatures from '@mapbox/mapbox-gl-draw/src/lib/move_features';

import {lineString, point} from '@turf/helpers';
import bearing from '@turf/bearing';
// import centroid from '@turf/centroid';
import center from '@turf/center';
import midpoint from '@turf/midpoint';
import distance from '@turf/distance';
import destination from '@turf/destination';
import transformRotate from '@turf/transform-rotate';
import transformScale from '@turf/transform-scale';

export const TxRectMode = {};

export const TxCenter = {
    Center: 0,  // rotate or scale around center of polygon
    Opposite: 1,  // rotate or scale around opposite side of polygon
};

function parseTxCenter(value, defaultTxCenter = TxCenter.Center) {
    if (value == undefined || value == null)
        return defaultTxCenter;

    if (value === TxCenter.Center || value === TxCenter.Opposite)
        return value;

    if (value == 'center')
        return TxCenter.Center;

    if (value == 'opposite')
        return TxCenter.Opposite;

    throw Error('Invalid TxCenter: ' + value);
}

/*
    opts = {
        featureId: ...,

        canScale: default true,
        canRotate: default true,

        rotatePivot: default 'center' or 'opposite',
        scaleCenter: default 'center' or 'opposite',

        canSelectFeatures: default true,    // can exit to simple_select mode
    }
 */
TxRectMode.onSetup = function(opts) {
    const featureId =
        (opts.featureIds && Array.isArray(opts.featureIds) && opts.featureIds.length > 0) ?
            opts.featureIds[0] : opts.featureId;

    const feature = this.getFeature(featureId);

    if (!feature) {
        throw new Error('You must provide a valid featureId to enter tx_poly mode');
    }

    if (feature.type != Constants.geojsonTypes.POLYGON) {
        throw new TypeError('tx_poly mode can only handle polygons');
    }
    if (feature.coordinates === undefined
        || feature.coordinates.length != 1
        || feature.coordinates[0].length <= 2) {
        throw new TypeError('tx_poly mode can only handle polygons');
    }

    const state = {
        featureId,
        feature,

        canTrash: opts.canTrash != undefined ? opts.canTrash : true,

        canScale: opts.canScale != undefined ? opts.canScale : true,
        canRotate: opts.canRotate != undefined ? opts.canRotate : true,

        singleRotationPoint: opts.singleRotationPoint != undefined ? opts.singleRotationPoint : false,
        rotationPointRadius: opts.rotationPointRadius != undefined ? opts.rotationPointRadius : 1.0,

        rotatePivot: parseTxCenter(opts.rotatePivot, TxCenter.Center),
        scaleCenter: parseTxCenter(opts.scaleCenter, TxCenter.Center),

        canSelectFeatures: opts.canSelectFeatures != undefined ? opts.canSelectFeatures : true,
        // selectedFeatureMode: opts.selectedFeatureMode != undefined ? opts.selectedFeatureMode : 'simple_select',

        dragMoveLocation: opts.startPos || null,
        dragMoving: false,
        canDragMove: false,
        selectedCoordPaths: opts.coordPath ? [opts.coordPath] : []
    };

    if (!(state.canRotate || state.canScale)) {
        console.warn('Non of canScale or canRotate is true');
    }

    this.setSelectedCoordinates(this.pathsToCoordinates(featureId, state.selectedCoordPaths));
    this.setSelected(featureId);
    doubleClickZoom.disable(this);

    this.setActionableState({
        combineFeatures: false,
        uncombineFeatures: false,
        trash: state.canTrash
    });

    return state;
};

TxRectMode.toDisplayFeatures = function(state, geojson, push) {
    if (state.featureId === geojson.properties.id) {
        geojson.properties.active = Constants.activeStates.ACTIVE;
        push(geojson);


        var suppPoints = createSupplementaryPoints(geojson, {
            map: this.map,
            midpoints: false,
            selectedPaths: state.selectedCoordPaths
        });

        if (state.canScale) {
            this.computeBisectrix(suppPoints);
            suppPoints.forEach(push);
        }

        if (state.canRotate) {
            var rotPoints = this.createRotationPoints(state, geojson, suppPoints);
            rotPoints.forEach(push);
        }
    } else {
        geojson.properties.active = Constants.activeStates.INACTIVE;
        push(geojson);
    }

    // this.fireActionable(state);
    this.setActionableState({
        combineFeatures: false,
        uncombineFeatures: false,
        trash: state.canTrash
    });

    // this.fireUpdate();
};

TxRectMode.onStop = function() {
    doubleClickZoom.enable(this);
    this.clearSelectedCoordinates();
};

// TODO why I need this?
TxRectMode.pathsToCoordinates = function(featureId, paths) {
    return paths.map(coord_path => { return { feature_id: featureId, coord_path }; });
};

TxRectMode.computeBisectrix = function(points) {
    for (var i1 = 0; i1 < points.length; i1++) {
        var i0 = (i1 - 1 + points.length) % points.length;
        var i2 = (i1 + 1) % points.length;
        // console.log('' + i0 + ' -> ' + i1 + ' -> ' + i2);

        var l1 = lineString([points[i0].geometry.coordinates, points[i1].geometry.coordinates]);
        var l2 = lineString([points[i1].geometry.coordinates, points[i2].geometry.coordinates]);
        var a1 = bearing(points[i0].geometry.coordinates, points[i1].geometry.coordinates);
        var a2 = bearing(points[i2].geometry.coordinates, points[i1].geometry.coordinates);
        // console.log('a1 = '  +a1 + ', a2 = ' + a2);

        var a = (a1 + a2)/2.0;

        if (a < 0.0)
            a += 360;
        if (a > 360)
            a -= 360;

        points[i1].properties.heading = a;
    }

};

TxRectMode._createRotationPoint = function(rotationWidgets, featureId, v1, v2, rotCenter, radiusScale) {
    var cR0 = midpoint(v1, v2).geometry.coordinates;
    var heading = bearing(rotCenter, cR0);
    var distance0 = distance(rotCenter, cR0);
    var distance1 = radiusScale * distance0; // TODO depends on map scale
    var cR1 = destination(rotCenter, distance1, heading, {}).geometry.coordinates;

    rotationWidgets.push({
            type: Constants.geojsonTypes.FEATURE,
            properties: {
                meta: Constants.meta.MIDPOINT,
                parent: featureId,
                lng: cR1[0],
                lat: cR1[1],
                coord_path: v1.properties.coord_path,
                heading: heading,
            },
            geometry: {
                type: Constants.geojsonTypes.POINT,
                coordinates: cR1
            }
        }
    );
};

TxRectMode.createRotationPoints = function(state, geojson, suppPoints) {
    const { type, coordinates } = geojson.geometry;
    const featureId = geojson.properties && geojson.properties.id;

    let rotationWidgets = [];
    if (type != Constants.geojsonTypes.POLYGON) {
        return ;
    }

    var corners = suppPoints.slice(0);
    corners[corners.length] = corners[0];

    var v1 = null;

    var rotCenter = this.computeRotationCenter(state, geojson);

    if (state.singleRotationPoint) {
        this._createRotationPoint(rotationWidgets, featureId, corners[0], corners[1], rotCenter, state.rotationPointRadius);
    } else {
        corners.forEach((v2) => {
            if (v1 != null) {
                this._createRotationPoint(rotationWidgets, featureId, v1, v2, rotCenter, state.rotationPointRadius);
            }

            v1 = v2;
        });
    }

    return rotationWidgets;
};

TxRectMode.startDragging = function(state, e) {
    this.map.dragPan.disable();
    state.canDragMove = true;
    state.dragMoveLocation = e.lngLat;
};

TxRectMode.stopDragging = function(state) {
    this.map.dragPan.enable();
    state.dragMoving = false;
    state.canDragMove = false;
    state.dragMoveLocation = null;
};

const isRotatePoint = isOfMetaType(Constants.meta.MIDPOINT);
const isVertex = isOfMetaType(Constants.meta.VERTEX);

TxRectMode.onTouchStart = TxRectMode.onMouseDown = function(state, e) {
    if (isVertex(e)) return this.onVertex(state, e);
    if (isRotatePoint(e)) return this.onRotatePoint(state, e);
    if (isActiveFeature(e)) return this.onFeature(state, e);
    // if (isMidpoint(e)) return this.onMidpoint(state, e);
};

const TxMode = {
    Scale: 1,
    Rotate: 2,
};

TxRectMode.onVertex = function(state, e) {
    // console.log('onVertex()');
    // convert internal MapboxDraw feature to valid GeoJSON:
    this.computeAxes(state, state.feature.toGeoJSON());

    this.startDragging(state, e);
    const about = e.featureTarget.properties;
    state.selectedCoordPaths = [about.coord_path];
    state.txMode = TxMode.Scale;
};

TxRectMode.onRotatePoint = function(state, e) {
    // console.log('onRotatePoint()');
    // convert internal MapboxDraw feature to valid GeoJSON:
    this.computeAxes(state, state.feature.toGeoJSON());

    this.startDragging(state, e);
    const about = e.featureTarget.properties;
    state.selectedCoordPaths = [about.coord_path];
    state.txMode = TxMode.Rotate;
};

TxRectMode.onFeature = function(state, e) {
    state.selectedCoordPaths = [];
    this.startDragging(state, e);
};

TxRectMode.coordinateIndex = function(coordPaths) {
    if (coordPaths.length >= 1) {
        var parts = coordPaths[0].split('.');
        return parseInt(parts[parts.length - 1]);
    } else {
        return 0;
    }
};

TxRectMode.computeRotationCenter = function(state, polygon) {
    var center0 = center(polygon);
    return center0;
};

TxRectMode.computeAxes = function(state, polygon) {
    // TODO check min 3 points
    const center0 = this.computeRotationCenter(state, polygon);
    const corners = polygon.geometry.coordinates[0].slice(0);

    const n = corners.length-1;
    const iHalf = Math.floor(n/2);

    // var c0 = corners[corners.length - 1];
    // var headings = corners.map((c1) => {
    //     var rotPoint = midpoint(point(c0),point(c1));
    //     var heading = bearing(center0, rotPoint);
    //     c0 = c1;
    //     return heading;
    // });
    // headings = headings.slice(1);

    var rotateCenters = [];
    var headings = [];

    for (var i1 = 0; i1 < n; i1++) {
        var i0 = i1 - 1;
        if (i0 < 0)
            i0 += n;

        const c0 = corners[i0];
        const c1 = corners[i1];
        const rotPoint = midpoint(point(c0),point(c1));

        var rotCenter = center0;
        if (TxCenter.Opposite === state.rotatePivot) {
            var i3 = (i1 + iHalf) % n; // opposite corner
            var i2 = i3 - 1;
            if (i2 < 0)
                i2 += n;

            const c2 = corners[i2];
            const c3 = corners[i3];
            rotCenter = midpoint(point(c2),point(c3));
        }

        rotateCenters[i1] = rotCenter.geometry.coordinates;
        headings[i1] = bearing(rotCenter, rotPoint);
    }

    state.rotation = {
        feature0: polygon,  // initial feature state
        centers: rotateCenters,
        headings: headings, // rotation start heading for each point
    };

    // compute current distances from centers for scaling



    var scaleCenters = [];
    var distances = [];
    for (var i = 0; i < n; i++) {
        var c1 = corners[i];
        var c0 = center0.geometry.coordinates;
        if (TxCenter.Opposite === state.scaleCenter) {
            var i2 = (i + iHalf) % n; // opposite corner
            c0 = corners[i2];
        }
        scaleCenters[i] = c0;
        distances[i] = distance( point(c0), point(c1), { units: 'meters'});
    }

    // var distances = polygon.geometry.coordinates[0].map((c) =>
    //     turf.distance(center, turf.point(c), { units: 'meters'}) );

    state.scaling = {
        feature0: polygon,  // initial feature state
        centers: scaleCenters,
        distances: distances
    };
};

TxRectMode.onDrag = function(state, e) {
    if (state.canDragMove !== true) return;
    state.dragMoving = true;
    e.originalEvent.stopPropagation();

    const delta = {
        lng: e.lngLat.lng - state.dragMoveLocation.lng,
        lat: e.lngLat.lat - state.dragMoveLocation.lat
    };
    if (state.selectedCoordPaths.length > 0 && state.txMode) {
        switch (state.txMode) {
            case TxMode.Rotate:
                this.dragRotatePoint(state, e, delta);
                break;
            case TxMode.Scale:
                this.dragScalePoint(state, e, delta);
                break;
        }
    } else {
        this.dragFeature(state, e, delta);
    }


    state.dragMoveLocation = e.lngLat;
};

TxRectMode.dragRotatePoint = function(state, e, delta) {
    // console.log('dragRotateVertex: ' + e.lngLat + ' -> ' + state.dragMoveLocation);

    if (state.rotation === undefined || state.rotation == null) {
        console.error('state.rotation required');
        return ;
    }

    var polygon = state.feature.toGeoJSON();
    var m1 = point([e.lngLat.lng, e.lngLat.lat]);


    const n = state.rotation.centers.length;
    var cIdx = (this.coordinateIndex(state.selectedCoordPaths) + 1) % n;
    // TODO validate cIdx
    var cCenter = state.rotation.centers[cIdx];
    var center = point(cCenter);

    var heading1 = bearing(center, m1);

    var heading0 = state.rotation.headings[cIdx];
    var rotateAngle = heading1 - heading0; // in degrees
    if (isShiftDown(e)) {
        rotateAngle = 5.0 * Math.round(rotateAngle / 5.0);
    }

    var rotatedFeature = transformRotate(state.rotation.feature0,
        rotateAngle,
        {
           pivot: center,
            mutate: false,
        });

    state.feature.incomingCoords(rotatedFeature.geometry.coordinates);
    // TODO add option for this:
    this.fireUpdate();
};

TxRectMode.dragScalePoint = function(state, e, delta) {
    if (state.scaling === undefined || state.scaling == null) {
        console.error('state.scaling required');
        return ;
    }

    var polygon = state.feature.toGeoJSON();

    var cIdx = this.coordinateIndex(state.selectedCoordPaths);
    // TODO validate cIdx

    var cCenter = state.scaling.centers[cIdx];
    var center = point(cCenter);
    var m1 = point([e.lngLat.lng, e.lngLat.lat]);

    var dist = distance(center, m1, { units: 'meters'});
    var scale = dist / state.scaling.distances[cIdx];

    if (isShiftDown(e)) {
        // TODO discrete scaling
        scale = 0.05 * Math.round(scale / 0.05);
    }

    var scaledFeature = transformScale(state.scaling.feature0,
        scale,
        {
            origin: cCenter,
            mutate: false,
        });

    state.feature.incomingCoords(scaledFeature.geometry.coordinates);
    // TODO add option for this:
    this.fireUpdate();
};

TxRectMode.dragFeature = function(state, e, delta) {
    moveFeatures(this.getSelected(), delta);
    state.dragMoveLocation = e.lngLat;
    // TODO add option for this:
    this.fireUpdate();
};

TxRectMode.fireUpdate = function() {
    this.map.fire(Constants.events.UPDATE, {
        action: Constants.updateActions.CHANGE_COORDINATES,
        features: this.getSelected().map(f => f.toGeoJSON())
    });
};

TxRectMode.onMouseOut = function(state) {
    // As soon as you mouse leaves the canvas, update the feature
    if (state.dragMoving) {
        this.fireUpdate();
    }
};

TxRectMode.onTouchEnd = TxRectMode.onMouseUp = function(state) {
    if (state.dragMoving) {
        this.fireUpdate();
    }
    this.stopDragging(state);
};

TxRectMode.clickActiveFeature = function (state) {
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
    state.feature.changed();
};

TxRectMode.onClick = function(state, e) {
    if (noTarget(e)) return this.clickNoTarget(state, e);
    if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
    if (isInactiveFeature(e)) return this.clickInactive(state, e);
    this.stopDragging(state);
};

TxRectMode.clickNoTarget = function (state, e) {
    if (state.canSelectFeatures)
        this.changeMode(Constants.modes.SIMPLE_SELECT);
};

TxRectMode.clickInactive = function (state, e) {
    if (state.canSelectFeatures)
        this.changeMode(Constants.modes.SIMPLE_SELECT, {
            featureIds: [e.featureTarget.properties.id]
        });
};

TxRectMode.onTrash = function() {
    // TODO check state.canTrash
    this.deleteFeature(this.getSelectedIds());
    // this.fireActionable();
};
