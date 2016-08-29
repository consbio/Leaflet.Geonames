# Leaflet.Geonames

A [GeoNames](http://www.geonames.org/) powered geocoding search control for Leaflet.  

It allows you to enter a placename, display a list of search results using GeoNames, and select a placename to zoom to.
  
Location markers remain on the map until the control is closed (click on icon to open / close). 

*Tested with Leaflet 1.0.0-rc3*


## Install

From Bower:

```
bower install Leaflet.Geonames
```


From NPM:

```
npm install leaflet-geonames
```


## Usage

Include the CSS: 

```
<link rel="stylesheet" href="L.Control.Geonames.css" />
```

This control uses [Google Material Icons](https://design.google.com/icons) by default.


Include the JavaScript:

```
<script src="L.Control.Geonames.min.js"></script>
```


Example usage:

```
var control = L.control.geonames({
    username: '',  // Geonames account username.  Must be provided
    zoomLevel: null,  // Max zoom level to zoom to for location.  If null, will use the map's max zoom level.
    maxresults: 5,  // Maximum number of results to display per search
    className: 'leaflet-geonames-icon', //class for icon
    workingClass: 'leaflet-geonames-icon-working', //class for search underway
    featureClasses: ['A', 'H', 'L', 'P', 'R', 'T', 'U', 'V'],  // feature classes to search against.  See: http://www.geonames.org/export/codes.html
    baseQuery: 'isNameRequired=true',  // The core query sent to GeoNames, later combined with other parameters above
    position: 'topleft',
    markNames: true // show a marker at the location of each geoname found, with an associated popup which shows the name,
    adminCodes: { // filter results by a country and state.  Values can be strings or return by a function.
        country: 'us',
        adminCode1: function() {return 'wa'}
    },
    lang: 'en', // language for results
    bbox: {east:-121, west: -123, north: 46, south: 45} // bounding box filter for results (e.g., map extent).  Values can be an object with east, west, north, south, or a function that returns that object.
});
map.addControl(control);
```

## Demos:
- [Basic](http://consbio.github.io/Leaflet.Geonames/examples/basic.html)
- [Admin Codes](http://consbio.github.io/Leaflet.Geonames/examples/adminCodes.html)
- [Bounding Box](http://consbio.github.io/Leaflet.Geonames/examples/bbox.html)
- [Locale](http://consbio.github.io/Leaflet.Geonames/examples/locale.html)


## Credits:
Developed with support from the [South Atlantic Landscape Conservation Cooperative](http://www.southatlanticlcc.org/), and maintained with support from [Peninsular Florida LCC](http://peninsularfloridalcc.org/).

Some ideas derived from [L.GeoSearch](https://github.com/smeijer/L.GeoSearch).

## Contributors: 
* [Brendan Ward](https://github.com/brendan-ward) 
* [Kaveh Karimi-Asli](https://github.com/ka7eh) 
* [Mike Moran](https://github.com/mikemoraned)