import MapboxDraw from '@mapbox/mapbox-gl-draw';

export const TxRectMode = {};




export function tx_rect_mode_demo() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHJ5a292YW5vdiIsImEiOiJjazM0OG9hYW4wenR4M2xtajVseW1qYjY3In0.YnbkeuaBiSaDOn7eYDAXsQ';
    var map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
        center: [-73.93, 40.73], // starting position [lng, lat]
        zoom: 10 // starting zoom
    });
}
