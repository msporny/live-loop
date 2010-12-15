/**
 * All of the live-loop javascript code necessary to make live loop work.
 */
(function($)
{
   // create the liveloop object
   window.liveloop = window.liveloop || {};
   var liveloop = window.liveloop;

   liveloop.generateCodePrologue = function()
   {
      return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML+RDFa 1.0//EN\" \"http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:dc=\"http://purl.org/dc/terms/\">\n <head>\n  <title>Test Snippet</title>\n </head>\n <body>\n";
   }

   liveloop.setupCodePrologue = function()
   {
      var e = $("#code-prologue");
      var encodedPrologue = $('<div/>').text(liveloop.generateCodePrologue()).html(); 
      e.html(encodedPrologue);
   };

   liveloop.generateCodeEpilogue = function()
   {
      return "\n </body>\n</html>";
   }

   liveloop.setupCodeEpilogue = function()
   {
      var e = $("#code-epilogue");
      var encodedEpilogue = $('<div/>').text(liveloop.generateCodeEpilogue()).html(); 
      e.html(encodedEpilogue);
   };
   
   liveloop.setupUi = function()
   {
      liveloop.setupCodePrologue();
      liveloop.setupCodeEpilogue();
      $("#code-body").keyup(liveloop.updateTriples);
   };
   
   liveloop.updateTriples = function(event)
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

})(jQuery);

