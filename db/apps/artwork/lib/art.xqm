module namespace art = "http://kitwallace.co.uk/lib/art";
import module namespace log ="http://kitwallace.me/log" at "/db/lib/log.xqm";

declare variable $art:centre := (51.474845,-3.174844);
declare variable $art:root := "/Artworks/";
declare variable $art:stem := "/artworks/";
declare variable $art:base := "/db/apps/artworks";
declare variable $art:artworks := collection(concat($art:base,"/artworks"))//artwork;
declare variable $art:additions := collection(concat($art:base,"/additions"))//artwork;
declare variable $art:locations := doc(concat($art:base,"/ref/locations.xml"))//location;
declare variable $art:googlekey  := "AIzaSyB-sB9Nwqkh-imfUd1-w3_lz4KFhL-_VqU";
declare variable $art:users := doc(concat($art:base,"/ref/users.xml"))/users;

declare function art:artwork($id) {
   $art:artworks[id=$id]
};

declare function art:caption($art as element(artwork)) {
  concat ($art/Title,if($art/Artist) then concat(" by ",$art/Artist) else () ,if ($art/Year) then concat (" [",$art/Year,"]") else ())

};

declare function art:list-artworks($artworks as element(artwork)*) as element(table) {
<div>
<h3><em>Click on a heading to sort</em></h3>
<table class="sortable">
  <tr><th>Title</th><th>Year</th><th>Type</th><th>Artist</th><th>Location</th></tr>

{
 for $art in $artworks 
 order by $art/Title
 return
  <tr>
    <td><b><a href="{$art:root}art/{$art/id}">{$art/Title/string()}</a></b></td>
    <td>{if ($art/Year) then  $art/Year/string() else ()}</td>
    <td>{$art/Type/string()}</td>
    <td>{if ($art/Artist) then $art/Artist/string() else ()}</td>
    <td>{string-join(($art/Area,$art/Road),", ")}</td>
  </tr>
}
</table>
</div>
};

declare function art:view-artwork($art as element(artwork)) as element(table) {
let $addition := $art:additions[id=$art/id]
return
 <div>
  <div id="map_text">
  <table>
    <tr><th>Title</th><td>{$art/Title/string()}  | <a target="_blank" class="external" href="https://www.google.co.uk/search?q={$art/Title} Cardiff">Google</a></td></tr>
    {if ($addition) 
     then <tr>
              <th>Subject{if (count($addition/subject) > 1) then "s" else ()}</th>
              <td>{for $subject in $addition/subject 
                   return
                      <span><a target="_blank" class="external" href="https://www.google.co.uk/search?q={$subject}">{$subject}</a> </span>
                  }
              </td>
          </tr> 
     else ()
    }
    {if ($art/Artist) then <tr><th>Artist</th><td>{$art/Artist/string()} | <a target="_blank" class="external" href="https://www.google.co.uk/search?q={$art/Artist} sculptor">Google</a></td></tr> else ()}
    {if ($art/Year) then <tr><th>Year</th><td>{$art/Year/string()}</td></tr> else ()}
    
    <tr><th>Type</th><td>{$art/Type/string()}</td></tr>
    <tr><th>Area</th><td>{$art/Area/string()}</td></tr>
    <tr><th>Road</th><td>{$art/Road/string()}</td></tr>
    <tr><th>Location</th><td>{$art/latitude/string()},{$art/longitude/string()}</td></tr>
    {if ($art/description) then <tr><th>Description</th><td>{$art/description/string()}</td></tr> else () }
    <tr><th>Photo</th><td><a href="{$art/URL}"><img src="{$art/URL}" width="400"/></a></td></tr>
  </table>
  </div>
  
  <div>
      {art:artwork-markers($art:artworks,$art)}
      <script type="text/javascript"> var centre = new google.maps.LatLng({$art/latitude/string()},{$art/longitude/string()}); var zoom = 17; </script>
      <div id="map_canvas" class="half_canvas">
      </div>
   </div>
  
  
  </div>
};

