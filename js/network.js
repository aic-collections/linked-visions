if (!document.createElementNS || !document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect) {
  alert('We\'re Sorry, this visualization uses the SVG standard, most modern browsers support SVG. If you would like to see this visualization please view this page in another browser such as Google Chrome, Firefox, Safari, or Internet Explorer 9+');
}

vex.defaultOptions.className = 'vex-theme-os';


var visMode = 'wave';           //the type of network to render, each has it own settings

var tripleStore = null;         //holds the triple data bank created by the rdfquery plugin
var tripleObject = null;        //holds the javascript seralized object of the triple store
var descStore = null;           //holds the triple data bank created by the rdfquery plugin for the description
var descObject = null;          //holds the javascript seralized object of the triple store for the description
var nameObject = null;          //holds the foaf names of the people
var largestNodes = [];          //holds a list of the N largest nodes/people (most connections) in order to place/lock them properly on render
var hidePopupTimer = null;      //holds the timer to close the popup
var showPopupTimer = null;
var currentNode = null;         //the current node we are highligting
var usePerson = null;           //the person in person mode
var usePersonIndex = 0;         //the index pos of the usePerson in the nodes array, so we dont have to loop through the whole thing everytime
var edgesAvg = 0;
var edgesInterval = 0           //the steps between the avg and largest # edges
var trans = [0,0];
var scale = 0.99;
var dynamicPeople = [];         //holds who is added in the dynamic mode
var rendering = false;          //global to keep track if we are rendering from a click or a history pushstate change
var popupShown = false;         //global to keep track if the popup has already been displayed

var idLookup = {}               //holds nice names to uri conversion

var zoom = null;                //the d3.js zoom object
var baseNodes = [];             //stores the base (all) of the nodes and
var baseLinks = [];             // links

var force = null;               //the d3 force object
var vis = null                  //the visualization
var visWidth = 1000;            //width and height of the network canvas, in px
var visHeight = 500;

var connectionCounter = {};     //holds each id as a property name w/ the value = # of connections they have

var connectionIndex = {};       //an object with properties as id names, with values an array of strings of ids that person has connections to.
var largestConnection = 0;
var relationIndex = {};         //an object with properties as relationship ids, with values an array of strings of ids that have that relation.

var simlarityIndex = {}         //properties are id names, with the value being an array of objects with other ids and their # of matching connections
var largestSimilarity = 0;      //holds the max number of similar connections any two nodes share in the network

var strokeWidth = 0.3;          //the defult width to make the stroke

                                //the settings that vary for each diff type of network
var networkGravity =  0;
var netwokrLinkLength = 35;
var networkLargeNodeLimit = 20;	//the number of top nodes to fix/lock to a patterend spot on the network
var netwokrCharge = -800;
var networkStopTick = true;     //when the alpha value drops to display the graph, do we stop the nodes from animating?
var networkNodeDrag = false;    //can you drag the nodes about?

var networkMinEdges = 2;        //the min number of edges to have a node be rendered

var cssSafe = new RegExp(/%|\(|\)|\.|\,|'|"/g);	//the regex to remove non css viable chars

var youTubeObject = '<object style="height=130px; width=200px; position: absolute; bottom: 0px;"> <param name="movie" value="https://www.youtube.com/v/<id>?version=3&feature=player_embedded&controls=1&enablejsapi=1&modestbranding=1&rel=0&showinfo=1&autoplay=1"><param name="allowFullScreen" value="true"><param name="wmode" value="transparent"><param name="allowScriptAccess" value="always"><embed src="https://www.youtube.com/v/<id>?version=3&feature=player_embedded&controls=1&enablejsapi=1&modestbranding=1&rel=0&showinfo=1&autoplay=1" type="application/x-shockwave-flash" allowfullscreen="true" allowScriptAccess="always" width="200" height="130" wmode="transparent"></object>';
var zoomWidgetObj = null;       //the zoom widget draghandeler object
var zoomWidgetObjDoZoom = true;

var oldzoom = 0;

var fill = d3.scale.category10();
var lineColor = d3.scale.category20c();


jQuery(document).ready(function($) {
  $("#gephi").hide();

  // Bind to StateChange Event
  History.Adapter.bind(window,'statechange',function() { // Note: We are using statechange instead of popstate
    var State = History.getState(); // Note: We are using History.getState() instead of event.state
    parseStateChangeVis();
  });

  if(!document.createElementNS || !document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect) {
    jQuery("#network").html(
      'Sorry, this visualization uses the <a href="http://en.wikipedia.org/wiki/Scalable_Vector_Graphics">SVG standard</a>, most modern browsers support SVG.<br>If you would like to see this visualization please view this page in another browser such as <a href="https://www.google.com/chrome">Chrome</a>, <a href="http://www.mozilla.org/en-US/firefox/new/">Firefox</a>, <a href="http://www.apple.com/safari/download/">Safari</a>, or <a href="http://windows.microsoft.com/en-US/internet-explorer/downloads/ie">Internet Explorer 9+</a>'
    );
    return false;
  }

  /* Binds */
  $(window).resize(function() { windowResize();});

  jQuery("#menu_fixed").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {changeVisMode("wave"); });
  jQuery("#menu_similar").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {changeVisMode("clique"); });
  jQuery("#menu_free").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {changeVisMode("free"); });
  jQuery("#menu_dynamic").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {changeVisMode("dynamic"); });

  jQuery("#filter_all").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {hideRelations(); });
  jQuery("#filter_family").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {showRelations("family"); });
  jQuery("#filter_friends").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {showRelations("friends"); });
  jQuery("#filter_colleagues").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {showRelations("colleagues"); });
  jQuery("#filter_mentors").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {showRelations("mentors"); });
  jQuery("#filter_employers").mouseenter(function() {$(this).css("opacity",1); }).mouseleave(function() {$(this).css("opacity",0.15); }).click(function() {showRelations("employers"); });

  $("#dynamicSearchInput").keyup(function() {dynamicFilterList(); });
  $("#dynamicSearchClear").click(function() {$("#dynamicSearchInput").val(''); dynamicFilterList(); });
  $("#dynamicClear").click(function() {dynamicPeople = []; filter(); });

  //$("#network").fadeOut();

  var history = History.getState();
  if (history.hash.search(/\?person=/) > -1) {
    visMode = "person";
  }
  windowResize();

  //showSpinner("Loading<br>Triples");

  initalizeNetwork();

  //give the UI some breathing room, a chance to render
  setTimeout(function() {

    //grab the names of the artists
    $.get('data/names.txt', function(data) {
      buildNameStore(data);
    });


    //grab the descripons of the artists
    $.get('data/abstracts.txt', function(data) {
      buildDescriptionStore(data);
    });

    $.get('data/relationships.txt', function(data) {

      buildTripleStore(data);

      dataAnalysis();

      //we need the description data ready because it has the names in it
      var interval = window.setInterval(function checkDescriptionStore() {
        if (window.descObject) {
          window.clearTimeout(interval);
          buildBase();

          parseStateChangeVis();
        }
      },10);

    })
      .error(function() { alert("There was an error in accessing the data file. Please try again."); });

  }, 10, []);


  //add the zoom widget
  jQuery("#network").append(
    jQuery("<div>")
      .attr("id","zoomWidget")
      .addClass("dragdealer")
      .append(
        jQuery("<div>")
          .addClass("handle")
          .append(
            jQuery("<div>")
              .text("-")
          )
      )
      .append(
        jQuery("<div>")
          .addClass("zoomWidgetRail")
      )
      .append(
        jQuery("<div>")
          .addClass("zoomWidgetEndcaps")
          .attr("id","woomWidgetZoomOut")
          .css("top","-17px")
          .append(
            jQuery("<div>")
              .text("-")
          )
      )
      .append(
        jQuery("<div>")
          .addClass("zoomWidgetEndcaps")
          .attr("id","woomWidgetZoomIn")
          .css("top","145px")
          .append(
            jQuery("<div>")
              .text("+")
          )
      )

  );

  jQuery("#zoomWidget").mouseenter(function() {console.log('whhyyy'); zoomWidgetObjDoZoom = true; });

  zoomWidgetObj = new Dragdealer('zoomWidget',
                                 {
                                   horizontal: false,
                                   vertical: true,
                                   y: 0.255555555,
                                   animationCallback: function(x, y)
                                   {
                                     //if the value is the same as the intial value exit, to prevent a zoom even being called onload
                                     if (y==0.255555555) {return false;}
                                     //prevent too muuch zooooom
                                     if (y<0.05) {return false;}


                                     //are we  zooming based on a call from interaction with the slider, or is this callback being triggerd by the mouse event updating the slider position.
                                     if (zoomWidgetObjDoZoom == true) {

                                       y =y *4;

                                       //this is how it works now until i figure out how to handle this better.
                                       //translate to the middle of the vis and apply the zoom level
                                       vis.attr("transform", "translate(" + [(visWidth/2)-(visWidth*y/2),(visHeight/2)-(visHeight*y/2)] + ")"  + " scale(" + y+ ")");
                                       //store the new data into the zoom object so it is ready for mouse events
                                       zoom.translate([(visWidth/2)-(visWidth*y/2),(visHeight/2)-(visHeight*y/2)]).scale(y);
                                     }



                                   }
                                 });
});

