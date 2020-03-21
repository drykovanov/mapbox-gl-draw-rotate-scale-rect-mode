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

```
    import { TxRectMode, TxCenter } from 'mapbox-gl-draw-rotate-scale-rect-mode';
    ...
    const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
        },

        modes: Object.assign({
            tx_rect: TxRectMode,
        }, MapboxDraw.modes),

        styles: drawStyle,
    });
```


Second, create your rectangle polygon (with [turf](https://turfjs.org/docs/#polygon)) and provide it's _featureId_ to `changeMode()`:
```

    const coordinates = [cUL,cUR,cLR,cLL,cUL];
    const poly = turf.polygon([coordinates]);
    poly.id = <unique id>;
    
    draw.add(poly);

    draw.changeMode('tx_rect', {
        featureId: poly.id, // required
    });
```


`changeMode()` accepts following parameters:
* `rotatePivot` - change rotation pivot to the middle of the opposite polygon side
* `scaleCenter` - change scaling center to the opposite vertex
```
    draw.changeMode('tx_rect', {
        featureId: poly.id, // required

        rotatePivot: TxCenter.Center,   // rotate around center
        scaleCenter: TxCenter.Opposite, // scale around opposite vertex
    });
```
See how it works:
![Demo gif](/docs/tx_center.gif)
