var compass_points = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
var stem = "/artworks/";
var here_icon = stem+"assets/redbullseye.png";
var nearest_icon = stem+"assets/camera-highlight.png";
var art_icon = stem+"assets/camera.png";

var infowindow = null;
var markers = {};
var map;
var here ;
var artworks;

var debug = false;
var latitude= 0;
var longitude= 0 ;
var last_lat = 0;
var last_long= 0;

var load_range = 10000;
var load_lat =0;
var load_long =0;

var moves = 0;
var delta = 2;

var last_near_id = "";

var watching =false;
var watch_id ;


// base function
function radians(degrees) {
   return degrees * Math.PI / 180;
};
 
function degrees(radians) {
   return radians * 180 / Math.PI;
};

function round_degrees(degrees) {
  return  Math.round(degrees * 1000000.0) / 1000000.0; 
}

function distance_direction(flat,flong,slat,slong) {
      midlat = (Number(flat) + Number(slat)) /2.0;
      midrad = radians(midlat);
      longCorr = Math.cos(midrad);
      dlat =  (flat - slat) * 60;
      dlong = (flong - slong) * 60 * longCorr;
      deg = Math.round(degrees(Math.atan2(-dlat,-dlong)));
      if (deg < 0 ) deg +=  360;
      return [Math.sqrt((dlat * dlat) + (dlong * dlong)) * 1852 ,
              ( 450 - deg ) % 360
              ]
};

function compass_point(dir) {
   var point =  Math.floor((dir + 11.25) / 22.5) % 16 ;
   return compass_points[point];
}

function sort_0(a,b) {
   return ((a[0][0] < b[0][0]) ? -1 : ((a[0][0] > b[0][0])? 1 : 0 ));
}

//  map creation
// initialize global map variables


function initialize_map(lat , lng){
  var canvas = document.getElementById("map_canvas");
  var position = new google.maps.LatLng(lat,lng);
  map = new google.maps.Map(canvas,{
      zoom:  18,
      center: position,
      mapTypeId: 'satellite'
      }); 
  here = new google.maps.Marker({
          position: position,
          title: "Here",
          map: map,
          icon: here_icon
       });
  markers = {};
  infowindow =  new google.maps.InfoWindow( {
          content: "loading ... "
       });      
}


//  functions to update the map

/*
 *  structures
 *    artworks  array of artwork objects loaded via AJAX
 *        art has properties:Title,Artist,description)
 *            id - artwork id
 *            Title
 *            Artist
 *            latitude, longitude - artwork position
 *            description
 * 
 *    selection
 *         0 - [distance, direction from point]
 *         1 - artworkk
 */

function update_map_markers(selection) {
   var live = {};
   if (debug) alert("selection length "+selection.length);
   if (debug) alert("last"+selection[selection.length - 1][1].id);
   for (i in selection){
       var obj =selection[i][1];
       var id =obj.id;
       var mark =  markers[id];
       var html =  "<div>"+obj.id+" <em>"+obj.Title+"</em>"+ "             &#160;<br/>";
       if (obj.Artist != undefined) html += " <em>"+obj.Artist+"</em> ";
       if (obj.Year != undefined) html += " Created " + obj.Year;
       if (obj.description != undefined) html+= "<br/>" + obj.description;
       html += "</div>";
       
       if (mark == undefined )   {    // missing 
               var position = new google.maps.LatLng(obj.latitude,obj.longitude);
               var icon = art_icon;
               var marker = new google.maps.Marker({
                 position: position,
                 title: obj.Title + " " + obj.id,
                 map: map,
                 icon: icon,
                 html: html
              });
              markers[id]=marker;
              live[id]=1;
              google.maps.event.addListener(marker,'click', function() {
                   infowindow.setContent(this.html);
                   infowindow.open(map, this);
              });
          }
       else  { // update
          if (mark.map == null) mark.setMap(map);  
          live[id]=1;
       }
   }
   for (k in markers) {
       if (live[k] == undefined) {
          mark = markers[k];
          mark.setMap(null);  
       }  
   }
   if (selection.length > 0) {
       var obj = selection[0][1];
       var near_id = obj.id;
       if (near_id != last_near_id) {
          if (last_near_id != "") markers[last_near_id].setIcon(art_icon);
          markers[near_id].setIcon(nearest_icon);
          last_near_id =  near_id;
       }   
     }
   else {
      if (last_near_id != "") {
          markers[last_near_id].setIcon(art_icon);   
          last_near_id = "";
      }
   }
 }

function update_map_here(lat,lng) {
    var position = new google.maps.LatLng(lat,lng);
    map.setCenter(position);
    here.setPosition(position);
}

// web page updating