function parseStateChangeVis() {

  var history = History.getState();

  if (history.hash.search(/\?person=/) > -1) {

    var person = history.hash.split('?person=')[1];
    //trim off the suid that the library attaches if we need to. hacky
    if (person.search(/_suid=/)>-1) {
      person = person.split('&_suid=')[0]
    }

    //lookup that nice name for the uri
    usePerson = jQuery.map(idLookup, function(obj,index) {
      if(obj === person)
        return index;
    })[0];

    changeVisMode("person");

  } else if (history.hash.search(/\?mode=/) > -1) {

    var mode = history.hash.split('?mode=')[1];
    //sometime this id gets append to the url
    if (mode.search(/_suid=/)>-1) {
      mode = mode.split('&_suid=')[0]
    }
    changeVisMode(mode);

  } else {
    //showSpinner("Rendering<br>Network");
    filter();
  }
}

function initalizeNetwork() {

  $("#dynamicListHolder, #dynamicSearchHolder, #dynamicClear").css("display","none")

  $("#video").css("left","0px");
  if (visMode == "wave") {
    networkGravity =  0.5;
    netwokrLinkLength = 25;
    networkLargeNodeLimit = 20;
    netwokrCharge = -600;
    networkMinEdges = 2;
    networkStopTick = true;
    networkNodeDrag = false;

  }

  if (visMode == "free") {
    networkGravity =  0.1;
    netwokrLinkLength = 25;
    networkLargeNodeLimit = 20;
    netwokrCharge = -45;
    networkMinEdges = 2;
    networkStopTick = true;
    networkNodeDrag = false;
    //scale = 0.6;
    //trans = [visWidth/6,visHeight/6];
  }

  if (visMode == "person") {
    networkGravity = 0.5;
    netwokrLinkLength = 25;
    networkLargeNodeLimit = 20;
    netwokrCharge = function (d) {return Math.floor(Math.random()*visWidth*-6-visHeight*2)}; 
    networkStopTick = true;
    networkNodeDrag = false;
  }

  if (visMode == "clique") {
    networkGravity =  0.1;
    netwokrLinkLength = 125;
    networkLargeNodeLimit = 20;
    netwokrCharge = -1500;
    networkMinEdges = 4;
    networkStopTick = true;
    networkNodeDrag = false;
  }

  if (visMode == "dynamic") {
    networkGravity =  0.05;
    netwokrLinkLength = 500;
    networkLargeNodeLimit = 20;
    netwokrCharge = -800;
    networkStopTick = false;
    networkNodeDrag = true;

    //if we have not yet built the dynamic list
    if ($("#dynamicListHolder").length<2) {
      //get dynamic list ready
      buildDynamicList();
    }

    $("#video").css("left","225px");

    $("#dynamicListHolder, #dynamicSearchHolder").css("display","block")

    //show a hint
    if (dynamicPeople.length == 0) {

      $("#dynamicHelp").fadeIn(10,function() {

        $("#dynamicHelp").fadeOut(5000);

      })
    } else {
      $("#dynamicClear").fadeIn(5000);
    }
  }

  //if it has already been defined
  if (force == null) {
    force = d3.layout.force()
      .size([$("#network").width() - 5, $("#network").height() - 5]);
  }

  force.gravity(networkGravity);
  force.linkStrength(function(d) {  return linkStrength(d);});
  force.distance(netwokrLinkLength);
  force.charge(netwokrCharge);
  force.chargeDistance(visWidth/2);
  
  if (vis == null) {
    zoom = d3.behavior.zoom()
      .translate([0,0])
      .scale(0.99)
      .scaleExtent([0.25,6])	//how far it can zoom out and in
      .on("zoom", redraw);

    vis = d3.select("#network").append("svg:svg")
      .attr("width", $("#network").width() - 10)
      .attr("height", $("#network").height() - 10)
      .append('svg:g')
      .call(zoom)//.call(d3.behavior.zoom().scaleExtent([0.25, 6]).on("zoom", redraw)) //.call(d3.behavior.zoom().on("zoom", redraw))
      .append('svg:g');

    vis.append('svg:rect')
      .attr('width', $("#network").width() + 1000)
      .attr('height', $("#network").height() + 1000)
      .attr('fill', 'white')
      .attr('id', 'zoomCanvas')
      .style("cursor",  "url(menu/openhand.png)")
      .on("mousedown", function() {

        //the grabbing css rules do not work with web-kit, so specifiy the cursor hand and use the css for firefox.
        d3.select("#zoomCanvas").style("cursor",  "url(menu/closedhand.png)");
        d3.select("#zoomCanvas").attr("class","grabbing");
      })
      .on("mouseup", function() {
        d3.select("#zoomCanvas").style("cursor",  "url(menu/openhand.png)");
        d3.select("#zoomCanvas").attr("class","");
      });
  }

  vis.attr("transform",
           "translate(" + trans + ")"
           + " scale(" + scale + ")");
}

//process the triple data through the RDF jquery plugin to create an object
function buildTripleStore(data) {

  tripleStore = $.rdf.databank([],
                               { base: 'http://www.dbpedia.org/',
                                 namespaces: {
                                   dc: 'http://purl.org/dc/elements/1.1/',
                                   foaf: 'http://xmlns.com/foaf/0.1/',
                                   lj: 'http://www.linkedjazz.org/lj/',
                                   aic: 'http://lv.artic.edu/ns#',
                                   rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                                   rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
                                   xml: 'http://www.w3.org/XML/1998/namespace',
                                   xsd: 'http://www.w3.org/2001/XMLSchema#'
                                 } 
                               });


  // I'm only intrested in the knowsOf right now before we work more on verifying the 52nd street stuff, so just make all relationships knowsof
  var alreadyKnows = [];

  /***********
   *   The file we are loading is expected to be a triple store in the format '<object> <predicate> <object> .\n'
   *   Note the space after the final object and the '.' and the \n only
   ************/
  var triples = data.split("\n");
  for (x in triples) {
    if (triples[x].length > 0) {
      try{
        tripleStore.add(triples[x]);
      }
      catch (err) {
        //if it cannot load one of the triples it is not a total failure, keep going
        console.log('There was an error processing the data file:');
        console.log(err);
      }
    }
  }

  tripleObject = tripleStore.dump()
}

//process the triple data through the RDF jquery plugin to create an object
function buildDescriptionStore(data) {

  var descStore = $.rdf.databank([],
                                 { base: 'http://www.dbpedia.org/',
                                   namespaces: {
                                     dc: 'http://purl.org/dc/elements/1.1/',
                                     wc: 'http://www.w3.org/2000/01/rdf-schema',
                                     lj: 'http://www.linkedjazz.org/lj/' } });


  /***********
   *   The file we are loading is expected to be a triple dump in the format '<object> <predicate> <object> .\n'
   *   Note the space after the final object and the '.' and the \n only
   ************/
  var triples = data.split("\n");
  for (x in triples) {
    if (triples[x].length > 0) {
      try{
        descStore.add(triples[x]);
      }
      catch (err) {
        //if it cannot load one of the triples it is not a total failure, keep going
        console.log('There was an error processing the data file:');
        console.log(err);
      }
    }
  }

  descObject = descStore.dump()
}

//process the triple data through the RDF jquery plugin to create an object
function buildNameStore(data) {

  var nameStore = $.rdf.databank([],
                                 { base: 'http://www.dbpedia.org/',
                                   namespaces: {
                                     dc: 'http://purl.org/dc/elements/1.1/',
                                     wc: 'http://www.w3.org/2000/01/rdf-schema',
                                     lj: 'http://www.linkedjazz.org/lj/' } });

  /***********
   *   The file we are loading is expected to be a triple dump in the format '<object> <predicate> <object> .\n'
   *   Note the space after the final object and the '.' and the \n only
   ************/
  var triples = data.split("\n");
  for (x in triples) {
    if (triples[x].length > 0) {
      try{
        nameStore.add(triples[x]);
      }
      catch (err) {
        //if it cannot load one of the triples it is not a total failure, keep going
        console.log('There was an error processing the data file:');
        console.log(err);
      }
    }
  }

  nameObject = nameStore.dump();
}

function dataAnalysis() {

  //we need to know some stats about the people before we start to render the network
  //find out the largest nodes
  var totalConnections = 0;
  for (x in tripleObject) {	//each x here is a person

    var size = 0;
    for (y in tripleObject[x]) {		//this level is the types of relations, mentions, knows, etc. each y here is a realtion bundle
      size = size + tripleObject[x][y].length;
    }
    var sizeObj = {};
    sizeObj.node = x;
    sizeObj.size = size;
    sizeObj.random = Math.floor((Math.random()*100)+1);
    largestNodes.push(sizeObj);
    totalConnections = totalConnections + size;
  }

  //now an array of objects of with the .node property being the index to the tripleObect
  largestNodes.sort(function(a,b) {
    return b.size - a.size;
  });

  //find out the range of number of connections to color our edges
  edgesAvg = Math.floor(totalConnections/largestNodes.length);
  edgesInterval = (largestNodes[0].size - edgesAvg) / 3;
  console.log("edgesInterval: " + edgesInterval);

  var flipFlop = 0;
  //for (largeNode in largestNodes) {
  //	largestNodes[largeNode].flipFlop =  (flipFlop % 2 == 1) ?  (flipFlop*-1) : (flipFlop);
  for (var i = largestNodes.length - 1; i >= 0; i--) {
    largestNodes[i].flipFlop =  (flipFlop % 2 == 1) ?  (flipFlop*-1) : (flipFlop);
    flipFlop++;
  }
  largestNodes.splice(networkLargeNodeLimit,largestNodes.length-networkLargeNodeLimit);
  largestNodes.sort(function(a,b) {
    return b.flipFlop - a.flipFlop;
  });

  if (visMode == "wave") {
    //we want to pin some of the larger nodes to the outside in order to keep things readable, so figure our where to put them and store it in this obj array
    for (n in largestNodes) {
      var nudge = 0;
      var r = visHeight/3;
      var a = (186 / largestNodes.length) * n;

      if (n == 0) {nudge = 50;}
      if (n == 1) {nudge = -50;}

      largestNodes[n].x = (visWidth/2) + (r+visWidth/4) * Math.cos(a);
      largestNodes[n].y = (visHeight/2) + nudge - 10 + r * Math.sin(a);

      /*

        vis.append("circle")
        .attr("class", "node")
        .attr("cx", largestNodes[n].x)
        .attr("cy", largestNodes[n].y)
        .attr("r", 8)
        .style("fill", function(d, i) { return fill(i & 3); })
        .style("stroke", function(d, i) { return d3.rgb(fill(i & 3)).darker(2); })
        .style("stroke-width", 1.5);

      */

    }
  }
}


