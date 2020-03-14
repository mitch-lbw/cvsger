import 'babel-polyfill';
import 'regenerator-runtime/runtime'

/**
 * parse given csv to array
 * @param {*} text 
 */
function csvToArray(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
};

/**
 * compute radius of circle in dependency to zoom and weight
 * @param {*} zoom 
 * @param {*} weight 
 */
function getRadiusByZoom(zoom, weight) {
    var logWeight = Math.log(weight);
    if (logWeight == 0) {
        logWeight = 1;
    }
    if (zoom < 4) {
        zoom = 4;
    }
    return logWeight * (1500 * (Math.pow((7 / zoom), 5)));
}

/** 
 * map mode switch
 */
const bright = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const dark = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
var mode = bright;

if ('dark' == getURLParam('mode')) {
    mode = dark;
    document.getElementById('mapstyle').value = "dark";
}
document.getElementById('mapstyle').onchange = function () {
    window.location = setURLParam('mode', this.value);
};

var valuesMap = {};
// start counting at -1 due to csv header
var confirmedCount = -1;
var recoveredCount = 0;
var deathsCount = 0;

const userAction = async () => {
    const response = await fetch('https://raw.githubusercontent.com/iceweasel1/COVID-19-Germany/master/germany_with_source.csv');
    const text = await response.text();
    const listOfEntries = csvToArray(text);
    listOfEntries.forEach(([No, Date, FederatedState, District, Latitude, Longitude, Source]) => {
        confirmedCount += 1;
        if (!isNaN(Latitude) && !isNaN(Longitude)) {
            var key = Latitude + "_" + Longitude;
            var dcc = valuesMap[key] ? valuesMap[key].confirmed + 1 : 1;
            valuesMap[key] = { confirmed: dcc, long: Longitude, lat: Latitude, state: FederatedState, district: District };
        }
    });

    var leafletMap = L.map('map').setView([51.133481, 10.018343], 7);
    var markers = [];

    for (var key in valuesMap) {
        let val = valuesMap[key];
        let marker = L.circle([val.lat, val.long], {
            fillOpacity: 0.6,
            radius: 1500 * Math.log(val.confirmed),
            fillColor: 'red',
            color: 'none'
        }).addTo(leafletMap);
        marker.bindPopup(formatCoordinate(val.confirmed, 0, 0, val.state, val.district));
        marker.on('mouseover', function (ev) {
            marker.openPopup();
        });
        marker.on("mouseout", function (ev) {
            marker.closePopup();
        });
        marker.weight = val.confirmed
        markers.push(marker);
    }

    leafletMap.on('zoomend', function () {
        markers.forEach(function (marker, index) {
            marker.setRadius(getRadiusByZoom(leafletMap.getZoom(), marker.weight));
        });
    });

    L.tileLayer(mode, {
        attribution: 'Build with Leaflet'
    }).addTo(leafletMap);

    function formatCoordinate(confirmed, recovered, deaths, state, district) {
        return ("\n    <table>\n      <tbody>\n        <tr><th>Confirmed</th><td>" + (confirmed) + "</td></tr>\n<tr><th>Recovered</th><td>" + (recovered) + "</td></tr>\n<tr><th>Deaths</th><td>" + (deaths) + "</td></tr>\n<tr><th>Federal state</th><td>" + (state) + "</td></tr>\n        <tr><th>District</th><td>" + (district) + "</td></tr>\n      </tbody>\n    </table>");
    }

    /**
     * tooltip
     */
    L.DomUtil.get('olh').innerHTML = 'Reported Cases';
    L.DomUtil.get('olcl').innerHTML = '<span class="span-bold">Confirmed</span></br>' +
        '<span class="span-bold"> Recovered</span ></br> ' +
        '<span class="span-bold">Deaths</span>';


    var tooltipTemplate =
        '<span>{confirmed}</span> <br>' +
        '<span>{recovered}</span> <br>' +
        '<span>{deaths}</span> <br>';

    confirmedCount = 3795;
    var tmpRec = recoveredCount > 0 ? recoveredCount : 46;
    var tmpDea = deathsCount > 0 ? deathsCount : 8;

    var tooltipData = {
        confirmed: confirmedCount,
        recovered: tmpRec,
        deaths: tmpDea
    };
    var tooltipContent = L.Util.template(tooltipTemplate, tooltipData);
    L.DomUtil.get('olcv').innerHTML = tooltipContent;

    var percentageTemplate = '<br>' +
        '<span>{recRate}%&#185;</span> <br>' +
        '<span>{letality}%&#185;</span>';

    var percentageData = {
        recRate: (tmpRec / confirmedCount).toFixed(3),
        letality: (tmpDea / confirmedCount).toFixed(3)
    };

    var percentageContent = L.Util.template(percentageTemplate, percentageData);
    L.DomUtil.get('olcp').innerHTML = percentageContent;

}

userAction();

function getURLParam(param) {
    var urlParams = new URL(window.location.href);
    var urlParam = urlParams.searchParams.get(param);
    return urlParam;
}

function setURLParam(param, value) {
    var urlParams = new URL(window.location.href);
    urlParams.searchParams.set(param, value)
    return urlParams;
}