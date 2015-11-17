if (!document.createElementNS || !document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect) {
  alert('We\'re Sorry, this visualization uses the SVG standard, most modern browsers support SVG. If you would like to see this visualization please view this page in another browser such as Google Chrome, Firefox, Safari, or Internet Explorer 9+');
}

vex.defaultOptions.className = 'vex-theme-os';

var lastLocation = '';          //the previous window.location, for debouncing pageviews
var visMode = 'clique';         //the type of network to render, each has it own settings

var tripleStore = null;         //holds the triple data bank created by the rdfquery plugin
var tripleObject = null;        //holds the javascript seralized object of the triple store
var descStore = null;           //holds the triple data bank created by the rdfquery plugin for the description
var descObject = null;          //holds the javascript seralized object of the triple store for the description
var nameObject = null;          //holds the foaf names of the people
var largestNodes = [];          //holds a list of the N largest nodes/people (most connections) in order to place/lock them properly on render
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
var visWidth = $(window).width(); //width and height of the network canvas, in px
var visHeight = $(window).height();
var largeNodeRadius = 20;
var smallNodeRadius = 5;

var connectionCounter = {};     //holds each id as a property name w/ the value = # of connections they have

var connectionIndex = {};       //an object with properties as id names, with values an array of strings of ids that person has connections to.
var largestConnection = 0;
var relationIndex = {};         //an object with properties as relationship ids, with values an array of strings of ids that have that relation.
var connectionRelationIndex = {};         //an object with properties as relationship ids, with values an array of strings of ids that have that relation.

var simlarityIndex = {}         //properties are id names, with the value being an array of objects with other ids and their # of matching connections
var largestSimilarity = 0;      //holds the max number of similar connections any two nodes share in the network

var strokeWidth = 0.3;          //the defult width to make the stroke

//the settings that vary for each diff type of network
var networkLargeNodeLimit = 20;	//the number of top nodes to fix/lock to a patterend spot on the network
var networkNodeDrag = false;    //can you drag the nodes about?

