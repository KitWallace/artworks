import module namespace art = "http://kitwallace.co.uk/lib/art" at "lib/art.xqm";
declare option exist:serialize "method=xhtml media-type=text/html omit-xml-declaration=no indent=yes 
        doctype-public=-//W3C//DTD&#160;XHTML&#160;1.0&#160;Transitional//EN
        doctype-system=http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd";


declare function local:login-form() {
  <div>
  <form action="?" method="post">
     <input type="submit" name="mode" value="view only"/>
     email address<input name="email" size="30"/>
     <input type="password" name="password"/>
     <input type="submit" name="mode" value="editing"/>
    </form>
   </div>
};

declare function local:login($mode) {
    if ($mode="start")
    then local:login-form()
    else if ($mode="editing")
    then
      let $email := request:get-parameter("email",())
      let $password := request:get-parameter("password",())
      let $user := $art:users/user[email=$email]
      return
        if (exists($user) and util:hash($password,"MD5") = $user/password)
        then 
          let $session := session:set-attribute("user",$user/username)
          let $max := session:set-max-inactive-interval(240*60)
          return <div class="run">{$user/username} editing</div>
        else 
          local:login-form()
     else if ($mode="view only")
     then <div class="run"></div>
     else <div>{$mode} unknown </div>
};

declare function local:user() {
   if (session:exists()) then session:get-attribute("user") else "no session"
};

let $mode := request:get-parameter("mode","start")
let $login := local:login($mode)
let $view_range := request:get-parameter("view_range",1000)
let $log := art:log("locate")

return
<html>
    <head>
        
        <link rel="stylesheet" type="text/css" href="{$art:stem}assets/mobile.css"  ></link>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script> 
        {if ($login/@class="run")
         then (
           <script src="https://maps.googleapis.com/maps/api/js?key={$art:googlekey}"></script> ,
           <script type="text/javascript">var editing = {if (exists(local:user())) then "true" else "false"};</script>,
           <script src="{$art:stem}js/mobile.js" type="text/javascript" charset="utf-8"></script>
           )
         else ()
         }
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link href="{$art:stem}assets/BTF.png" rel="icon" sizes="128x128" />
        <link rel="shortcut icon" type="image/png" href="{$art:stem}assets/BTF.png"/>
    </head>
    <body> 
          <h1>Artworks in Cardiff</h1>
          {$login}
          {if ($login/@class="run")
          then 
          <div>
          <span >Nearby <input type="text" name="view_range" id="view_range" value="{$view_range}" size="4" />m </span> <button id="refresh" class="button" onclick="get_position()">Refresh Position</button>  
          <button id="watching" class="button" onclick="watch_change()">Watch OFF</button><br/> 
          <span  id="latlong"></span> <span id="status"></span> <br/>
          <hr/>
          <div id="nearest"> </div>

          <div id="map_canvas" class="full_canvas"></div>
          </div>
          else ()
          }
    </body>
</html>
