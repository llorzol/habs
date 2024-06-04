/* Javascript plotting library for jQuery and flot.
 *
 * Main is a JavaScript library to graph NwisWeb information
 * for a site(s).
 *
 * version 3.12
 * June 3, 2024
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

var message = "Need a NWIS USGS site number, which is a number ";
message    += "consisting of 15 digits (example 433152121281301). ";

// Prepare when the DOM is ready
//
$(document).ready(function()
 {
   // Current url
   //-------------------------------------------------
   var url     = new URL(window.location.href);
   console.log("Current Url " + window.location.href);

   // Parse
   //-------------------------------------------------
   site         = url.searchParams.get('site');
   site_no      = url.searchParams.get('site_no');
   numberOfDays = url.searchParams.get('numberOfDays');
   startingDate = url.searchParams.get('startingDate');
   endingDate   = url.searchParams.get('endingDate');
   console.log(`Site ${site}`);
   console.log(`Site_no ${site_no}`);
   console.log(`startingDate ${startingDate}`);
   console.log(`endingDate ${endingDate}`);

   // Check arguments
   //-------------------------------------------------
   if(site)
     {
       if(!checkSiteNo(site))
          {
            openModal(message);
            fadeModal(6000);
            return;
          }
       site_no = site;
     }

   else if(site_no)
     {
       if(!checkSiteNo(site_no))
          {
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

   //console.log(site_no)

   // Build ajax requests
   //
   var webRequests  = [];
   
   // Request for current conditions information
   //
   var request_type = "GET";
   var script_http  = `https://waterservices.usgs.gov/nwis/iv/?format=rdb&sites=${site_no}&siteStatus=all`;
   var data_http    = "";
         
   var dataType     = "text";
      
   // Web request
   //
   webRequests.push($.ajax( {
     method:   request_type,
     url:      script_http,
     data:     data_http, 
     dataType: dataType,
     success: function (myData) {
         message = "Processed current conditions information";
         openModal(message);
         fadeModal(2000);
         myDataInfo   = parseIvRDB(myData);
         myParameters = myDataInfo.myParameterData;
     },
     error: function (error) {
       message = `Failed to load current conditions information ${error}`;
       openModal(message);
       fadeModal(2000);
       return false;
     }
   }));

   // Request for period of record information
   //
   var request_type = "GET";
   var script_http  = `https://waterservices.usgs.gov/nwis/site/?format=rdb&sites=${site_no}&seriesCatalogOutput=true&outputDataTypeCd=iv&siteStatus=all&hasDataTypeCd=iv`;
   var data_http    = "";
         
   var dataType     = "text";
      
   // Web request
   //
   webRequests.push($.ajax( {
     method:   request_type,
     url:      script_http,
     data:     data_http, 
     dataType: dataType,
     success: function (myData) {
         message = "Processed period of record information";
         openModal(message);
         fadeModal(2000);
         myDataInfo = parseSitePorRDB(myData);
         //console.log('myDataInfo');
         //console.log(myDataInfo);
         myParmInfo  = myDataInfo.myData[site_no];
         //console.log('myParmInfo');
         //console.log(myParmInfo);
         mySiteInfo  = myDataInfo.siteInfo[site_no];
         //console.log('mySiteInfo');
         //console.log(mySiteInfo);
     },
     error: function (error) {
       message = `Failed to load period of record information ${error}`;
       openModal(message);
       fadeModal(2000);
       return false;
     }
   }));

   // Run ajax requests
   //
   $.when.apply($, webRequests).then(function() {

        // Web request
        //
       callWqService(mySiteInfo, myParameters, myParmInfo);
   });
  })

function callWqService(mySiteInfo, myParameters, myParmInfo) {
    console.log("callWqService");

    // Check for data
    //
    if (!myParameters || !myParmInfo) {

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
    agency_cd  = mySiteInfo['agency_cd'];
    station_nm = mySiteInfo['station_nm'];

    $(document).prop('title', 'Lake Profile for site ' + site_no);
    $('#site_text').html(['HAB Site', agency_cd, site_no, '</br>', station_nm].join(' '));
    
    // Build period of record for water-quality information
    //
    var myTsIdList  = jQuery.map(myParmInfo, function(element,index) {return index}).sort();
    var myLocWeb    = /Variable Depth Profile Data/;
    var myBeginDate = null;
    var myEndDate   = null;

    for(myTsId of myTsIdList)
    {
        var myDescription = myParameters[myTsId].description;
        var myParmCd      = myParmInfo[myTsId].parm_cd;
        var beginDate     = myParmInfo[myTsId].begin_date.trim();
        var endDate       = myParmInfo[myTsId].end_date.trim();
                
        myParmInfo[myTsId].description = myDescription;
                
        if (myLocWeb.test(myDescription))
        {
            if (!myBeginDate) { myBeginDate = dayjs(beginDate,'YYYY-MM-DD'); }
            myDate = dayjs(beginDate,'YYYY-MM-DD');
            if(myDate < myBeginDate) { myBeginDate = myDate; }
            
            if (!myEndDate) { myEndDate = dayjs(endDate,'YYYY-MM-DD'); }
            myDate = dayjs(endDate,'YYYY-MM-DD');
            if(myDate > myEndDate) { myEndDate = myDate; }
         }
    }
    startingPorDate = dayjs(myBeginDate).format('YYYY-MM-DD');
    endingPorDate   = dayjs(myEndDate).format('YYYY-MM-DD');
    console.log(`Period of Record from ${startingPorDate} to ${endingPorDate}`);
      
    // User specified dates
    //
    if(startingDate && endingDate)
    {
        //console.log(`User specified dates from ${startingDate} to ${endingDate}`);
        
        var myStartingDate = dayjs(startingDate);
        var myEndingDate   = dayjs(endingDate);

        startingDate = dayjs(myStartingDate).format('YYYY-MM-DD');
        endingDate   = dayjs(myEndingDate).format('YYYY-MM-DD');
    }
      
    // User specified days
    //
    else if(numberOfDays)
    {
        console.log(`User specified days ${numberOfDays}`);
        defaultDays        = numberOfDays;
        
        var myStartingDate = dayjs().subtract(numberOfDays, 'days');
        var myEndingDate   = dayjs();

        startingDate       = dayjs(myStartingDate).format('YYYY-MM-DD');
        endingDate         = dayjs(myEndingDate).format('YYYY-MM-DD');
    }
      
    // Default 200 days
    //
    else
    {
        //console.log('Default 200 days');
        
        
        var myStartingDate = dayjs().subtract(defaultDays, 'days');
        var myEndingDate   = dayjs();

        startingDate       = dayjs(myStartingDate).format('YYYY-MM-DD');
        endingDate         = dayjs(myEndingDate).format('YYYY-MM-DD');
    }
      
    // Check starting/ending dates
    //
    var myStartingDate    = dayjs(startingDate,'YYYY-MM-DD');
    var myEndingDate      = dayjs(endingDate,'YYYY-MM-DD');
    var myStartingPorDate = dayjs(startingPorDate,'YYYY-MM-DD');
    var myEndingPorDate   = dayjs(endingPorDate,'YYYY-MM-DD');

    maxUserDays           = myEndingDate.diff(myStartingDate, 'days');
    maxDays               = myEndingPorDate.diff(myStartingPorDate, 'days');
    
    console.log(`Specified dates from ${startingDate} to ${endingDate} is ${maxUserDays} days`);
    console.log(`POR dates from ${startingPorDate} to ${endingPorDate} is ${maxDays} days`);

    // Graph interval inside of period of record
    //
    if(myStartingDate >= myStartingPorDate && myEndingDate <= myEndingPorDate)
    {
        var doNothing = true;
    }

    // Graph interval before period of record
    //
    else if(myEndingDate <= myStartingPorDate)
    {
        endingDate     = endingPorDate;
        
        myStartingDate = dayjs(myendingPorDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }

    // Graph interval past period of record
    //
    else if(myStartingDate >= myEndingPorDate)
    {
        endingDate     = endingPorDate;
        
        myStartingDate = dayjs(endingPorDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }

    // Graph interval overlaps before period of record
    //
    else if(myStartingDate < myStartingPorDate && myEndingDate < myEndingPorDate)
    {
        myStartingDate = dayjs(myEndingDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }

    // Graph interval overlaps past period of record
    //
    else if(myStartingDate >= myStartingPorDate && myEndingDate >= myEndingPorDate)
    {
        endingDate     = endingPorDate;
        
        myStartingDate = dayjs(myEndingPorDate).subtract(defaultDays, 'days');
        startingDate   = dayjs(myStartingDate).format('YYYY-MM-DD');
        if(myStartingDate < myStartingPorDate) { startingDate = startingPorDate; }
    }
    
    console.log(`Specified requested dates from ${startingDate} to ${endingDate}`);
    
    // Request for iv service information
    //
    var request_type = "GET";
    var script_http  = `https://nwis.waterservices.usgs.gov/nwis/iv/?format=rdb&sites=${site_no}`;
    script_http     += `&startDT=${startingDate}&endDT=${endingDate}&siteStatus=all`;
    var data_http    = "";
    
    var dataType     = "text";

    // Web request
    //
    webRequest(request_type, script_http, data_http, dataType, lakeProfilerService);
}

function lakeProfilerService(dataRDB) {
    //console.log("lakeProfilerService");
    //console.log(dataRDB);

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
    //console.log('myHash');
    //console.log(myHash);

    // Check for data
    //
    if (myHash.message) {

        $('#site_text').append(['</br>', '<p class="text-danger">Currently no data available</p>'].join(' '));
        
        closeModal();

        // Warning message
        //
        message = "No information for site " + site_no;
        openModal(message);

        fadeModal(3000);

        return false;
    }

    // Build data for site
    //
    var myDataHash = {};
    myDataHash.startingDate    = startingDate;
    myDataHash.endingDate      = endingDate;
    myDataHash.myAgingData     = myHash.myAgingData;
    myDataHash.myParameterData = myParmInfo;
    myDataHash.mySiteData      = myHash.mySiteData[site_no];    
    myDataHash.myData          = myHash.myData[site_no];    

    // Call plotting routine
    //
    plotLakeProfile(myDataHash, agency_cd, site_no, station_nm);
}