declare function art:main() {
  <div>Artworks in Cardiff</div>
};


declare function art:artwork-markers($artworks as element(artwork)*, $focus as element(artwork)?) as element(script) {
<script type="text/javascript">
var markers = [
   { string-join(
       for $art in $artworks
       let $title := replace($art/Title,"'","\\'")
       let $description := replace($art/description,"'","\\'")
       let $type := if ($art/id = $focus/id) then "Focus" else $art/Type
       let $icon :=  concat($art:stem,doc(concat($art:base,"/ref/arttypes.xml"))//arttype[name=$type]/icon)
       let $popup :=  util:serialize(
         <div><h1><a href="{$art:root}art/{$art/id}">{$title}</a></h1><h2>{if ($art/Artist) then concat("by ",replace($art/Artist,"'","\\'")) else ()}{if ($art/Year) then concat(" in ",$art/Year) else ()}</h2>{$description}</div>,
          "method=xhtml media-type=text/html indent=no") 

       return
          concat("['",$title,"',",
                  $art/latitude/string(),",",$art/longitude/string(),
                  ",'",$popup,"','",$icon,"']")
       ,",&#10;")
     }
     ];

</script> 

};

declare function art:map-artworks($artworks as element(artwork)*) as element(div) {
  <div>
      {art:marker-legend()}
      {art:artwork-markers($artworks,())}
      <script type="text/javascript"> var centre = new google.maps.LatLng({$art:centre[1]},{$art:centre[2]}); var zoom = 12; </script>
      <div id="map_canvas" class="full_canvas">
      </div>
   </div>
};


declare function art:log($action) {
   log:log-request("artworks",$action) 
};




declare function art:marker-legend() {
   element div {
       for $type in doc(concat($art:base,"/ref/arttypes.xml"))//arttype
       return <span>{$type/name[1]/string()}<img src="{$art:stem}{$type/icon}"/></span>
   }
};

declare function art:locations() {
  <div>
      <ul>
       {for $location in $art:locations
        return
          <li><a href="{$art:root}location/{$location/name}">{$location/name/string()}</a></li>
       }
     </ul>
 </div>
};

declare function art:about() {
let $max := count($art:artworks)
let $r := util:random($max)
let $art := $art:artworks[$r]
return
<div>
<div id="map_text">
  <h2>About</h2>
  <div>This is a prototype site which maps the artwork in Cardiff. It also provides a mobile version which identifies nearby art. </div>
  
  <h2>Data</h2>
  <div>Raw data for this site has been kindly provided by Michael Barnett of the <a class="external" href="https://www.cardiff.gov.uk/ENG/resident/Planning/City-design-and-public-art/Pages/City-design-and-public-art.aspx">Cardiff City Council planning department. </a></div>
   <div>
  <h2>Links</h2>
  <ul>
   <li><a class="external" href="/Artfind">Artfind</a> Find Artworks  on the go : Firefox/Safari not yet Chrome</li>
   <li><a class="external" target="_blank" href="https://www.cardiff.gov.uk/ENG/resident/Planning/Documents/The%20Cardiff%20Public%20Art%20Register.pdf">Cardiff Public Art Register</a></li>
   <li><a class="external" target="_blank" href="http://ishare.cardiff.gov.uk/mycardiff.aspx">MyCardiff Map</a></li>
   <li><a class="external" target="_blank" href="https://en.wikipedia.org/wiki/List_of_public_art_in_Cardiff">Wikipedia List of public art in Cardiff</a></li>
  </ul>
  </div>
  <h2>Development</h2>
  <div>Developed by  <a href="http://kitwallace.co.uk">Chis Wallace</a> as a contribution to the <a href="http://odcamp.org.uk/">Cardiff Open Data Camp</a>.  Uses <a class="external"  href="http://exist-db.org">eXist XML application platform.</a>
  </div>

 </div>
   <div id="photo">
   <a href="{$art:root}art/{$art/id}"><img src="{$art/URL}" width="400"/></a>
   <h3>{art:caption($art)}</h3>
  </div>
</div>
};