//	Builds the base nodes and links arrays
function buildBase() {

  var allObjects = [];
  var quickLookup = {};

  //we need to establish the nodes and links
  //we do it by making a string array and adding their ids to it, if it is unique in the string array then we can add the object to the node array

  for (x in tripleObject) {	//each x here is a person
    if (allObjects.indexOf(String(x)) == -1) {
      allObjects.push(String(x));
      baseNodes.push({id: String(x)});
    }

    for (y in tripleObject[x])
    { //this level is the types of relations, mentions, knows, etc. each y here is a realtion bundle
      for (z in tripleObject[x][y]) { //here each z is a relation
        if (allObjects.indexOf(tripleObject[x][y][z].value) == -1) {

          baseNodes.push({id: tripleObject[x][y][z].value});
          allObjects.push(tripleObject[x][y][z].value);

          //we are adding props to this object to store their # of connections, depending on the order they may have already been added if they
          //were added by the creatLink function, so in both places check for the propery and add it in if it is not yet set

          if (!connectionCounter.hasOwnProperty(tripleObject[x][y][z].value)) {
            connectionCounter[tripleObject[x][y][z].value] = 0;
          }

          if (!quickLookup.hasOwnProperty(tripleObject[x][y][z].value)) {
            quickLookup[tripleObject[x][y][z].value] = -1;
          }

        }
        createLink(String(x),tripleObject[x][y][z].value,String(y));
      }
    }
  }

  //asign the number of connections each node has  and add the label
  for (aNode in baseNodes) {
    baseNodes[aNode].connections = connectionCounter[baseNodes[aNode].id];
    if (baseNodes[aNode].connections>largestConnection) {largestConnection = baseNodes[aNode].connections;}

    //build an human label
    var id = baseNodes[aNode].id;
    var label = "";

    if (nameObject.hasOwnProperty(id)) {

      if (nameObject[id]['http://xmlns.com/foaf/0.1/name']) {
        label = nameObject[id]['http://xmlns.com/foaf/0.1/name'][0].value;
      }
    }

    if (label == "") {
      label = $.trim(decodeURIComponent(baseNodes[aNode].id.split("/")[baseNodes[aNode].id.split("/").length-1]).replace(/\_/g,' '));
      if (label.search(/\(/) != -1) {
        label = label.substring(0,	label.indexOf("("));
      }
      label = $.trim(label);

    }

    idLookup[baseNodes[aNode].id] = encodeURIComponent(label.replace(/\s/g,"_"));

    baseNodes[aNode].label = label;

    //build a label lastname first
    label = label.split(" ");

    if (label[label.length-1].toLowerCase() == 'jr.' || label[label.length-1].toLowerCase() == 'jr' || label[label.length-1].toLowerCase() == 'sr.' || label[label.length-1].toLowerCase() == 'sr') {
      var lastLabel = label[label.length-2].replace(',','') + ' ' +  label[label.length-1] + ',';
      for (var i = 0; i <= label.length-2; i++) {
        lastLabel = lastLabel + ' ' + label[i].replace(',','');
      }
    } else {
      var lastLabel =  label[label.length-1] + ',';
      for(var i = 0; i <= label.length-2; i++) {
        lastLabel = lastLabel + ' ' + label[i].replace(',','');
      }
    }

    baseNodes[aNode].labelLast = lastLabel;
  }

  //we are building the similarity index here, basiclly it loops through all of the people and compairs their connections with everyone else
  //people who have similar connections have larger  simlarityIndex = the # of connections
  for (var key in connectionIndex) {
    var tmpAry = [];
    if (connectionIndex[key].length > 1) {
      for (var key2 in connectionIndex) {
        if (key != key2) {
          if (connectionIndex[key2].length > 1) {
            var tmpCount = 0;
            tmpCount =  connectionIndex[key].filter(function(i) {return !(connectionIndex[key2].indexOf(i) == -1);}).length;
            if (tmpCount>1) {
              tmpAry.push({name:key2,count:tmpCount})
              if (tmpCount>largestSimilarity) {largestSimilarity = tmpCount;}
            }
          }
        }
      }
    }
    tmpAry.sort(function(a,b) {
      return b.count - a.count;
    });

    simlarityIndex[key] = {};

    for (x in tmpAry) {
      simlarityIndex[key][tmpAry[x].name] = tmpAry[x].count;
    }
  }

  function createLink(id1, id2, pred) {
    var obj1 = null, obj2 = null;

    //in an effor to speed this lookup a little is to see if we have indexed the pos of the requested ids already, if so do not loop
    if (quickLookup[id1]>-1 && quickLookup[id2]>-1) {
      obj1 = quickLookup[id1];
      obj2 = quickLookup[id2];
    } else {
      //not yet in the quicklookup object, it will be added here
      for (q in baseNodes) {
        if (baseNodes[q].id == id1) {obj1 = q;}
        if (baseNodes[q].id == id2) {obj2 = q;}
        if (obj1 != null && obj2 != null) {
          quickLookup[id1] = obj1;
          quickLookup[id2] = obj2;

          break;
        }
      }
    }

    var customClass = "link_" + id1.split("/")[id1.split("/").length-1].replace(cssSafe,'');
    customClass = customClass + " link_" + id2.split("/")[id2.split("/").length-1].replace(cssSafe,'');

    baseLinks.push({source: baseNodes[obj1], target: baseNodes[obj2], distance: 5, customClass:customClass});

    //+1 the number of conenctions, of it is not yet in the object, add it at 1
    if (!connectionCounter.hasOwnProperty(id1)) {
      connectionCounter[id1] = 1;
    } else {
      connectionCounter[id1] = connectionCounter[id1] + 1;
    }
    if (!connectionCounter.hasOwnProperty(id2)) {
      connectionCounter[id2] = 1;
    } else {
      connectionCounter[id2] = connectionCounter[id2] + 1;
    }

    //add this relation ship to the connectionIndex object
    //has propery yet?
    if (!connectionIndex.hasOwnProperty(id1)) {
      connectionIndex[id1] = [];
    }
    if (!connectionIndex.hasOwnProperty(id2)) {
      connectionIndex[id2] = [];
    }

    //does it have this relationship already?
    if (connectionIndex[id1].indexOf(id2) == -1) {
      connectionIndex[id1].push(id2);
    }
    if (connectionIndex[id2].indexOf(id1) == -1) {
      connectionIndex[id2].push(id1);
    }

    //add this relationship to the relationIndex object
    //has propery yet?
    if (!relationIndex.hasOwnProperty(pred)) {
      relationIndex[pred] = [];
    }

    //does it have this relationship already?
    if (relationIndex[pred].indexOf(id1) == -1) {
      relationIndex[pred].push(id1);
    }
    if (relationIndex[pred].indexOf(id2) == -1) {
      relationIndex[pred].push(id2);
    }
  }
}

function filter(clear) {
  if (typeof clear == 'undefined') {clear = true;}

  //are we wiping the nodes out or just adding?
  if (clear) {
    //$("#network").css("visibility","hidden");
    vis.selectAll("g.node").remove();
    vis.selectAll("line.link").remove();


    nodes = [];
    links = [];
    force.nodes([]);
    force.links([]);
    restart();
  }

  var workingNodes = [];
  var workingLinks = [];

  nodesRemove = {};

  if (visMode == 'person') {
    for (var key in connectionIndex) {
      if (connectionIndex[key].indexOf(usePerson) == -1 && key != usePerson) {
        nodesRemove[key] = true;
      }
    }
  } else if (visMode == 'dynamic') {

    console.log('dynamicPeople: ' + dynamicPeople);

    var connected = [];
    var connetedCounteed = {};

    //we want to only add people if they are a selected person, or they have a connection that is shared by at least one person aready on the graph

    for (x in dynamicPeople) {
      //add everyones connections
      for (y in connectionIndex[dynamicPeople[x]]) {
        connected.push(connectionIndex[dynamicPeople[x]][y]);
      }
    }

    for (x in connected) {
      if (connetedCounteed.hasOwnProperty(connected[x])) {
        connetedCounteed[connected[x]] = connetedCounteed[connected[x]] + 1;
      } else {
        connetedCounteed[connected[x]] = 1;
      }
    }

    console.log('connetedCounteed: ' + connetedCounteed);

    for (x in baseNodes) {

      //is this node in the conenctions?
      if (connetedCounteed.hasOwnProperty(baseNodes[x].id)) {

        //yes, but do they have more than one entry, meaning that more than 1 person has them as a connection?
        if (connetedCounteed[baseNodes[x].id] < 2) {

          //no
          //but are they one of the dynamic people?
          if (dynamicPeople.indexOf(baseNodes[x].id) == -1) {
            //no
            nodesRemove[baseNodes[x].id] = true;
          }
        }
      } else {

        //no...but are they the person themselfs?
        if (dynamicPeople.indexOf(baseNodes[x].id) == -1) {
          //no, remove them
          nodesRemove[baseNodes[x].id] = true;
        }
      }
    }
  } else {

    //filter out people with too little number of conenctions. we use the connectionCounter from the buildBase function
    for (var key in connectionCounter) {
      if (connectionCounter.hasOwnProperty(key)) {
        if (connectionCounter[key] < networkMinEdges) {
          nodesRemove[key] = true;
        }
      }
    }
  }

  //now build the working arrays of the things we want to keep,
  for (aNode in baseNodes) {
    if (!nodesRemove.hasOwnProperty(baseNodes[aNode].id)) {
      workingNodes.push(baseNodes[aNode]);
    }
  }

  for (aLink in baseLinks) {
    if (nodesRemove.hasOwnProperty(baseLinks[aLink].source.id) == false && nodesRemove.hasOwnProperty(baseLinks[aLink].target.id) == false) {
      workingLinks.push(baseLinks[aLink]);
    }
  }

  if(visMode == 'dynamic') {
    //for the dynmaic mode, we don't want a whole mess of edges cofusing things, since we are just intrested in how the added people are connected
    var temp = [];
    for (aLink in workingLinks) {
      if (dynamicPeople.indexOf(workingLinks[aLink].source.id) != -1 || dynamicPeople.indexOf(workingLinks[aLink].target.id) != -1) {
        temp.push(workingLinks[aLink]);
      }
    }
    workingLinks = temp;

  }

  /*

    for (var i = nodesRemove.length - 1; i >= 0; i--) {
    nodes.splice(nodesRemove[i],1);
    }
    for (var i = linksRemove.length - 1; i >= 0; i--) {
    links.splice(linksRemove[i],1);
    }
  */

  //lock the large nodes to the pattern
  for (aNode in workingNodes) {
    workingNodes[aNode].lock = false;
    //workingNodes[aNode].y = visHeight / 2;
    //workingNodes[aNode].x = Math.floor((Math.random()*visWidth)+1);
    if (visMode != "person") {
      for (large in largestNodes) {
        if (largestNodes[large].node == workingNodes[aNode].id) {
          workingNodes[aNode].lockX = largestNodes[large].x;
          workingNodes[aNode].lockY = largestNodes[large].y;
          workingNodes[aNode].lock = true;
        }
      }
    }

    if (visMode == "person" && workingNodes[aNode].id == usePerson) {
      usePersonIndex = aNode;
    }
  }

  //copy over our work into the d3 node/link array
  nodes = force.nodes();
  links = force.links();

  for (aNode in workingNodes) {
    nodes.push(workingNodes[aNode]);
  }
  for (aLink in workingLinks) {
    links.push(workingLinks[aLink]);
  }

  /*
    if (visMode == 'dynamic') {
    //we also dont want to double add nodes, we needed to leave them in up to this point so the new links could be drawn, but, now take them out
    var temp = [];
    for (r in nodes) {

    var add = true;

    //is it already in there?
    for (n in temp) {
    if (nodes[r].id == temp[n].id) {
    add = false;
    }
    }

    if (add) {
    temp.push(nodes[r]);
    }

    }
    nodes = temp;



    }


    console.log(nodes);
  */

  restart();
}

function restart() {

/*  vis.append("svg:defs").selectAll("marker")
    .data(["FOAFknows"])
    .enter().append("svg:marker")
    .attr("id", String)
    .attr("class","marker")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 10)
    .attr("markerHeight", 10)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5")
    .style("fill","#666")
    .style("stroke-width",0);
*/
  
  vis.selectAll("line.link")
    .data(links)
    .enter().insert("line", "circle.node")
    .style("stroke",function(d) {return edgeColor(d);})
    .style("stroke-width",function(d) {return edgeStrokeWidth(d);})
    .attr("class", function(d) {return "link " + d.customClass})
    //.attr("marker-end", function(d) { return  (visMode == "person"||visMode == "dynamic") ? "url(#FOAFknows)" : "none"; })
    .attr("x1", function(d) { return d.source.x; })
    .attr("y1", function(d) { return d.source.y; })
    .attr("x2", function(d) { return d.target.x; })
    .attr("y2", function(d) { return d.target.y; });

  var node = vis.selectAll("g.node")
    .data(nodes);

  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .style("cursor","pointer")
      .attr("id", function(d) {  return "node_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
      /*.on("click",function(d) {
        //$("#network").fadeOut('fast',
        //                    function() {
        usePerson = d.id;
        changeVisMode("person");
        //                  }
        //               );
      });*/

  if (networkNodeDrag) {
    nodeEnter.call(force.drag);
  }

  nodeEnter.append("circle")
    .attr("id", function(d) {return "backgroundCircle_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'');})
    .attr("class","backgroundCircle")
    .attr("cx", function(d) { return 0; })
    .attr("cy", function(d) { return 0; })
    .attr("r", function(d) { return  returnNodeSize(d); })
    .style("fill", "#000000")
	.style("stroke", "#000000")
    .style("stroke-width", function(d) {return returnNodeStrokeWidth(d);});
	
  nodeEnter.append("svg:image")
    .attr("id", function(d) {  return "imageCircle_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("class","imageCircle")
    .attr("xlink:href", function(d) {

      var useId = $.trim(decodeURI(d.id).split("\/")[decodeURI(d.id).split("\/").length-1]);
      if (fileNames.indexOf(useId+'.png') == -1) {
        return "menu/whistler.png";
      } else {
        return "/image/round/" + useId+'.png';
      }
    })
    .attr("x", function(d) { return  (returnNodeSize(d)*-1); })
    .attr("y", function(d) { return  (returnNodeSize(d)*-1); })
    .attr("width", function(d) { return  (returnNodeSize(d)*2); })
    .attr("height", function(d) { return  (returnNodeSize(d)*2); })
	.style("opacity", function(d) { return returnNodeOpac(d);  })
	.attr("visibility", function(d) { return returnNodeVisible(d);  });
	
	  nodeEnter.append("svg:text")
    .attr("id", function(d) {  return "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("font-size", function(d) {return returnNodeSize2(d) / 2})
    .attr("class",  function(d) {return "circleText"})
    .attr("font-family", "Verdana, Geneva, sans-serif")
	  .style("text-transform", "uppercase")
	  .style("letter-spacing", ".25em")
    .attr("text-anchor","middle")
    .attr("display",function(d) { return displayLabel(d);})
    .attr("x", function(d) { return  (returnTextLoc(d)*-0.1); })
    .attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8; })
	  .style("fill", "#000000")
	  .attr("visibility", "hidden")
    .text(function(d) { return d.label; });	//console.log('d.label', d.label);

	nodeEnter.append("svg:rect")
    .attr("id", function(d) {  return "circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("class",  function(d) {return "circleTextRect"})
	  .attr("x", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().x; })
    .attr("y", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    .attr("width", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width; })
    .attr("height", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().height; })
	  .attr("stroke", "black")
	  .attr("stroke-width", 10)
	  .attr("visibility", "visible")
	  .style("fill", "black");

  nodeEnter.append("svg:text")
    .attr("id", function(d) {  return "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("font-size", function(d) {return returnNodeSize2(d) / 2})
    .attr("class",  function(d) {return "circleText"})
    .attr("font-family", "Verdana, Geneva, sans-serif")
	  .style("text-transform", "uppercase")
	  .style("letter-spacing", ".25em")
    .attr("text-anchor","middle")
    .attr("display",function(d) { return displayLabel(d);})
    .attr("x", function(d) { return  (returnTextLoc(d)*-0.1); })
    .attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8; })
	  .style("fill", "#ffffff")
	  .attr("visibility", "visible")
    .text(function(d) { return d.label; });	// console.log('d.label', d.label); 

  nodeEnter.append("svg:text")
    .attr("id", function(d) {  return "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("font-size", function(d) {return returnNodeSize2(d) / 2})
    .attr("class",  "labelText")
    .attr("font-family", "Verdana, Geneva, sans-serif")
	  .style("text-transform", "uppercase")
	  .style("letter-spacing", ".25em")
    .attr("text-anchor","middle")
    .attr("display",function(d) { return displayLabel(d);})
    .attr("x", function(d) { return  (returnTextLoc(d)*-0.1); })
    .attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+20; })
	  .style("fill", "#000000")
	  .attr("visibility", "hidden")
    .text("ARTIST");	
	
  nodeEnter.append("svg:rect")
    .attr("id", function(d) {  return "labelRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
	  .attr("x", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().x; })
    .attr("y", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    .attr("width", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width; })
    .attr("height", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().height; })
	  .attr("class",  "labelRect")
	  .attr("stroke", "black")
	  .attr("stroke-width", 10)
	  .style("opacity", 0)
	  .attr("visibility", "hidden")
	  .style("fill", "black");
	
  nodeEnter.append("svg:text")
    .attr("id", function(d) {  return "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("font-size", function(d) {return returnNodeSize2(d) / 2})
    .attr("class",  "labelText")
    .attr("font-family", "Verdana, Geneva, sans-serif")
	  .style("text-transform", "uppercase")
	  .style("letter-spacing", ".25em")
    .attr("text-anchor","middle")
    .attr("display",function(d) { return displayLabel(d);})
    .attr("x", function(d) { return  (returnTextLoc(d)*-0.1); })
    .attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+20; })
	  .style("fill", "#ffffff")
	  .style("opacity", 0)
	  .attr("visibility", "hidden")
    .text("ARTIST");
	
  
  // Align nodes along a diagonal for speedier rendering
  var n = nodes.length;
  /*nodes.forEach(function(d, i) {
    d.x = d.y = visWidth / n * i;
  });*/

  //controls the movement of the nodes
  force.on("tick", function(e) {
	  
	for (aNode in nodes) {
			nodes[aNode].width = $("#" + "node_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1])[0].	getBBox().width;
			nodes[aNode].height = $("#" + "node_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1])[0].getBBox().height;
		
			nodes[aNode].x2 = nodes[aNode].width;	
			nodes[aNode].y2 = nodes[aNode].height;
			//console.log('nodes[aNode]', nodes[aNode]);
			//console.log('nodes[aNode].x2', nodes[aNode].x2);
			//console.log('nodes[aNode].y2', nodes[aNode].y2);
		  }
		  
	  var q = d3.geom.quadtree(nodes);
	  nodes.forEach(function(d) {
		  console.log('d', d);
		  q.visit(collide(d));
	  });

    if (visMode == "wave" || visMode == "person") {
      for (aNode in nodes) {
        if (nodes[aNode].lock) {
          nodes[aNode].x = nodes[aNode].lockX;
          nodes[aNode].y = nodes[aNode].lockY;
        } else {
          if (e.alpha <= .08) {
            if  (nodes[aNode].y <= 0) { nodes[aNode].y = Math.floor((Math.random()*20)+8); nodes[aNode].lock = true; nodes[aNode].lockY = nodes[aNode].y; nodes[aNode].lockX = nodes[aNode].x; }
            if  (nodes[aNode].y >= visHeight) {nodes[aNode].y = visHeight- Math.floor((Math.random()*60)+20); nodes[aNode].lock = true; nodes[aNode].lockY = nodes[aNode].y; nodes[aNode].lockX = nodes[aNode].x; }
          }
        }
      }
    }

    if (visMode == "person") {
      nodes[usePersonIndex].x = visWidth/2;
      nodes[usePersonIndex].y = visHeight/2;
      showPopup(nodes[usePersonIndex]);
    }

    if (networkStopTick) {
      if (e.alpha <= .02) {
        hideSpinner();

	
        if ($("#network").css("visibility") != "visible") {
          $("#network").css("visibility","visible");
          $("#network").fadeIn();
          $("#zoomWidget").css("visibility","visible");
        }

        if (networkStopTick) {
          //force.stop();
        }
      }
    } else {
      hideSpinner();

      //in this mode (don't stop tick) is used by the dynamic mode, we ewant to illustrat the flow of relationships, so
      //do the math needed to draw the markers on the outside of the nodes.
      //for the other modes, its not important
      vis.selectAll("line.link")
        .attr("x1", function(d) { return pointsBetween(d.source,d.target)[0][0]; })
        .attr("y1", function(d) { return pointsBetween(d.source,d.target)[0][1]; })
        .attr("x2", function(d) { return pointsBetween(d.source,d.target)[1][0];})
        .attr("y2", function(d) { return pointsBetween(d.source,d.target)[1][1]; });

      vis.selectAll("g.node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")";});

      if ($("#network").css("visibility") != "visible") {
        $("#network").css("visibility","visible");
        $("#network").fadeIn();
        $("#zoomWidget").css("visibility","visible");
      }
    }
  });

  force.start();
  for (var i = 0; i < n*10; ++i) force.tick();
  force.stop();

  vis.selectAll("line.link")
    .attr("x1", function(d) { return d.source.x;})
    .attr("y1", function(d) { return d.source.y; })
    .attr("x2", function(d) { return d.target.x; })
    .attr("y2", function(d) { return d.target.y; });

  vis.selectAll("g.node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")";});
}

function valueInRange(value, mini, maxi)
{ return (value >= mini) && (value <= maxi); }

function overlap(A, B)
{
    xOverlap = valueInRange(A.x, B.x, B.x + B.width) ||
                    valueInRange(B.x, A.x, A.x + A.width);
	if (xOverlap) {				
	console.log('xOverlap', xOverlap);
	}

    yOverlap = valueInRange(A.y, B.y, B.y + B.height) ||
                    valueInRange(B.y, A.y, A.y + A.height);
	if (yOverlap) {				
	console.log('yOverlap', yOverlap);
	}
	
    return xOverlap || yOverlap;
}

function collide(node) {
	console.log('collideNode', node);
	  var nx1, nx2, ny1, ny2, padding;
	  padding = 32;
	  nx1 = node.x - padding;
	  nx2 = node.x2 + padding;
	  ny1 = node.y - padding;
	  ny2 = node.y2 + padding;
	  return function(quad, x1, y1, x2, y2) {
		console.log('quad', quad);
		var dx, dy;
		if (quad.point && (quad.point !== node)) {
		  if (overlap(node, quad.point)) {
			console.log('collideNode', node);
			console.log('quad.point', quad.point);
			dx = Math.min(node.x2 - quad.point.x, quad.point.x2 - node.x) / 2;
			node.x -= dx;
			quad.point.x -= dx;
			  console.log('node.y2 - quad.point.y', node.y2 - quad.point.y);
			  console.log('quad.point.y2 - node.y', quad.point.y2 - node.y);
			dy = Math.min(node.y2 - quad.point.y, quad.point.y2 - node.y) / 2;
			console.log('dy', dy);
			console.log('node.y1', node.y);
			node.y -= dy;
			console.log('node.y', node.y);
			quad.point.y += dy;
			console.log('quad.point.y', quad.point.y);
			node.isOverlapping = true;
		  } else {
			node.isOverlapping = false; 
		  }
		}
		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	};
};

function displayLabel(d) {
  if (visMode == "person" || visMode == "dynamic") {
    return "block";
  } else {
    return (d.connections >= edgesInterval/1.5) ? "block" : "none";
  }
}

function returnNodeStrokeWidth(d) {
/*
  if (visMode == "person" || visMode == "dynamic") {
    if (dynamicPeople.indexOf(d.id) != -1 || usePerson == d.id) {
      return 5;
    }
  }
*/
  return 1.5
}

function returnNodeColor(d) {
  if (visMode == "person" || visMode == "dynamic") {
    if (dynamicPeople.indexOf(d.id) != -1 || usePerson == d.id) {
      return "#FC0";
    }
  }
  return "#666"
}

function returnNodeSize(d) {
  /* original code here 2.9.ts
  if (visMode == "person") {
    if (d.id == usePerson) {
      return 50;
    } else {
      return 15 + Math.round(d.connections/15);
    }
  } else if (visMode == "dynamic") {
    if (dynamicPeople.indexOf(d.id) == -1) {
      return 20;
    } else {
      return 35;
    }
  } else {
    return Math.round(Math.sqrt(d.connections)*3 + (d.connections/6));
  }*/
 if (d.label == "James McNeill Whistler" || d.label == "Theodore Casimir Roussel") {
	  //console.log(d);
		return 15;
  } else {
	return 5;
  }
}

function returnNodeVisible(d) {
	if (d.label == "James McNeill Whistler" || d.label == "Theodore Casimir Roussel") {
		return "visible";
  } else {
	  return "hidden";
  }
}

//replacing returnNodeSize for testing 2.10.ts
function returnTextLoc(d) {
	if (d.label == "James McNeill Whistler" || d.label == "Theodore Casimir Roussel") {
		return 20;
	} else {
		return 15;
	}
}

function returnNodeOpac(d) {
	if (d.label == "James McNeill Whistler" || d.label == "Theodore Casimir Roussel") {
		return 1;
	} else {
		return 0;
	}
}

//replacing returnNodeSize for testing 2.10.ts
function returnNodeSize2(d) {
	return 15;
}

//wooo!, from https://groups.google.com/forum/?fromgroups#!topic/d3-js/ndyvibO7wDA
function pointsBetween(circle1,circle2,standOff1,standOff2) {
  var x1 = circle1.x, y1 = circle1.y,
  x2 = circle2.x, y2 = circle2.y,
  dx = x2-x1, dy = y2-y1,
  r1 = returnNodeSize(circle1) + (standOff1||0),
  r2 = returnNodeSize(circle2) + (standOff2||0);
  if ( (r1+r2)*(r1+r2) >= dx*dx+dy*dy ) return [[0,0],[0,0]];
  var a = Math.atan2(dy,dx), c = Math.cos(a), s = Math.sin(a);
  return [
    [x1+c*r1,y1+s*r1],
    [x2-c*r2,y2-s*r2]
  ];
}

function hidePopup() {

  //hidePopupTimer
  jQuery("#popUp").css("display","none");

  //var customClass = "link_" + currentNode.id.split("/")[currentNode.id.split("/").length-1].replace(/%|\(|\)|\.|\,/g,'');

  d3.selectAll(".marker").attr("stroke-opacity",1).attr("fill-opacity",1)
  d3.selectAll(".link").attr("stroke-opacity",1).style("fill-opacity",1).style("stroke-width",function(d) {return edgeStrokeWidth(d)});
  d3.selectAll(".backgroundCircle").attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".imageCircle").attr("display","block");
  d3.selectAll(".circleText").attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".circleTextRect").attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".labelText").attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".labelRect").attr("fill-opacity",1).attr("stroke-opacity",1);

  popupShown = false;
}

function showPopup(d,cords) {
  if (!popupShown) {

    // Clear the popup
    jQuery('#popUp').empty();

    // Headshot
    var useId = $.trim(decodeURI(d.id).split("\/")[decodeURI(d.id).split("\/").length-1]);

    if (headshotFileNames.indexOf(useId+'.png') == -1) {
      var useImage = 'menu/no_headshot.png';
    } else {
      var useImage = '/image/headshot/' + useId+'.png'
    }

    jQuery('#popUp')
      .append(
        $("<a>")
          .attr("href", useImage)
          .attr("class", "cboxElement")
          .attr("title", "<h2>James McNeill Whistler</h2><h3>1876–1942</h3><p>In 1899 Addams entered Whistler’s Académie Carmen in Paris, where he remained a student until it closed in 1901. There he met his future wife Inez Eleanor Bate—the massière, or principle student—who actually admitted Adams to the school. Whistler took the unusual step of making both official apprentices, and they remained faithful followers. Whistler greatly influenced both Addams’s decision to work in the medium of etching and his subject matter, which centered on crowds and architecture.</p>")
          .append(
            $("<div>")
              .attr("id", "popup_headshotCont")
              .attr("class","popup-headshot-cont")
              .attr("width", "100%")
              .attr("height", "250px")
              .append(
                $("<img>")
                  .attr("width", "100%")
                  .attr("src", useImage)
                  .attr("id", "popup_headshot")
                  .attr("class","popup-headshot")
              )
          )
      );

    // Back
    jQuery('#popUp')
      .append(
        $('<a>')
          .attr("href", "/linked-visions")
          .append(
            $("<div>")
              .attr("class", "popup-back")
              .text("BACK")
          )
      );
    
    // Name and dates
    jQuery('#popUp')
      .append(
        $("<h2>")
        .text("James McNeill Whistler")
      )
      .append(
        $("<h3>")
        .text("1876–1942")
      );

    // Metadata
    jQuery('#popUp')
      .append(
        $("<div>")
          .attr("id", "popup_metadata")
          .attr("class", "popup-metadata")
          .attr("width", "30%")
          .append(
            $("<img>")
              .attr("width", "20px")
              .attr("height", "4px")
              .attr("src", "menu/dash.png")
          )
          .append($("<br/>"))
          .append($("<p>").html("BIRTHPLACE<br/>Woodbury, New Jersey"))
          .append($("<p>").html("OCCUPATION<br/>Printmaker<br/>Painter"))
      );

    // Desciption
    jQuery('#popUp')
      .append(
        $("<div>")
          .attr("id", "popup_description")
          .attr("class", "popup-description")
          .attr("width", "60%")
          .append(
            $("<img>")
              .attr("width", "20px")
              .attr("height", "4px")
              .attr("src", "menu/dash.png")
          )
          .append($("<br/>"))
          .append($("<p>").html("In 1899 Addams entered Whistler’s Académie Carmen in Paris, where he remained a student until it closed in 1901. There he met his future wife Inez Eleanor Bate—the massière, or principle student—who actually admitted Adams to the school. Whistler took the unusual step of making both official apprentices, and they remained faithful followers. Whistler greatly influenced both Addams’s decision to work in the medium of etching and his subject matter, which centered on crowds and architecture."))
      );

    jQuery('#popUp')
      .append(
        $("<div>")
          .attr("class", "clear")
      );

    // Works
    jQuery('#popUp')
      .append(
        $("<div>")
          .attr("id", "popup_works")
          .attr("class", "popup-works")
          .attr("width", "90%")
          .append(
            $("<img>")
              .attr("width", "20px")
              .attr("height", "4px")
              .attr("src", "menu/dash.png")
          )
          .append($("<br/>"))
          .append($("<p>").html("WORKS"))
      );
    
    jQuery("#popUp")
      .css("left", "0px")
      .css("top", "0px");

    jQuery('.cboxElement').colorbox({transition:"fade", width:"75%", height:"75%", scrolling:false,
                                     onComplete:function () {
                                       jQuery('.cboxPhoto').attr('style','width:55%; height:auto; margin:100px');
                                       jQuery('.cboxPhoto').css({'float': 'right'});
                                     }});
    
    
    jQuery("#popUp").fadeIn(200);

    popupShown = true;
  }

  
/*
  var descText = '';
  if (descObject.hasOwnProperty(d.id)) {

    if (descObject[d.id]['http://dbpedia.org/ontology/abstract']) {
      var desc = descObject[d.id]['http://dbpedia.org/ontology/abstract'][0].value;
      var r = /\\u([\d\w]{4})/gi;
      desc = desc.replace(r, function (match, grp) {
        return String.fromCharCode(parseInt(grp, 16)); } );
      desc = unescape(desc);
      descText = decodeURIComponent(desc);
      descText = descText.replace(/&ndash;/gi,'-');
      descText = descText.replace(/&amp;/gi,'&');

      var link = d.id.replace('dbpedia','wikipedia').replace('resource','wiki');

      descText = descText.substring(0,250) + '...' + '<br>' + '<a class="popup-link" target="_blank" href="' + link + '">From Wikipedia</a><br><br>';

    } else {
      descText = "";
    }
  }
*/

}


function showDialogPopup(person1,person2) {
  jQuery("#popUp").fadeOut(100)

  vex.dialog.open({
    message: 'Transcript Dialog',
    input: '<div class="transcript-dialog-holder"></div>',
    callback: function(data) {
      if (data === false) {
        return console.log('Cancelled');
      }
      return false;
    }
  });

  //max it out
  $(".vex-content").css("width",$(window).width()-100);
  $(".transcript-dialog-holder").css({height: $(window).height()-475});
  $(".vex-dialog-button-secondary").hide();

  //load the inital info about these two
  $.get('/api/compare/<' + encodeURIComponent(person1) + '>/<' + encodeURIComponent(person2) + '>', function(realTalk) {

    //load the transcript data for the context
    $.get('/api/text/'+realTalk.transcript, function(transcript) {

      //build the link to the transcript
      $('.vex-content').first().append($("<a>").addClass('transcript-dialog-doc-link').text('Transcript Source').attr('target','_blank').attr('href',transcript.sourceURL));

      //build the summary info from 52nd
      if (realTalk.userBeingTalkedAbout.length != 0 || realTalk.userTalkingAbout.length != 0) {

        var all = realTalk.userBeingTalkedAbout.concat(realTalk.userTalkingAbout);
        console.log(all);

        $('.vex-content').first().append(

          $("<div>")
            .addClass('transcript-dialog-holder-semantic')
            .append($("<span>").html('Semantic data from <a targe="_blank" href="http://linkedjazz.org/52ndStreet/">52nd St Crowd</a>: '))
        );

        var added = [];

        for (var a in all) {
          var rel = all[a];

          var source = rel.source.replace('<','').replace('>','') , target = rel.target.replace('<','').replace('>','') , relationship = "", color = "grey";

          if (nameObject[source]) {
            if (nameObject[source]['http://xmlns.com/foaf/0.1/name']) {
              source = nameObject[source]['http://xmlns.com/foaf/0.1/name'][0]['value'];
            }
          }

          if (nameObject[target]) {
            if (nameObject[target]['http://xmlns.com/foaf/0.1/name']) {
              target = nameObject[target]['http://xmlns.com/foaf/0.1/name'][0]['value'];
            }
          }

          if (rel.value == '<http://purl.org/vocab/relationship/influencedBy>') {
            relationship = "influenced by";
            color = 'rgba(188, 143, 102, 0.25)';
          } else if (rel.value == '<http://purl.org/vocab/relationship/mentorOf>') {
            relationship = "mentored";
            color = 'rgba(229, 142, 60, 0.25)';
          } else if (rel.value == '<http://purl.org/vocab/relationship/knowsOf>') {
            relationship = "knows of";
            color = 'rgba(131, 149, 159, 0.25)';
          } else if (rel.value == '<http://purl.org/vocab/relationship/acquaintanceOf>') {
            relationship = "is acquaintance of";
            color = 'rgba(77, 165, 213, 0.25)';
          } else if (rel.value == '<http://purl.org/vocab/relationship/closeFriendOf>') {
            relationship = "friend of";
            color = 'rgba(43, 175, 247, 0.25)';
          } else if (rel.value == '<http://purl.org/vocab/relationship/hasMet>') {
            relationship = "has met";
            color = 'rgba(108, 156, 182, 0.25)';
          } else if (rel.value == '<http://purl.org/vocab/relationship/friendOf>') {
            relationship = "friends with";
            color = 'rgba(43, 175, 247, 0.25)';
          } else if (rel.value == '<http://linkedjazz.org/ontology/inBandTogether>') {
            relationship = "was in band together with";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://linkedjazz.org/ontology/playedTogether>') {
            relationship = "played together with";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://linkedjazz.org/ontology/bandmember>') {
            relationship = "was bandmember of";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://linkedjazz.org/ontology/touredWith>') {
            relationship = "toured with";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://linkedjazz.org/ontology/bandLeaderOf>') {
            relationship = "was band leader of";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://purl.org/ontology/mo/collaborated_with>') {
            relationship = "collaborated with";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_colleague_of>') {
            relationship = "is colleague of";
            color = 'rgba(159, 144, 131, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_spouse_of>') {
            relationship = "is spouse of";
            color = 'rgba(188, 143, 102, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_assistant_to>') {
            relationship = "is assistant to";
            color = 'rgba(229, 142, 60, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_friend_of>') {
            relationship = "is friend of";
            color = 'rgba(131, 149, 159, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_student_of>') {
            relationship = "is student of";
            color = 'rgba(77, 165, 213, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_artist_of>') {
            relationship = "is artist of";
            color = 'rgba(43, 175, 247, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_model_for>') {
            relationship = "is model for";
            color = 'rgba(108, 156, 182, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_intimate_with>') {
            relationship = "is intimate with";
            color = 'rgba(43, 175, 247, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_teacher_of>') {
            relationship = "is teacher of";
            color = 'rgba(159, 143, 60, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_relative_of>') {
            relationship = "is relative of";
            color = 'rgba(188, 142, 159, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_executor_for>') {
            relationship = "is executor for";
            color = 'rgba(229, 149, 213, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_master_of>') {
            relationship = "is master of";
            color = 'rgba(131, 165, 247, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_physician_to>') {
            relationship = "is physician to";
            color = 'rgba(77, 175, 182, 0.25)';
          } else if (rel.value == '<http://data.artic.edu/whistler/predicate/is_secretary_to>') {
            relationship = "is secratory to";
            color = 'rgba(43, 156, 247, 0.25)';
          }

          if (added.indexOf(source + ' ' + relationship + ' ' + target) == -1) {
            $('.transcript-dialog-holder-semantic').first().append(
              $("<span>")
                .addClass('transcript-dialog-holder-semantic-label')
                .html(source + ' ' + relationship + ' ' + target)
                .css("background-color",color)
            );
            added.push(source + ' ' + relationship + ' ' + target)
          }
        }
      }

      var allAddedIds = [];

      //we need to loop through all the occurances
      for (var x in realTalk.occurances) {

        var textId = parseInt(realTalk.occurances[x].id);
        var type = realTalk.occurances[x].type;

        if (allAddedIds.indexOf(textId)>-1) {
          continue;
        }

        allAddedIds.push(textId);

        if (type == 'A' && textId > 0) {
          textId = textId-1 + ',' + textId;
          allAddedIds.push(textId-1);
          console.log(realTalk.occurances[x].type);
        }

        if (type == 'Q') {
          allAddedIds.push(textId+1);
          textId = (textId) + ',' + (textId+1);
        }

        $.get('/api/text/'+realTalk.transcript +'/' + textId, function(transcriptText) {

          //it will likely be a pair of responses
          for (t in transcriptText) {

            //add the image in
            $('.transcript-dialog-holder').first().append(
              $("<div>")
                .addClass( ( transcriptText[t].type == 'Q'  ) ? 'questionImage' : 'answerImage' )
                .append(
                  $("<img>")
                    .attr('src',function() {
                      var useImage = ""

                      if (transcriptText[t].type == 'Q') {
                        useImage = '/52new/img/no_image_square.png';
                      } else {
                        var uri = transcript.intervieweeURI.replace('<','').replace('>','');
                        var useId = $.trim(uri.split("\/")[uri.split("\/").length-1]);

                        if (fileNames.indexOf(useId+'.png') == -1) {
                          useImage =  "/52new/img/no_image_square.png'";
                        } else {
                          useImage =  "/image/round/" + useId+'.png';
                        }
                      }

                      return useImage;
                    })
                )
                .append(
                  $("<span>")
                    .text( ( transcriptText[t].type == 'Q'  ) ? 'Interviewer' : transcript.interviewee)
                )
            );

            $('.transcript-dialog-holder').first().append(
              $("<div>")
                .html( highlightText(transcriptText[t].text, [person1, person2]) )
                .addClass('bubble')
                .addClass(  ( transcriptText[t].type == 'Q'  ) ? 'question' : 'answer')
            );

            $('.transcript-dialog-holder').append($("<br>").css("clear","both"));
          }

          $('.transcript-dialog-holder').append($("<hr>").css("clear","both"));
        });
      }
    });
  });
}

function highlightText(text, uris) {

  for (var n in uris) {
    var uri = uris[n];

    if (nameObject[uri]) {
      if (nameObject[uri]['http://xmlns.com/foaf/0.1/name']) {
        var name = nameObject[uri]['http://xmlns.com/foaf/0.1/name'][0]['value'];
        var re = new RegExp(name,"gi");

        text = text.replace(re,'<span class="highlight">' + name + '</span>' );
      }
    }
  }

  return text;
}

function changeVisMode(changeTo) {

  if (rendering)
    return false;

  rendering = true;

  if (changeTo == "person") {
    History.pushState({state:idLookup[usePerson]}, "Person Mode", "?person=" + idLookup[usePerson]);
  } else {
    History.pushState({state:changeTo}, changeTo +" Mode", "?mode=" + changeTo);
  }

  //set the gephi download link
  if (changeTo == 'person') {
    $("#gephi").show();
    $("#gephi").attr("href", 'http://linkedjazz.org/api/relationships/ego/%3C' + encodeURIComponent(usePerson) + '%3E/gexf');
  } else if (changeTo != 'dynamic') {
    $("#gephi").show();
    $("#gephi").attr("href", 'http://linkedjazz.org/api/relationships/all/gexf');
  } else {
    $("#gephi").hide();
  }

  visMode = changeTo;

  //$("#network").fadeOut(function() {

    //$("#network").css("visibility","hidden");

    //if the popup has been shown make sure its hidden before the next view
    if (currentNode != null) {hidePopup();}

    //showSpinner("Rendering<br>Network");
    initalizeNetwork();

    //we need to rest the zoom/pan
    zoom.translate([0,0]).scale(1);
    vis.attr("transform", "translate(" + [0,0] + ")"  + " scale(" + 1 + ")");

    zoomWidgetObjDoZoom = false;
    zoomWidgetObj.setValue(0,0.255555555);

    filter();

    rendering = false;
  //});
}

function hideRelations() {
  var fill = "black";
  d3.selectAll(".marker").attr("stroke-opacity",1).attr("fill-opacity",1)
  d3.selectAll(".marker path").style("fill", fill);
  d3.selectAll(".backgroundCircle").attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).style("stroke", fill);
  d3.selectAll(".imageCircle").attr("display","block");
  d3.selectAll(".circleText").attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".circleTextRect").attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".labelText").attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".labelRect").attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".link").attr("stroke-opacity",1).style("fill-opacity",1).style("stroke-width",function(d) {return edgeStrokeWidth(d)}).style("fill", fill).style("stroke", fill);
}

