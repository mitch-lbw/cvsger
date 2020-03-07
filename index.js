import 'ol/ol.css';
import { useGeographic } from 'ol/proj';
import { Map, View, Feature, Overlay } from 'ol/index';
import { Point } from 'ol/geom';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Style, Circle, Fill } from 'ol/style';
import 'babel-polyfill';

useGeographic();

var styleFunction = function (feature, resolution) {
    return new Style({
        image: new Circle({
            radius: 3 * Math.log(feature.values_.confirmed),
            fill: new Fill({ color: 'red' })
        })
    });
};

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

var valuesMap = {};
var occasions = [];
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

    for (var key in valuesMap) {
        var val = valuesMap[key];
        occasions.push(new Feature({ geometry: new Point([val.long, val.lat]), name: key, confirmed: val.confirmed, recovered: 0, deaths: 0, state: val.state, district: val.district }));
    }

    var map = new Map({
        target: 'map',
        view: new View({
            center: [10.018343, 51.133481],
            zoom: 7
        }),
        layers: [
            new TileLayer({
                source: new OSM()
            }),
            new VectorLayer({
                source: new VectorSource({
                    features:
                        occasions
                }),
                style: styleFunction
            })
        ]
    });

    var element = document.getElementById('popup');

    var popup = new Overlay({
        element: element,
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10]
    });
    map.addOverlay(popup);

    function formatCoordinate(feature) {
        return ("\n    <table>\n      <tbody>\n        <tr><th>Confirmed</th><td>" + (feature.values_.confirmed) + "</td></tr>\n<tr><th>Recovered</th><td>" + (feature.values_.recovered) + "</td></tr>\n<tr><th>Deaths</th><td>" + (feature.values_.deaths) + "</td></tr>\n<tr><th>Federal state</th><td>" + (feature.values_.state) + "</td></tr>\n        <tr><th>District</th><td>" + (feature.values_.district) + "</td></tr>\n      </tbody>\n    </table>");
    }

    map.on('pointermove', function (event) {
        if (map.hasFeatureAtPixel(event.pixel)) {
            var feature = map.getFeaturesAtPixel(event.pixel)[0];
            var coordinate = feature.getGeometry().getCoordinates();
            popup.setPosition(coordinate);
            document.getElementById('popup').innerHTML = formatCoordinate(feature);
        }
        else {
            popup.setPosition(undefined);
        }
    });

    document.getElementById('info').innerText = document.getElementById('info').innerText + " " + confirmedCount + " / " + recoveredCount + " / " + deathsCount;
}

userAction();


