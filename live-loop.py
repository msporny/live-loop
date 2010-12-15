##
# This is the web service for the Live Loop RDFa editor.
# License: LGPLv3
#
# @author Manu Sporny
import os, os.path, sys
import subprocess
import rdfa

try:
    from mod_python import apache
except Exception, e:
    pass

##
# Formats a triple in a very special way.
#
# @param request the HTTP request to use when writing the output.
# @param subject the subject of the triple.
# @param predicate the predicate for the triple.
# @param obj the object of the triple.
# @param object_type the type for the object in the triple.
# @param datatype the datatype for the object in the triple.
# @param language the language for the object in the triple.
def writeTriple2( \
    request, subject, predicate, obj, object_type, datatype, language):
    request.write("&lt;%s&gt; &lt;%s&gt; " % (subject, predicate))
    if(object_type == rdfa.RDF_TYPE_IRI):
        request.write("&lt;%s&gt; . " % (obj,))
    else:
        ostr = "&quot;%s&quot; ." % (obj,)
        if(language != None):
            ostr += "@%s" % (language,)
        if(datatype != None):
            ostr += "^^^<%s>" % (datatype,)
        request.write(ostr)

##
# Called whenever a triple is generated for the default graph by the 
# underlying implementation.
#
# @param request the HTTP request to use when writing the output.
# @param subject the subject of the triple.
# @param predicate the predicate for the triple.
# @param obj the object of the triple.
# @param object_type the type for the object in the triple.
# @param datatype the datatype for the object in the triple.
# @param language the language for the object in the triple.
def defaultTriple2( \
    request, subject, predicate, obj, object_type, datatype, language):

    request.write("<div class=\"rdfa-default-triple\">")
    writeTriple2( \
        request, subject, predicate, obj, object_type, datatype, language)
    request.write("</div>")

##
# Called whenever a triple is generated for the processor graph by the 
# underlying implementation.
#
# @param request the HTTP request to use when writing the output.
# @param subject the subject of the triple.
# @param predicate the predicate for the triple.
# @param obj the object of the triple.
# @param object_type the type for the object in the triple.
# @param datatype the datatype for the object in the triple.
# @param language the language for the object in the triple.
def processorTriple2( \
    request, subject, predicate, obj, object_type, datatype, language):
    
    request.write("<div class=\"rdfa-processor-triple\">")
    if(object_type == rdfa.RDF_TYPE_NAMESPACE_PREFIX):
        request.write("%s %s: %s ." % (subject, predicate, obj))
    else:
        writeTriple( \
            request, subject, predicate, obj, object_type, datatype, language)
    request.write("</div>")

##
# Called whenever the processing buffer for the C-side needs to be re-filled.
#
# @param data the entire file blob
# @param bufferSize the size of the buffer to return. Returning anything less
#                   than bufferSize will halt execution after the returned
#                   buffer has been processed.
def handleBuffer2(data, bufferSize):
    return data.read()

##
# The handler function is what is called whenever an apache call is made.
#
# @param req the HTTP request.
#
# @return apache.OK if there wasn't an error, the appropriate error code if
#         there was a failure.
def handler(req):
    # File that runs an apache test.
    status = apache.OK
  
    puri = req.parsed_uri
    service = puri[-3]
    argstr = puri[-2]
    args = {}

    # Retrieve all of the unit tests from the W3C website
    if(service.find("/live-loop/triples") != -1):
        req.content_type = 'text/html'
        if(req.method == "POST"):
            document = req.read()
            liveLoopDir = os.path.dirname(req.canonical_filename)
            p = subprocess.Popen(["python", "live-loop.py"], 
                bufsize=4096, stdin=subprocess.PIPE, stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, close_fds=True, cwd=liveLoopDir)
            p.stdin.write(document)
            (so, se) = p.communicate()
            req.write(so)
        else:
            req.content_type = 'text/plain'
            req.write("""
You can POST an XHTML+RDFa document to this service. The result will be an HTML snippet that can be placed inside of a <div> element in an HTML page.

For example, try the following using CURL:

curl -d "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><\!DOCTYPE html PUBLIC \\"-//W3C//DTD XHTML+RDFa 1.1//EN\\" \\"http://www.w3.org/MarkUp/DTD/xhtml-rdfa-2.dtd\\"> <html xmlns=\\"http://www.w3.org/1999/xhtml\\" xmlns:dc=\\"http://purl.org/dc/elements/1.1/\\"><head><title>Test Snippet</title></head><body><p>This HTML snippet was written by <span about=\\"\\" property=\\"dc:creator\\">Manu Sporny</span>.</p></body></html>" %s
""" % (req.construct_url(req.unparsed_uri),))
    # Perform a git update in the current directory
    elif(service.find("/live-loop/git-update") != -1):
        testSuitePath = os.path.dirname(req.canonical_filename)
        gitUpdatePath = os.path.join(testSuitePath, ".git")
        p = subprocess.Popen(["git", "--git-dir", gitUpdatePath, "pull"], 
            bufsize=4096, stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
            close_fds=True, cwd=testSuitePath)
        (so, se) = p.communicate()
        req.write("GIT status: %s%s" % (so, se))
    else:
        req.content_type = 'text/html'
        req.write("<strong>ERROR: Unknown Live Loop service: %s</strong>" % \
            (service,))

    return status

if __name__ == "__main__":
    parser = rdfa.RdfaParser("http://example.com/sample.html")
    parser.setDefaultGraphTripleHandler(defaultTriple2, sys.stdout)
    parser.setProcessorGraphTripleHandler(processorTriple2, sys.stdout)
    parser.setBufferHandler(handleBuffer2, sys.stdin)
    parser.parse()