function showRelations(rel) {

  // First we grey out everything
  var fill = "black";
  //clearTimeout(hidePopupTimer);
  d3.selectAll(".backgroundCircle").attr("fill-opacity",0.03).attr("stroke-opacity",0.03).style("fill", fill).style("stroke", fill);
  d3.selectAll(".circleText").attr("fill-opacity",0.03).attr("stroke-opacity",0.03);
  d3.selectAll(".circleTextRect").attr("fill-opacity",0.03).attr("stroke-opacity",0.03).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".labelText").attr("fill-opacity",0.03).attr("stroke-opacity",0.03);
  d3.selectAll(".labelRect").attr("fill-opacity",0.03).attr("stroke-opacity",0.03).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".imageCircle").attr("display","none");
  d3.selectAll(".link").attr("stroke-opacity",0.03).attr("fill-opacity",0.03).style("fill", fill).style("stroke", fill);

  // Which predicates to show
  var relationsToShow = [];
  if (rel == "friends") {
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_friend_of");
    fill = "#ff9019";
  }
  else if (rel == "family") {
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_relative_of");
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_spouse_of");
    fill = "#79c942";
  }
  else if (rel == "colleagues") {
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_colleague_of");
    fill = "#e33b61";
  }
  else if (rel == "mentors") {
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_student_of");
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_teacher_of");
    fill = "#ff9900";
  }
  else if (rel == "employers") {
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_master_of");
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_assistant_to");
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_artist_of");
    relationsToShow.push("http://data.artic.edu/whistler/predicate/is_model_for");
    fill = "#ff9019";
  }

  var nodesShown = [];

  // Show circles and names
  for (var r in relationsToShow) {
    var rx = relationsToShow[r];
    for (var e in relationIndex[rx]) {
      var id = relationIndex[rx][e].split("/")[relationIndex[rx][e].split("/").length-1].replace(cssSafe,'');
      d3.selectAll("#backgroundCircle_" + id).attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).style("stroke", fill);
      d3.selectAll("#imageCircle_"+ id).attr("display","block").style("fill", fill).attr("stroke", fill);
      d3.selectAll("#circleText_"+ id).attr("fill-opacity",1).attr("stroke-opacity",1);
      d3.selectAll("#circleTextRect_"+ id).attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).attr("stroke", fill);
      d3.selectAll("#labelText_"+ id).attr("fill-opacity",1).attr("stroke-opacity",1);
      d3.selectAll("#labelRect_"+ id).attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).attr("stroke", fill);
      d3.selectAll(".marker path").style("fill", fill);
      nodesShown.push(id);
    }
  }

  // Now show all the lines between all the nodes that we've shown
  for (var n in nodesShown) {
    for (var m in nodesShown) {
      if (nodesShown[n] != nodesShown[m]) {
        d3.selectAll(".link_" + nodesShown[n] + ".link_" + nodesShown[m]).attr("stroke-opacity",1).style("fill-opacity",1).style("stroke-width",2).style("fill", fill).style("stroke", fill);
      }
    }
  }
}

