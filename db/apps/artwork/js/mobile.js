var compass_points = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

var here_icon = "http://maps.google.com/mapfiles/kml/pal4/icon49.png";
var nearest_icon = "http://maps.google.com/mapfiles/kml/pal2/icon4.png";
var tree_icon = "http://maps.google.com/mapfiles/kml/pal2/icon12.png";

var infowindow = null;
var markers = {};
var map;
var here ;
var trees;

var debug = false;
var debug2 = false;
var latitude= 0;
var longitude= 0 ;
var last_lat = 0;
var last_long= 0;

var load_range = 0;
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
 *    trees  array of tree objects laoded via AJAX
 *        tree has properties:
 *            id - tree id
 *            latin - latin name
 *            common - common name
 *            latitude, longitude - tree position
 *            girth - if not 0 is girth in cms
 *            state - tree state  
 * 
 *   selection
 *         0 - [distance, direction from point]
 *         1 - tree
 */

function update_map_markers(selection) {
   var live = {};
   for (i in selection){
       var tree =selection[i][1];
       var id =tree.id;
       var mark =  markers[id];
       if (debug) alert(id);
       if (mark == undefined )   {    // missing 
               var position = new google.maps.LatLng(tree.latitude,tree.longitude);
               var icon = tree_icon;
               var girth = "";
               if (tree.girth != undefined) girth = " girth " + tree.girth + "cm";
               var marker = new google.maps.Marker({
                 position: position,
                 title: tree.latin + " " + tree.id,
                 map: map,
                 icon: icon,
                 html: "<div><em>"+tree.latin+"</em>"+ "<br/><b>" + tree.common +"</b>"+"<br/>"+tree.state + girth +"<br/> " +tree.id+"</div>"
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
       var tree = selection[0][1]
       var near_id = tree.id;
       if (near_id != last_near_id) {
          if (last_near_id != "") markers[last_near_id].setIcon(tree_icon);
          markers[near_id].setIcon(nearest_icon);
          last_near_id =  near_id;
       }   
     }
   else {
      if (last_near_id != "") {
          markers[last_near_id].setIcon(tree_icon);   
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

// update the 'nearest'div on the web page from a selection
function update_page_nearest(selection) {
       var dist_dir = selection[0];
       var tree = selection[1];
       var dist = Math.round(dist_dir[0]);
       var dir =  Math.round(dist_dir[1]);
       var id = tree.id;
       var girth = "";
       if (tree.girth != undefined) girth = " Girth " + tree.girth + "cm";

       var div = "<div>"+"<em>"+tree.latin+"</em><br/>";
       div += "<b>"+tree.common+"</b> ";
       if (editing) div +=  "<a target='_blank' href='../trees/edittree.xq?id="+tree.id+"'>"+id + "</a>"
       div += " "+tree.state+"<br/>";
       div += girth +' [' + dist+ "m at " + dir + '° ' + compass_point(dir)  +  ']'+"</div>";
       div += "</div>"
       $('#nearest').html(div);
}

// update the latlong div on the webpage 

function update_page_latlong(latitude,longitude) {
    var span = "<span>"+round_degrees(latitude)+","+round_degrees(longitude);
    if (editing) 
        span += " <a href='../trees/edittree.xq?latitude="+latitude+"&longitude="+longitude+"'> Add Tree</a>";
    span += "</span>";
    $('#latlong').html(span);
}

// update the number of loaded trees
function update_page_loaded() {
    $('#trees').html(trees.tree.length);
}

/* 
   * load trees from external script
 */
 
function load_trees() {
     var url = "http://bristoltrees.space/trees/trees-in-range.xq?latitude="+latitude+"&longitude="+longitude+"&range="+load_range;
     if (debug2) alert (url);
     //start ajax request
     $.ajax({
          url: url,
          //force to handle it as text
           dataType: "text",
           success: function(data) {
                trees = $.parseJSON(data);
                trees_loaded() ;
           }  
      });
}

function trees_loaded() {
    update_page_loaded();
    load_lat = latitude;
    load_long = longitude;
    update_trees();
}

/*
 * select trees within range
 * input - trees  
 *       lat, long  position
 *       range - distance in m from position
 * 
 * output - selection of trees in order of increasing distance from position within range, augmented with distance and direction
 */

function nearby(lat,lng,range) {
     var selection =[];
     for (k in trees.tree) {
         var tree = trees.tree[k];
         var dist_dir = distance_direction(lat,lng,tree.latitude,tree.longitude);
          if (dist_dir[0] <= range) 
             selection.push([dist_dir,tree]);
       }
     return selection.sort(sort_0);       
}

//  main page and map updater

function update_trees() {
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

    if (map == undefined)  
        initialize_map(latitude , longitude);
    update_map_here(latitude,longitude);
    update_page_latlong(latitude,longitude);
    
    load_range = $('#load_range').val();
    var offset = distance_direction(load_lat,load_long,latitude,longitude)[0];
    var out_of_range = offset > Number(load_range) * 0.9;
//    $('#status').html('offset '+offset + ' : ' + out_of_range);
    if (debug) alert("Distance from load position "+offset);
    if ( out_of_range || trees == undefined) {
        load_trees();
    }
    else {
      var d =  distance_direction(last_lat,last_long,latitude,longitude);
      if (debug) alert("distance from last update " + d[0]);
      if (d[0] > delta) {           
            update_trees();
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
     get_position();
  });
