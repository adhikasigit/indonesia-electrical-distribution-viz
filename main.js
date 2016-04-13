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
      props['Jumlah Non-PLN'] + props['Jumlah Bukan Listrik'];
    return ((props[attr]) / total) * 100;
  }

  var pieColor = {
    'Jumlah Meteran': '#f4d00c',
    'Jumlah Non-Meteran': '#e19f25',
    'Jumlah Non-PLN': '#0093d1',
    'Jumlah Bukan Listrik': '#b83032'
  };

  // Information
  var infoControl = new (L.Control.extend({
    options: {
      position: 'topright'
    },

    onAdd: function(map) {
      var card = L.DomUtil.create('div', 'card');
      var cardContent = L.DomUtil.create('div', 'card-content', card);
      var cardTitle = L.DomUtil.create('span', 'card-title', cardContent);
      cardTitle.innerHTML = 'Detil Kabupaten';
      var cardDescription = L.DomUtil.create('p', undefined, cardContent);
      cardDescription.innerHTML = 'Hover over a state';
      return card;
    },

    update: function(props) {
      var container = this.getContainer().getElementsByTagName('p')[0];
      var detail = '';
      var pieData = null;
      if (props) {
        pieData = [];
        _.each(props, function(value, key) {
          if (key.indexOf('Jumlah') == -1) {
            detail += '<b>' + key + '</b>: ' + value + '<br/>';
          } else {
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
      } else {
        detail = 'Hover over a state';
      }
      container.innerHTML = detail;
      if (pieData) {
        var pieCtx = L.DomUtil
          .create('canvas', undefined, container)
          .getContext('2d');
        var pie = (new Chart(pieCtx)).Pie(pieData, {
          //Boolean - Whether we animate the rotation of the Doughnut
          animateRotate: true,

          //Boolean - Whether we animate scaling the Doughnut from the centre
          animateScale: true,

          tooltipTemplate: '<%= value.toFixed(2) %> %',

          tooltipEvents: [],

          showTooltips: true,
          onAnimationProgress: function() {
            this.showTooltip(this.segments, true);
          },

          onAnimationComplete: function() {
            this.showTooltip(this.segments, true);
          }
        });
        L.DomUtil.create('div', 'legend', container)
          .innerHTML = pie.generateLegend();
      }
    },

    // listener functions
    highlight: function() {
      var control = this;
      return function(e) {
        var layer = e.target;
        control.update(layer.feature.properties);
      };
    },

    reset: function() {
      var control = this;
      return function() {
        control.update();
      };
    }
  }))();

  this.infoControl = infoControl;

  function getColor(val) {
    if (val == 100) {
      return '#800026';
    } else if (val >= 75) {
      return '#E31A1C';
    } else if (val >= 25) {
      return '#FEB24C';
    }
    return '#FFEDA0';
  }

  this.geoJson = L.geoJson(gson, {
      style: function(feature) {
        return {
          fillColor: getColor(
            100 - getPercentage(feature.properties, 'Jumlah Bukan Listrik')
          ),
          weight: 2,
          opacity: 1,
          color: 'white',
          dashArray: '3',
          fillOpacity: 0.7
        };
      },
      onEachFeature: function(feature, layer) {
        layer.on({
          mouseover: infoControl.highlight(),
          mouseout: infoControl.reset()
        });
      }
    }
  );

  this.legend = new (L.Control.extend({
    options: {
      position: 'bottomright'
    },

    onAdd: function(map) {
      var card = L.DomUtil.create('div', 'card');
      var cardContent = L.DomUtil.create('div', 'card-content', card);
      var cardTitle = L.DomUtil.create('span', 'card-title', cardContent);
      cardTitle.innerHTML = 'Legend';
      var cardDescription = L.DomUtil.create('div', 'legend', cardContent);
      var cardDescriptionList = L.DomUtil.create('ul', undefined, cardDescription);
      cardDescriptionList.innerHTML = '';
      var level = [0, 25, 75, 100];

      for (var idx = 0; idx < level.length; ++idx) {
        cardDescriptionList.innerHTML +=
          '<li><span style="background:' + getColor(level[idx] + 1) + '"></span> ' +
          level[idx] + (level[idx + 1] ? '&ndash;' + level[idx + 1] : '+') + '% </li>';
      }
      return card;
    }
  }))();

  this.main = function() {
    map.addControl(this.infoControl);
    map.addControl(this.legend);
    this.geoJson.addTo(map);
  };
}

(new Choropleth(data.gson)).main();