//build the intial list used for dynamic mode
function buildDynamicList() {

  var listNodes = baseNodes;
  listNodes.sort(function(a,b) {
    var nameA = a.labelLast.toLowerCase(), nameB = b.labelLast.toLowerCase()
    if (nameA < nameB) //sort string ascending
      return -1
    if (nameA > nameB)
      return 1
    return 0 //default return value (no sorting)
  });

  var domFragment = $("<div>");

  for (x in listNodes) {
    var id_css = listNodes[x].id.split("/")[listNodes[x].id.split("/").length-1].replace(cssSafe,'');
    var id_img = $.trim(decodeURI(listNodes[x].id).split("\/")[decodeURI(listNodes[x].id).split("\/").length-1]);

    var descText = '';
    // if (descObject.hasOwnProperty(listNodes[x].id)) {
    //  var desc = descObject[listNodes[x].id]['http://www.w3.org/2000/01/rdf-schema#comment'][0].value;
    //  var r = /\\u([\d\w]{4})/gi;
    //  desc = desc.replace(r, function (match, grp) {
    //    return String.fromCharCode(parseInt(grp, 16)); } );
    //  desc = unescape(desc);
    //  descText = decodeURIComponent(desc);
    //  descText = descText.replace(/&ndash;/gi,'-');
    //  descText = descText.replace(/&amp;/gi,'&');
    // }

    if (descObject[listNodes[x].id]) {
      if (descObject[listNodes[x].id]['http://dbpedia.org/ontology/abstract']) {
        var desc = descObject[listNodes[x].id]['http://dbpedia.org/ontology/abstract'][0].value;
        var r = /\\u([\d\w]{4})/gi;
        desc = desc.replace(r, function (match, grp) {
          return String.fromCharCode(parseInt(grp, 16)); } );
        desc = unescape(desc);
        descText = decodeURIComponent(desc);
        descText = descText.replace(/&ndash;/gi,'-');
        descText = descText.replace(/&amp;/gi,'&');

        var link = listNodes[x].id.replace('dbpedia','wikipedia').replace('resource','wiki');

        descText = descText.substring(0,250) + '...' + '<br>' + '<a class="popup-link" target="_blank" href="' + link + '">From Wikipedia</a><br><br>';
      } else {
        descText = "";
      }
    }

    domFragment.append
    (
      $("<div>")
        .attr("id","dynamic_" + id_css)
        .addClass("dynamicListItem")
        .data("label",listNodes[x].labelLast)
        .data("id",listNodes[x].id)
        .click(function() { if (dynamicPeople.indexOf($(this).data("id")) == -1) {$("#dynamicClear").fadeIn(5000); $("#dynamicHelp").css("display","none"); usePerson = $(this).data("id"); dynamicPeople.push(usePerson); filter();}})
        .append
      (
        $("<img>")
          .attr("src",function()
                {

                  if (fileNames.indexOf(id_img+'.png') != -1) {
                    return "/image/round/" + id_img+'.png';
                  } else {
                    return "";
                  }
                })
          .css("visibility",function()
               {
                 if (fileNames.indexOf(id_img+'.png') != -1) {
                   return "visible"
                 } else {
                   return "hidden"
                 }
               })
      )
        .append
      (
        $("<div>")
          .text(listNodes[x].labelLast)
          .attr("title", descText)

      )
    )
  }

  $("#dynamicListHolder").html(domFragment);

  window.orginalDynamicListFragment = domFragment;
}

