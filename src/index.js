import MapboxDraw from '@mapbox/mapbox-gl-draw';

import Constants from '@mapbox/mapbox-gl-draw/src/constants';
import doubleClickZoom from '@mapbox/mapbox-gl-draw/src/lib/double_click_zoom';
import createSupplementaryPoints from '@mapbox/mapbox-gl-draw/src/lib/create_supplementary_points';
import CommonSelectors from '@mapbox/mapbox-gl-draw/src/lib/common_selectors';
import moveFeatures from '@mapbox/mapbox-gl-draw/src/lib/move_features';

import * as turf from '@turf/turf';

export const TxRectMode = {};

TxRectMode.toDisplayFeatures = function(state, geojson, push) {
    if (state.featureId === geojson.properties.id) {
        geojson.properties.active = Constants.activeStates.ACTIVE;
        push(geojson);
        var suppPoints = createSupplementaryPoints(geojson, {
            map: this.map,
            midpoints: false,
            selectedPaths: state.selectedCoordPaths
        });
        this.computeBisectrix(suppPoints);
        var rotPoints = this.createRotationPoints(geojson, suppPoints);
        suppPoints.forEach(push);
        rotPoints.forEach(push);
    } else {
        geojson.properties.active = Constants.activeStates.INACTIVE;
        push(geojson);
    }

    // this.fireActionable(state);
    this.setActionableState({
        combineFeatures: false,
        uncombineFeatures: false,
        trash: false
    });
};

TxRectMode.onSetup = function(opts) {
    const featureId = opts.featureId;
    const feature = this.getFeature(featureId);

    if (!feature) {
        throw new Error('You must provide a featureId to enter direct_select mode');
    }

    if (feature.type != Constants.geojsonTypes.POLYGON) {
        throw new TypeError('tx_rect mode doesn\'t handle only rectangles');
    }
    if (feature.coordinates === undefined
        || feature.coordinates.length != 1
        || feature.coordinates[0].length != 4) {
        throw new TypeError('tx_rect mode doesn\'t handle only rectangles');
    }

    const state = {
        featureId,
        feature,
        dragMoveLocation: opts.startPos || null,
        dragMoving: false,
        canDragMove: false,
        selectedCoordPaths: opts.coordPath ? [opts.coordPath] : []
    };

    // TODO why I need this?
    this.setSelectedCoordinates(this.pathsToCoordinates(featureId, state.selectedCoordPaths));
    this.setSelected(featureId);
    doubleClickZoom.disable(this);

    this.setActionableState({
        trash: true
    });

    return state;
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
    console.log('computeBisectrix()');


    for (var i1 = 0; i1 < points.length; i1++) {
        var i0 = (i1 - 1 + points.length) % points.length;
        var i2 = (i1 + 1) % points.length;
        // console.log('' + i0 + ' -> ' + i1 + ' -> ' + i2);

        var l1 = turf.lineString([points[i0].geometry.coordinates, points[i1].geometry.coordinates]);
        var l2 = turf.lineString([points[i1].geometry.coordinates, points[i2].geometry.coordinates]);
        var a1 = turf.bearing(points[i0].geometry.coordinates, points[i1].geometry.coordinates);
        var a2 = turf.bearing(points[i2].geometry.coordinates, points[i1].geometry.coordinates);
        // console.log('a1 = '  +a1 + ', a2 = ' + a2);

        var a = (a1 + a2)/2.0;

        if (a < 0.0)
            a += 360;
        if (a > 360)
            a -= 360;

        points[i1].properties.heading = a;
    }

};

