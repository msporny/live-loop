/**
 * All of the live-loop javascript code necessary to make live loop work.
 */
(function($)
{
   // create the liveloop object
   window.liveloop = window.liveloop || {};
   var liveloop = window.liveloop;

   // the counter is used to throttle XMLHttpRequests for triple lookups
   liveloop.tripleCounter = 1;
   
   // the counter timeout is used to keep track of the timeout object if the
   // triple counter needs to be replaced with a new timeout object
   liveloop.tripleCounterTimeout = null;

   // the counter is used to throttle XMLHttpRequests for triple lookups
   liveloop.prefixCounter = 1;
   
   // the counter timeout is used to keep track of the timeout object if the
   // counter needs to be replaced with a new timeout object
   liveloop.prefixCounterTimeout = null;
   
   // the active vocabularies for the page
   liveloop.vocabs = 
   {
      dc: "http://purl.org/dc/terms/", 
      foaf: "http://xmlns.com/foaf/0.1/"
   };

   /**
    * Generates the HTML prologue for the document, which is prepended to the
    * editable text area.
    */
   liveloop.generateCodePrologue = function()
   {
      var prologue = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML+RDFa 1.0//EN\" \"http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\"";
      
      for(k in liveloop.vocabs)
      {
         prologue += "\n      xmlns:" + k + "=\"" + liveloop.vocabs[k] + "\"";
      }
      
      prologue += ">\n <head>\n  <title>Test Snippet</title>\n </head>\n <body>\n";
      
      return prologue;
   }

   /**
    * Performs the code prologue setup, binding hotspot areas for the editable
    * portions of the code prologue.
    */
   liveloop.setupCodePrologue = function()
   {
      var e = $("#code-prologue");
      var encodedPrologue = $('<div/>').text(liveloop.generateCodePrologue()).html();
      encodedPrologue = encodedPrologue.replace("xmlns=", 
         "<span id=\"prefix-editor-hotspot\" " +
         "title=\"Click to edit the available vocabularies\">xmlns=");
      encodedPrologue = encodedPrologue.replace(" &lt;head&gt;", 
         "</span> &lt;head&gt;");
      e.html(encodedPrologue);
      
      // setup the editor hotspot event
      $("#prefix-editor-hotspot").click(liveloop.showPrefixEditor);
   };

   
   /**
    * Generates the HTML epilogue for the document, which is appended to the
    * editable text area.
    */
   liveloop.generateCodeEpilogue = function()
   {
      return "\n </body>\n</html>";
   }

   /**
    * Performs the code epilogue setup, converting the epilogue into a 
    * displayable format.
    */
   liveloop.setupCodeEpilogue = function()
   {
      var e = $("#code-epilogue");
      var encodedEpilogue = $('<div/>')
         .text(liveloop.generateCodeEpilogue()).html(); 
      e.html(encodedEpilogue);
   };
   
   /**
    * Displays the prefix editor for the document, which allows prefixes to be
    * declared using only short-names for vocabularies.
    */
   liveloop.showPrefixEditor = function()
   {
      var pe = $("#prefix-editor");
      var pl = $("#prefix-list").html("");
      var ple = $("#prefix-list-editor").html("");

      for(k in liveloop.vocabs)
      {
         liveloop.addPrefixListItem(k, liveloop.vocabs[k]);
      }
      ple.append("<div>xmlns:<input id=\"prefix-input\" type=\"text\" " +
         "size=\"8\" />=\"<span id=\"prefix-editor-lookup-result\"></span>" +
         "<img id=\"prefix-loading\" " +
         "style=\"margin: 2px 2px; display: none;\" " +
         "src=\"loading.gif\" />\"</div>");

      liveloop.setupPrefixEditor();

      // show and set focus on the prefix editor
      //pe.show();
      var prefixCount = 0;
      for(i in liveloop.vocabs) prefixCount++;
      $("#prefix-input").focus();
      $("#prefix-editor").modal({
        maxWidth: ($(document).width() / 4) * 3,
        minHeight: 210 + (liveloop.getLineHeight() * prefixCount)
      });
   };

   /**
    * Binds the UI to the JavaSCript callback methods.
    */
   liveloop.setupPrefixEditor = function()
   {
      var pel = $("#prefix-input").keyup(liveloop.checkPrefixCounter);
   }

   /**
    * Binds the UI to the JavaScript callback methods.
    */   
   liveloop.setupUi = function()
   {
      liveloop.setupCodePrologue();
      liveloop.setupCodeEpilogue();
      $("#code-body").keyup(liveloop.checkTripleCounter);
      
      // display the initial triples
      liveloop.updateTriples();
   };

   /**
    * Adds a prefix item to the prefix list UI.
    *
    * @param prefix the prefix to add to the UI.
    * @param uri the uri that the prefix maps to.
    */
   liveloop.addPrefixListItem = function(prefix, uri)
   {
      // add the item to the prefix list
      $("#prefix-list")
         .append("<div class=\"icon\" id=\"prefix-list-item-" + prefix + "\">" +
            "<span><img id=\"prefix-list-image-" + prefix + 
            "\" src=\"list-remove.png\" ></img>" + "xmlns:" + prefix + 
            "=\"" + uri + "\"</span></div>");
            
      // add a click handler to remove the item from the prologue and the
      // vocabulary list
      $("#prefix-list-item-" + prefix).click(function(event)
      {
         delete liveloop.vocabs[prefix];
         liveloop.setupCodePrologue();
         $("#prefix-list-item-" + prefix).remove();
         liveloop.updateTriples();
      });
   }

   /**
    * Retrieve the standard line height for the page.
    *
    * @return the standard line height on the page in pixels.
    */
   liveloop.getLineHeight = function()
   {
      var rval = 10;
      var div = $('<div style="height: 1em;"></div>').appendTo('body');
      var rval = div.height();
      div.remove();

      return rval;
   }

   /**
    * Performs a check on the prefix editor counter. If the counter hits 0, an 
    * XMLHttpRequest is sent to the server for processing.
    *
    * @param event the browser event that triggered this method.
    */
   liveloop.checkPrefixCounter = function(event)
   {
      var setPrefixTimeout = true;
      
      if(event)
      {
         liveloop.prefixCounter = 1;
         // if the enter key was pressed, cancel the event, update the
         // prefix list, and hide the dialog
         if(event.keyCode == 13)
         {
            var prefix = $("#prefix-input").val();
            var resolved = $("#prefix-editor-lookup-result").text();

            console.log(prefix, "=>", resolved);
            
            if(prefix.length > 0 && resolved.length > 0)
            {
               // hide the dialog
               liveloop.vocabs[prefix] = resolved;
               liveloop.setupCodePrologue();
               $("#prefix-loading").hide();
               
               // adjust the size of the prefix editor
               var smcheight = $("#simplemodal-container").height();
               $("#simplemodal-container").height(
                  smcheight + 2 * liveloop.getLineHeight());
               
               // append to the prefix list
               liveloop.addPrefixListItem(prefix, resolved);
               liveloop.updateTriples();

               // reset the prefix editor
               $("#prefix-input").val("");
               $("#prefix-editor-lookup-result").text("");
               
               // reset the prefix counters
               liveloop.prefixCounter = null;
               if(liveloop.prefixCounterTimeout)
               {
                  clearTimeout(liveloop.prefixCounterTimeout);
               }
               setPrefixTimeout = false;
            }
         }
      }
      else
      {
         liveloop.prefixCounter--;
      }
      
      if(liveloop.prefixCounter <= 0)
      {
         liveloop.lookupPrefix();
      }
      else if(setPrefixTimeout)
      {
         $("#prefix-loading").show();
         if(liveloop.prefixCounterTimeout)
         {
            clearTimeout(liveloop.prefixCounterTimeout);
         }
         liveloop.prefixCounterTimeout = 
            setTimeout(liveloop.checkPrefixCounter, 1000);
      }
   };

   /**
    * Performs a check on the editing counter. If the counter hits 0, an 
    * XMLHttpRequest is sent to the server for processing.
    *
    * @param event the browser event that triggered this method.
    */
   liveloop.checkTripleCounter = function(event)
   {
       if(event)
       {
          liveloop.tripleCounter = 1;
       }
       else
       {
          liveloop.tripleCounter--;
       }
       
       if(liveloop.tripleCounter <= 0)
       {
          $("#triples-loading").hide();
          liveloop.updateTriples();
       }
       else
       {
          $("#triples-loading").show();
          if(liveloop.tripleCounterTimeout)
          {
             clearTimeout(liveloop.tripleCounterTimeout);
          }
          liveloop.tripleCounterTimeout = 
             setTimeout(liveloop.checkTripleCounter, 1000);
       }
   };

   /**
    * Updates the triples that are being displayed on the page after contacting
    * the server and retrieving the triples.
    */
   liveloop.updateTriples = function()
   {
      var rdfaDocument = liveloop.generateCodePrologue() + 
         $("#code-body").val() + liveloop.generateCodeEpilogue();
      $.ajax({
         url: "triples",
         type: "POST",
         success: function(data) 
         {
            $("#triple-data").html(data);
         },
         contentType: "application/xml+xhtml",
         processData: false,
         data: rdfaDocument
      });
   };

   /**
    * Updates the prefix that is being displayed on the page after contacting
    * the server and retrieving the prefix information.
    */
   liveloop.lookupPrefix = function()
   {
      var prefix = $("#prefix-input").val();

      if(prefix.length > 0)
      {
         $.ajax({
            url: "http://prefix.cc/" + prefix + ".file.json",
            type: "GET",
            success: function(data) 
            {
               if(prefix in data)
               {
                  $("#prefix-editor-lookup-result").text(data[prefix]);
               }
               $("#prefix-loading").hide();
            },
            error: function(data) 
            {
               $("#prefix-loading").hide();
            },
            parsererror: function(data) 
            {
               $("#prefix-loading").hide();
            }
         });
      }
   };

})(jQuery);

