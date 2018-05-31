//See this url for more info about valid adminCodes: http://www.geonames.org/export/geonames-search.html
var ADMIN_CODES = ['country', 'adminCode1', 'adminCode2', 'adminCode3', 'continentCode'];
var BBOX = ['east', 'west', 'north', 'south'];

L.Control.Geonames = L.Control.extend({
    includes: L.Evented ? L.Evented.prototype : L.Mixin.Events,

    _active: false,
    _resultsList: null,
    _marker: null,
    _popup: null,
    _hasResults: false,
    options: {
        //position: 'topcenter',  // in addition to standard 4 corner Leaflet control layout, this will position and size from top center
        geonamesSearch: 'https://secure.geonames.org/searchJSON',  // override this if using a proxy to get connection to geonames
		geonamesPostalCodes: 'https://secure.geonames.org/postalCodeSearchJSON',  // override this if using a proxy to get connection to geonames
        username: '', //Geonames account username.  Must be provided
        maxresults: 10, //Maximum number of results to display per search
        zoomLevel: 15, //Max zoom level to zoom to for location.  If null, will use the map's max zoom level.
        className: 'leaflet-geonames-icon', //class for icon
        workingClass: 'leaflet-geonames-icon-working', //class for search underway
        featureClasses: ['A', 'H', 'L', 'P', 'R', 'T', 'U', 'V'], //feature classes to search against.  See: http://www.geonames.org/export/codes.html
        baseQuery: 'isNameRequired=true', //The core query sent to GeoNames, later combined with other parameters above
        position: 'topleft',
        showMarker: true, //Show a marker at the location the selected location
        showPopup: true, //Show a tooltip at the selected location
        adminCodes: {},  //Filter results by the specified admin codes mentioned in `ADMIN_CODES`. Each code can be a string or a function returning a string. `country` can be a comma-separated list of countries.
        bbox: {}, //An object in form of {east:..., west:..., north:..., south:...}, specifying the bounding box to limit the results to
        lang: 'en', //Locale of results
        alwaysOpen: false  //if true, search field is always visible
    },
    onAdd: function(map) {
        if (this.options.position == 'topcenter') {
            // construct a top-center location for this widget
            // trick from: https://stackoverflow.com/questions/33614912/how-to-locate-leaflet-zoom-control-in-a-desired-position
            map._controlCorners.topcenter = L.DomUtil.create('div', 'leaflet-top leaflet-center', map._controlContainer);
        }

        this._container = L.DomUtil.create('div', 'leaflet-geonames-search leaflet-bar');

        // keep mouse events from causing map to drag or zoom map
        L.DomEvent.disableClickPropagation(this._container);

        var link = this._link = L.DomUtil.create('a', this.options.className, this._container);
        link.href = '#';
        link.title = 'Search by location name or postcode';

        var form = L.DomUtil.create('form', '', this._container);
        L.DomEvent.addListener(form, 'submit', this._search, this);

        var lnRadioBtn = this._input = L.DomUtil.create('input', '', form);
        lnRadioBtn.type = 'radio';
        lnRadioBtn.title = 'Location name';
		lnRadioBtn.name = 'locationType';
		lnRadioBtn.id = 'placename';
		lnRadioBtn.value = 'geonamesSearch';
		lnRadioBtn.checked = 'checked';
		
		var lnRadioLabel = this._input = L.DomUtil.create('label', '', form);
		lnRadioLabel.title = 'Place name';
		lnRadioLabel.innerText = 'Place name';
		lnRadioLabel.htmlFor  = 'placename';
				
		var pcRadioBtn = this._input = L.DomUtil.create('input', '', form);
        pcRadioBtn.type = 'radio';
        pcRadioBtn.title = 'Postcode';
		pcRadioBtn.name = 'locationType';
		pcRadioBtn.id = 'postcode';
		pcRadioBtn.value = 'geonamesPostalCodes';
		
		var pcRadioLabel = this._input = L.DomUtil.create('label', '', form);
		pcRadioLabel.title = 'Postcode';
		pcRadioLabel.innerText = 'Postcode';
		pcRadioLabel.htmlFor  = 'postcode';
		
		var searchInput = this._input = L.DomUtil.create('input', '', form);
        searchInput.type = 'search';
        searchInput.placeholder = 'Enter a location name or postcode';

		this._url = this.options.geonamesSearch;
        this._resultsList = L.DomUtil.create('ul', '', this._container);

        L.DomEvent.on(searchInput, 'keyup change search', function() {
            // When input changes, clear out the results
            L.DomUtil.removeClass(this._resultsList, 'hasResults');
            L.DomUtil.removeClass(this._resultsList, 'noResults');
            this._hasResults = false;
            this._resultsList.innerHTML = '';
            this.removeMarker();
            this.removePopup();
        }, this);

        L.DomEvent.on(searchInput, 'focus', function() {
            if (!this.active) {
                this.show();
            }
        }, this);
		
		L.DomEvent.on(lnRadioBtn, 'click', function(e){
			searchInput.value = "";
			this._resultsList.innerHTML = '';
			this._url = this.options[e.target.value];
		}, this);
		
		L.DomEvent.on(pcRadioBtn, 'click', function(e){
			searchInput.value = "";
			this._resultsList.innerHTML = '';
			this._url = this.options[e.target.value];
		}, this);

        if (this.options.alwaysOpen) {
            this._active = true;
            L.DomUtil.addClass(this._container, 'active');
            L.DomEvent.on(link, 'click', this.show, this);
        }
        else {
            // Control button toggles visibility of the search field
            L.DomEvent.on(link, 'click', function(){
                if (this._active) {
                    this.hide();
                }
                else {
                    this.focus();
                }
            }, this);
        }

         map.on('click', function(event) {
            // ENTER key raises a click event too; ignore it
            if (event.originalEvent instanceof KeyboardEvent) {
                return;
            }
            if (this.options.alwaysOpen) {
                this.hideResults();
            }
            else {
                this.hide();
            }
        }, this);

        return this._container;
    },
    addPoint: function(geoname) {
        // clear out previous point / popup
        this.removeMarker();
        this.removePopup();

        var name = this._getNameParts(geoname).join(', ');
        var lat = parseFloat(geoname.lat);
        var lon = parseFloat(geoname.lng);

        if (this.options.showMarker || this.options.showPopup) {
            var zoomLevel = this.options.zoomLevel || this._map.getMaxZoom();
            this._map.setView([lat, lon], zoomLevel, false);
        }

        if (this.options.showMarker) {
            this._marker = L.marker([lat, lon]).addTo(this._map);

            if (this.options.showPopup) {
                this._marker.bindPopup(name);
                this._marker.openPopup();
            }
        }
        else if (this.options.showPopup) {
            this._popup = L.popup()
                .setLatLng([lat,lon])
                .setContent(name)
                .openOn(this._map);
        }
    },
    show: function() {
        this._active = true;
        L.DomUtil.addClass(this._container, 'active');
        if (this._hasResults) {
            L.DomUtil.addClass(this._resultsList, 'hasResults');
        }
        else {
            L.DomUtil.addClass(this._resultsList, 'noResults');
        }
    },
    hide: function() {
        this._active = false;
        L.DomUtil.removeClass(this._container, 'active');
        this.hideResults();
    },
    hideResults: function() {
        L.DomUtil.removeClass(this._resultsList, 'hasResults');
        L.DomUtil.removeClass(this._resultsList, 'noResults');
    },
    focus: function() {
        this.show();
        this._input.focus();
    },
    _close: function(){
        // Clear search field (if not alwaysOpen, close results list, and
        // remove marker

        this.hide();
        this.removeMarker();
        this.removePopup();
    },
    removeMarker: function() {
        if (this._marker != null){
            this._map.removeLayer(this._marker);
            this._marker = null;
        }
    },
    removePopup: function() {
        if (this._popup != null) {
            this._map.closePopup(this._popup);
            this._popup = null;
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
			postalcode: this._input.value,
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

        var url = this._url + '?' + this._objToQuery(coreParams) + '&' + this._objToQuery(searchParams);
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
		var jsonResponse;
		if(typeof response.geonames != 'undefined')
		{
			jsonResponse = response.geonames;
		}
		else if (typeof response.postalCodes != 'undefined')
		{
			jsonResponse = response.postalCodes;
		}
        L.DomUtil.removeClass(this._link, this.options.workingClass);

        if (jsonResponse.length > 0){
            L.DomUtil.addClass(this._resultsList, 'hasResults');
            this._hasResults = true;
            var li;
            jsonResponse.forEach(function(geoname){
                li = L.DomUtil.create('li', '', this._resultsList);
                var nameParts = this._getNameParts(geoname);
                var primaryName = nameParts.slice(0,2).join(', ');
                var countryName = (nameParts.length > 2)? '<br/><em>' + nameParts[2] + '</em>': '';
                li.innerHTML =  primaryName + countryName;
                L.DomEvent.addListener(li, 'click', function(){
                    //The user picks a location and it changes the search text to be that location
                    this._input.value = primaryName;

                    if (this.options.alwaysOpen) {
                        this.hideResults();
                    }
                    else {
                        this.hide();
                    }

                    this.fire('select', {geoname: geoname});    
                    this.addPoint(geoname);
                }, this);
            }, this);
        }
        else {
            L.DomUtil.addClass(this._resultsList, 'noResults');
            li = L.DomUtil.create('li', '', this._resultsList);
            li.innerText = 'No results found';
        }
    },
    _getNameParts: function(geoname){
        var extraName;
        var parts = [];
		if(typeof geoname.name != 'undefined')
		{
			parts.push(geoname.name);
		}	
		else if(typeof geoname.postalCode != 'undefined')
		{
			parts.push(geoname.postalCode);
		}

        ['adminName1', 'adminName2', 'countryName', 'countryCode'].forEach(function(d){
            extraName = geoname[d];
            if (extraName && extraName != '' && extraName != parts[0]){
                parts.push(extraName);
            }
        }, this);
        return parts;
    }
});

L.control.geonames = function (options) {
  return new L.Control.Geonames(options);
};
