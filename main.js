'use strict';

var mapboxConfig = {
  template: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png' +
  '?access_token={accessToken}',
  id: 'opelhoward.pk7d9mn9',
  accessToken: 'pk.' +
  'eyJ1Ijoib3BlbGhvd2FyZCIsImEiOiJjaW1vaXFvNWIwMGZxdXlreWsydzNuMm42In0.' +
  '1TgVGyHp_pxyWpq_NPnOpA'
};

var init = {
  pos: [-2.329499, 116.1167094],
  zoom: 5
};

var map = L.map('mapid').setView(init.pos, init.zoom);
L.tileLayer(mapboxConfig.template, {
  maxZoom: 18,
  id: mapboxConfig.id,
  accessToken: mapboxConfig.accessToken
}).addTo(map);

var dataLocation = {
  'location': 'output.json',
  'gson': 'sumberlistrik.json'
};

var data = {};
async.map(['location', 'gson'], function(variable) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', dataLocation[variable], false);
  xhr.send(null);
  data[variable] = JSON.parse(xhr.responseText);
});

function Choropleth(gson) {

  function getPercentage(props, attr) {
    var total = props['Jumlah Meteran'] + props['Jumlah Non-Meteran'] +
      props['Jumlah Non-PLN'] + props['Jumlah Bukan Listrik'] + 4;
    return ((props[attr] + 1) / total) * 100;
  }

  var pieColor = {
    'Jumlah Meteran': '#f4d00c',
    'Jumlah Non-Meteran': '#e19f25',
    'Jumlah Non-PLN': '#0093d1',
    'Jumlah Bukan Listrik': '#b83032'
  };

  // Information
  var infoControl = {
    onclick: function(props) {
      props = props.target.feature.properties;
      var container = document.getElementById('description');
      var detail = '';
      var pieData = null;
      if (props) {
        pieData = [];
        var numberOfFamily = 0;
        _.each(props, function(value, key) {
          if (key.indexOf('Jumlah') == -1) {
            detail += '<b>' + key + '</b>: ' + value + '<br/>';
          } else {
            numberOfFamily += value;
            pieData.push({
              value: getPercentage(props, key),
              color: pieColor[key],
              label: key
            });
          }
        });
        detail += '<b>Aksesbilitas</b>: ' +
          (100 - getPercentage(props, 'Jumlah Bukan Listrik')).toFixed(2) +
          '%<br/>';
        detail += '<b>Jumlah Rumah Tangga</b>: ' +
          numberOfFamily +
          '<br/>';
      } else {
        detail = 'Hover over a state';
      }
      container.innerHTML = detail;
      if (pieData) {
        var pieCtx = L.DomUtil
          .create('canvas', undefined, container)
          .getContext('2d');
        (new Chart(pieCtx)).Pie(pieData, {
          //Boolean - Whether we animate the rotation of the Doughnut
          animateRotate: true,

          //Boolean - Whether we animate scaling the Doughnut from the centre
          animateScale: false,

          tooltipTemplate: '<%= value.toFixed(0) %> %',

          showTooltips: true
        });
      }
    }
  };

  function getColor(val) {
    if (val >= 80) {
      return '#2c7bb6';
    } else if (val >= 60) {
      return '#abd9e9';
    } else if (val >= 40) {
      return '#ffffbf';
    } else if (val >= 20) {
      return '#fdae61';
    }
    return '#d7191c';
  }

  this.geoJson = L.geoJson(gson, {
      style: function(feature) {
        return {
          fillColor: getColor(
            100 - getPercentage(feature.properties, 'Jumlah Bukan Listrik')
          ),
          weight: 2,
          opacity: 1,
          color: 'black',
          dashArray: '3',
          fillOpacity: 0.7
        };
      },
      onEachFeature: function(feature, layer) {
        layer.on({
          mousemove: function(feature) {
            L.popup({
              autoPan: false,
              closeButton: false
            }).setLatLng(feature.latlng)
              .setContent(feature.target.feature.properties['Nama Kabupaten'])
              .openOn(map);
            // Materialize.toast(feature.target.feature.properties['Nama Kabupaten'], 500)
          },
          mousedown: infoControl.onclick
        });
      }
    }
  );

  this.legend = {
    add: function() {
      var container = document.getElementById('map-legend');
      var legend = L.DomUtil.create('div', 'legend', container);

      var level = [0, 20, 40, 60, 80, 100];
      for (var idx = 0; idx < level.length - 1; ++idx) {
        var elementLegend = L.DomUtil.create('div', undefined, legend);
        var span = L.DomUtil.create('span', undefined, elementLegend);
        span.style.background = getColor(level[idx] + 1);
        elementLegend.innerHTML +=
          level[idx] + '&ndash;' + level[idx + 1] + '%';
      }
    }
  };

  this.main = function() {
    this.legend.add();
    this.geoJson.addTo(map);
  };
}

(new Choropleth(data.gson)).main();
$('#modal1').openModal();
