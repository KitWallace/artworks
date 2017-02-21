xquery version "3.0";

import module namespace art = "http://kitwallace.co.uk/lib/art" at "lib/art.xqm";
import module namespace math ="http://exist-db.org/xquery/math"  at "org.exist.xquery.modules.math.MathModule";
declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:media-type "application/json";

let $latitude := number(request:get-parameter("latitude",$tcentre[1]))
let $longitude := number(request:get-parameter("longitude",$tcentre[2]))

let $range := number(request:get-parameter("range",2000))
let $longCorr := math:cos(math:radians($art:centre[2]))
return
  element artworks {
            for $art in $art:artworks
            let $alatitude := $art/latitude 
            let $alongitude := $art/longitude 
            let $dlat := ($latitude - number($alatitude)) * 60
            let $dlong := ($longitude - number($alongitude)) * 60 * $longCorr
            let $distance :=  math:sqrt(($dlat * $dlat) + ($dlong * $dlong))  * 1852 (: meters :)
            where $distance <= $range
            order by $distance
            return 
                 element artwork {
                       element distance {$distance},
                       element latitude {$alatitude},
                       element longitude {$alongitude},
                       $art/(id,Title,Artist,Year,description)
                 }
   }
      