function dynamicFilterList() {

  var searchTerm = $("#dynamicSearchInput").val().toLowerCase();

  $(".dynamicListItem").each(function() {

    if ($(this).data("label").toLowerCase().indexOf(searchTerm) == -1) {
      $(this).css("display","none");
    } else {
      $(this).css("display","block");
    }
  });
}

//zoom/pan function called by mouse event
function redraw(useScale) {
  //store the last event data
  trans = d3.event.translate;
  scale = d3.event.scale;
  
  if (scale > 2) {
	 //console.log(trans);
  	 //console.log(scale);
	 d3.selectAll(".backgroundCircle").style("fill", "#ffffff");
	 d3.selectAll(".imageCircle").transition(800).style("opacity",1).attr("visibility","visible");
  }
  if (scale > 3) {
	 d3.selectAll(".labelText").transition(800).style("opacity",1).attr("visibility","visible");
	 d3.selectAll(".labelRect").transition(800).style("opacity",1).attr("visibility","visible");  
  }
  

  //transform the vis
  vis.attr("transform",
           "translate(" + trans + ")"
           + " scale(" + scale + ")");
  y = 1/trans[1] + scale*.6;
  d3.selectAll(".circleText").attr("transform",
                                   "translate(" + 1/trans[0] + " " + y + ")"
                                   + " scale(" + 1/scale + ")");
  d3.selectAll(".circleTextRect").attr("transform",
                                   "translate(" + 1/trans[0] + " " + y + ")"
                                   + " scale(" + 1/scale + ")");
  d3.selectAll(".labelText").attr("transform",
                                  "translate(" + 1/trans[0] + " " + y + ")"
                                  + " scale(" + 1/scale + ")");
  d3.selectAll(".labelRect").attr("transform",
                                   "translate(" + 1/trans[0] + " " + y + ")"
                                  + " scale(" + 1/scale + ")");

  //we need to update the zoom slider, set the boolean to false so the slider change does not trigger a zoom change in the vis (from the slider callback function)
  zoomWidgetObjDoZoom = false;
  zoomWidgetObj.setValue(0,(scale/4));
}