// update the 'nearest' div on the web page from a selection
function update_page_nearest(selection) {
       var dist_dir = selection[0];
       var obj = selection[1];
       var dist = Math.round(dist_dir[0]);
       var dir =  Math.round(dist_dir[1]);
       var id = obj.id;

       var div = "<div>"+"<em>"+obj.Title+"</em><br/>";
       if (obj.Artist  !=undefined) div += "<b>"+obj.Artist+"</b> ";
       if (editing) div +=  "<a target='_blank' href='"+stem+"edit-artwork.xq?id="+id+"'>Edit</a>"
       if (obj.Year  !=undefined ) div += " "+obj.Year+"<br/>";
       if (obj.description !=undefined) div+= "<div>"+obj.description+"</div>"
       div += ' [' + dist+ "m at " + dir + '° ' + compass_point(dir)  +  ']'+"</div>";
       div += "</div>"
       $('#nearest').html(div);
}

// update the latlong div on the webpage 

function update_page_latlong(latitude,longitude) {
    var span = "<span>"+round_degrees(latitude)+","+round_degrees(longitude);
    if (editing) 
        span += " <a href='"+stem+"edit-artwork.xq?latitude="+latitude+"&longitude="+longitude+"'> Add Artwork</a>";
    span += "</span>";
    $('#latlong').html(span);
}

// update the number of loaded artworks
function update_page_loaded() {
    $('#artworks').html(artworks.artwork.length);
}

/* 
   * load art from external script
 */
 
function load_artworks() {
     var url = stem+"art-in-range.xq?latitude="+latitude+"&longitude="+longitude+"&range="+load_range;
     if(debug) alert (url);
     //start ajax request
     $.ajax({
          url: url,
          //force to handle it as text
           dataType: "text",
           success: function(data) {
                artworks = $.parseJSON(data);
                art_loaded() ;
           }  
      });
}

function art_loaded() {
    if(debug) alert("loaded");
    update_page_loaded();
    load_lat = latitude;
    load_long = longitude;
    update_art();
}

/*
 * select art within range
 * input - art  
 *       lat, long  position
 *       range - distance in m from position
 * 
 * output - selection of art in order of increasing distance from position within range, augmented with distance and direction
 */

function nearby(lat,lng,range) {
     var selection =[];
     for (k in artworks.artwork) {
         var art = artworks.artwork[k];
         var dist_dir = distance_direction(lat,lng,art.latitude,art.longitude);
          if (dist_dir[0] <= range) 
             selection.push([dist_dir,art]);
       }
     return selection.sort(sort_0);       
}

//  main page and map updater

function update_art() {
     view_range = $('#view_range').val(); 
     if (debug) alert (latitude + "," + longitude + ","+view_range);
     var selection = nearby(latitude,longitude,view_range);
     if (debug) alert (selection.length);
     if (selection.length > 0)
             update_page_nearest(selection[0]);
     else $('#nearest').html("");
     update_map_markers(selection);
     last_lat = latitude ;
     last_long = longitude;
}

function set_position(position) {
    if (moves == 0) {
          get_position();
          moves ++;
          return null;
    }
    latitude = round_degrees(position.coords.latitude);
    longitude = round_degrees(position.coords.longitude);
    if (debug) alert("set position");
    if (map == undefined)  
        initialize_map(latitude , longitude);
    update_map_here(latitude,longitude);
    update_page_latlong(latitude,longitude);
    
    var offset = distance_direction(load_lat,load_long,latitude,longitude)[0];
    var out_of_range = offset > Number(load_range) * 0.9;
//    $('#status').html('offset '+offset + ' : ' + out_of_range);
    if (debug) alert("Distance from load position "+offset);
    if ( out_of_range || artworks == undefined) {
        load_artworks();
    }
    else {
      var d =  distance_direction(last_lat,last_long,latitude,longitude);
      if (debug) alert("distance from last update " + d[0]);
      if (d[0] > delta) {           
            update_art();
      }      
    }
 }

// geolocation

function get_position() {
     if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(set_position, errorFunction,{enableHighAccuracy:true});
    } else {
       alert("no navigator");
    }
};

function watch_change() {
    if(debug) alert("Watching"+watching);
    if (watching) {
        navigator.geolocation.clearWatch(watch_id);
        watching = false;
        $('#watching').text('Watch OFF');
 //       alert("watching now off");
    }
    else {
        if (navigator.geolocation) {
           watch_id =  navigator.geolocation.watchPosition(set_position, errorFunction, {enableHighAccuracy:true,maximumage:30000});
           watching = true;
           $('#watching').text('Watch ON');
 //          alert("watching now on");
        } else {
           alert("no navigator");
        }
   }
};

function errorFunction(position) {
    alert('Error!');
}

$(document).ready(function() { 
     if(debug) alert("initialize");
     get_position();
  });
