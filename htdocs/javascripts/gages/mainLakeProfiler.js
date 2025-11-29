/* Javascript plotting library for jQuery and flot.
 *
 * Main is a JavaScript library to graph NwisWeb information
 * for a site(s).
 *
 $Id: /var/www/html/habs/javascripts/gages/mainLakeProfiler.js, v 4.02 2025/10/07 19:09:09 llorzol Exp $
 $Revision: 4.02 $
 $Date: 2025/10/07 19:09:09 $
 $Author: llorzol $
 *
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

// loglevel
//
let myLogger = log.getLogger('myLogger');
//myLogger.setLevel('debug');
myLogger.setLevel('info');

var timeZone = 'America/Vancouver'

var site_no      = null;
var mySiteHash   = {};
var mySiteInfo   = {};
var myParameters = {};
var myParmInfo   = {};
var myPorData    = {};
var defaultDays  = 200;
var maxUserDays  = 0;
var MaxDays      = 0;

// Possible arguments in URL
//
var numberOfDays = null;
var startingDate = null;
var endingDate   = null;
var startingPorDate = null;
var endingPorDate   = null;

var helpFile     = 'helpFile.txt';

var agency_cd;
var coop_site_no;
var station_nm;
var latitude;
var longitude;
var lsdelev;
var lsdaccuracy;
var lsdelevdatum;

var message = "Incorrectly formatted USGS site number: ";
message    += "You must use the USGS station numbers, which are a number ";
message    += "from 8 to 15 digits long (example 433152121281301). ";

// Prepare when the DOM is ready
//
$(document).ready(function() {

    // Current url
    //-------------------------------------------------
    var url     = new URL(window.location.href);
    myLogger.info("Current Url " + window.location.href);

    // Parse
    //-------------------------------------------------
    site         = url.searchParams.get('site');
    site_no      = url.searchParams.get('site_no');
    numberOfDays = url.searchParams.get('numberOfDays');
    startingDate = url.searchParams.get('startingDate');
    endingDate   = url.searchParams.get('endingDate');
    myLogger.info(`Site ${site}`);
    myLogger.info(`Site_no ${site_no}`);
    myLogger.info(`startingDate ${startingDate}`);
    myLogger.info(`endingDate ${endingDate}`);

    // Check arguments
    //-------------------------------------------------
    if(site) {
        if(!checkSiteNo(site)) {
            openModal(message);
            fadeModal(6000);
            return;
        }
        site_no = site;
    }

    else if(site_no) {
        if(!checkSiteNo(site_no)) {
            openModal(message);
            fadeModal(6000);
            return;
        }
    }

    else {

        // Loading message
        //
        openModal(message);
        fadeModal(3000);
    }

   if (numberOfDays) {
     if(!checkNumber(numberOfDays)) { return null; }
   }

   if (startingDate) {
     if(!checkDate(startingDate)) { return null; }
   }

   if (endingDate) {
     if(!checkDate(endingDate)) { return null; }
   }
                  
   // Message specify startingDate or endingDate
   //
   if (startingDate && !endingDate) {

     message = "Please specify an endingDate argument &endingDate=YYYY-MM-DD";
     openModal(message);

     fadeModal(6000);

     return;
   }

   if (!startingDate && endingDate) {

     message = "Please specify an startingDate argument &startingDate=YYYY-MM-DD";
     openModal(message);

     fadeModal(6000);

     return;
   }
   
   message = "Requesting general site information and  water-quality measurements for site " + site_no;
   openModal(message);

   //myLogger.info(site_no)

   // Build ajax requests
   //
   var webRequests  = [];

   // Request for period of record information
   //
   var request_type = "GET";
   //var script_http  = `https://waterservices.usgs.gov/nwis/site/?format=rdb&sites=${site_no}&seriesCatalogOutput=true&outputDataTypeCd=iv&siteStatus=all&hasDataTypeCd=iv`;
   var script_http  = `https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items/USGS-${site_no}?f=json&lang=en-US`
   var data_http    = "";
         
   var dataType     = "json";
      
   // Web request
   //
   webRequests.push($.ajax( {
     method:   request_type,
     url:      script_http,
     data:     data_http, 
     dataType: dataType,
     success: function (myData) {
         //message = "Processed period of record information";
         //openModal(message);
         //fadeModal(2000);
         mySiteInfo = parseMonitoringLocationJson(myData);
         myLogger.info('Done parseMonitoringLocation');
         myLogger.info(mySiteInfo);
     },
       error: function (error) {
           message = `Failed to load period of record information for site ${site_no} status ${error.status} ${error.statusText}`;
           openModal(message);
           fadeModal(2000);
           myLogger.info(message)
           return false;
       }
   }));

   // Request for thresholds information
   //
   var request_type = "GET";
   var script_http  = `https://api.waterdata.usgs.gov/ogcapi/v0/collections/time-series-metadata/items?limit=10000&properties=unit_of_measure,begin,end,parameter_code,thresholds,sublocation_identifier,web_description,parameter_description&skipGeometry=true&computation_identifier=Instantaneous&monitoring_location_id=USGS-${site_no}&f=json`
   var data_http    = "";
         
   var dataType     = "json";
      
   // Web request
   //
   webRequests.push($.ajax( {
     method:   request_type,
     url:      script_http,
     data:     data_http, 
     dataType: dataType,
     success: function (myData) {
         //message = "Processed thresolds information";
         //openModal(message);
         //fadeModal(2000);
         myParameters = parseTimeSeriesJson(myData);
         myLogger.info('Done parseTimeSeriesJson');
         myLogger.info(myParameters);
     },
       error: function (error) {
           message = `Failed to thresolds information for site ${site_no} status ${error.status} ${error.statusText}`;
           openModal(message);
           fadeModal(2000);
           myLogger.info(message)
           return false;
       }
   }));

   // Run ajax requests
   //
   $.when.apply($, webRequests).then(function() {

       // Check for data
       //
       if (mySiteInfo.message) {
           myLogger.error(message);
           openModal(message);
           fadeModal(2000);
           return false;
       }

        // Web request
        //
       callWqService(mySiteInfo, myParameters);
   });
  })

function callWqService(mySiteInfo, myParameters) {
    myLogger.info("callWqService");

    // Check for data
    //
    if (!myParameters) {

        // Warning message
        //
        closeModal();
        message = "No site or water-quality information for site " + site_no;
        openModal(message);

        fadeModal(3000);

        return false;
    }

    // Update specific site information
    //
    agency_cd  = mySiteInfo['agency_code'];
    station_nm = mySiteInfo['monitoring_location_name'];

    $(document).prop('title', 'Lake Profile for site ' + site_no);
    $('#site_text').html(['HAB Site', agency_cd, site_no, '</br>', station_nm].join(' '));
    
    // Build period of record for water-quality information
    //
    var myIdList  = Object.keys(myParameters).sort();
    var myBeginDate = null;
    var myEndDate   = null;

    for(myId of myIdList) {
        let myParmCd      = myParameters[myId].parameter;
        let beginDate     = myParameters[myId].begin_date.trim();
        let endDate       = myParameters[myId].end_date.trim();

        if (!myBeginDate) { myBeginDate = dayjs(beginDate,'YYYY-MM-DD'); }
        let startingDate = dayjs(beginDate,'YYYY-MM-DD');
        if(startingDate < myBeginDate) { myBeginDate = startingDate; }

        if (!myEndDate) { myEndDate = dayjs(endDate,'YYYY-MM-DD'); }
        let endingDate = dayjs(endDate,'YYYY-MM-DD');
        if(endingDate > myEndDate) { myEndDate = endingDate; }

        myParameters[myId].days = endingDate.diff(startingDate, 'days');
    }
    startingPorDate = dayjs(myBeginDate).format('YYYY-MM-DD');
    endingPorDate   = dayjs(myEndDate).format('YYYY-MM-DD');
    myLogger.info(`Period of Record from ${startingPorDate} to ${endingPorDate}`);
      
    // User specified dates
    //
    if(startingDate && endingDate) {
        //myLogger.info(`User specified dates from ${startingDate} to ${endingDate}`);
        
        let myStartingDate = dayjs(startingDate);
        let myEndingDate   = dayjs(endingDate);

        startingDate = dayjs(myStartingDate).format('YYYY-MM-DD');
        endingDate   = dayjs(myEndingDate).format('YYYY-MM-DD');
    }
      
    // User specified days
    //
    else if(numberOfDays) {
        myLogger.info(`User specified days ${numberOfDays}`);
        defaultDays        = numberOfDays;
        
        let myStartingDate = dayjs().subtract(numberOfDays, 'days');
        let myEndingDate   = dayjs();

        startingDate       = dayjs(myStartingDate).format('YYYY-MM-DD');
        endingDate         = dayjs(myEndingDate).format('YYYY-MM-DD');
    }
      
    // Default 200 days
    //
    else {
        //myLogger.info('Default 200 days');        
        
        let myStartingDate = dayjs().subtract(defaultDays, 'days');
        let myEndingDate   = dayjs();

        startingDate       = dayjs(myStartingDate).format('YYYY-MM-DD');
        endingDate         = dayjs(myEndingDate).format('YYYY-MM-DD');
    }
      
    // Check starting/ending dates
    //
    let myStartingDate    = dayjs(startingDate,'YYYY-MM-DD');
    let myEndingDate      = dayjs(endingDate,'YYYY-MM-DD');
    let myStartingPorDate = dayjs(startingPorDate,'YYYY-MM-DD');
    let myEndingPorDate   = dayjs(endingPorDate,'YYYY-MM-DD');

    maxUserDays           = myEndingDate.diff(myStartingDate, 'days');
    maxDays               = myEndingPorDate.diff(myStartingPorDate, 'days');
    
    myLogger.info(`Specified dates from ${startingDate} to ${endingDate} is ${maxUserDays} days`);
    myLogger.info(`POR dates from ${startingPorDate} to ${endingPorDate} is ${maxDays} days`);

    // Graph interval inside of period of record
    //
    if(myStartingDate >= myStartingPorDate && myEndingDate <= myEndingPorDate) {
        var doNothing = true;
    }

    // Graph interval before period of record
    //
    else if(myEndingDate <= myStartingPorDate) {
        endingDate     = endingPorDate;
        
        myStartingDate = dayjs(myendingPorDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }

    // Graph interval past period of record
    //
    else if(myStartingDate >= myEndingPorDate) {
        endingDate     = endingPorDate;
        
        myStartingDate = dayjs(endingPorDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }

    // Graph interval overlaps before period of record
    //
    else if(myStartingDate < myStartingPorDate && myEndingDate < myEndingPorDate) {
        myStartingDate = dayjs(myEndingDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }

    // Graph interval overlaps past period of record
    //
    else if(myStartingDate >= myStartingPorDate && myEndingDate >= myEndingPorDate) {
        endingDate     = endingPorDate;
        
        myStartingDate = dayjs(myEndingPorDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }
    
    myLogger.info(`Specified requested dates from ${startingDate} to ${endingDate}`);
    
    // Request for iv service information
    //
    var request_type = "GET";
    var script_http  = `https://nwis.waterservices.usgs.gov/nwis/iv/?format=rdb&sites=${site_no}`;
    script_http     += `&startDT=${startingDate}&endDT=${endingDate}&siteStatus=all`;
    var script_http  = `data/iv-${site_no}.txt`;
    var data_http    = "";
    
    var dataType     = "text";

    // Web request
    //
    webRequest(request_type, script_http, data_http, dataType, lakeProfilerService);
}

function lakeProfilerService(dataRDB) {
    //myLogger.info("lakeProfilerService");
    //myLogger.info(dataRDB);
   
   //closeModal();
   message = "Processing water-quality measurements for site " + site_no;
   updateModal(message);

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
    [myIvData, myParameterData] = parseIvRDB(dataRDB, myParameters);
    myLogger.info('parseIvRDB');
    myLogger.info(myIvData);
    myLogger.info(myParameterData);

    // Check for data
    //
    if (myIvData.message) {

        $('#site_text').append(['</br>', '<p class="text-danger">Currently no data available</p>'].join(' '));
        
        closeModal();

        // Warning message
        //
        message = "No information for site " + site_no;
        openModal(message);

        fadeModal(3000);

        return false;
    }

    // Correlate parameter and iv results
    //
    let myIdList   = Object.keys(myParameters).sort();
    let myTsidList = Object.keys(myParameterData).sort();

    for(myId of myIdList) {
        let parameter_description  = myParameters[myId].parameter_description
        let sublocation_identifier = myParameters[myId].sublocation_identifier
        let web_description        = myParameters[myId].web_description
        let id = parameter_description
        if(sublocation_identifier) { id += `, ${sublocation_identifier}` }
        if(web_description) { id += `, [${web_description}]` }

        myParameters[myId].tsid = null

        for(myTsid of myTsidList) {
            let description  = myParameterData[myTsid].description;
            if(description == id) {
                myParameters[myId].tsid = myTsid
                myParameters[myId].data = myIvData[myTsid]
            }
        }
        
                                                           
    }

    // Build data for site
    //
    var myDataHash = {};
    myDataHash.startingDate    = startingDate;
    myDataHash.endingDate      = endingDate;
    myDataHash.myParameterData = myParameters;
    myDataHash.mySiteData      = mySiteInfo;    
    myDataHash.myData          = myIvData;    

    // Call plotting routine
    //
    plotLakeProfile(myDataHash, agency_cd, site_no, station_nm);
}
