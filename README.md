# TxRectMode mapbox-gl-draw custom mode

This is the custom [mapbox-gl-draw mode](https://github.com/mapbox/mapbox-gl-draw/blob/master/docs/MODES.md) which allows to rotate and scale rectangle polygons.

Live demo is [here](https://drykovanov.github.io/TxRectMode/demo/demo.html)

![Demo gif](/docs/tx_demo1.gif)

## Features:
* rotate/scale polygons
* options to choose rotation pivot and scale center
* discrete rotation whith <kbd>SHIFT</kbd> button pressed 
* demo how to transform image 

## Installation:
```
npm install git+https://github.com/drykovanov/mapbox-gl-draw-rotate-scale-rect-mode#0.1.7
```

## Usage examples:
First, init [MapboxDraw](https://github.com/mapbox/mapbox-gl-draw/blob/master/docs/API.md) with _TxRectMode_ and styling provided.

There is an example of styling in [demo.js](/src/demo.js) and icon set for [scaling](/demo/scale/) and [rotation](/demo/rotate/).

```js
    import { TxRectMode, TxCenter } from 'mapbox-gl-draw-rotate-scale-rect-mode';
    ...
    const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
        },

        modes: Object.assign({
            tx_poly: TxRectMode,
        }, MapboxDraw.modes),

        styles: drawStyle,
    });
```


Second, create your rectangle polygon (with [turf](https://turfjs.org/docs/#polygon)) and provide it's _featureId_ to `changeMode()`:
```js

    const coordinates = [cUL,cUR,cLR,cLL,cUL];
    const poly = turf.polygon([coordinates]);
    poly.id = <unique id>;
    
    draw.add(poly);

    draw.changeMode('tx_poly', {
        featureId: poly.id, // required
    });
```


`changeMode('tx_poly', ...)` accepts the following options:
* `rotatePivot` - change rotation pivot to the middle of the opposite polygon side
* `scaleCenter` - change scaling center to the opposite vertex
* `canScale` - set false to disable scaling
* `canRotate` - set false to disable rotation
* `canSelectFeatures' - set false to forbid exiting the mode
```js
    draw.changeMode('tx_poly', {
        featureId: poly.id, // required
        
        canScale: false,
        canRotate: true,    // only rotation enabled

        rotatePivot: TxCenter.Center,   // rotate around center
        scaleCenter: TxCenter.Opposite, // scale around opposite vertex
        
        canSelectFeatures: true,
    });
```
See how scaling and rotation around opposite side works:

![Demo gif](/docs/tx_center.gif)