function loadYouTube(useId) {

  var filename = useId + '.meta';
  $.get('img/' + filename, function(data) {

    var objectCode = youTubeObject.replace(/\<id\>/ig,data);

    $("#video").empty();
    $("#video").append(
      $("<a>")
        .text("[x] Close")
        .attr("href","#")
        .attr("id", "youTubeClose")
        .attr("title","Close Video")
        .click(function(event) {
          $("#video").empty();
          event.stopPropagation();
          event.preventDefault();
        })
    );
    $("#video").append(objectCode);

  });
  //youTubeObject
}

function edgeStrokeWidth(d) {
/*
  if (visMode == "person" || visMode == "dynamic") {
    if (nodes.length < 10) {
      return 2;
    }

    if (nodes.length < 30) {
      return 1;
    }
    if (nodes.length < 40) {
      return 0.5;
    }

    return .3;
  }
*/
  return 0.3;
}


function edgeColor(d) {
  if (visMode == 'dynamic') {return "#666";}

  if (typeof d.connections == 'undefined') {
    d = d.source;
  }

  if (d.connections <= edgesAvg) {
    //return "#bcbddc";
	return "#666666";
  }
  if ((d.connections-edgesAvg)/edgesInterval <= 1.5) {
    //return "#9ecae1";
	return "#666666";
  }
  if ((d.connections-edgesAvg)/edgesInterval <= 2.5) {
    //return "#74c476";
	return "#666666";
  }
  //return "#fdae6b";
  return "#666666";
}

