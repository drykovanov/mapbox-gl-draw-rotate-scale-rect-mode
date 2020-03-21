# TxRectMode mapbox-gl-draw custom mode

This is the custom [mapbox-gl-draw mode](https://github.com/mapbox/mapbox-gl-draw/blob/master/docs/MODES.md) which allows to rotate and scale rectangle polygons.

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
First, init _mapbox-gl-draw_ with _TxRectMode_ and styling provided.

There is style example in [demo.js](/src/demo.js) and icon set for [scaling](/demo/scale/) and [rotation](/demo/rotate/).

```
    import { TxRectMode, TxCenter} from 'mapbox-gl-draw-rotate-scale-rect-mode';
    ...
    const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            trash: true
        },

        modes: Object.assign({
            tx_rect: TxRectMode,
        }, MapboxDraw.modes),

        styles: drawStyle,
    });
```


Second: create your rectangle polygon (with [turf](https://turfjs.org/docs/#polygon)) and provide it's id to changeMode():
```

    const coordinates = [cUL,cUR,cLR,cLL,cUL];
    const poly = turf.polygon([coordinates]);
    poly.id = <unique id>;
    
    draw.add(poly);

    draw.changeMode('tx_rect', {
        featureId: poly.id, // required
    });
```


