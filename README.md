# Leaflet.Geonames

A [GeoNames](http://www.geonames.org/) powered geocoding search control for Leaflet.  

It allows you to enter a placename, display a list of search results using GeoNames, and select a placename to zoom to.
  
Location markers remain on the map until the control is closed (click on icon to open / close).  

See the [example](//consbio.github.io/Leaflet.Geonames).

*Tested with Leaflet 0.7.x*


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

This control uses [Font Awesome](http://fortawesome.github.io/Font-Awesome/) for the icon by default.  To use, include:

```
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css" />
```


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
    className: 'fa fa-crosshairs',  // class for icon
    workingClass: 'fa-spin',  // class for search underway
    featureClasses: ['A', 'H', 'L', 'P', 'R', 'T', 'U', 'V'],  // feature classes to search against.  See: http://www.geonames.org/export/codes.html
    baseQuery: 'isNameRequired=true',  // The core query sent to GeoNames, later combined with other parameters above
    position: 'topleft',
    markNames: true // show a marker at the location of each geoname found, with an associated popup which shows the name
});
map.addControl(control);
```




## Credits:
Developed with support from the [South Atlantic Landscape Conservation Cooperative](http://www.southatlanticlcc.org/)

Some ideas derived from [L.GeoSearch](https://github.com/smeijer/L.GeoSearch).