function linkStrength(d) {

  if (visMode == "free") {
    //return Math.sqrt(d.source.connections)/15;
    //return 0;
    return (d.source.connections / largestConnection) / 500;
  }

  if (visMode == "wave") {
    return Math.sqrt(d.source.connections)/9;
  }
  if (visMode == "person") {
    return 1;
    //return 0.2;
  }

  if (visMode == "dynamic") {
    return 0.01;
  }

  if (visMode == "clique") {
    //return Math.sqrt(d.source.connections)/8;

    //we want to find the combined simlarity between the two people
    var p1 = d.source.id;
    var p2 = d.target.id;

    var strength = 0;

    if (simlarityIndex[p1].hasOwnProperty(p2)) {strength = simlarityIndex[p1][p2];}
    if (simlarityIndex[p2].hasOwnProperty(p1)) {strength = strength+simlarityIndex[p2][p1];}

    return (strength / (largestSimilarity*2));
  }
}

function showSpinner(text) {

  $("#spinner").css("left",($("#network").width()/2 ) - 65 + "px");
  $("#spinner").css("top", ($("#network").height()/2 ) - 65 + "px");
  $("#spinner").css("display","block");
  $("#spinner span").html(text);
}

function hideSpinner() {
  $("#spinner").css("display","none");
}

function windowResize() {

  visWidth = $(window).width();
  visHeight = $(window).height();
  if (visMode == "person") {
    visWidth -= 540;
    $("#network").css('float', 'right');
  }
  $("#network").css('width', visWidth + 'px');
  $("#network").css('height',visHeight + 'px');
  $("#dynamicListHolder").css('height',visHeight - 110 + 'px');
}
