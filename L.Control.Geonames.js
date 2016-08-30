//See this url for more info about valid adminCodes: http://www.geonames.org/export/geonames-search.html
var ADMIN_CODES = ['country', 'adminCode1', 'adminCode2', 'adminCode3', 'continentCode'];
var BBOX = ['east', 'west', 'north', 'south'];

L.Control.Geonames = L.Control.extend({
    includes: L.Mixin.Events,

    _active: false,
    _resultsList: null,
    _marker: null,
    _hasResults: false,
    options: {
        username: '', //Geonames account username.  Must be provided
        maxresults: 5, //Maximum number of results to display per search
        zoomLevel: null, //Max zoom level to zoom to for location.  If null, will use the map's max zoom level.
        className: 'leaflet-geonames-icon', //class for icon
        workingClass: 'leaflet-geonames-icon-working', //class for search underway
        featureClasses: ['A', 'H', 'L', 'P', 'R', 'T', 'U', 'V'], //feature classes to search against.  See: http://www.geonames.org/export/codes.html
        baseQuery: 'isNameRequired=true', //The core query sent to GeoNames, later combined with other parameters above
        position: 'topleft',
	    markNames: true, //show a marker at the location of each geoname found, with an associated popup which shows the name
        adminCodes: {},  //Filter results by the specified admin codes mentioned in `ADMIN_CODES`. Each code can be a string or a function returning a string. `country` can be a comma-separated list of countries.
        bbox: {}, //An object in form of {east:..., west:..., north:..., south:...}, specifying the bounding box to limit the results to
        lang: 'en' //Locale of results
    },
    onAdd: function() {
        this._container = L.DomUtil.create('div', 'leaflet-geonames-search leaflet-bar');
        this._container.title = 'Search by location name';
        var link = this._link = L.DomUtil.create('a', this.options.className, this._container);
        link.href = '#';

        var form = L.DomUtil.create('form', '', this._container);
        L.DomEvent.addListener(form, 'submit', this._search, this);

        var input = this._input = L.DomUtil.create('input', '', form);
        input.type = 'text';
        input.placeholder = 'Enter a location name';

        this._resultsList = L.DomUtil.create('ul', '', this._container);

        L.DomEvent
            .on(this._container, 'dblclick', L.DomEvent.stop)
            .on(this._container, 'click', L.DomEvent.stop)
            .on(this._container, 'mousedown', L.DomEvent.stopPropagation)
            .on(link, 'click', function(){
                this._active = !this._active;
                if (this._active){
                    L.DomUtil.addClass(this._container, 'active');
                    input.focus();
                    if (this._hasResults){
                        L.DomUtil.addClass(this._resultsList, 'hasResults');
                    }
                }
                else {
                    this._close();
                }
            }, this);

        return this._container;
    },
    _close: function(){
        L.DomUtil.removeClass(this._container, 'active');
        L.DomUtil.removeClass(this._resultsList, 'hasResults');
        L.DomUtil.removeClass(this._resultsList, 'noResults');
        this._active = false;
        if (this._marker != null){
            this._map.removeLayer(this._marker);
            this._marker = null;
        }
    },
    _search: function(event){
        L.DomEvent.preventDefault(event);

        L.DomUtil.addClass(this._link, this.options.workingClass);
        L.DomUtil.removeClass(this._resultsList, 'noResults');

        //clear results
        this._hasResults = false;
        this._resultsList.innerHTML = '';

        var i, param;

        var bbox = (typeof this.options.bbox == 'function')? this.options.bbox(): this.options.bbox;
        for (i in BBOX) {
            if (!bbox[BBOX[i]]) {
                bbox = null;
                break;
            }
        }

        var searchParams = {
            q: this._input.value,
            lang: this.options.lang
        };
        for (param in this.options.adminCodes) {
            if (ADMIN_CODES.indexOf(param) == -1) continue;

            var paramValue = this.options.adminCodes[param];
            searchParams[param] = (typeof paramValue == 'function') ? paramValue() : paramValue;
        }
        if (bbox) {
            for (i in BBOX) {
                param = BBOX[i];
                searchParams[param] = bbox[param];
            }
        }

        this.fire('search', {params: searchParams});

        // parameters excluded from event above
        var coreParams = {
            username: this.options.username,
            maxRows: this.options.maxresults,
            style: "LONG"
        };


        var url = '//api.geonames.org/searchJSON?' + this._objToQuery(coreParams) + '&' + this._objToQuery(searchParams);
        if (this.options.featureClasses && this.options.featureClasses.length){
            url += '&' + this.options.featureClasses.map(function(fc){return 'featureClass=' + fc}).join('&');
        }
        if (this.options.baseQuery){
            url += '&' + this.options.baseQuery;
        }

        var origScope = this;
        var callbackName = 'geonamesSearchCallback';
        this._jsonp(url,
            function(response){
                document.body.removeChild(document.getElementById('getJsonP'));
                delete window[callbackName];
                origScope._processResponse(response);
            },
            callbackName
        );

    },
    _objToQuery: function(obj) {
        var queryParams = [];
        for(var param in obj)
        if (obj.hasOwnProperty(param)) {
            queryParams.push(encodeURIComponent(param) + "=" + encodeURIComponent(obj[param]));
        }
        return queryParams.join("&");
    },
    _jsonp: function(url, callback, callbackName){
        callbackName = callbackName || 'jsonpCallback';
        window[callbackName] = callback;

        url += '&callback=' + callbackName;
        var script = document.createElement('script');
        script.id = 'getJsonP';
        script.src = url;
        script.async = true;
        document.body.appendChild(script);
    },
    _processResponse: function(response){
        L.DomUtil.removeClass(this._link, this.options.workingClass);

        if (response.geonames.length > 0){
            L.DomUtil.addClass(this._resultsList, 'hasResults');
            this._hasResults = true;
            var li;
	    var zoomLevel = this.options.zoomLevel || this._map.getMaxZoom();
            response.geonames.forEach(function(geoname){
                li = L.DomUtil.create('li', '', this._resultsList);
                li.innerHTML = this._getName(geoname);
                L.DomEvent.addListener(li, 'click', function(){
                    var lat = parseFloat(geoname.lat);
                    var lon = parseFloat(geoname.lng);
                    if (this._marker != null){
                        this._map.removeLayer(this._marker);
                        this._marker = null;
                    }
		    this._map.setView([lat, lon], zoomLevel, false);
		    if (this.options.markNames) {
			this._marker = L.marker([lat, lon]);
			this._marker.addTo(this._map).bindPopup(this._getName(geoname));
			this._marker.openPopup();
		    }
                }, this);
            }, this);
        }
        else {
            L.DomUtil.addClass(this._resultsList, 'noResults');
            li = L.DomUtil.create('li', '', this._resultsList);
            li.innerText = 'No results found';
        }
    },
    _getName: function(geoname){
        var name = geoname.name;
        var extraName;
        ['adminName1', 'countryName'].forEach(function(d){
            extraName = geoname[d];
            if (extraName && extraName != '' && extraName != geoname.name){
                name += ', ' + extraName;
            }
        }, this);
        return name;
    }
});

L.control.geonames = function (options) {
  return new L.Control.Geonames(options);
};