var cssSafe = new RegExp(/%|\(|\)|\.|\,|'|"/g);	//the regex to remove non css viable chars

var zoomWidgetObj = null;       //the zoom widget draghandeler object
var zoomWidgetObjDoZoom = true;

var oldzoom = 0;

var fill = d3.scale.category10();
var lineColor = d3.scale.category20c();

var whistlerPersonIndex = 0;    //the index pos of the James_McNeill_whistler in the nodes array, so we dont have to loop through the whole thing everytime
var roussellPersonIndex = 0;    //the index pos of the Theodore_Roussell in the nodes array, so we dont have to loop through the whole thing everytime

var relFriends = [];
var relFamily = [];
var relColleagues = [];
var relMentors = [];
var relEmployers = [];

var jsonNodes = "";
var jsonLines = "";

var nodeClickFunction = function(d) {
  if (d3.event.defaultPrevented) return;
  force.stop();
  $(".popup-home-banner").hide();
  $("html, body").animate({ scrollTop: 0 }, "slow");
  $("#popUp").animate({ scrollTop: 0 }, 1);
  usePerson = d.id;
  changeVisMode("person");
};

var homeClick = function(){
	hideDetailElements(); 
	usePerson = null; 
	usePersonIndex = 0; 
	if (jsonNodes == "") {
		changeVisMode('clique');
	} else {
		changeVisMode('home'); 
	}
	windowResize();					  
};


var cboxProps = {transition:"fade",
                 width:"100%",
                 height:"100%",
                 opacity: 0.92,
                 scalePhotos: true,
                 returnFocus: false,
                 current: "Work {current} of {total}",
                 title: function(){ if ($('.cboxPhoto').length) { return $(this).find('img').attr('copy'); } else { return "" } },
                 onComplete:function () {
                   $('#cboxLoadedContent').css('overflow-x', 'hidden');
                   $('.cboxPhoto').attr('style','width: auto; height: 100%; margin-top:35px; margin-left: 35%; margin-right: 180px; float: none;');
                   $('#cboxContent').prepend(
                     $("<img>")
                       .attr("src", "menu/logo-white.png")
                       .attr("id","cboxLogo")
                       .attr("alt", "Art Institute of Chicago")
                   );
                   if ($('.cboxPhoto').length) {
                     // Fill the image to the window. Landscape and portrait images are treated differently:
                     var maxWidth = $('#cboxLoadedContent').width() * .55; // Max width for the image
                     var maxHeight = $('#cboxLoadedContent').height() * .92;    // Max height for the image
                     var ratio = 0;  // Used for aspect ratio
                     var width = $('.cboxPhoto').width();    // Current image width
                     var height = $('.cboxPhoto').height();  // Current image height

                     // Check if the current width is larger than the max
                     if(width > maxWidth){
                       ratio = maxWidth / width;   // get ratio for scaling image
                       $('.cboxPhoto').css("width", maxWidth); // Set new width
                       $('.cboxPhoto').css("height", height * ratio);  // Scale height based on ratio
                       $('.cboxPhoto').css("margin-top", (height - (height * ratio) - 70)/2 + 35);  // Scale height based on ratio
                       height = height * ratio;    // Reset height to match scaled image
                       width = width * ratio;    // Reset width to match scaled image
                     }

                     // Check if current height is larger than max
                     if(height > maxHeight){
                       ratio = maxHeight / height; // get ratio for scaling image
                       $('.cboxPhoto').css("height", maxHeight);   // Set new height
                       $('.cboxPhoto').css("width", width * ratio);    // Scale width based on ratio
                       width = width * ratio;    // Reset width to match scaled image
                     }
                     $('#cboxLoadedContent').click(function(e) {
                       $.colorbox.close();
                     });
                     $('.cboxPhoto').click(function(e) {
                       $.colorbox.next();
                     });
                   }
                 },
                 onLoad:function() {
                   $('html, body').css('overflow', 'hidden'); // page scrollbars off
                 },
                 onClosed:function() {
                   $('html, body').css('overflow', ''); // page scrollbars on
                 }
                };

jQuery(document).ready(function($) {
  // Bind to StateChange Event
  // Note: We are using statechange instead of popstate
  // Note: We are using History.getState() instead of event.state
  History.Adapter.bind(window,'statechange', parseStateChangeVis);

  if(!document.createElementNS || !document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect) {
    $("#network").html(
      'Sorry, this visualization uses the <a href="http://en.wikipedia.org/wiki/Scalable_Vector_Graphics">SVG standard</a>, most modern browsers support SVG.<br>If you would like to see this visualization please view this page in another browser such as <a href="https://www.google.com/chrome">Chrome</a>, <a href="http://www.mozilla.org/en-US/firefox/new/">Firefox</a>, <a href="http://www.apple.com/safari/download/">Safari</a>, or <a href="http://windows.microsoft.com/en-US/internet-explorer/downloads/ie">Internet Explorer 9+</a>'
    );
    return false;
  }

  /* Binds */
  $(window).resize(windowResize);

  $('#about').colorbox(cboxProps);

  resetFilters();
  
  var history = History.getState();
  if (history.hash.search(/\?person=/) > -1) {
    visMode = "person";
  }
  windowResize();

  $("#network").css("visibility","hidden");
	$("#title").css("display","none");
	$("#about").css("display","none");
	$("#logo").css("display","none");
  $(".filter-button").hide();

  showSpinner("");

  relFriends.push("http://data.artic.edu/whistler/predicate/is_friend_of");
  relFamily.push("http://data.artic.edu/whistler/predicate/is_relative_of");
  relFamily.push("http://data.artic.edu/whistler/predicate/is_spouse_of");
  relColleagues.push("http://data.artic.edu/whistler/predicate/is_colleague_of");
  relMentors.push("http://data.artic.edu/whistler/predicate/is_student_of");
  relMentors.push("http://data.artic.edu/whistler/predicate/is_teacher_of");
  relEmployers.push("http://data.artic.edu/whistler/predicate/is_master_of");
  relEmployers.push("http://data.artic.edu/whistler/predicate/is_assistant_to");
  relEmployers.push("http://data.artic.edu/whistler/predicate/is_artist_of");
  relEmployers.push("http://data.artic.edu/whistler/predicate/is_model_for");

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

  initializeZoomWidget();
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
    usePerson = $.map(idLookup, function(obj,index) {
      if(obj === person)
        return index;
    })[0];

    changeVisMode("person");
    windowResize();
  } else {
	  usePerson = null; 
	  usePersonIndex = 0; 
    $('#popUp').hide();
	  if (jsonNodes == "") {
		  changeVisMode("clique");
	  } else {
		  changeVisMode('home');	
	  }
	  windowResize();	
  }
}

function initalizeNetwork() {
  //if it has already been defined
  if (force == null) {
	  force = d3.layout.force()
      .size([$("#network").width() - 5, $("#network").height() - 5]);
  }

  networkNodeDrag = false;
  networkLargeNodeLimit = 20;

  force.linkStrength(0.1)
    .friction(0.9)
    .linkDistance(100)
    .charge(0)
    .gravity(0)
    //.theta(0.8)
    .alpha(0.1);
    //force.friction(0.2);

  if (vis == null) {
	  zoom = d3.behavior.zoom()
      .translate([0,0])
      .scale(0.99)
      .scaleExtent([0.4,2.4])	//how far it can zoom out and in
      .on("zoom", redraw);
	  
	  vis = d3.select("#network").append("svg:svg")
	  .attr("width", visWidth - 10)
	  .attr("height", visHeight - 130)
      .append('svg:g')
      .attr("id", "networkCanvas")
      .call(zoom)//.call(d3.behavior.zoom().scaleExtent([0.25, 6]).on("zoom", redraw)) //.call(d3.behavior.zoom().on("zoom", redraw))
	  .append('svg:g');

	  vis.append('svg:rect')
      .attr('width', visWidth)
      .attr('height', visHeight)
      .attr('id', 'zoomCanvas')
      .attr('fill-opacity', '0')
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
  vis.attr("transform", "translate(" + trans + ")" + " scale(" + scale + ")");
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

    //add this relationship to the connectionRelationIndex object
    //has propery yet?
    if (!connectionRelationIndex.hasOwnProperty(id1)) {
      connectionRelationIndex[id1] = [];
    }
    if (!connectionRelationIndex.hasOwnProperty(id2)) {
      connectionRelationIndex[id2] = [];
    }
    if (!connectionRelationIndex[id1].hasOwnProperty(pred)) {
      connectionRelationIndex[id1][pred] = [];
    }
    if (!connectionRelationIndex[id2].hasOwnProperty(pred)) {
      connectionRelationIndex[id2][pred] = [];
    }

    //does it have this connectionRelationship already?
    if (connectionRelationIndex[id1][pred].indexOf(id2) == -1) {
      connectionRelationIndex[id1][pred].push(id2);
    }
    if (connectionRelationIndex[id2][pred].indexOf(id1) == -1) {
      connectionRelationIndex[id2][pred].push(id1);
    }
  }
}

function resetFilters() {
  $(".filter-button").removeClass("disabled");

  $("#filter_all").click(function() {hideRelations(); });
  $("#filter_family").click(function() {showRelations("family"); });
  $("#filter_friends").click(function() {showRelations("friends"); });
  $("#filter_colleagues").click(function() {showRelations("colleagues"); });
  $("#filter_mentors").click(function() {showRelations("mentors"); });
  $("#filter_employers").click(function() {showRelations("employers"); });

  $(".filter-button").removeClass("active");
  $("#filter_all").addClass("active");

}

function disableFilter(preds, rel) {
  var show = false;
  for (var key in preds) {
    if (connectionRelationIndex.hasOwnProperty(usePerson) && connectionRelationIndex[usePerson].hasOwnProperty(preds[key])) {
      if (connectionRelationIndex[usePerson][preds[key]].length > 0) {
        show = true;
      }
    }
  }
  if (!show) {
    $("#filter_" + rel).addClass("disabled");
    $("#filter_" + rel).off("click");
  }
}

function filter(clear) {
  if (typeof clear == 'undefined') {clear = true;}

  //are we wiping the nodes out or just adding?
  if (clear) {
	  $("#network svg").css("visibility","hidden");
	  $("#networkCanvas").css("opacity", 0);
	  $("#title").css("display","none");
	  $("#about").css("display","none");
	  $("#logo").css("display","none");
	  $("#zoomWidget").css("display","none");
    vis.selectAll("g.node").remove();
    vis.selectAll("line.link").remove();

    
    if (visMode == "person") {
      $("#network").attr("class", "with-popup");

      resetFilters();

      disableFilter(relFriends, "friends");
      disableFilter(relFamily, "family");
      disableFilter(relColleagues, "colleagues");
      disableFilter(relMentors, "mentors");
      disableFilter(relEmployers, "employers");

      d3.selectAll(".node").on("click", nodeClickFunction);
    }
    else {
      $("#network").attr("class", "");
      $(".filter-button").hide();
    }

    nodes = [];
    links = [];
    force.nodes([]);
    force.links([]);
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

    if (visMode == "person" && workingNodes[aNode].id == usePerson) {
      usePersonIndex = aNode;
    }
    if (workingNodes[aNode].id == 'http://data.artic.edu/whistler/person/James_McNeill_Whistler') {
      whistlerPersonIndex = aNode;
    }
    if (workingNodes[aNode].id == 'http://data.artic.edu/whistler/person/Theodore_Roussel') {
      roussellPersonIndex = aNode;
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
  restart();
}

function restart() {
	//console.log('nodes', nodes);
	//console.log('useperson', usePersonIndex);
	//console.log('vismde', visMode);
  if (visMode == "clique" || visMode == "person" && nodes[usePersonIndex].connections > 15) {
    windowResize();
    showSpinner("");
    $('.filter-button').hide();
  }
  
  vis.append('defs')
	  .append('clipPath')
	  .attr("id", "myClip")
	  .append('circle')
	  .attr("cx", "0")
	  .attr("cy", "0")
	  .attr("r",  largeNodeRadius);
	  
	  vis.append('defs')
	  .append('clipPath')
	  .attr("id", "smallClip")
	  .append('circle')
	  .attr("cx", "0")
	  .attr("cy", "0")
	  .attr("r", "4");

  if (jsonLines != "" && visMode != 'person') {
	 links = $.parseJSON(jsonLines);
  }
  vis.selectAll("line.link")
    .data(links)
    .enter().insert("line", "circle.node")
    .attr("class", function(d) {return "link " + d.customClass});
  
  if (jsonNodes != "" && visMode != 'person') {
	  nodes = $.parseJSON(jsonNodes);
  }
  	  var node = vis.selectAll("g.node")
      .data(nodes);
  

  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("id", function(d) {  return "node_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')});

  if (networkNodeDrag) {
    nodeEnter.call(force.drag);
  }

  nodeEnter.append("circle")
    .attr("id", function(d) {return "backgroundCircle_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'');})
    .attr("class","backgroundCircle")
    .attr("r", function(d) { return  returnNodeSize(d); });

  nodeEnter.append("svg:image")
    .attr("id", function(d) {  return "imageCircle_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("class","imageCircle")
	  .attr("clip-path","url(#myClip)")
    .attr("xlink:href", function(d) {
      if (descObject.hasOwnProperty(d.id)) {
        if (descObject[d.id]['http://lv.artic.edu/ns#imageIcon']) {
          return descObject[d.id]['http://lv.artic.edu/ns#imageIcon'][0].value;
        }
      }
      return "menu/no_image.png";
    })
    .attr("x", function(d) { return  (returnNodeSize(d)*-1); })
    .attr("y", function(d) { return  (returnNodeSize(d)*-1); })
    .attr("width", function(d) { return  (returnNodeSize(d)*2); })
    .attr("height", function(d) { return  (returnNodeSize(d)*2); });
	
	nodeEnter.append("svg:rect")
    .attr("id", function(d) {  return "circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
	  .attr("rx", 8)
    .attr("ry", 8)
    .attr("class",  "circleTextRect");
	
	nodeEnter.append("svg:text")
    .attr("id", function(d) {  return "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("class",  "circleText")
    .attr("x", function(d) { return  (returnTextLoc(d)*-0.1); })
    .attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+6; })
    .text(function(d) { return d.label; });

  nodeEnter.selectAll(".circleText")
    .attr("textLength", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width * 1.1; });

  nodeEnter.selectAll(".circleTextRect")
    .attr("x", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().x - 10; })
    .attr("y", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    .attr("width", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width + 20; })
    .attr("height", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().height + 2; });

  nodeEnter.append("svg:rect")
    .attr("id", function(d) {  return "labelRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
	  .attr("rx", 6)
    .attr("ry", 6)
	.attr("class",  "labelRect");

  nodeEnter.append("svg:text")
    .attr("id", function(d) {  return "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("class",  "labelText")
    .attr("x", 0)
    .attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+27; })
    .attr("visibility", "hidden")
    .text(function(d) {
      var occupation = "ARTIST";
      if (descObject.hasOwnProperty(d.id)) {
        if (descObject[d.id]['http://dbpedia.org/ontology/occupation']) {
          occupation = descObject[d.id]['http://dbpedia.org/ontology/occupation'][0].value;
        }
      }
      return occupation;
    });

  nodeEnter.append("svg:rect")
    .attr("class",  "boundingRect")
	.attr("x", function(d) {  return $("#" + "node_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().x; })
    .attr("y", function(d) {  return $("#" + "node_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    .attr("width", function(d) {  return $("#" + "node_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width; })
    .attr("height", function(d) {  return $("#" + "node_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().height; })
	.attr("opacity", 0);

    nodeEnter.selectAll(".labelText")
    .attr("textLength", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width * 1.1; });

  nodeEnter.selectAll(".labelRect")
    .attr("x", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().x; })
    .attr("y", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    .attr("width", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().width; })
    .attr("height", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().height; });


  for (aNode in nodes) {
    nodes[aNode].width = $("#" + "node_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1].replace(cssSafe,''))[0].	getBBox().width;
    nodes[aNode].height = $("#" + "node_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1].replace(cssSafe,''))[0].getBBox().height;
	
	if (visMode != 'home') {
		nodes[aNode].x = visWidth/2;
		nodes[aNode].y = visHeight/2;
	}

    nodes[aNode].x2 = nodes[aNode].x + nodes[aNode].width;
    nodes[aNode].y2 = nodes[aNode].y + nodes[aNode].height;

    if (visMode != 'person') {
		if (visMode != 'home') {
		  if (nodes[aNode].id == 'http://data.artic.edu/whistler/person/James_McNeill_Whistler') {
			nodes[aNode].x = visWidth/2 + 100;
			nodes[aNode].y = visHeight/2;
			//nodes[aNode].fixed = true;
		  }
	
		  if (nodes[aNode].id == 'http://data.artic.edu/whistler/person/Theodore_Roussel') {
			nodes[aNode].x = visWidth/2 - 100;
			nodes[aNode].y = visHeight/2;
			//nodes[aNode].fixed = true;
		  }
		}

      // Highlight Whistler and Roussell
      vis.selectAll("#circleTextRect_James_McNeill_Whistler").attr("class", "circleTextRectHighlight");
      vis.selectAll("#circleTextRect_Theodore_Roussel").attr("class", "circleTextRectHighlight");

      vis.selectAll("#imageCircle_James_McNeill_Whistler").attr("class", "imageCircleHighlight");
      vis.selectAll("#imageCircle_Theodore_Roussel").attr("class", "imageCircleHighlight");

      vis.selectAll("#backgroundCircle_James_McNeill_Whistler").attr("class", "backgroundCircleHighlight");
      vis.selectAll("#backgroundCircle_Theodore_Roussel").attr("class", "backgroundCircleHighlight");
		
	    vis.selectAll("#labelRect_James_McNeill_Whistler").attr("class", "labelRectHighlight");
	    vis.selectAll("#labelRect_Theodore_Roussel").attr("class", "labelRectHighlight");
    }
    else {
      if (nodes[aNode].id == usePerson) {
        nodes[aNode].x = visWidth/2 + 270;
        nodes[aNode].y = visHeight/2;

        showPopup(nodes[aNode]);
        
	      $("#title").hide();
	      $("#about").hide();

        // Highlight selected person
        vis.selectAll("#circleTextRect_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1].replace(cssSafe,''))
          .attr("class", "circleTextRectHighlight");
        vis.selectAll("#imageCircle_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1].replace(cssSafe,''))
          .attr("class", "imageCircleHighlight");
        vis.selectAll("#backgroundCircle_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1].replace(cssSafe,''))
          .attr("class", "backgroundCircleHighlight");
		vis.selectAll("#labelRect_" + nodes[aNode].id.split("/")[nodes[aNode].id.split("/").length-1].replace(cssSafe,''))
	    .attr("class", "labelRectHighlight");	
      }
    }
  }
  d3.selectAll(".circleText").attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+7; })

  //hover colors for nodes
  d3.selectAll('.node').on({
	  mouseenter: function(d) {
		  if (d3.select("#circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).classed( "circleTextRectHighlight" )) {
		    d3.selectAll("#circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#cc846b").style("fill", "#cc846b");
			  d3.selectAll("#labelRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#cc846b").style("fill", "#cc846b");
		  } else {
			  d3.selectAll("#circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#E9967A").style("fill", "#E9967A");
			  d3.selectAll("#labelRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#E9967A").style("fill", "#E9967A");
		  }
	  }
  });
	  
 d3.selectAll('.node').on({
	  mouseleave: function(d) { 
		  if (d3.select("#circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).classed( "circleTextRectHighlight" )) {
			  d3.selectAll("#circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#E9967A").style("fill", "#E9967A");
			  d3.selectAll("#labelRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#E9967A").style("fill", "#E9967A");
		  } else {
			  d3.selectAll("#circleTextRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#000000").style("fill", "#000000");
			  d3.selectAll("#labelRect_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')).style("stroke", "#000000").style("fill", "#000000");
		  }
	  }
  });

  force.start();

  force.on("start", function(e){ 
    if (visMode == "person") {
      windowResize();
      showPopup(nodes[usePersonIndex]);
    }
  });

  //controls the movement of the nodes
  force.on("tick", function(e){
    if ((usePerson && nodes[usePersonIndex].connections < 15 && e.alpha <= 1) || e.alpha <= .02 || visMode == 'home') {
      hideSpinner();

      // Collision detection stolen from: http://vallandingham.me/building_a_bubble_cloud.html
      dampenedAlpha = e.alpha * .5;
      jitter = 0.3;
      ratio = 2.77; // xy ratio

      if (visMode != 'home') {
        vis.selectAll("g.node")
          .each(stickyPeople())
            .each(gravity(dampenedAlpha))
              .each(collide(jitter))
                .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")";});
      } else {
        vis.selectAll("g.node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")";});
      }

      vis.selectAll("line.link")
        .attr("x1", function(d) { return d.source.x;})
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      if ($("#network svg").css("visibility") != "visible") {
        $("#network").css("visibility","visible");
        $("#network svg").css("visibility","visible");
        $("#zoomWidget").show( "bounce", {times:3, distance:-80}, 2000).css("visibility","visible");
        if (visMode != 'home') {
          $("#networkCanvas").fadeTo( 1000, 1, function() {
            if (visMode != 'person') {
              $("#title").fadeIn(2000);
              $("#about").fadeIn(2000);
              $('#about').colorbox(cboxProps);
              $("#logo").fadeIn(2000);
            }
          });
        } else {
          $("#networkCanvas").css("opacity", 1);
          $("#title").css("display","block");
          $("#about").css("display","block");
          $('#about').colorbox(cboxProps);
          $("#logo").css("display","block");
        }
        if (visMode == 'person') {
          $(".filter-button:hidden").fadeIn(1000);
        }
      }

      if (visMode != 'person' && visMode != 'home') {
        var nodesInit = d3.selectAll("g.node");
        var json_nodes = JSON.stringify(nodesInit.data());
        jsonNodes = json_nodes;

        var linesInit = d3.selectAll("line.link");
        var json_lines = JSON.stringify(linesInit.data());
        jsonLines = json_lines;
      }
    }
    if (visMode == 'home' || visMode == 'person' || e.alpha < .007) {
      d3.selectAll(".node").on("click", nodeClickFunction);
      d3.selectAll(".popup-home").on("click", homeClick)
    }
  });
}

function stickyPeople() {
  return function(d) {
    if (visMode == "person") {
      if (d.id == usePerson) {
        d.x = visWidth/2;
        d.y = visHeight/2 - 250;
      }
    }
    else {
      if (d.id == 'http://data.artic.edu/whistler/person/James_McNeill_Whistler') {
        d.x = visWidth/2 + 100;
        d.y = visHeight/2;
      }
      if (d.id == 'http://data.artic.edu/whistler/person/Theodore_Roussel') {
        d.x = visWidth/2 - 100;
        d.y = visHeight/2;
      }
    }
  };
}

function gravity(alpha) {
  // start with the center of the display
  cx = visWidth / 2;
  cy = visHeight / 2;

  // use alpha to affect how much to push
  // towards the horizontal or vertical
  ax = alpha / 2;
  ay = alpha;

  // return a function that will modify the
  // node's x and y values
  return function(d) {
    d.x += (cx - d.x) * ax;
    d.y += (cy - d.y) * ay;
  };
}

function collide(jitter) {
  var collisionPadding = 4;
  // return a function that modifies
  // the x and y of a node
  return function(d) {
    nodes.forEach(function(d2) {
      // check that we aren't comparing a node
      // with itself
      if (d != d2) {
        // use distance formula to find distance
        //between two nodes
        x = d.x - d2.x;
        y = d.y - d2.y;
        distance = Math.sqrt(x * x + y * y);
        // find current minimum space between two nodes
        // using the width of the nodes
        minDistance = d.width*0.6 + d2.width*0.6 + collisionPadding;

        // if the current distance is less then the minimum
        // allowed then we need to push both nodes away from one another
        if (distance < minDistance) {
          // scale the distance based on the jitter variable
          distance = (distance - minDistance) / distance * jitter;
          // move our two nodes
          moveX = x * distance * ratio;
          moveY = y * distance;
          if (moveX == 0) { moveX = 1; }
          if (moveY == 0) { moveY = 1; }
          if ((visMode != 'person' && (d.id == 'http://data.artic.edu/whistler/person/James_McNeill_Whistler' || d.id == 'http://data.artic.edu/whistler/person/Theodore_Roussel'))
             || (visMode == 'person' && (d.id == usePerson))) {
            d2.x += moveX * 2;
            d2.y += moveY * 2;
          }
          else if ((visMode != 'person' && (d2.id == 'http://data.artic.edu/whistler/person/James_McNeill_Whistler' || d2.id == 'http://data.artic.edu/whistler/person/Theodore_Roussel'))
             || (visMode == 'person' && (d2.id == usePerson))) {
            d.x -= moveX * 2;
            d.y -= moveY * 2;
          }
          else {
            d.x -= moveX;
            d.y -= moveY;
            d2.x += moveX;
            d2.y += moveY;
          }
        }
      }
    });
  };
}

function returnNodeSize(d) {
  if (usePerson && d.id == usePerson) {
    return largeNodeRadius;
  }
  else if (!usePerson && (d.label == "James McNeill Whistler" || d.label == "Theodore Roussel")) {
    return largeNodeRadius;
  }
  else {
    return smallNodeRadius;
  }
}

//replacing returnNodeSize for testing 2.10.ts
function returnTextLoc(d) {
  if (usePerson && d.id == usePerson) {
    return largeNodeRadius;
  }
  else if (!usePerson && (d.label == "James McNeill Whistler" || d.label == "Theodore Roussel")) {
    return largeNodeRadius;
  }
  else {
    return smallNodeRadius + 11;
  }
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

function showPopup(d,cords) {
  if (!popupShown) {

    // Clear the popup
    $("#popUp").off( "scroll" );
    $('#popUp').empty();

    // Headshot
    var useId = $.trim(decodeURI(d.id).split("\/")[decodeURI(d.id).split("\/").length-1]);

    var abstract = "";
    var birthPlace = "";
    var birthDate = "";
    var deathPlace = "";
    var deathDate = "";
    var occupation = "";
    var activeStartDate = "";
    var activeEndDate = "";
    var headshotLarge = "";
    var headshotIcon = "";
    var headshotBanner = "";
    var headshotBannerButtonColor = "";

    var artwork1Large = "";
    var artwork1Thumb = "";
    var artwork1Title = "";
    var artwork1Date = "";
    var artwork1Artist = "";
    var artwork1Desc = "";

    var artwork2Large = "";
    var artwork2Thumb = "";
    var artwork2Title = "";
    var artwork2Date = "";
    var artwork2Artist = "";
    var artwork2Desc = "";

    var artwork3Large = "";
    var artwork3Thumb = "";
    var artwork3Title = "";
    var artwork3Date = "";
    var artwork3Artist = "";
    var artwork3Desc = "";

    var artwork4Large = "";
    var artwork4Thumb = "";
    var artwork4Title = "";
    var artwork4Date = "";
    var artwork4Artist = "";
    var artwork4Desc = "";

    if (descObject.hasOwnProperty(usePerson)) {
      if (descObject[usePerson]['http://dbpedia.org/ontology/abstract']) {
        abstract = descObject[usePerson]['http://dbpedia.org/ontology/abstract'][0].value;
      }
      if (descObject[usePerson]['http://dbpedia.org/ontology/birthPlace']) {
        birthPlace = descObject[usePerson]['http://dbpedia.org/ontology/birthPlace'][0].value;
      }
      if (descObject[usePerson]['http://dbpedia.org/ontology/birthDate']) {
        birthDate = descObject[usePerson]['http://dbpedia.org/ontology/birthDate'][0].value;
      }
      if (descObject[usePerson]['http://dbpedia.org/ontology/deathPlace']) {
        deathPlace = descObject[usePerson]['http://dbpedia.org/ontology/deathPlace'][0].value;
      }
      if (descObject[usePerson]['http://dbpedia.org/ontology/deathDate']) {
        deathDate = descObject[usePerson]['http://dbpedia.org/ontology/deathDate'][0].value;
      }
      if (descObject[usePerson]['http://dbpedia.org/ontology/occupation']) {
        occupation = descObject[usePerson]['http://dbpedia.org/ontology/occupation'][0].value;
        occupation = occupation.replace(new RegExp(', ', 'g'), '<br/>');
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#activeStartDate']) {
        activeStartDate = descObject[usePerson]['http://lv.artic.edu/ns#activeStartDate'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#activeEndDate']) {
        activeEndDate = descObject[usePerson]['http://lv.artic.edu/ns#activeEndDate'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#image']) {
        headshotLarge = descObject[usePerson]['http://lv.artic.edu/ns#image'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#imageIcon']) {
        headshotIcon = descObject[usePerson]['http://lv.artic.edu/ns#imageIcon'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#imageBanner']) {
        headshotBanner = descObject[usePerson]['http://lv.artic.edu/ns#imageBanner'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#imageBannerButtonColor']) {
        headshotBannerButtonColor = descObject[usePerson]['http://lv.artic.edu/ns#imageBannerButtonColor'][0].value;
      }

      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork1']) {
        artwork1Large = descObject[usePerson]['http://lv.artic.edu/ns#artwork1'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork1Thumb']) {
        artwork1Thumb = descObject[usePerson]['http://lv.artic.edu/ns#artwork1Thumb'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork1Title']) {
        artwork1Title = descObject[usePerson]['http://lv.artic.edu/ns#artwork1Title'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork1Date']) {
        artwork1Date = descObject[usePerson]['http://lv.artic.edu/ns#artwork1Date'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork1Artist']) {
        artwork1Artist = descObject[usePerson]['http://lv.artic.edu/ns#artwork1Artist'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork1Desc']) {
        artwork1Desc = descObject[usePerson]['http://lv.artic.edu/ns#artwork1Desc'][0].value;
      }

      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork2']) {
        artwork2Large = descObject[usePerson]['http://lv.artic.edu/ns#artwork2'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork2Thumb']) {
        artwork2Thumb = descObject[usePerson]['http://lv.artic.edu/ns#artwork2Thumb'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork2Title']) {
        artwork2Title = descObject[usePerson]['http://lv.artic.edu/ns#artwork2Title'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork2Date']) {
        artwork2Date = descObject[usePerson]['http://lv.artic.edu/ns#artwork2Date'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork2Artist']) {
        artwork2Artist = descObject[usePerson]['http://lv.artic.edu/ns#artwork2Artist'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork2Desc']) {
        artwork2Desc = descObject[usePerson]['http://lv.artic.edu/ns#artwork2Desc'][0].value;
      }

      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork3']) {
        artwork3Large = descObject[usePerson]['http://lv.artic.edu/ns#artwork3'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork3Thumb']) {
        artwork3Thumb = descObject[usePerson]['http://lv.artic.edu/ns#artwork3Thumb'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork3Title']) {
        artwork3Title = descObject[usePerson]['http://lv.artic.edu/ns#artwork3Title'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork3Date']) {
        artwork3Date = descObject[usePerson]['http://lv.artic.edu/ns#artwork3Date'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork3Artist']) {
        artwork3Artist = descObject[usePerson]['http://lv.artic.edu/ns#artwork3Artist'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork3Desc']) {
        artwork3Desc = descObject[usePerson]['http://lv.artic.edu/ns#artwork3Desc'][0].value;
      }

      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork4']) {
        artwork4Large = descObject[usePerson]['http://lv.artic.edu/ns#artwork4'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork4Thumb']) {
        artwork4Thumb = descObject[usePerson]['http://lv.artic.edu/ns#artwork4Thumb'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork4Title']) {
        artwork4Title = descObject[usePerson]['http://lv.artic.edu/ns#artwork4Title'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork4Date']) {
        artwork4Date = descObject[usePerson]['http://lv.artic.edu/ns#artwork4Date'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork4Artist']) {
        artwork4Artist = descObject[usePerson]['http://lv.artic.edu/ns#artwork4Artist'][0].value;
      }
      if (descObject[usePerson]['http://lv.artic.edu/ns#artwork4Desc']) {
        artwork4Desc = descObject[usePerson]['http://lv.artic.edu/ns#artwork4Desc'][0].value;
      }
    }


    var dates = "";
    if (birthPlace) {
      dates += birthPlace;
    }
    if (birthDate) {
      if (birthPlace) {
        dates += ", ";
      }
      dates += birthDate;
    }
    if ((birthDate || birthPlace) && (deathDate || deathPlace)) {
      dates += "–";
    }
    if (deathPlace) {
      dates += deathPlace;
    }
    if (deathDate) {
      if (deathPlace) {
        dates += ", ";
      }
      dates += deathDate;
    }

    if (activeStartDate || activeEndDate) {
      dates = "Active: ";
      if (activeStartDate) {
        dates += activeStartDate;
      }
      if (activeStartDate || activeEndDate) {
        dates += "–";
      }
      if (activeEndDate) {
        dates += activeEndDate;
      }
    }

    $('#popUp')
      .append(
        $("<a>")
          .attr("href", headshotLarge)
          .attr("class", "cboxHeadshot")
          .append(
            $("<div>")
              .attr("class","popup-headshot-cont")
              .append(
                $("<div>")
                  .attr("class","popup-headshot-cont-wrapper")
                  .append(
                    $("<img>")
                      .attr("src", headshotBanner)
                      .attr("class","popup-headshot")
                      .attr("id","popup-headshot")
                      .attr("alt", nodes[usePersonIndex].label)
                      .attr("copy", "<div class=\"divider\"><img src=\"menu/dash.png\"/></div><h2>" + nodes[usePersonIndex].label + "</h2><h4>" +  dates + "</h4><p>" + abstract + "</p>")
                  )
                  .append(
                    $("<img>")
                      .attr("src", "menu/plus.jpg")
                      .attr("class","popup-headshot-plus")
                  )
              )
          )
      );
	  
    $('.popup-headshot-cont')
		.mouseenter(function () {
	      $('.popup-headshot-plus').fadeIn(300);
	     })
		 .mouseleave(function () {
	      $('.popup-headshot-plus').fadeOut(100);
	     })
 
    // Home
    $('#popUp')
      .append(
        $("<div>")
          .attr("class", "popup-home popup-home-color-switch")
          .text("HOME")
      );

    $('#popUp')
      .append(
        $("<div>")
          .attr("class", "popup-home-banner")
          .css('display', 'none')
          .append(
            $("<div>")
              .attr("class", "popup-home")
              .text("HOME")
          )
      );

    if (headshotBannerButtonColor) {
      $('.popup-home-color-switch').css('color', headshotBannerButtonColor)
      $('.popup-home-color-switch').css('border-color', headshotBannerButtonColor)
      $('.popup-home')
	    .mouseenter(function () {
	      $('.popup-home').css('border-color', '#E9967A')  
	     })
		.mouseleave(function () {
	      $('.popup-home').css('border-color', headshotBannerButtonColor)  
	     });
    }

    // Name and dates
    $('#popUp')
      .append(
        $("<h2>")
          .text(nodes[usePersonIndex].label)
      )
      .append(
        $("<h3>")
          .text(dates)
      );

    // Metadata
    $('#popUp')
      .append(
        $("<div>")
          .attr("class", "popup-metadata")
          .append(
            $('<div>')
              .attr("class", "divider")
              .html("<img src=\"menu/dash.png\"/>")
          )
          .append($("<h4>").text("OCCUPATION"))
          .append($("<p>").html(occupation))
      );

    // Description
    $('#popUp')
      .append(
        $("<div>")
          .attr("class", "popup-description")
          .append(
            $('<div>')
              .attr("class", "divider")
              .html("<img src=\"menu/dash.png\"/>")
          )
          .append($("<p>").html(abstract))
      );

    $('#popUp')
      .append(
        $("<div>")
          .attr("class", "clear")
      );

    if (artwork1Large || artwork2Large || artwork3Large || artwork4Large) {
      popupWorks = $("<div>")
        .attr("class", "popup-artworks")

      popupWorks.append(
        $("<div>")
          .attr("class", "popup-row")
          .append(
            $('<div>')
              .attr("class", "divider")
              .html("<img src=\"menu/dash.png\"/>")
          )
          .append($("<h4>").html("WORKS"))
      );

      // Works
      if (artwork1Large) {
        popupWorks.append(
          $("<a>")
            .attr("href", artwork1Large)
            .attr("class", "artwork-group")
            .append(
              $("<span>")
                .attr("class", "popup-row")
                .append(
                  $("<div>")
                    .attr("class","popup-artwork-cont")
                    .append(
                      $("<div>")
                        .attr("class","popup-artwork-cont-wrapper")
                        .append(
                          $("<img>")
                            .attr("class", "popup-artwork")
                            .attr("src", artwork1Thumb)
                            .attr("alt", nodes[usePersonIndex].label)
                            .attr("copy", "<div class=\"divider\"><img src=\"menu/dash.png\"/></div><h2>" + nodes[usePersonIndex].label + "</h2><h4>" + artwork1Artist + "</h4><h3>" + artwork1Title + "</h3><h4>" + artwork1Date + "</h4><p>" + artwork1Desc + "</p>" )
                        )
                        .append(
                          $("<img>")
                            .attr("src", "menu/plus.jpg")
                            .attr("class","popup-artwork-plus")
                        )
                    )
                )
                .append(
                  $("<span>")
                    .attr("class", "popup-artwork-desc")
                    .append(
                      $("<span>")
                        .attr("class", "popup-artist")
                        .html(artwork1Artist)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-title")
                        .html(artwork1Title)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-date")
                        .html(artwork1Date)
                    )
                )
            )
        );
      }

      if (artwork2Large) {
        popupWorks.append(
          $("<a>")
            .attr("href", artwork2Large)
            .attr("class", "artwork-group")
            .append(
              $("<span>")
                .attr("class", "popup-row")
                .append(
                  $("<div>")
                    .attr("class","popup-artwork-cont")
                    .append(
                      $("<div>")
                        .attr("class","popup-artwork-cont-wrapper")
                        .append(
                          $("<img>")
                            .attr("class", "popup-artwork")
                            .attr("src", artwork2Thumb)
                            .attr("alt", nodes[usePersonIndex].label)
                            .attr("copy", "<div class=\"divider\"><img src=\"menu/dash.png\"/></div><h2>" + nodes[usePersonIndex].label + "</h2><h4>" + artwork2Artist + "</h4><h3>" + artwork2Title + "</h3><h4>" + artwork2Date + "</h4><p>" + artwork2Desc + "</p>" )
                        )
                        .append(
                          $("<img>")
                            .attr("src", "menu/plus.jpg")
                            .attr("class","popup-artwork-plus")
                        )
                    )
                )
                .append(
                  $("<span>")
                    .attr("class", "popup-artwork-desc")
                    .append(
                      $("<span>")
                        .attr("class", "popup-artist")
                        .html(artwork2Artist)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-title")
                        .html(artwork2Title)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-date")
                        .html(artwork2Date)
                    )
                )
            )
        );
      }

      if (artwork3Large) {
        popupWorks.append(
          $("<a>")
            .attr("href", artwork3Large)
            .attr("class", "artwork-group")
            .append(
              $("<span>")
                .attr("class", "popup-row")
                .append(
                  $("<div>")
                    .attr("class","popup-artwork-cont")
                    .append(
                      $("<div>")
                        .attr("class","popup-artwork-cont-wrapper")
                        .append(
                          $("<img>")
                            .attr("class", "popup-artwork")
                            .attr("src", artwork3Thumb)
                            .attr("alt", nodes[usePersonIndex].label)
                            .attr("copy", "<div class=\"divider\"><img src=\"menu/dash.png\"/></div><h2>" + nodes[usePersonIndex].label + "</h2><h4>" + artwork3Artist + "</h4><h3>" + artwork3Title + "</h3><h4>" + artwork3Date + "</h4><p>" + artwork3Desc + "</p>" )
                        )
                        .append(
                          $("<img>")
                            .attr("src", "menu/plus.jpg")
                            .attr("class","popup-artwork-plus")
                        )
                    )
                )
                .append(
                  $("<span>")
                    .attr("class", "popup-artwork-desc")
                    .append(
                      $("<span>")
                        .attr("class", "popup-artist")
                        .html(artwork3Artist)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-title")
                        .html(artwork3Title)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-date")
                        .html(artwork3Date)
                    )
                )
            )
        );
      }

      if (artwork4Large) {
        popupWorks.append(
          $("<a>")
            .attr("href", artwork4Large)
            .attr("class", "artwork-group")
            .append(
              $("<span>")
                .attr("class", "popup-row")
                .append(
                  $("<div>")
                    .attr("class","popup-artwork-cont")
                    .append(
                      $("<div>")
                        .attr("class","popup-artwork-cont-wrapper")
                        .append(
                          $("<img>")
                            .attr("class", "popup-artwork")
                            .attr("src", artwork4Thumb)
                            .attr("alt", nodes[usePersonIndex].label)
                            .attr("copy", "<div class=\"divider\"><img src=\"menu/dash.png\"/></div><h2>" + nodes[usePersonIndex].label + "</h2><h4>" + artwork4Artist + "</h4><h3>" + artwork4Title + "</h3><h4>" + artwork4Date + "</h4><p>" + artwork4Desc + "</p>" )
                        )
                        .append(
                          $("<img>")
                            .attr("src", "menu/plus.jpg")
                            .attr("class","popup-artwork-plus")
                        )
                    )
                )
                .append(
                  $("<span>")
                    .attr("class", "popup-artwork-desc")
                    .append(
                      $("<span>")
                        .attr("class", "popup-artist")
                        .html(artwork4Artist)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-title")
                        .html(artwork4Title)
                    )
                    .append(
                      $("<span>")
                        .attr("class", "popup-date")
                        .html(artwork4Date)
                    )
                )
            )
        );
      }

      popupWorks.append(
        $("<div>")
          .attr("class", "popup-row")
          .append(
            $('<p>')
              .html("&nbsp;")
          )
      );

      $('#popUp')
        .append(popupWorks);
    }

    $("#popUp")
      .css("left", "0px")
      .css("top", "0px");

    $('.cboxHeadshot').colorbox(cboxProps);

    var groupCboxProps = $.extend({rel: "artwork-group"}, cboxProps);
    $('.artwork-group').colorbox(groupCboxProps);

    $("#popUp").animate({ scrollTop: 0 }, 1);
    $(".popup-home-banner").hide();
    $("#popUp").fadeIn(200);

    setTimeout(function() {
      $("#popUp").scroll(function(){
        if (!isScrolledIntoView('.popup-headshot-cont', 50)) {
          $(".popup-home-banner").fadeIn(200);
        }
        else {
          $(".popup-home-banner").fadeOut(200);
        }
      });
    }, 1000, []);

    //popupShown = true;
  }
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

function hideDetailElements() {
	$('#popUp').hide();
}

function changeVisMode(changeTo) {
  if (rendering)
    return false;
  rendering = true;

  if (changeTo == "person") {
    if (nameObject.hasOwnProperty(usePerson)) {
      if (nameObject[usePerson]['http://xmlns.com/foaf/0.1/name']) {
        var name = nameObject[usePerson]['http://xmlns.com/foaf/0.1/name'][0].value;
      }
    }

    updateHistory(idLookup[usePerson], "Linked Visions: " + name, "?person=" + idLookup[usePerson]);
  } else {
    updateHistory(changeTo, "Linked Visions", "network.php");
  }

  visMode = changeTo;

  initalizeNetwork();

  //we need to rest the zoom/pan
  zoom.translate([0,0]).scale(1);
  vis.attr("transform", "translate(" + [0,0] + ")"  + " scale(" + 1 + ")");

  zoomWidgetObjDoZoom = false;
  zoomWidgetObj.setValue(0,0.8);

  filter();

  rendering = false;

}

function updateHistory(state, title, url) {
  History.pushState({state: state}, title, url);
  // pushState doesn't set title on initial load, so do it manually 
  document.title = title; 
  // fire custom vpv event
  // debounce pageviews by comparing to previous location
  if(lastLocation !== window.location.toString()) {
    lastLocation = window.location.toString();
    // listen to this event to trigger virtual pageviews for analytics
    $('body').trigger('vpv');
  }
}

function hideRelations() {
  var black = "black";
  var salmon = "#E9967A";
  var grey = "#cccccc";
  d3.selectAll(".marker").transition().attr("stroke-opacity",1).attr("fill-opacity",1)
  d3.selectAll(".marker path").transition().style("fill", black);
  d3.selectAll(".backgroundCircle").transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", salmon).style("stroke", salmon);
  d3.selectAll(".backgroundCircleHighlight").transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", salmon).style("stroke", salmon);
  d3.selectAll(".imageCircle").transition().attr("display","block");
  d3.selectAll(".imageCircleHighlight").transition().attr("display","block");
  d3.selectAll(".circleText").transition().attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".circleTextRect").transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", black).attr("stroke", black);
  d3.selectAll(".circleTextRectHighlight").transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", salmon).attr("stroke", salmon);
  d3.selectAll(".labelText").transition().attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll(".labelRect").transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", "black").attr("stroke", black);
  d3.selectAll(".labelRectHighlight").transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", salmon).attr("stroke", salmon);
  d3.selectAll(".link").transition().attr("stroke-opacity",1).style("fill-opacity",1).style("stroke-width",0.3).style("fill", grey).style("stroke", grey);

  $(".filter-button").removeClass("active");
  $("#filter_all").addClass("active");
  d3.selectAll(".node").on("click", nodeClickFunction);
}

function showRelations(rel) {
  $(".filter-button").removeClass("active");
  $("#filter_" + rel).addClass("active");
  d3.selectAll(".node").on("click", nodeClickFunction);

  // First we grey out everything
  var fill = "black";
  d3.selectAll(".backgroundCircle").transition().attr("fill-opacity",0.03).attr("stroke-opacity",0.03).style("fill", fill).style("stroke", fill);
  d3.selectAll(".backgroundCircleHighlight").transition().attr("fill-opacity",0.1).attr("stroke-opacity",0.1);
  d3.selectAll(".circleText").transition().attr("fill-opacity",0.03).attr("stroke-opacity",0.03);
  d3.selectAll(".circleTextRect").transition().attr("fill-opacity",0.03).attr("stroke-opacity",0.03).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".circleTextRectHighlight").transition().attr("fill-opacity",0.1).attr("stroke-opacity",0.1);
  d3.selectAll(".labelText").transition().attr("fill-opacity",0.03).attr("stroke-opacity",0.03);
  d3.selectAll(".labelRect").transition().attr("fill-opacity",0.03).attr("stroke-opacity",0.03).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".labelRectHighlight").transition().attr("fill-opacity",0.03).attr("stroke-opacity",0.03);
  d3.selectAll(".imageCircle").transition().attr("display","none");
  d3.selectAll(".imageCircleHighlight").transition().attr("display","none");
  d3.selectAll(".link").transition().attr("stroke-opacity",0.03).attr("fill-opacity",0.03).style("fill", fill).style("stroke", fill);

  // Which predicates to show
  var relationsToShow = [];
  fill = "#E9967A";
  if (rel == "friends") {
    relationsToShow = relFriends;
  }
  else if (rel == "family") {
    relationsToShow = relFamily;
  }
  else if (rel == "colleagues") {
    relationsToShow = relColleagues;
  }
  else if (rel == "mentors") {
    relationsToShow = relMentors;
  }
  else if (rel == "employers") {
    relationsToShow = relEmployers;
  }

  var nodesShown = [];

  // Show circles and names
  for (var r in relationsToShow) {
    var rx = relationsToShow[r];
    for (var e in connectionRelationIndex[usePerson][rx]) {
      var id = connectionRelationIndex[usePerson][rx][e].split("/")[connectionRelationIndex[usePerson][rx][e].split("/").length-1].replace(cssSafe,'');
      d3.selectAll("#backgroundCircle_" + id).transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).style("stroke", fill);
      d3.selectAll("#imageCircle_"+ id).transition().attr("display","block").style("fill", fill).attr("stroke", fill);
      d3.selectAll("#circleText_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1);
      d3.selectAll("#circleTextRect_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", "black").attr("stroke", "black");
      d3.selectAll("#labelText_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1);
      d3.selectAll("#labelRect_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", "black").attr("stroke", "black");
      d3.selectAll(".marker path").transition().style("fill", fill);
      nodesShown.push(id);
    }
  }
  var id = usePerson.split("/")[usePerson.split("/").length-1].replace(cssSafe,'');
  d3.selectAll("#backgroundCircle_" + id).transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).style("stroke", fill);
  d3.selectAll("#imageCircle_"+ id).transition().attr("display","block").style("fill", fill).attr("stroke", fill);
  d3.selectAll("#circleText_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll("#circleTextRect_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).attr("stroke", fill);
  d3.selectAll("#labelText_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1);
  d3.selectAll("#labelRect_"+ id).transition().attr("fill-opacity",1).attr("stroke-opacity",1).style("fill", fill).attr("stroke", fill);
  d3.selectAll(".marker path").transition().style("fill", fill);
  nodesShown.push(id);
  // Now show all the lines between all the nodes that we've shown
  for (var n in nodesShown) {
    for (var m in nodesShown) {
      if (nodesShown[n] != nodesShown[m] && (nodesShown[n] == id || nodesShown[m] == id)) {
        d3.selectAll(".link_" + nodesShown[n] + ".link_" + nodesShown[m]).transition().attr("stroke-opacity",1).style("fill-opacity",1).style("stroke-width",2).style("fill", fill).style("stroke", fill);
      }
    }
  }

  // Remove click events from disabled nodes
  for (var n in nodes) {
    var id = nodes[n].id.split("/")[nodes[n].id.split("/").length-1].replace(cssSafe,'');

    if ($.inArray(id, nodesShown) == -1) {
      d3.selectAll("#node_" + id).on("click", null);
    }
  }
}

//zoom/pan function called by mouse event
function redraw(useScale) {
  //store the last event data
  trans = d3.event.translate;
  scale = d3.event.scale;
  tx = trans[0];
  ty = trans[1];
  tx = Math.min(tx, d3.select("#networkCanvas").node().getBBox().width/2 + visWidth/2 - visWidth*.1);
  tx = Math.max(tx, (d3.select("#networkCanvas").node().getBBox().width/2 + visWidth/2 - visWidth*.1)*-1);
  ty = Math.min(ty, d3.select("#networkCanvas").node().getBBox().height/2 + visHeight/2 - visHeight*.3);
  ty = Math.max(ty, (d3.select("#networkCanvas").node().getBBox().height/2 + visHeight/2 - visHeight*.3)*-1);
  
  //transform the vis
  vis.attr("transform","translate(" + [tx, ty] + ")" + " scale(" + scale + ")");
  
  //we need to update the zoom slider, set the boolean to false so the slider change does not trigger a zoom change in the vis (from the slider callback function)
  zoomWidgetObjDoZoom = false;
  //subtracting from 1 to flip axis
  zoomWidgetObj.setValue(0,1-(scale-.4)/2);
}

/*
nodeEnter.append("svg:image")
    .attr("id", function(d) {  return "imageCircle_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,'')})
    .attr("class","imageCircle")
	.attr("clip-path","url(#myClip)")
    .attr("xlink:href", function(d) {
      var useId = $.trim(decodeURI(d.id).split("\/")[decodeURI(d.id).split("\/").length-1]);
      if (fileNames.indexOf(useId+'.png') == -1) {
        return "menu/no_image.png";
      } else {
        return "images/headshotIcon/" + useId+'.png';
      }
    })
    .attr("x", function(d) { return  (returnNodeSize(d)*-1); })
    .attr("y", function(d) { return  (returnNodeSize(d)*-1); })
    .attr("width", function(d) { return  (returnNodeSize(d)*2); })
    .attr("height", function(d) { return  (returnNodeSize(d)*2); });
	*/

function showSpinner(text) {
  if (visMode == "person") {
    $("#spinner").css("left",((visWidth/2) + 540) + "px");
  }
  else {
    $("#spinner").css("left",(visWidth/2)-66 + "px");
  }
  $("#spinner").css("top", (visHeight/2) + "px");
  $("#spinner").css("display","block");
  $("#spinner span").html(text);
}

function hideSpinner() {
  $("#spinner").css("display","none");
}

function isScrolledIntoView(elem, buffer) {
  if (!buffer){
    buffer = 0;
  }

  var $elem = $(elem);
  var $window = $(window);

  var docViewTop = $window.scrollTop() + buffer;
  var docViewBottom = docViewTop + $window.height() - buffer;

  var elemTop = $elem.position().top;
  var elemBottom = elemTop + $elem.outerHeight(true);

  return ((elemTop <= docViewBottom) && (elemBottom >= docViewTop));
}

function windowResize() {
  visWidth = $(window).width();
  visHeight = $(window).height() - 120;
  if (visMode == "person") {
    visHeight += 120;
    visWidth -= $('#popUp').width();
    if (visWidth < 614) {
      visWidth = 614;
    }
	  //visHeight -= 500;
    $("#network").css('float', 'right');
  }
  $("#network").css('width', visWidth + 'px');
  $("#network").css('height',visHeight + 'px');
  d3.select("#network svg")
	  .attr("width", visWidth - 10)
	  .attr("height", visHeight - 10);
}

function initializeZoomWidget() {
  //add the zoom widget
  $("#network").append(
    $("<div>")
      .attr("id","zoomWidget")
      .addClass("dragdealer")
      .append(
        $("<div>")
          .addClass("handle")
          
      )
      .append(
        $("<div>")
          .addClass("zoomWidgetRail")
      )
      .append(
        $("<div>")
          .addClass("zoomWidgetEndcaps")
          .attr("id","woomWidgetZoomIn")
          .append(
            $("<div>")
              .text("+")
          )
      )
	  .append(
        $("<div>")
          .addClass("zoomWidgetEndcaps")
          .attr("id","woomWidgetZoomOut")
          .append(
            $("<div>")
              .html("&mdash;")
          )
      )
  );

  $("#zoomWidget").mouseenter(function() { zoomWidgetObjDoZoom = true; });

  zoomWidgetObj = new Dragdealer('zoomWidget', {
    horizontal: false,
    vertical: true,
    y: 0.8,
    animationCallback: zoomWidgetAnimationCallback
  });
}

function zoomWidgetAnimationCallback(x, y) {
  //if the value is the same as the intial value exit, to prevent a zoom even being called onload
  if (y==0.8) { return false; }

  //subtracting from 1 to flip axis
  y = 1 - y;
  y = (y * 2) + .4;

  // Implement various zoom levels
  if (y > 1 && y <= 2) {
    d3.selectAll(".backgroundCircle").attr("r", largeNodeRadius);
    d3.selectAll(".backgroundCircle").style("fill", "#ffffff");
    if ($(".imageCircle").css("visibility") != "visible") {
      d3.selectAll(".imageCircle").transition(800).style("opacity",1).attr("visibility","visible");
    }
    d3.selectAll(".imageCircle")
      .attr("clip-path","url(#smallClip)")
      .attr("width", largeNodeRadius*2)
      .attr("height", largeNodeRadius*2)
      .attr("x", largeNodeRadius*-1)
      .attr("y", largeNodeRadius*-1)
      .attr("clip-path","url(#myClip)");
    d3.selectAll(".labelText").transition(500).style("opacity",0).attr("visibility","hidden");
    d3.selectAll(".labelRect").transition(500).style("opacity",0).attr("visibility","hidden");
    d3.selectAll(".labelRectHighlight").transition(500).style("opacity",0).attr("visibility","hidden");	
  }
  if (y > 2) {
    if ($(".labelText").css("visibility") != "visible") {
      d3.selectAll(".labelText").transition(800).style("opacity",1).attr("visibility","visible");
      d3.selectAll(".labelRect").transition(800).style("opacity",1).attr("visibility","visible");
      d3.selectAll(".labelRectHighlight").transition(800).style("opacity",1).attr("visibility","visible");
    }
  }

  // Default view
  if (y <= 1) {
    d3.selectAll(".backgroundCircle").transition(800).attr("r", function(d) { return  returnNodeSize(d); });
    d3.selectAll(".backgroundCircle").style("fill", "#E9967A");
    d3.selectAll(".imageCircle").transition(500).style("opacity",0).attr("visibility","hidden")
      .attr("width", function(d) { return  (returnNodeSize(d)*2); })
      .attr("height", function(d) { return  (returnNodeSize(d)*2); })
      .attr("x", function(d) { return  (returnNodeSize(d)*-1); })
      .attr("y", function(d) { return  (returnNodeSize(d)*-1); })
      .attr("clip-path","url(#smallClip)");
    d3.selectAll(".circleText").attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+6; })
      d3.selectAll(".labelText").attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+27; } )
  }
  else {
    d3.selectAll(".circleText").attr("y", function(d) { return largeNodeRadius+largeNodeRadius/1.8+6; })
      d3.selectAll(".labelText").attr("y", function(d) { return largeNodeRadius+largeNodeRadius/1.8+27; } )
  }

  d3.selectAll(".circleTextRect").attr("y", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    d3.selectAll(".circleTextRectHighlight").attr("y", function(d) { return $("#" + "circleText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    d3.selectAll(".labelRect").attr("y", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    d3.selectAll(".labelRectHighlight").attr("y", function(d) { return $("#" + "labelText_" + d.id.split("/")[d.id.split("/").length-1].replace(cssSafe,''))[0].getBBox().y; })
    if (y <= 1) {
      d3.selectAll(".circleText").attr("y", function(d) { return returnTextLoc(d)+returnTextLoc(d)/1.8+7; });
    }
    else {
      d3.selectAll(".circleText").attr("y", function(d) { return largeNodeRadius+largeNodeRadius/1.8+7; });
    }


  //are we  zooming based on a call from interaction with the slider, or is this callback being triggerd by the mouse event updating the slider position.
  if (zoomWidgetObjDoZoom == true) {
    //this is how it works now until i figure out how to handle this better.
    //translate to the middle of the vis and apply the zoom level
    vis.attr("transform", "translate(" + [(visWidth/2)-(visWidth*y/2),(visHeight/2)-(visHeight*y/2)] + ")"  + " scale(" + y + ")");
    //store the new data into the zoom object so it is ready for mouse events
    zoom.translate([(visWidth/2)-(visWidth*y/2),(visHeight/2)-(visHeight*y/2)]).scale(y);
  }
}