TxRectMode.createRotationPoints = function(geojson, suppPoints) {
    const { type, coordinates } = geojson.geometry;
    const featureId = geojson.properties && geojson.properties.id;

    let rotationWidgets = [];
    if (type != Constants.geojsonTypes.POLYGON) {
        return ;
    }

    var corners = suppPoints.slice(0);
    corners[corners.length] = corners[0];

    var v1 = null;
    corners.forEach((v2) => {
        if (v1 != null) {
            var center = turf.centroid(geojson);
            var cR0 = turf.midpoint(v1, v2).geometry.coordinates;

            var heading = turf.bearing(center, cR0);
            var distance0 = turf.distance(center, cR0);
            var distance1 = 1.0 * distance0; // TODO paramter, TODO depends on map scale
            var cR1 = turf.destination(center, distance0, heading, {}).geometry.coordinates;

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

            // rotationWidgets.push({
            //         type: Constants.geojsonTypes.FEATURE,
            //         properties: {
            //             meta: Constants.meta.MIDPOINT,
            //             parent: featureId,
            //             // lng: cR1[0],
            //             // lat: cR1[1],
            //             coord_path: v1.properties.coord_path
            //         },
            //         geometry: {
            //             type: Constants.geojsonTypes.LINE_STRING,
            //             coordinates: [cR0, cR1]
            //         }
            //     }
            // );
        }

        v1 = v2;

    });

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

const isRotatePoint = CommonSelectors.isOfMetaType(Constants.meta.MIDPOINT);
const isVertex = CommonSelectors.isOfMetaType(Constants.meta.VERTEX);

TxRectMode.onTouchStart = TxRectMode.onMouseDown = function(state, e) {
    if (isVertex(e)) return this.onVertex(state, e);
    if (isRotatePoint(e)) return this.onRotatePoint(state, e);
    if (CommonSelectors.isActiveFeature(e)) return this.onFeature(state, e);
    // if (isMidpoint(e)) return this.onMidpoint(state, e);
};


const TX_MODE_SCALE = "tx.scale";
const TX_MODE_ROTATE = "tx.rotate";

TxRectMode.onVertex = function(state, e) {
    // console.log('onVertex()');
    // convert internal MapboxDraw feature to valid GeoJSON:
    this.computeAxes(state.feature.toGeoJSON(), state);

    this.startDragging(state, e);
    const about = e.featureTarget.properties;
    state.selectedCoordPaths = [about.coord_path];
    state.txMode = TX_MODE_SCALE;
};

TxRectMode.onRotatePoint = function(state, e) {
    // console.log('onRotatePoint()');
    // convert internal MapboxDraw feature to valid GeoJSON:
    this.computeAxes(state.feature.toGeoJSON(), state);

    this.startDragging(state, e);
    const about = e.featureTarget.properties;
    state.selectedCoordPaths = [about.coord_path];
    state.txMode = TX_MODE_ROTATE;
};

TxRectMode.onFeature = function(state, e) {
    state.selectedCoordPaths = [];
    this.startDragging(state, e);
};

TxRectMode.computeAxes = function(polygon, state) {
    // TODO check min 3 points
    var center = turf.centroid(polygon);

    var rotPoint = turf.midpoint(
        turf.point(polygon.geometry.coordinates[0][0]),
        turf.point(polygon.geometry.coordinates[0][1]));
    var heading = turf.bearing(center, rotPoint);

    state.rotation = {
        feature0: polygon,  // initial feature state
        center: center.geometry.coordinates,
        heading0: heading // rotation start heading
    };

    // compute current distances from center for scaling
    var distances = polygon.geometry.coordinates[0].map((c) =>
        turf.distance(center, turf.point(c), { units: 'meters'}) );

    state.scaling = {
        feature0: polygon,  // initial feature state
        center: center.geometry.coordinates,
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
            case TX_MODE_ROTATE:
                this.dragRotatePoint(state, e, delta);
                break;
            case TX_MODE_SCALE:
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
    var m1 = turf.point([e.lngLat.lng, e.lngLat.lat]);
    var heading1 = turf.bearing(turf.point(state.rotation.center), m1);

    var rotateAngle = heading1 - state.rotation.heading0; // in degrees
    if (CommonSelectors.isShiftDown(e)) {
        rotateAngle = 5.0 * Math.round(rotateAngle / 5.0);
    }

    var rotatedFeature = turf.transformRotate(state.rotation.feature0,
        rotateAngle,
        {
           pivot: state.rotation.center,
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

    var center = turf.point(state.scaling.center);
    var m1 = turf.point([e.lngLat.lng, e.lngLat.lat]);

    var distance = turf.distance(center, m1, { units: 'meters'});
    var scale = distance / state.scaling.distances[0]; // TODO fix index

    if (CommonSelectors.isShiftDown(e)) {
        // TODO discrete scaling
        scale = 0.05 * Math.round(scale / 0.05);
    }

    var scaledFeature = turf.transformScale(state.scaling.feature0,
        scale,
        {
            origin: state.scaling.center,
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
    if (CommonSelectors.noTarget(e)) return this.clickNoTarget(state, e);
    if (CommonSelectors.isActiveFeature(e)) return this.clickActiveFeature(state, e);
    if (CommonSelectors.isInactiveFeature(e)) return this.clickInactive(state, e);
    this.stopDragging(state);
};

TxRectMode.clickNoTarget = function () {
    // this.changeMode(Constants.modes.SIMPLE_SELECT);
};

TxRectMode.clickInactive = function () {
    // this.changeMode(Constants.modes.SIMPLE_SELECT);
};

// 0. inherit from DirectSelect mode
// 1. forbid adding midpoints: DirectSelect.onMidpoint
// 2. forbid deleting midpoints: DirectSelect.onTrash
// 3. implement rotation
// 4. implement scale on point move


// ----Demo----

var drawStyle = [
    {
        'id': 'gl-draw-polygon-fill-inactive',
        'type': 'fill',
        'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Polygon'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'fill-color': '#3bb2d0',
            'fill-outline-color': '#3bb2d0',
            'fill-opacity': 0.0
        }
    },
    {
        'id': 'gl-draw-polygon-fill-active',
        'type': 'fill',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        'paint': {
            'fill-color': '#fbb03b',
            'fill-outline-color': '#fbb03b',
            'fill-opacity': 0.0
        }
    },

    // {
    //     'id': 'gl-draw-polygon-midpoint',
    //     'type': 'circle',
    //     'filter': ['all',
    //         ['==', '$type', 'Point'],
    //         ['==', 'meta', 'midpoint']],
    //     'paint': {
    //         'circle-radius': 3,
    //         'circle-color': '#fbb03b'
    //     }
    // },



    {
        'id': 'gl-draw-polygon-stroke-inactive',
        'type': 'line',
        'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Polygon'],
            ['!=', 'mode', 'static']
        ],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#3bb2d0',
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-polygon-stroke-active',
        'type': 'line',
        'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#fbb03b',
            'line-dasharray': [0.2, 2],
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-line-inactive',
        'type': 'line',
        'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'LineString'],
            ['!=', 'mode', 'static']
        ],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#3bb2d0',
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-line-active',
        'type': 'line',
        'filter': ['all',
            ['==', '$type', 'LineString'],
            ['==', 'active', 'true']
        ],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#fbb03b',
            'line-dasharray': [0.2, 2],
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
        'type': 'circle',
        'filter': ['all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 4,
            'circle-color': '#fff'
        }
    },
    {
        'id': 'gl-draw-polygon-and-line-vertex-inactive',
        'type': 'circle',
        'filter': ['all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 2,
            'circle-color': '#fbb03b'
        }
    },

    {
        'id': 'gl-draw-polygon-and-line-vertex-scale-icon',
        'type': 'symbol',
        'filter': ['all',
            ['==', 'meta', 'vertex'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'layout': {
            'icon-image': 'scale',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
            'icon-rotate': ['get', 'heading']
        },
        'paint': {
            'icon-opacity': 1.0,
            'icon-opacity-transition': {
                'delay': 0,
                'duration': 0
            }
        }
    },


    {
        'id': 'gl-draw-point-point-stroke-inactive',
        'type': 'circle',
        'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['==', 'meta', 'feature'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 5,
            'circle-opacity': 1,
            'circle-color': '#fff'
        }
    },
    {
        'id': 'gl-draw-point-inactive',
        'type': 'circle',
        'filter': ['all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['==', 'meta', 'feature'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 3,
            'circle-color': '#3bb2d0'
        }
    },
    {
        'id': 'gl-draw-point-stroke-active',
        'type': 'circle',
        'filter': ['all',
            ['==', '$type', 'Point'],
            ['==', 'active', 'true'],
            ['!=', 'meta', 'midpoint']
        ],
        'paint': {
            'circle-radius': 4,
            'circle-color': '#fff'
        }
    },
    {
        'id': 'gl-draw-point-active',
        'type': 'circle',
        'filter': ['all',
            ['==', '$type', 'Point'],
            ['!=', 'meta', 'midpoint'],
            ['==', 'active', 'true']],
        'paint': {
            'circle-radius': 2,
            'circle-color': '#fbb03b'
        }
    },
    {
        'id': 'gl-draw-polygon-fill-static',
        'type': 'fill',
        'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
        'paint': {
            'fill-color': '#404040',
            'fill-outline-color': '#404040',
            'fill-opacity': 0.1
        }
    },
    {
        'id': 'gl-draw-polygon-stroke-static',
        'type': 'line',
        'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#404040',
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-line-static',
        'type': 'line',
        'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'LineString']],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#404040',
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-point-static',
        'type': 'circle',
        'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Point']],
        'paint': {
            'circle-radius': 5,
            'circle-color': '#404040'
        }
    },


    // {
    //     'id': 'gl-draw-polygon-rotate-point',
    //     'type': 'circle',
    //     'filter': ['all',
    //         ['==', '$type', 'Point'],
    //         ['==', 'meta', 'rotate_point']],
    //     'paint': {
    //         'circle-radius': 5,
    //         'circle-color': '#fbb03b'
    //     }
    // },

    {
        'id': 'gl-draw-line-rotate-point',
        'type': 'line',
        'filter': ['all',
            ['==', 'meta', 'midpoint'],
            ['==', '$type', 'LineString'],
            ['!=', 'mode', 'static']
            // ['==', 'active', 'true']
        ],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#fbb03b',
            'line-dasharray': [0.2, 2],
            'line-width': 2
        }
    },
    {
        'id': 'gl-draw-polygon-rotate-point-stroke',
        'type': 'circle',
        'filter': ['all',
            ['==', 'meta', 'midpoint'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 4,
            'circle-color': '#fff'
        }
    },
    {
        'id': 'gl-draw-polygon-rotate-point',
        'type': 'circle',
        'filter': ['all',
            ['==', 'meta', 'midpoint'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 2,
            'circle-color': '#fbb03b'
        }
    },
    {
        'id': 'gl-draw-polygon-rotate-point-icon',
        'type': 'symbol',
        'filter': ['all',
            ['==', 'meta', 'midpoint'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'layout': {
            'icon-image': 'rotate',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
            'icon-rotate': ['get', 'heading']
        },
        'paint': {
            'icon-opacity': 1.0,
            'icon-opacity-transition': {
                'delay': 0,
                'duration': 0
            }
        }
    },
];

function tx_rect_mode_demo_map_onload(event) {

    var map = event.target;

    map.loadImage('rotate/01.png', function(error, image) {
        if (error) throw error;
        map.addImage('rotate', image);
    });

    map.loadImage('scale/01.png', function(error, image) {
        if (error) throw error;
        map.addImage('scale', image);
    });

    var draw = new MapboxDraw({
        displayControlsDefault: true,
        // styles: drawStyles,
        modes: Object.assign({
            tx_rect: TxRectMode,
        }, MapboxDraw.modes),

        styles: drawStyle,
    });

    // nyc_1911.jpg - 468x760

    var im_w = 421;
    var im_h = 671;

    const canvas = map.getCanvas();
    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1;
    // Get the size of the canvas in CSS pixels.
    var rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    // console.log('canvas: ' + w + 'x' + h);

    while (im_w >= (0.8 * w) || im_h >= (0.8 * h)) {
        im_w = Math.round(0.8 * im_w);
        im_h = Math.round(0.8 * im_h);
    }

    const cUL = map.unproject ([w/2 - im_w/2, h/2 - im_h/2]).toArray();
    const cUR = map.unproject ([w/2 + im_w/2, h/2 - im_h/2]).toArray();
    const cLR = map.unproject ([w/2 + im_w/2, h/2 + im_h/2]).toArray();
    const cLL = map.unproject ([w/2 - im_w/2, h/2 + im_h/2]).toArray();
    const coordinates = [cUL,cUR,cLR,cLL,cUL];
    const polygon = turf.polygon([coordinates]);
    polygon.id = 1;

    map.addSource("test-overlay", {
        "type": "image",
        "url": 'nyc_1911_crop.jpg',
        "coordinates": [cUL,cUR,cLR,cLL]
    });

    map.addLayer({
        "id": "test-overlay-layer",
        "type": "raster",
        "source": "test-overlay",
        "paint": {
            "raster-opacity": 0.90,
            "raster-fade-duration": 0
        },
    });

    map.addControl(draw, 'top-right');
    map.on('draw.update', drawUpdateOverlay.bind({
        map: map
    }));


    draw.add(polygon);
    // draw.changeMode('mode', opts);
    // tx_rect, direct_select
    draw.changeMode('tx_rect', {
        featureId: polygon.id
    });



}

function drawUpdateOverlay(e) {
    var feature = e.features[0];
    var coordinates = feature.geometry.coordinates[0].slice(0, 4);

//    console.log(coordinates);

    this.map.getSource("test-overlay").setCoordinates(coordinates);
}

export function tx_rect_mode_demo() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHJ5a292YW5vdiIsImEiOiJjazM0OG9hYW4wenR4M2xtajVseW1qYjY3In0.YnbkeuaBiSaDOn7eYDAXsQ';
    var map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
        center: [-73.93, 40.73], // starting position [lng, lat]
        zoom: 10, // starting zoom
        // fadeDuration: 0 //
    });

    map.on('load', tx_rect_mode_demo_map_onload);
}
