'use strict';

var dataLocation = {
  'conf': 'conf.json',
  'location': 'output.json',
  'gson': 'sumberlistrik.json',
  'overallData': 'overalldata.json'
};

var data = {
  gpsLocation: {},
  autocomplete: {}
};
async.map(['conf', 'location', 'gson', 'overallData'],
  function(variable) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dataLocation[variable], false);
    xhr.send(null);
    data[variable] = JSON.parse(xhr.responseText);
  });

var mapboxConfig = data.conf;

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

function Choropleth(gson) {

  function getPercentage(props, attr) {
    var total = props['Jumlah Meteran'] + props['Jumlah Non-Meteran'] +
      props['Jumlah Non-PLN'] + props['Jumlah Bukan Listrik'] + 4;
    return ((props[attr] + 1) / total) * 100;
  }

  // Information
  var infoControl = {
    pieColor: {
      'Jumlah Meteran': '#f4d00c',
      'Jumlah Non-Meteran': '#e19f25',
      'Jumlah Non-PLN': '#0093d1',
      'Jumlah Bukan Listrik': '#b83032'
    },

    showRegencyData: function(props) {
      var container = document.getElementById('description');
      var detail = '';
      var pieData = [];
      var numberOfFamily = 0;
      _.each(props, function(value, key) {
        if (key.indexOf('Jumlah') == -1) {
          detail += '<b>' + key + '</b>: ' + value + '<br/>';
        } else {
          numberOfFamily += value;
          pieData.push({
            value: getPercentage(props, key),
            color: infoControl.pieColor[key],
            label: key
          });
        }
      });
      detail += '<b>Aksesbilitas</b>: ' +
        (100 - getPercentage(props, 'Jumlah Bukan Listrik')).toFixed(2) +
        '%<br/>';
      detail += '<b>Jumlah Rumah Tangga</b>: ' + numberOfFamily.toLocaleString('id') + '<br/>';
      container.innerHTML = detail;
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
  };

  function getColor(val) {
    if (val >= 93.1575) {
      return '#ffffb2';
    } else if (val >= 83.7179) {
      return '#fecc5c';
    } else if (val >= 48.4835) {
      return '#fd8d3c';
    } else if (val >= 38.8235) {
      return '#f03b20';
    }
    return '#bd0026';
  }

  var layerOutStyle = {
    weight: 1,
    opacity: 1,
    color: 'black',
    dashArray: '3',
    fillOpacity: 0.7
  };
  var layerOverStyle = {
    weight: 2,
    color: 'black',
    dashArray: ''
  };

  this.geoJson = L.geoJson(gson, {
      style: function(feature) {
        var style = $.extend({}, layerOutStyle);
        style.fillColor = getColor(
          100 - getPercentage(feature.properties, 'Jumlah Bukan Listrik')
        );
        return style;
      },
      onEachFeature: function(feature, layer) {
        layer.on({
          mouseover: function(feature) {
            var hoverInfo = $('#hover-info');
            hoverInfo.find('span').show();
            hoverInfo.find('span')
              .text(feature.target.feature.properties['Nama Kabupaten']);

            var layer = feature.target;

            layer.setStyle(layerOverStyle);
          },
          // mousemove: function() {
          //   var latlng = feature.latlng;
          //   L.popup({
          //     autoPan: false,
          //     closeButton: false
          //   }).setLatLng(latlng)
          //     .setContent(feature.target.feature.properties['Nama Kabupaten'])
          //     .openOn(map);
          // },
          mouseout: function(feature) {
            $('#hover-info').find('span').hide();
            layer.setStyle(layerOutStyle);
          },
          click: function(props) {
            var data = props.target.feature.properties;
            infoControl.showRegencyData(data);
          }
        });
        data.gpsLocation[feature.properties['Nama Kabupaten']] = layer;
        data.autocomplete[feature.properties['Nama Kabupaten']] = null;
      }
    }
  );

  this.legend = {
    add: function() {
      var container = document.getElementById('map-legend');
      var legend = L.DomUtil.create('div', 'legend', container);

      var level = [0, 39, 48, 84, 93, 100];
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
    infoControl.showRegencyData(data.overallData);

    map.on('click', function() {
      infoControl.showRegencyData(data.overallData);
    });
  };
}

(new Choropleth(data.gson)).main();

$('input.autocomplete').autocomplete({
  data: data.autocomplete,
  matchFn: function(name) {
    var gpsLocation = data.gpsLocation;
    if (gpsLocation.hasOwnProperty(name)) {
      gpsLocation[name].fireEvent('click');
      map.fitBounds(gpsLocation[name].getBounds());
    }
  }
});

// $('#intro-modal').openModal();
