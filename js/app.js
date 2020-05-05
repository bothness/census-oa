// Identify elements for event listeners + DOM rendering
const searchbox = document.getElementById('searchbox');
const searchbutton = document.getElementById('searchbutton');
const results = document.getElementById('results');

// Blank array for json data
var json = {};
var geojson = {};

// Initialize map
mapboxgl.accessToken = 'pk.eyJ1IjoiYXJrYmFyY2xheSIsImEiOiJjamdxeDF3ZXMzN2IyMnFyd3EwdGcwMDVxIn0.P2bkpp8HGNeY3-FOsxXVvA';
var map = new mapboxgl.Map({
  container: 'map',
  style: {
    'version': 8,
    'sources': {
      'osm-tiles': {
        'type': 'raster',
        'tiles': [
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        'tileSize': 256,
        'attribution':
          'OpenStreetMap'
      }
    },
    'layers': [
      {
        'id': 'osm-tiles',
        'type': 'raster',
        'source': 'osm-tiles',
        'minzoom': 0,
        'maxzoom': 20
      }
    ]
  },
  center: [-4, 54.5],
  zoom: 5
});
map.addControl(new mapboxgl.NavigationControl());

// Update map on click
map.on('click', function (e) {
  search('coords', e.lngLat);
});

// Function to update geojson layer + re-center map
function addMapLayer(geodata, layername) {
  map.addSource(layername, {
    'type': 'geojson',
    'data': geodata
  });
  map.addLayer({
    'id': layername,
    'type': 'line',
    'source': layername,
    'layout': {},
    'paint': {
      'line-width': 2,
      'line-color': '#088',
      'line-opacity': 0.8
    }
  });
}

// Function to remove a layer + source (if it exists)
function remMapLayer(layer) {
  if (map.getLayer(layer)) {
    map.removeLayer(layer);
  }
  if (map.getSource(layer)) {
    map.removeSource(layer);
  }
}

// Function to fit map to geojson layer
function fitMapLayer(geodata) {
  var coordinates = geodata.features[0].geometry.geometries ? geodata.features[0].geometry.geometries[0].coordinates[0] : geodata.features[0].geometry.coordinates[0];

  var bounds = coordinates.reduce(function (bounds, coord) {
    return bounds.extend(coord);
  }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, {
    padding: 20
  });
}

// Function to turn CSV (string) into array of objects
function tsv2json(string) {
  let json = [];
  string = string.replace(/['"]+/g, '');
  let array = string.split('\n');
  let headers = array[0].split('\t');
  for (var i = 1; i < array.length - 1; i++) {
    let data = array[i].split('\t');
    let obj = {};
    for (var j = 0; j < data.length; j++) {
      obj[headers[j].trim()] = data[j].trim();
    }
    json.push(obj);
  }
  return json;
}

// Function to create data table from json data
function data2table(data) {
  let keys = Object.keys(data[0]);
  let html = '<p>Age breakdown for the population of output area ' + data[0]['GEOGRAPHY_CODE'] + ' in ' + data[0]['DATE_NAME'] + '.</p>';
  html += '<table class="table table-sm">';
  html += '<thead><tr><th scope="col">Age group</th><th scope="col">%</th></tr></thead><tbody>'
  for (object in data) {
    html += '<tr>';
    html += '<td>' + data[object][keys[2]] + '</td>';
    html += '<td><img src="./img/pixel.png" style="height: 18px; width: ' + (data[object][keys[3]] * 4) + 'px;"> ' + data[object][keys[3]] + '%</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  results.innerHTML = html;
}

// function to return output area data based on postcode or coordinates
function search(type, value) {
  let tsvurl = '';
  let kmlurl = '';
  if (type == 'postcode') {
    tsvurl = 'http://www.nomisweb.co.uk/api/v01/dataset/NM_145_1.data.tsv?date=latest&geography=POSTCODE|' + value + ';299&rural_urban=0&cell=1...16&measures=20301&select=date_name,geography_code,cell_name,obs_value';
    kmlurl = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_145_1.data.kml?date=latest&geography=POSTCODE|' + value + ';299&rural_urban=0&cell=0&measures=20100';
  } else {
    tsvurl = 'http://www.nomisweb.co.uk/api/v01/dataset/NM_145_1.data.tsv?date=latest&geography=LATLONG|' + value.lat + ';' + value.lng + ';299&rural_urban=0&cell=1...16&measures=20301&select=date_name,geography_code,cell_name,obs_value';
    kmlurl = 'https://www.nomisweb.co.uk/api/v01/dataset/NM_145_1.data.kml?date=latest&geography=LATLONG|' + value.lat + ';' + value.lng + ';299&rural_urban=0&cell=0&measures=20100';
  }
  fetch(tsvurl).then((response) => {
    return response.text();
  })
    .then((tsvdata) => {
      json = tsv2json(tsvdata);

      fetch(kmlurl).then((response) => {
        return response.text();
      })
        .then((str) => {
          return (new window.DOMParser()).parseFromString(str, "text/xml");
        })
        .then((kmldata) => {
          geojson = toGeoJSON.kml(kmldata);
          return geojson;
        })
        .then(() => {
          remMapLayer('selection');
          addMapLayer(geojson, 'selection');
          fitMapLayer(geojson);
        });
      return true;
    })
    .then(() => {
      data2table(json);
    })
}

// Add event listeners for search
searchbutton.addEventListener('click', () => { search('postcode', searchbox.value) });
searchbox.addEventListener('change', () => { search('postcode', searchbox.value) });