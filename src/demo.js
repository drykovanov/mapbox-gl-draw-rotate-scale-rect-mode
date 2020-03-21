// ----Demo----
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { polygon } from "@turf/helpers";
import {TxRectMode} from "./index";

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
    // var im_w = 421;
    // var im_h = 671;
    var im_w = 751;
    var im_h = 345;


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
    const poly = polygon([coordinates]);
    poly.id = 1;

    map.addSource("test-overlay", {
        "type": "image",
        // "url": 'nyc_1911_crop.jpg',
        "url": '03_image_bin_masked.png',
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
    // draw.update is out of sync with actual drawn polygon
    // map.on('draw.update', drawUpdateOverlay.bind({
    //     map: map
    // }));

    // map.on('draw.render', drawUpdateOverlayByFeature.bind({map: map, feature: polygon, draw: draw}));
    // map.on('data', drawUpdateOverlayByFeature.bind({map: map, feature: polygon, draw: draw}));
    map.on('data', onData.bind({
        draw: draw,
        map: map
    }));

    draw.add(poly);
    // tx_rect, direct_select
    draw.changeMode('tx_rect', {
        featureId: poly.id
    });
}

function onData(e) {
    if (e.sourceId && e.sourceId.startsWith('mapbox-gl-draw-')) {
        // console.log(e.sourceId);
        if (e.type && e.type == 'data'
            && e.source.data
            // && e.sourceDataType && e.sourceDataType == 'content'
            && e.sourceDataType == undefined
            && e.isSourceLoaded
        ) {
            // var source = this.map.getSource(e.sourceId);
            //var geojson = source._data;
            var geojson = e.source.data;
            if (geojson && geojson.features && geojson.features.length > 0) {
                drawUpdateOverlayByFeature(geojson.features[0], this.map);
            }
        }
    }
}

function drawUpdateOverlayByFeature(feature, map) {
    var coordinates = feature.geometry.coordinates[0].slice(0, 4);
    map.getSource("test-overlay").setCoordinates(coordinates);
}

export function tx_rect_mode_demo() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHJ5a292YW5vdiIsImEiOiJjazM0OG9hYW4wenR4M2xtajVseW1qYjY3In0.YnbkeuaBiSaDOn7eYDAXsQ';
    var map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
        // center: [-73.93, 40.73], // starting position [lng, lat]
        center: [30.387850, 59.994247],
        zoom: 19, // starting zoom
        // fadeDuration: 0 //
    });

    map.on('load', tx_rect_mode_demo_map_onload);
}
