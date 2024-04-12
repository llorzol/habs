/* Javascript plotting library for jQuery and flot.
 *
 * Main is a JavaScript library to graph NwisWeb information
 * for a site(s).
 *
 * version 2.00
 * July 2, 2023
 */

/*
###############################################################################
# Copyright (c) Oregon Water Science Center
#
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
# OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# DEALINGS IN THE SOFTWARE.
###############################################################################
*/

var agency_cd;
var site_no;
var coop_site_no;
var station_nm;
var latitude;
var longitude;
var lsdelev;
var lsdaccuracy;
var lsdelevdatum;

// Prepare when the DOM is ready
//
$(document).ready(function() {

    //$("#footer").show();

    // Parse
    //-------------------------------------------------
    if (jQuery.url.param("site")) {
        site_no = jQuery.url.param("site");
    } else if (jQuery.url.param("site_no")) {
        site_no = jQuery.url.param("site");
    }

    //console.log(site_no)

    if (typeof site_no !== "undefined") {
        // Loading message
        //
        message = "Processing information for site " + site_no;
        openModal(message);

        // Request for site service information
        //
        var column = "site_no";
        var request_type = "GET";
        var script_http = "data/iv.rdb";
        var data_http = "";

        var script_http = 'https://nwis.waterservices.usgs.gov/nwis/iv/?format=rdb'
        script_http += '&sites=' + site_no;
        //script_http     += '&period=P200D&siteStatus=all'
        if (site_no == '444306122144600') {
			script_http += '&period=P200D&siteStatus=all&Access=3';
            //script_http += '&startDT=2019-09-01&endDT=2020-04-01';
        } else if (site_no == '441022122193200') {
            script_http += '&period=P200D&siteStatus=all&Access=3';
			} else if (site_no == '14162100') {
            script_http += '&period=P200D&siteStatus=all&Access=3';
        } else {
            console.log("Unable to fetch site number")
        }
        //script_http     += '&startDT=2019-09-01&endDT=2020-04-01'
        var data_http = "";

        var dataType = "text";

        // Web request
        //
        webRequest(request_type, script_http, data_http, dataType, lakeProfilerService);
    }
});

function lakeProfilerService(dataRDB) {
    //console.log("lakeProfilerService");
    //console.log(dataRDB);

    // Check for data
    //
    if (typeof dataRDB.message !== "undefined") {
        closeModal();

        // Warning message
        //
        message = "No information for site " + site_no;
        openModal(message);

        fadeModal(3000);

        return false;
    }


    // Check for error
    //
    if (dataRDB.length < 1) {
        closeModal();

        // Warning message
        //
        message = "No information for site " + site_no;
        openModal(message);

        fadeModal(3000);
    }

    // Parsing routine
    //
    myHash = parseIvRDB(dataRDB);

    // Update specific site information
    //
    $(document).prop('title', 'Lake Profile for site ' + site_no);
    var mySiteText = myHash.mySiteData;
    var agency_cd = myHash.mySiteData[site_no]['agency_cd'];
    var station_nm = myHash.mySiteData[site_no]['station_nm'];

    $('#site_text').html(['HAB Site', agency_cd, site_no, '</br>', station_nm].join(' '));

    // Call plotting routine
    //
    plotLakeProfile(myHash, agency_cd, site_no, station_nm);
}
