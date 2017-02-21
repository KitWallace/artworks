import module namespace art = "http://kitwallace.co.uk/lib/art" at "lib/art.xqm";
import module namespace url = "http://kitwallace.me/url" at "/db/lib/url.xqm";

let $serialize := util:declare-option("exist:serialize","method=xhtml media-type=text/html")
let $context := url:get-context()
let $log := art:log("home")
return
<html>
  <head>
     <link rel="stylesheet" type="text/css" href="{$art:stem}assets/base.css" media="screen" ></link>

     <script type="text/javascript" src="{$art:stem}/js/sorttable.js"></script> 
     <script src="https://maps.googleapis.com/maps/api/js?key={$art:googlekey}"></script>
     <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
     <script type="text/javascript"> var draggable = {if ($context/draggable) then 'true' else 'false'}; </script>

     <script type="text/javascript" src="{$art:stem}/js/map.js"></script> 
  </head>
  <body>
   <h1><a href="{$art:root}">Artworks in Cardiff</a> | <a href="{$art:root}list">List</a> | <a href="{$art:root}map">Map</a> </h1>
   <hr/>
   <div>
   {

   if ($context/_signature="art/*")
   then art:view-artwork(art:artwork($context/art))
   else if ($context/_signature="list") 
   then art:list-artworks($art:artworks)
   else if ($context/_signature="map")
   then art:map-artworks($art:artworks)
   else art:about()
   }
   </div>
  </body>
</html>
