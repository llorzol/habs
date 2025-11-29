/**
 * Namespace: d3_lakeprofiler.js
 *
 * D3_lakeprofiler is a JavaScript library to provide a set of functions to build
 *  the Lake Profiler Web Site.
 *
 $Id: d3_lakeprofiler.js,v 4.04 2025/10/18 09:25:59 llorzol Exp $
 $Revision: 4.04 $
 $Date: 2025/10/18 09:25:59 $
 $Author: llorzol $
 *
 */
// https://www.google.com/search?source=hp&ei=FJmWXueWLJHV-gSx5ZuwAQ&q=d3+change+color+of+line+segments&oq=d3+change+color+of+line+seg&gs_lcp=CgZwc3ktYWIQARgAMggIIRAWEB0QHjoOCAAQ6gIQtAIQmgEQ5QI6BQgAEIMBOgIIADoECAAQAzoFCAAQzQI6BggAEBYQHkotCBcSKTE5N2cxMDJnOTJnODBnODRnODNnMTA3Zzg1Zzg1ZzgxZzcyZzg1ZzgzSh0IGBIZMWcxZzFnMWcxZzFnMWcxZzFnMWc1ZzVnOFC-RVictAFgyMwBaABwAHgAgAGbAYgBuQ-SAQQyNy4xmAEAoAEBqgEHZ3dzLXdperABBg&sclient=psy-ab
// https://stackoverflow.com/questions/24442030/how-do-i-color-line-segments-between-specific-points-in-a-d3-line-plot
// https://stackoverflow.com/questions/27026625/how-to-change-line-color-in-d3js-according-to-axis-value
//
// Path pieces
//
// http://bl.ocks.org/bycoffe/18441cddeb8fe147b719fab5e30b5d45
//
// Path tooltip
// https://observablehq.com/@d3/line-chart-with-tooltip
// http://www.d3noob.org/2014/07/my-favourite-tooltip-method-for-line.html
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

// Customizing tooltip with bootstrap
//
const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", 'position-absolute bg-light text-start fs-6 fw-bold shadow p-1 m-2 border border-1 border-dark rounded-3');

// Set format of dates for tooltip
//
const formatDate = d3.timeFormat("%b %d, %Y");

/** Wrapper for renderGraphs. Encapsulates global variables to avoid any side effects.
 * @param {object} myHash - Incoming raw data from API (default rdb format).
 * @param {string} agency_cd - Agency that published the data.
 * @param {string} site_no - Number of gage, station, or sensor site.
 * @param {string} station_nm - Name of gage, station, or sensor site.
 */
function plotLakeProfile(myHash, agency_cd, site_no, station_nm) {
    myLogger.info('plotLakeProfile myHash');
    myLogger.info(myHash);
   
    message = `Plotting water-quality measurements for site ${station_nm}`;
    openModal(message);

    /** Preferred chart order (list in reverse) */
    const paramOrder = [
        '00300',
        '00095',
        '00010',
        '63680',
        '32316',
        '32319',
        '00400',
        '32295'
    ]

    /** Preferred colors for Approved/Provisional records */
    //
    const qualifiers = { 'Approved' : 'blue', 'Provisional' : 'orange' }

    /** d3 parameters */
    var y_box_min = 75;
    var y_box_max = 350;
    var y_axis = y_box_max - y_box_min;
    var slider_box = 50
    var x_box_min = 75;
    var x_box_width = 700;
    var x_box_max = x_box_min + x_box_width;
    var x_axis = x_box_max - x_box_min;

    /** Slider status locked/unlocked for profile chart */
    var sliderLockStatus = true;

    /** Once rendered, never rebuild charts (except for profile chart) */
    let timeseriesCharts = false;
    let contourCharts = false;

    /** Call main function */
    renderGraphs(myHash, agency_cd, site_no, station_nm);

    /** Main Function
     * @param {object} rawData - Incoming raw data from API (default rdb format).
     * @param {string} agency - Agency that published the data.
     * @param {string} siteNumber - Number of gage, station, or sensor site.
     * @param {string} siteName - Name of gage, station, or sensor site.
     */
    function renderGraphs(rawData, agency, siteNumber, siteName) {

        let myParameterData = rawData.myParameterData;
        let myData = rawData.myData;
        let myTimeSeries = {};
        let numberRe = new RegExp(/^(\d+)_(\d+)$/);
        let qualifierRe = new RegExp(/_*(\D+)$/);

        //myLogger.info(`Specified requested dates from ${rawData.startingDate} to ${rawData.endingDate} [${maxUserDays} days]`);
        myLogger.info(`Data`);
        myLogger.info(myData);

        startingDate = dayjs(rawData.startingDate).format('MMM DD, YYYY');
        endingDate   = dayjs(rawData.endingDate).format('MMM DD, YYYY');
        //myLogger.info(`Specified requested dates from ${startingDate} to ${endingDate} [${maxUserDays} days]`);
        
        startingPorDate = dayjs(startingPorDate).format('MMM DD, YYYY');
        endingPorDate   = dayjs(endingPorDate).format('MMM DD, YYYY');
        //myLogger.info(`Available dates from ${startingPorDate} to ${endingPorDate} [${maxDays} days]`);

        availableRecord = `The available record spans a period from ${startingPorDate} to ${endingPorDate} and covers ${maxDays} days.`
        moreDataLink    = `<a href="/habs/lakeprofiler.html?site=${siteNumber}&numberOfDays=${maxDays}" target="_blank">View ${maxDays} days of data</a>`;

        /** Build Tabs in DOM */
        $('#paramTabs').html(buildTabs());
        $('#paramTabs').append(buildTabContent());
        loadInitialText(siteNumber)
        loadSiteText(siteNumber, myParameterData)
        loadHelpText(helpFile, defaultDays, availableRecord, moreDataLink)

        // Build parameter order for panels
        //
        myLogger.info('myParameterData')
        myLogger.info(myParameterData)
        
        // Loop through record extracting specific fields
        //
        // Extract time-series set and reformat data to make it more copasetic for d3
        // data = An array of objects
        // concentrations = An array of three objects, each of which contains an array of objects
        //
        let myTsIdList  = Object.keys(myParameterData);
        let DepthSeries = {};
        let Profiles    = [];
        let TimeSeries  = [];
        let Contours    = [];
        let firstDropDate = null;
        let lastDropDate = null;
        let firstSeriesDate = null;
        let lastSeriesDate = null;
        let profilesDescriptionRe   = /Variable Depth Profile Data/;
        let timeseriesDescriptionRe = /\[1 Meter Below The Surface\]/;
        
        for (let tsID of myTsIdList) {
           
            let description     = myParameterData[tsID].parameter_description;
            let param_cd        = myParameterData[tsID].parameter;
            let unit_of_measure = myParameterData[tsID].unit_of_measure;
            let seriesType      = myParameterData[tsID].seriesType;
            
            let myTsId          = myParameterData[tsID].tsid;
            if(!paramOrder.includes(param_cd)) { continue; }

            myLogger.info(`guID ${tsID} tsID ${myTsId} seriesType ${seriesType}`)

            if (['profile', 'timeseries'].includes(seriesType)) {
                let myTimeSeries = myParameterData[tsID].data;
                let numRecords   = myTimeSeries.length;
                if (seriesType === 'profile') {
                    let myDescription = description.replace(profilesDescriptionRe, "")
                    Profiles[paramOrder.indexOf(param_cd)] = {
                        tsid: tsID,
                        description: myDescription,
                        unit_of_measure: unit_of_measure,
                        datapoints: myTimeSeries.slice()
                    };
                    Contours[paramOrder.indexOf(param_cd)] = {
                        tsid: tsID,
                        description: myDescription,
                        unit_of_measure: unit_of_measure,
                        datapoints: myTimeSeries.slice()
                    };

                    // Ensure the graphed period of time is equal between the profile and contour panels
                    //  and graphed period of time is equal for timeseries panels
                    //
                    if(!firstDropDate) {
                        firstDropDate = myTimeSeries[0].date;
                    }
                    if(myTimeSeries[0].date < lastDropDate) {
                        firstDropDate = myTimeSeries[0].date;
                    }
                    if(!lastDropDate) {
                        lastDropDate = myTimeSeries[myTimeSeries.length - 1].date;
                    }
                    if(myTimeSeries[myTimeSeries.length - 1].date > lastDropDate) {
                        lastDropDate = myTimeSeries[myTimeSeries.length - 1].date
                    }
                }
                else if (seriesType === 'timeseries') {
                    let myDescription = description.replace(timeseriesDescriptionRe, "")
                    TimeSeries[paramOrder.indexOf(param_cd)] = {
                        tsid: tsID,
                        description: myDescription,
                        unit_of_measure: unit_of_measure,
                        datapoints: myTimeSeries.slice()
                    };

                    // Ensure the graphed period of time is equal between the profile and contour panels
                    //  and graphed period of time is equal for timeseries panels
                    //
                    if(!firstSeriesDate) {
                        firstSeriesDate = myTimeSeries[0].date;
                    }
                    if(myTimeSeries[0].date < lastSeriesDate) {
                        firstSeriesDate = myTimeSeries[0].date;
                    }
                    if(!lastSeriesDate) {
                        lastSeriesDate = myTimeSeries[myTimeSeries.length - 1].date;
                    }
                    if(myTimeSeries[myTimeSeries.length - 1].date > lastSeriesDate) {
                        lastSeriesDate = myTimeSeries[myTimeSeries.length - 1].date
                    }
                }
            }
        }

        //myLogger.info('Profiles timeseries');
        //myLogger.info(Profiles);

        //myLogger.info('Contours timeseries');
        //myLogger.info(Contours);

        //myLogger.info('TimeSeries timeseries');
        //myLogger.info(TimeSeries);

        // When tab is clicked, create and render graphs for each site
        //
        $('button.tabNames').click(function() {
            let graphType = $(this).prop('id').replace('-tab', '');
            //myLogger.info(`Clicked ${graphType}`);
            if (graphType === 'profiles') {
                plotTimeProfiles(Profiles, agency, siteNumber, siteName, firstDropDate, lastDropDate);
            } else if (graphType === 'timeseries') {
                plotTimeSeries(TimeSeries, agency, siteNumber, siteName, firstSeriesDate, lastSeriesDate);
            } else if (graphType === 'contours') {
                plotContourPoints(Contours, agency, siteNumber, siteName, firstDropDate, lastDropDate);
            }
        });

        /** Create Tabs in DOM */
        function buildTabs() {
            const myTabs     = ['General', 'Profiles', 'Time-Series', 'Contours', 'Site-Information', 'Help']; /** Tab names */
            const tabContent = []; /** Array where raw html will be stored */

            /** Add html structure to support tabs */
            tabContent.push('<nav id="Tabs" class="border-bottom">');
            tabContent.push('  <div class="nav nav-tabs" id="nav-tab" role="tablist">');

            /** For every tab name, create a list item and add to tabContent */
            let activeText = 'active';
            let tabText    = '';
            for (var i = 0; i < myTabs.length; ++i) {
                let tag = myTabs[i].replace('-', '').toLowerCase();
                tabContent.push(`<button id="${tag}-tab" class="nav-link ${activeText} fs-4 tabNames" data-bs-toggle="tab" data-bs-target="#${tag}" type="button" role="tab" aria-controls="nav-${tag}">${myTabs[i]}</button>`);
                activeText = ''
            }

            /** Closing html */
            tabContent.push('</div>');
            tabContent.push('</nav>');

            return tabContent.join("\n");
        }

        /** Create Tab html structure */
        function buildTabContent() {
            const tabNames = []; /** Array where tab names will be stored */
            const tabContent = []; /** Array where raw html will be stored */

            /** Get all tab names by selecting id of all children under div "Tabs" */
            //$('div#Tabs ul li a').each(function(i) {
            $('button.tabNames').each(function() {
                tabNames.push($(this).prop('id'));
            });

            /** Loop and add html structure for future content */
            tabContent.push('<div class="tab-content" id="nav-tabContent">');
            for (var i = 0; i < tabNames.length; ++i) {
                 let tag = tabNames[i].replace('-tab', '').toLowerCase();
               /** If first tab, show it, if not, hide it */
                if (i == 0) {
                    tabContent.push(`<div id="${tag}" class="tab-pane fade in active show mt-2" role="tabpanel" aria-labelledby="${tabNames[i]}-tab" tabindex="0">`);
                    tabContent.push(`<div class="tabName fs-5 text-capitalize">${tag} Information</div>`);
                    tabContent.push(`<div class="tabContent fs-6 mt-2" id="${tag}Content"></div>`);
                } else {
                    tabContent.push(`<div id="${tag}" class="tab-pane fade in mt-2">`);
                    tabContent.push(`<div class="tabName fs-5 text-capitalize">${tag} Information</div>`);
                    tabContent.push(`<div class="tabContent mt-2" id="${tag}Content"></div>`);
                }
                tabContent.push(`</div>`);
            }
            tabContent.push('</div>');
            return tabContent.join("\n");
        }

        /** Read in file content and render it as text in the first tab
         *  @param {string} siteNumber - Number of gage, station, or sensor site.
         */
        function loadInitialText(siteNumber) {
            const file = 'site_text/' + ['site_' + siteNumber, 'txt'].join('.'); /** File Path to load informational text from */
            $('#general').show();
            $('#generalContent').load(file, function( response, status, xhr ) {
                if ( status == "error" ) {
                    var msg = "Sorry but there was an error: ";
                    myLogger.info(`${msg} ${xhr.status} ${xhr.statusText}`);
                    $('#generalContent').html(`Missing general information for site ${siteNumber}`);
                }
            });
            
            return;
        }

        /** Read in help content and render it as text in the last tab
         *  @param {string} helpFile - text provide help and hints.
         */
        function loadHelpText(helpFile, defaultDays, availableRecord, moreDataLink) {

            //myLogger.info('loadHelpText');
            //myLogger.info(helpFile, defaultDays, startingPorDate, endingPorDate);

            $('div#helpContent').append('<span id="helpIntro"></span>');
            $('div#helpContent').append('<span id="helpText"></span>');
            $('div#helpContent').append('<span id="disclaimer"></span>');

            $('span#helpContent').load(`${helpFile} span#helpIntro`);

            if(maxDays < defaultDays) {
                $('span#helpText').load(`${helpFile} span#showLessData`, function() {
                    $('span#defaultDays').html(defaultDays);
                    $('span#availableRecord').html(availableRecord);
                });
            }
            else if(maxDays > defaultDays) {
                $('span#helpText').load(`${helpFile} span#showMoreData`, function() {
                    $('span#defaultDays').html(defaultDays);
                    $('span#availableRecord').html(availableRecord);
                    $('span#moreDataLink').html(moreDataLink);
                });
            }
            else {
                $('span#helpText').load(`${helpFile} span#showAllData`, function() {
                    $('span#defaultDays').html(defaultDays);
                    $('span#availableRecord').html(availableRecord);
                });
            }
 
            $('span#disclaimer').load(`${helpFile} span#disclaimer`);
           
            return;
        }

        /** Read in site content and render it as text in the tab
         *  @param {string} siteNumber - Number of gage, station, or sensor site.
         */
        function loadSiteText(siteNumber, myParameterData) {

            //  Create popup content
            //
            var siteInfoContent  = [];
            siteInfoContent.push('<div class="bg-success bg-gradient text-white fs-4 fw-bold p-3 mb-2">General Site Information</div>');
            siteInfoContent.push('<div class="divTable fs-6 mt-2 mb-4">');

            // Create entries
            //
            siteInfoContent.push(
                ['<div class="divTableRow">',
                 '<div class="divTableCell">Site Decimal Longitude:</div>',
                 '<div class="divTableCell"></div>',
                 '<div class="divTableCell"></div>',
                 '<div class="divTableCell"></div>',
                 `<div class="divTableCell text-end">${mySiteInfo.dec_long_va}</div>`,
                 '</div>'
                ].join('')
                );

            siteInfoContent.push(
                ['<div class="divTableRow">',
                 '<div class="divTableCell">Site Decimal Latitude:</div>',
                 '<div class="divTableCell"></div>',
                 '<div class="divTableCell"></div>',
                 '<div class="divTableCell"></div>',
                 `<div class="divTableCell text-end">${mySiteInfo.dec_lat_va}</div>`,
                 '</div>'
                ].join('')
                );

            siteInfoContent.push(
                ['<div class="divTableRow">',
                 '<div class="divTableCell">Site Decimal Latitude-Longitude Datum:</div>',
                 '<div class="divTableCell"></div>',
                 '<div class="divTableCell"></div>',
                 '<div class="divTableCell"></div>',
                 `<div class="divTableCell text-end">${mySiteInfo.dec_coord_datum_cd}</div>`,
                 '</div>'
                ].join('')
            );
            
            siteInfoContent.push('</div>');
            
            // Parameter Information
            //
            siteInfoContent.push('<div class="bg-success bg-gradient text-white fs-4 fw-bold p-3 mt-2 mb-2">Parameter Information</div>');
            siteInfoContent.push('<div class="divTable mt-2 mb-4">');

            siteInfoContent.push(
                ['<div class="divTableRow bg-success-subtle fs-5 fw-bold">',
                 '<div class="divTableCell">',
                 'Parameter</br>Description',
                 '</div>',
                 '<div class="divTableCell">',
                 'Parameter</br>Code',
                 '</div>',
                 '<div class="divTableCell">',
                 'Begin</br>Date',
                 '</div>',
                 '<div class="divTableCell">',
                 'End</br>Date',
                 '</div>',
                 '<div class="divTableCell">',
                 'Number</br>of Days',
                 '</div>',
                 '</div>'
                ].join('')
            );

            // Sort by parameter code
            //
            const myTsIdList = Object.keys(myParameterData)
                  .sort((a,b)=>myParameterData[a].parameter - myParameterData[b].parameter)

            for(myTsId of myTsIdList) {
                let parameter_description = myParameterData[myTsId].parameter_description
                if(myParameterData[myTsId].sublocation_identifier) { parameter_description += `, ${myParameterData[myTsId].sublocation_identifier}` }
                if(myParameterData[myTsId].web_description) { parameter_description += ` [${myParameterData[myTsId].web_description}]` }

                let parameter   = myParameterData[myTsId].parameter;
                let beginDate  = myParameterData[myTsId].begin_date;
                let endDate    = myParameterData[myTsId].end_date;
                let myDays     = myParameterData[myTsId].days;
                
                siteInfoContent.push(
                    ['<div class="divTableRow">',
                     '<div class="divTableCell">',
                     `${parameter_description}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${parameter}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${beginDate}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${endDate}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${myDays}`,
                     '</div>',
                     '</div>'
                    ].join('')
                );
            }

            //  Finish div table
            //
            siteInfoContent.push('</div>');
            
            $('#siteinformation').html(siteInfoContent.join(''));
        }
        
        fadeModal(2000);
    }

    /** Exported call to begin render
     * @param {object} Profiles - Data to be rendered, unsorted
     * @param {object} myParameterData - Parameter titles and TSIDs to label graphs with
     * @param {string} agency_cd - Agency that published the data.
     * @param {string} site_no - Number of gage, station, or sensor site.
     * @param {string} station_nm - Name of gage, station, or sensor site.
     */
    function plotTimeProfiles(Profiles, agency_cd, site_no, station_nm, firstDropDate, lastDropDate) {

        myLogger.info('Profiles timeseries');
        myLogger.info(Profiles);

        message = "Profiles of depth and water-quality measurements for site " + station_nm;
        openModal(message);

        // Add introduction and SVG panel for each TSID
        //
        renderIntro(Profiles);

        // SVG canvas for each TSID. If current is depth TSID, do not render a graph for it
        //
        const profileScales = {};

        for (var i = 0; i < Profiles.length; i++) {

            // Local Variables
            //
            const tsID = Profiles[i].tsid;
            const myDescription = Profiles[i].description;
            const unit_of_measure = Profiles[i].unit_of_measure;
            const svgID = ['svgProfiles', i].join("_"); // Creates and selects appropriate chart into svg variable
            const svg = d3.select("#" + svgID);
            const x_element = 'depth'; // Data to alter
            //const variableProfile = Profiles[i].datapoints // Capture only elements after the first drop date
            //const variableProfile = Profiles[i].datapoints.slice(0) // Capture only elements after the first drop date
            const lines = []; // TSID specific, date filtered array of different drops for that day

            //myLogger.info(myDescription)
            //myLogger.info(Profiles[i].datapoints)

            // Define Axis min and max values
            //
            const maxXaxis = d3.max(Profiles[i].datapoints, d => d.concentration);
            const minXaxis = d3.min(Profiles[i].datapoints, d => d.concentration);
            const maxYaxis = d3.max(Profiles[i].datapoints, d => d.depth);
            const minYaxis = d3.min(Profiles[i].datapoints, d => d.depth);
            const maxY2axis = d3.max(Profiles[i].datapoints, d => d.depth * 3.28084);
            const minY2axis = d3.min(Profiles[i].datapoints, d => d.depth * 3.28084);

            // Define Date and Value min and max values
            //
            //const maxDate = d3.max(Profiles[i].datapoints, d => d.date);
            const minDate = firstDropDate;
            const maxDate = lastDropDate;
            const maxValue = d3.max(Profiles[i].datapoints, d => d.concentration);
            const minValue = d3.min(Profiles[i].datapoints, d => d.concentration);

            // Set axis scales
            //
            const xScale = d3.scaleLinear().domain([minXaxis, maxXaxis]).range([0, x_axis]);
            const yScale = d3.scaleLinear().domain([maxYaxis, minYaxis]).nice().range([y_axis, 0]);
            const y2Scale = d3.scaleLinear().domain([maxY2axis, minY2axis]).nice().range([y_axis, 0]);
            if (!profileScales[tsID]) { profileScales[tsID] = [] } // If first one, initialize a new array for it
            profileScales[tsID].push({ 'xScale': xScale, 'yScale': yScale })

            // Define axes
            //
            const xAxis = d3.axisBottom().scale(xScale);
            const yAxis = d3.axisLeft().scale(yScale);
            const y2Axis = d3.axisRight().scale(y2Scale);

            // Prepare a color palette for points
            // TODO is this needed/used?
            const color = d3.scaleSequential(d3.interpolateCool)
            color.domain([maxValue, minValue])

            // Generate profile plot
            //
            setIntroTextDate(dayjs(maxDate).endOf('day')); // Set to text to reflect end of the day of the latest measurement
            generateChartShell(tsID, myDescription, svgID, svg);
            generateAxis(svg, svgID, xAxis, 'Concentration', yAxis, 'Depth, in meters', y2Axis, 'Depth, in feet');
            addSiteText(svg);
            addNoDataBackground(svg);

            // Filter data for current day and store in lines
            const toSet = dayjs(maxDate)
            filterDataByDate(toSet, Profiles[i].datapoints, lines);
            //filterDataByDate(toSet, variableProfile, lines);

            // Add lines and circles for day to graph
            graphDay(lines, tsID, svg, xScale, yScale, x_element, maxDate, unit_of_measure);

            // Generate Slider
            generateSlider(svg, minDate, maxDate, Profiles[i].datapoints, tsID, svgID, x_element, xScale, yScale, profileScales)
            //generateSlider(svg, minDate, maxDate, variableProfile, tsID, svgID, x_element, xScale, yScale, profileScales)
        }

        function renderIntro(Profiles) {
            var svgContent = [];
            svgContent.push('<span id="profileIntro"></span>');
            svgContent.push('<span id="profileText"></span>');
            svgContent.push('<span id="sliderText"></span>');
            svgContent.push('<ul style="list-style-type:none;">');

            // Push new graphs and mark location of where the depth data is in array
            //
            for (var i = 0; i < Profiles.length; i++) {
                var myTitle = Profiles[i].description;
                var svgID = ['svgProfiles', i].join("_");

                svgContent.push('<li class="svgGraph">');
                svgContent.push('<svg id="' + svgID + '" class="svg border-2 border-black shadow mb-3"></svg>');
                svgContent.push('</li>');
            }
            svgContent.push('</ul>');
            $('#profilesContent').html(svgContent.join("\n"));

            // Add introduction content
            //
            $('span#profileIntro').load(`${helpFile} span#profileIntro`);

            if(maxDays < defaultDays) {
                $('span#profileText').load(`${helpFile} span#showLessData`, function() {
                    $('span#defaultDays').html(defaultDays);
                    $('span#availableRecord').html(availableRecord);
                });
            }
            else if(maxDays > defaultDays) {
                $('span#profileText').load(`${helpFile} span#showMoreData`, function() {
                    $('span#defaultDays').html(defaultDays);
                    $('span#availableRecord').html(availableRecord);
                    $('span#moreDataLink').html(moreDataLink);
                });
            }
            else {
                $('span#profileText').load(`${helpFile} span#showAllData`, function() {
                    $('span#defaultDays').html(defaultDays);
                    $('span#availableRecord').html(availableRecord);
                });
            }
 
            $('span#sliderText').load(`${helpFile} span#sliderText`, function() {
                $('span#currentDate').html(endingDate);

                // Add event listener for checkbox
                //
                $('.lockSlider').on('change', function() {
                    if (this.checked) {
                        sliderLockStatus = true;
                        $('span#dateLabel').css('color', 'black');
                    } else {
                        sliderLockStatus = false;
                        $('span#dateLabel').css('color', 'grey');
                    }
                    myLogger.info(`Clicked slider lock ${sliderLockStatus}`);
                });

            });
            
            return;
        }

        function generateChartShell(tsID, myDescription, svgID, svg) {

            // Check width of title
            //
            const myTitle = `${myDescription} [${tsID}]`;
            let myText = textSize(myTitle);
            let fontHeight = myText.height;
            let fontWidth = myText.width / myTitle.length;

            let containerWidth = +d3.select("#" + svgID).style('width').slice(0, -2);
            let hold = '';

            // Add site information
            //
            if (myText.width < containerWidth) {
               svg.append("text")
                    .attr('x', x_box_min * 0.1)
                    .attr('y', fontHeight * 0.85)
                    .attr('class', 'site_title')
                    .text(myTitle);
            } else {
                let myTexts = myTitle.split(/,/);
                let title = "";
                let x_text = x_box_min * 0.1;
                let y_text = fontHeight * 0.85;
                for (let ii = 0; ii < myTexts.length; ii++) {
                    if (([title, myTexts[ii]].join(',').length * fontWidth) > containerWidth) {
                        let mySiteText = svg.append("text")
                            .attr('x', x_text)
                            .attr('y', y_text)
                            .attr('class', 'site_title')
                            .text(title);
                        title = myTexts[ii];
                        x_text = x_box_min * 0.1 + fontWidth * 2.0;
                        y_text += fontHeight * 0.85;
                    } else {
                        if (title.length > 0) { title = [title, myTexts[ii]].join(","); } else { title = myTexts[ii]; }
                    }
                }

                svg.append("text")
                    .attr('x', x_text)
                    .attr('y', y_text)
                    .attr('class', 'site_title')
                    .text(title);
            }

            return;
        }

        function generateAxis(svg, svgID, xAxis, xAxisLabel, yAxis, yAxisLabel, y2Axis, y2AxisLabel) {

            // Add the X Axis
            //
            svg.append("g")
                .attr("id", `x-axis-${svgID}`)
                .attr("class", "x axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_max})`)
                .call(xAxis);

            // Determine axis tic dimensions
            //
            axisInfo  = getSvg(`#x-axis-${svgID}`)
            xPosition = axisInfo.x
            yPosition = axisInfo.y
            ticWidth  = axisInfo.width
            ticHeight = axisInfo.height

            // Axis label
            //
            svg.append("text")
                .attr("transform", `translate(${x_box_min + ticWidth * 0.5}, ${y_box_max + ticHeight * 2 })`)
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .text(xAxisLabel);

            // Add the Y Axis
            //
            svg.append("g")
                .attr("id", `y-axis-${svgID}`)
                .attr("class", "y axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .call(yAxis)

            // Determine axis tic dimensions
            //
            axisInfo  = getSvg(`#y-axis-${svgID}`)
            xPosition = axisInfo.x
            yPosition = axisInfo.y
            ticWidth  = axisInfo.width
            ticHeight = axisInfo.height

            // Add the Y Axis label
            //
            svg.append("text")
                .attr("transform", `translate(${x_box_min - ticWidth * 2}, ${y_box_min + y_axis * 0.5}) rotate(-90)`)
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .text("Depth, in meters");

            // Add secondary Y Axis
            //
            svg.append("g")
                .attr("id", `y2-axis-${svgID}`)
                .attr("class", "y axis")
                .attr("transform", `translate(${x_box_max}, ${y_box_min})`)
                .call(y2Axis)

            // Determine axis tic dimensions
            //
            axisInfo  = getSvg(`#y2-axis-${svgID}`)
            xPosition = axisInfo.x
            yPosition = axisInfo.y
            ticWidth  = axisInfo.width
            ticHeight = axisInfo.height

            // Add the Secondary Y Axis label
            //
            svg.append("text")
                .attr("transform", `translate(${x_box_max + ticWidth * 2.5}, ${y_box_min + y_axis * 0.5}) rotate(-90)`)
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .text("Depth, in feet");

            return;
        }

        function addNoDataBackground(svg) {
            // Add no data text keep hidden until needed
            let graphID = svg.attr("id");
            svg.append("text")
                .attr("id", graphID)
                .attr("class", "noData " + graphID)
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min + y_axis * 0.5})`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.0")
                .text('No data recorded for ');
            return
        }

        function addSiteText(svg) {

            // For agency and site number
            svg.append("text")
                .attr("class", "siteText")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min})`)
                .attr("dy", `${y_axis * 0.15}`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text(`${agency_cd} ${site_no}`)

            // For Station name
            svg.append("text")
                .attr("class", "siteText")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min})`)
                .attr("dy", `${y_axis * 0.25}`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text(station_nm);
            return;
        }

        function setIntroTextDate(date) {
            const formatIntroDate = d3.timeFormat("%b %d, %Y");
            $('#currentDate').text(formatIntroDate(date));
            return;
        }

        /**
         *
         * @param {Date} input
         * @param {Array} variableProfile
         * @param {Array} linesArray
         *
         */
        function filterDataByDate(input, variableProfile, linesArray) {
            // Set startDate to beginning of day and endDate to end of day, with valid data

            const startDate = dayjs(input).startOf('day') // set to 12:00 am
            const endDate = dayjs(input).endOf('day'); // set to 23:59 pm
            const filteredByDate = variableProfile.filter(function(d) { return d.date > startDate && d.date < endDate && d.concentration !== null && d.depth !== null; })

            //myLogger.info(filteredByDate)

            // Make a line for each drop
            var linesTracker = 0;
            var hold = 0
            for (var i = 0; i < filteredByDate.length; ++i) {
                if (hold < filteredByDate[i].depth) {
                    if (linesArray[linesTracker] == undefined) {
                        linesArray[linesTracker] = []
                        linesArray[linesTracker][0] = filteredByDate[i]
                    } else {
                        linesArray[linesTracker].push(filteredByDate[i])
                    }
                    hold = filteredByDate[i].depth
                }
                // Reset values and move to new line
                else {
                    hold = 0;
                    ++linesTracker;
                    --i;
                }
            }
            return;
        }

        function graphDay(lines, tsid, svg, xScale, yScale, x_element, maxDate, unit_of_measure) {

            // If no data for that day
            if (lines.length < 1) {
                myLogger.info(`No data ${maxDate} Date ${d3.timeFormat("%b %d, %Y")(maxDate)}`);
                var graphID = svg.attr("id");
                d3.selectAll("." + graphID)
                  .style("opacity", "1.0")
                  .text(`No data recorded for ${maxDate}`)
                return;
            }
            // Loop through each drop and graph the line for it
            for (var c = 0; c < lines.length; ++c) {
                graphLines(lines[c], tsid, svg, c, xScale, yScale, x_element);
                graphDatapoints(lines[c], tsid, svg, c, xScale, yScale, unit_of_measure);
            }

            return;
        }

        function graphLines(data, tsid, svg, count, xScale, yScale, x_element) {

            // Define line
            const line = d3.line()
                .curve(d3.curveMonotoneX)
                .defined(function(d) { return d["concentration"] !== null; })
                .x(function(d) {
                    return xScale(d["concentration"]);
                })
                .y(function(d) {
                    return yScale(d[x_element]);
                })

            // Add lines to graph
            svg.append("path")
                .data([data])
                .attr("id", `line_${tsid}_${count}`)
                .attr("class", `line profileCharts lines_${tsid}`)
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .style("stroke-width", '3px')
                .style("stroke", 'black')
                .attr("d", line)
                // Styling
                .on('mouseover', function(d) {
                    const circleOver = this.attributes.id.textContent.replace('line', 'circle')
                    d3.select(this) //on mouseover of each line, give it a nice thick stroke
                        .raise()
                        .style("stroke-width", '5px')
                        .style("stroke", 'orange')
                    d3.selectAll(`#${circleOver}`)
                        .raise()
                        .style("fill", 'orange')
                        .style("stroke", 'orange')
                        .style("stroke-width", '5px')
               })
                .on('mouseout', function(d) {
                    const circleOut = this.attributes.id.textContent.replace('line', 'circle')
                    d3.select(this) //on mouseout of each line, return thinner stroke
                        .style("stroke-width", '3px')
                        .style("stroke", 'black')
                    d3.selectAll(`#${circleOut}`)
                        .style("fill", 'red')
                        .style("stroke", 'red')
                        .style("stroke-width", '1.5px')
                })
        }

        function graphDatapoints(data, tsid, svg, count, xScale, yScale, unit_of_measure) {

            // Add the datapoint circles
            svg.append(`g`)
                .attr('class', `circles_${tsid}`)
                .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("id", `circle_${tsid}_${count}`)
                .attr("class", `circle profileCharts circles_${tsid}`)
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .attr("cx", d => xScale(d.concentration))
                .attr("cy", d => yScale(d.depth))
                .attr("r", 4)
                .attr("stroke", 'red')
                .style("fill", 'red')
                .style("stroke-width", '1.5px')
                .on('mouseover', function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 1)
                        .style("stroke", 'orange')
                        .style("fill", 'orange')
                    tooltip
                        .html(`Date: ${formatDate(d.date)}<br>Depth: ${d.depth} m<br>${d.qualifier} value: ${d.concentration} ${unit_of_measure}`)
                        .style("left", event.pageX + "px")
                        .style("top", event.pageY - 28 + "px")
                })
                .on("mouseout", () => {
                    tooltip.transition()
                        .duration(200)
                        .style("stroke", 'red')
                        .style("fill", 'red')
                        .style("opacity", 0);
                });
            return;
        }

        function generateSlider(svg, minDate, maxDate, variableProfile, tsID, svgID, x_element, xScale, yScale, profileScales) {
            /** Set slider https://bl.ocks.org/officeofjane/47d2b0bfeecfcb41d2212d06d095c763
            /*             https://bl.ocks.org/officeofjane/b3f6a4f89a54fb193265b5c05659e17b
            */
            var targetValue = x_axis;

            const x_slider = x_box_max - x_box_min;
            const y_slider = y_box_max + slider_box;

            // Set axis scales
            //
            const sliderScale = d3.scaleTime()
                  .domain([new Date(minDate), new Date(maxDate)]).nice()
                  .range([0, x_slider])

            var slider = d3
                .sliderBottom(sliderScale)
                //.min(minDate)
                //.max(maxDate)
                .step(1000 * 60 * 60 * 24)
                .width(x_slider)
                .tickFormat(d3.timeFormat('%b %d'))
                //.ticks(7)
                .default(maxDate)
                .handle(
                    d3.symbol()
                        .type(d3.symbolCircle)
                        .size(200)()
                )
                .on('onchange', val => {
                    let currentDate = d3.timeFormat('%b %d %Y')(val);
                    let sliderValue = sliderScale(val);
                    myLogger.info(`slider ${val} Date ${currentDate} X ${sliderValue}`);
                    sliderOnDrag(val, sliderValue, Profiles, tsID, svg, x_element, xScale, yScale, profileScales)
                })

            var gTime = svg.append('g')
                .attr("id", `slider-${svgID}`)
                .attr("class", "slider")
                .attr('width', 500)
                .attr('height', 100)
                .append('g')
                .attr('transform', `translate(${x_box_min}, ${y_slider})`)

            gTime.call(slider);

            //setIntroTextDate(sliderValue`);
        }

        function sliderOnDrag(currentValue, sliderValue, Profiles, tsID, svg, x_element, xScale, yScale, profileScales) {

            //myLogger.info(`sliderLockStatus ${sliderLockStatus}`);
            //myLogger.info(variableProfile);
            //myLogger.info('profileScales');
            //myLogger.info(profileScales);

            let currentDate = d3.timeFormat('%b %d, %Y')(currentValue);
            const sliderLines = []

            // Check if graphing is locked to individual or all
            //
            if (sliderLockStatus) {
                const lockedSliderLines = []

                setIntroTextDate(currentValue);

                d3.selectAll(".noData")
                    .style("opacity", "0.0")
                    .text('No data recorded for ');

                // Set slider to current date
                d3.selectAll('.parameter-value')
                    .attr("transform", `translate(${sliderValue},0)`);
                d3.selectAll('.parameter-value text').each(function(d, i) {
                    d3.select(this).text(d3.timeFormat('%b %d')(currentValue));
                });

                for (var i = 0; i < Profiles.length; i++) {
                    // Set specifics for each graph
                    let tsid = Profiles[i].tsid
                    //myLogger.info(`tsid ${tsid}`);
                    
                    const lockedSvg = d3.select(`#svgProfiles_${i}`);
                    const lockedxScale = profileScales[tsid][0].xScale;
                    const lockedyScale = profileScales[tsid][0].yScale;
                    lockedSliderLines[i] = [];

                    // Remove existing lines
                    d3.selectAll(`.lines_${tsid}`).remove()
                    d3.selectAll(`.circles_${tsid}`).remove();

                    // Filter data for current day and store in lines and add to graphs
                    filterDataByDate(currentDate, Profiles[i].datapoints, lockedSliderLines[i]);
                    graphDay(lockedSliderLines[i], Profiles[i].tsid, lockedSvg, lockedxScale, lockedyScale, x_element, currentDate);
                }
            } else {

                for (var i = 0; i < Profiles.length; i++) {
                    // Set specifics for each graph
                    let tsid = Profiles[i].tsid

                    if (tsid === tsID) {

                        filterDataByDate(currentDate, Profiles[i].datapoints, sliderLines)

                        // Remove current lines and rehide "no data recorded for"
                        d3.selectAll(`.lines_${tsID}`).remove()
                        d3.selectAll(`.circles_${tsID}`).remove()
                        d3.selectAll(".noData").style("opacity", "0.0").text('No data recorded for ')

                        graphDay(sliderLines, tsID, svg, xScale, yScale, x_element, currentDate)

                        break;
                    }
                }

            }
        }
        
        fadeModal(2000);
    }


    // Plot
    //
    function plotTimeSeries(TimeSeries, agency_cd, site_no, station_nm, firstSeriesDate, lastSeriesDate) {

        if (timeseriesCharts) { return; }

        message = "Time-series of water-quality measurements for site " + station_nm;
        openModal(message);
        
        // Add text content above panels
        //
        var svgContent = [];
        svgContent.push('<span id="timeseriesIntro"></span>');
        svgContent.push('<span id="timeseriesText"></span>');
        svgContent.push('<ul style="list-style-type:none;">');

        // Add panels
        //
        for (let i = 0; i < TimeSeries.length; i++) {
            let tsID = TimeSeries[i].tsid;
            let myTitle = TimeSeries[i].description;
            //myLogger.info(`TimeSeries -> ${tsID} ${myTitle}`);

            let svgID = ['svgTimeSeries', i].join("_");

            svgContent.push('<li>');
            svgContent.push(`<svg id="${svgID}" class="panel_${tsID} svg border-2 border-black shadow mb-3"></svg>`);
            svgContent.push('</li>');
        }
        svgContent.push('</ul>');
        $('#timeseriesContent').html(svgContent.join("\n"));

        // Add introduction content
        //
        $('span#timeseriesIntro').load(`${helpFile} span#timeseriesIntro`);

        if(maxDays < defaultDays) {
            $('span#timeseriesText').load(`${helpFile} span#showLessData`, function() {
                $('span#defaultDays').html(defaultDays);
                $('span#availableRecord').html(availableRecord);
            });
        }
        else if(maxDays > defaultDays) {
            $('span#timeseriesText').load(`${helpFile} span#showMoreData`, function() {
                $('span#defaultDays').html(defaultDays);
                $('span#availableRecord').html(availableRecord);
                $('span#moreDataLink').html(moreDataLink);
            });
        }
        else {
            $('span#timeseriesText').load(`${helpFile} span#showAllData`, function() {
                $('span#defaultDays').html(defaultDays);
                $('span#availableRecord').html(availableRecord);
            });
        }

        // SVG panels
        //
        for (let i = 0; i < TimeSeries.length; i++) {

            // Local Variables
            //
            const tsID = TimeSeries[i].tsid;
            const svgID = `svgTimeSeries_${i}`
            const unit_of_measure = TimeSeries[i].unit_of_measure;

            // SVG canvas
            //
            const svg = d3.select(`#${svgID}`);
            
            // Check width of title
            //
            const myTitle = TimeSeries[i].description;
            let myText = textSize(myTitle);
            let fontHeight = myText.height;
            let fontWidth = myText.width / myTitle.length;

            let containerWidth = +d3.select("#" + svgID).style('width').slice(0, -2);

            // Add site information
            //
            if (myText.width < containerWidth) {
                svg.append("text")
                    .attr('class', 'site_title')
                    .attr('x', x_box_min * 0.1)
                    .attr('y', fontHeight * 0.85)
                    .text(myTitle);
            } else {
                let myTexts = myTitle.split(/,/);
                let title = "";
                let x_text = x_box_min * 0.1;
                let y_text = fontHeight * 0.85;
                for (let ii = 0; ii < myTexts.length; ii++) {
                    if (([title, myTexts[ii]].join(',').length * fontWidth) > containerWidth) {
                        svg.append("text")
                            .attr('class', 'site_title')
                            .attr('x', x_text)
                            .attr('y', y_text)
                            .text(title);
                        title = myTexts[ii];
                        x_text = x_box_min * 0.1 + fontWidth * 2.0;
                        y_text += fontHeight * 0.85;
                    } else {
                        if (title.length > 0) { title = [title, myTexts[ii]].join(","); } else { title = myTexts[ii]; }
                    }
                }

                svg.append("text")
                    .attr('class', 'site_title')
                    .attr('x', x_text)
                    .attr('y', y_text)
                    .text(title);
            }

            // Insert null to break line if
            //   exceed high/low threshold values
            //   missing value occurs
            //
            // Set color for Approved/Provisional record
            //
            let tempL     = [];
            let deltaDate = null;
            let ThresholdAbove = null;
            let ThresholdBelow = null;
            if(TimeSeries[i].ThresholdAbove) ThresholdAbove = TimeSeries[i].ThresholdAbove
            if(TimeSeries[i].ThresholdBelow) ThresholdBelow = TimeSeries[i].ThresholdBelow
            //myLogger.info(`TimeSeries ${myTitle} ${TimeSeries[i].datapoints.length}`);
            for (let ii = 1; ii < TimeSeries[i].datapoints.length; ii++) {

                if(ThresholdAbove && TimeSeries[i].datapoint[ii] > ThresholdAbove) TimeSeries[i].datapoint[ii] = null
                if(ThresholdBelow && TimeSeries[i].datapoint[ii] < ThresholdBelow) TimeSeries[i].datapoint[ii] = null

                let qualifierColor = 'orange';
                if(TimeSeries[i].datapoints[ii].qualifier == 'Approved') {
                    qualifierColor = 'blue';
                }
                TimeSeries[i].datapoints[ii].color = qualifierColor
                
                currentDate = TimeSeries[i].datapoints[ii].date;
                if(!deltaDate) {
                    lastDate  = TimeSeries[i].datapoints[ii - 1].date;
                    tempCurrent = dayjs(currentDate).format('MMM DD, YYYY HH:mm');
                    tempLast    = dayjs(lastDate).format('MMM DD, YYYY HH:mm');
                    deltaDate = currentDate - lastDate;
                    //myLogger.info(`deltaDate ${deltaDate} for current date ${tempCurrent} to last date ${tempLast}`);
                }
                else {
                    deltaTemp = currentDate - lastDate;
                    if(deltaTemp > deltaDate) {
                        tempCurrent = dayjs(currentDate).format('MMM DD, YYYY HH:mm');
                        tempLast    = dayjs(lastDate).format('MMM DD, YYYY HH:mm');
                        //myLogger.info(`deltaTemp > deltaDate ${deltaTemp} for current date ${tempCurrent} to last date ${tempLast}`);
                        myDateTime = lastDate + deltaTemp;
                        myValue    = null;
                        myQualifier = TimeSeries[i].datapoints[ii].qualifier;
                        tempL.push({'date': myDateTime, 'concentration': myValue, 'qualifier': myQualifier, 'color': null });
                    }
                }
                lastDate = currentDate;
                tempL.push(TimeSeries[i].datapoints[ii]);
            }
            TimeSeries[i].datapoints = tempL.slice();
            myLogger.info(`TimeSeries`);
            myLogger.info(TimeSeries[i].datapoints);

            // Graph
            //
            let timeseriesGraph = svg.append("g")
                .attr("class", `timeseriesGraph-${svgID}`)
                
            // X axis scale
            //
            let maxDate = lastSeriesDate;
            let minDate = firstSeriesDate;
            
            let xScale = d3.scaleTime()
                .domain([minDate, maxDate]).nice()
                .range([0, x_axis])

            // X axis
            //
            let axisLine = timeseriesGraph.append("g")
                .attr("class", "timeseries-x-axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_max})`)
                .call(d3.axisBottom(xScale).tickValues([]).tickSize(0))

            let axisBottom = timeseriesGraph.append("g")
                .attr("id", "timeseries-x-axis")
                .attr("class", "timeseries-x-axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_max + 10})`)
                .call(d3.axisBottom(xScale)
                      .tickFormat(d3.timeFormat('%b %d')))

            let tickCount = xScale.ticks().length
            axisBottom
                .selectAll('g.timeseries-x-axis g.tick')
                .append('text')
                .attr("dy", "3em")
                .attr("fill", "currentColor")
                .text((e, i) => {
                    if(i === 0 ) { return d3.timeFormat('%Y')(minDate) }
                    if(i === tickCount - 1) { return d3.timeFormat('%Y')(maxDate) }
                });

            timeseriesGraph.append("g")
                .append("text")
                .attr("id", `timeseriesGraph-Xaxislabel-${svgID}`)
                .attr("class", "x-axislabel")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_max})`)
                .attr("dy", "3em")
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-weight", "700")
                .text("Calendar"); 

            // Y Axis
            //
            let maxValue = d3.max(TimeSeries[i].datapoints, d => d.concentration);
            let minValue = d3.min(TimeSeries[i].datapoints, d => d.concentration);
            let yScale = d3.scaleLinear()
                .domain([minValue, maxValue]).nice()
                .range([y_axis, 0]);

            // Retrieve tick values from the scale
            //
            const ticks = yScale.ticks();

            // The actual tick step can be determined from the generated ticks.
            //
            const tickInterval = ticks[1] - ticks[0];
            let yMin = yScale.domain()[0];
            let yMax = yScale.domain()[1];
            myLogger.info(`Values maximum value ${maxValue} minimum value ${minValue} Y axis maximum ${yMax} minimum ${yMin} tickInterval ${tickInterval}`);
            if(Math.abs((yMax - maxValue)) < tickInterval) yMax += tickInterval
            if(Math.abs((yMin - minValue)) < tickInterval) yMin -= tickInterval
            if(yMin < 0.0) yMin = 0.0
            yScale.domain([yMin, yMax])
            
            // Add the Y Axis
            //
            timeseriesGraph.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .call(d3.axisLeft(yScale))

            // Add the Y Axis label
            //
            timeseriesGraph.append("g")
                .append("text")
                .attr("class", "y-axislabel")
                .attr("transform", `translate(${x_box_min * 0.5}, ${y_box_min + y_axis * 0.5}) rotate(-90)`)
                .attr("dx", "-0.71em")
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-weight", "700")
                .text("Concentration");

            // Mark qualifier for Approved/Provisional records
            //
            const qualifierGroups = d3.groups(TimeSeries[i].datapoints, d => d.qualifier)
            myLogger.info(`qualifierGroups}`);
            myLogger.info(qualifierGroups);

            // Define qualifier line
            //
            let strokeWidth = 6
            let yMid = y_axis + strokeWidth
            let qualifierLine = d3.line()
                .curve(d3.curveMonotoneX)
                .defined(function(d) { return d.color !== null; })
                .x(function(d) {
                    return xScale(d.date);
                })
                .y(yMid)

            // Add qualifiers
            //
            if(qualifierGroups.length > 0) {

                let dx = 10
                let dy = 60

                // Add qualifier to legend
                //
                let descriptions = d3.select(`.timeseriesLegend-${svgID}`)
                if(descriptions.size() < 1) {
                    descriptions = timeseriesGraph.append("g")
                        .attr("class", `timeseriesLegend-${svgID}`)
                }
                
                let myText = descriptions.append("text")
                    .attr("id", "qualifierLink")
                    //.attr('class', qualifier)
                    .attr('x', x_box_min)
                    .attr('y', y_box_max)
                    .attr('dx', dx)
                    .attr('dy', dy)
                    .style("text-anchor", "start")
                    .style("font-family", "sans-serif")
                    .style("font-weight", "400")
                    .style("font-size", "0.9rem")
                    .text('Data approval period')
                
                dy += 10

                for(let ii = 0; ii < qualifierGroups.length; ii++) {
                    let qualifier = qualifierGroups[ii][0];
                    let data      = qualifierGroups[ii][1];
                    let color     = 'orange'
                    if(qualifier == 'Approved') color = 'blue'

                    // Add the line
                    //
                    timeseriesGraph.append("path")
                        .datum(data)
                        .attr("id", qualifier)
                        .attr("class", "qualifierLine")
                        .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                        .attr("stroke", color)
                        .attr("stroke-width", strokeWidth)
                        .attr("stroke-opacity", 1.0)
                        .attr("d", qualifierLine)

                    let myRect = descriptions.append("rect")
                        .attr('id', 'qualifierLink')
                        .attr('class', qualifier)
                        .attr('x', `${x_box_min + dx}`)
                        .attr('y', `${y_box_max + dy}`)
                        .attr('width', `${strokeWidth * 2}`)
                        .attr('height', `${strokeWidth}`)
                        .attr('fill', color)
                        .attr('stroke', color)
                        .attr('stroke-width', strokeWidth)
                        .on('mouseover', function(d, i) {
                            let id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', 'yellow')
                        })
                        .on('mouseout', function(d, i) {
                            let id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', color)
                        })

                    let myText = descriptions.append("text")
                        .attr("id", "qualifierLink")
                        .attr('class', qualifier)
                        .attr('x', x_box_min)
                        .attr('y', y_box_max)
                        .attr('dx', `${dx + strokeWidth * 4}`)
                        .attr('dy', `${dy + 6}`)
                        .style("text-anchor", "start")
                        .style("alignment-baseline", "center")
                        .style("font-family", "sans-serif")
                        .style("font-weight", "400")
                        .style("font-size", "0.8rem")
                        .text(qualifier)
                        .on('mouseover', function(d, i) {
                            var id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', 'yellow')
                        })
                        .on('mouseout', function(d, i) {
                            var id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', color)
                        })

                    dx += strokeWidth * 20
                }
            }

            // Define parameter line
            //
            let line = d3.line()
                .curve(d3.curveMonotoneX)
                .defined(function(d) { return d.concentration !== null; })
                .x(function(d) {
                    return xScale(d.date);
                })
                .y(function(d) {
                    return yScale(d.concentration);
                });
                
            // Add the line
            //
            timeseriesGraph.append("path")
                .datum(TimeSeries[i].datapoints)
                .attr("class", "line")
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .attr("d", line)

            // Show points
            //
            timeseriesGraph.append("g")
                .selectAll("circle")
                .data(TimeSeries[i].datapoints)
                .enter()
                .append("circle")
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .attr("cx", d => xScale(d.date))
                .attr("cy", d => yScale(d.concentration))
                .attr("r", 3)
                .style("opacity", 0)
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 1)
                    tooltip
                        .html(`Date: ${formatDate(d.date)}<br>${d.qualifier} value: ${d.concentration}`)
                        .style("left", event.pageX + "px")
                        .style("top", event.pageY - 28 + "px")
                })
                .on("mouseout", () => {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0)
                });
            
            // Add site text to each panel
            //
            timeseriesGraph.append("text")
                .attr("class", "siteText")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min + y_axis * 0.15})`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text([agency_cd, site_no].join(" "));

            timeseriesGraph.append("text")
                .attr("class", "siteText")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min + y_axis * 0.25})`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text(station_nm);
        }

        timeseriesCharts = true;
        
        fadeModal(2000);
    }

    // Plot
    //
    function plotContourPoints(Contours, agency_cd, site_no, station_nm, firstDropDate, lastDropDate) {

        if (contourCharts) { return; }
   
        message = `Contours of depth and water-quality measurements for site ${station_nm}`;
        openModal(message);

         // Add text content above graph
        //
        var svgContent = [];
        svgContent.push('<span id="contourIntro"></span>');
        svgContent.push('<span id="contourText"></span>');
        svgContent.push('<ul style="list-style-type:none;">');

        for (var i = 0; i < Contours.length; i++) {
            var tsID    = Contours[i].tsid;
            var myTitle = Contours[i].description;

            var svgID = ['svgContours', i].join("_");

            svgContent.push('<li>');
            svgContent.push('<svg id="' + svgID + '" class="svg border-2 border-black shadow mb-3"></svg>');
            svgContent.push('</li>');
        }
        svgContent.push('</ul>');
        $('#contoursContent').html(svgContent.join("\n"));

        // Add introduction content
        //
        $('span#contourIntro').load(`${helpFile} span#contourIntro`);

        if(maxDays < defaultDays) {
            $('span#contourText').load(`${helpFile} span#showLessData`, function() {
                $('span#defaultDays').html(defaultDays);
                $('span#availableRecord').html(availableRecord);
            });
        }
        else if(maxDays > defaultDays) {
            $('span#contourText').load(`${helpFile} span#showMoreData`, function() {
                $('span#defaultDays').html(defaultDays);
                $('span#availableRecord').html(availableRecord);
                $('span#moreDataLink').html(moreDataLink);
            });
        }
        else {
            $('span#contourText').load(`${helpFile} span#showAllData`, function() {
                $('span#defaultDays').html(defaultDays);
                $('span#availableRecord').html(availableRecord);
            });
        }

        // SVG panels
        //
        for (let i = 0; i < Contours.length; i++) {

            // Local Variables
            //
            const tsID = Contours[i].tsid;
            const svgID = `svgContours_${i}`;
            const unit_of_measure = Contours[i].unit_of_measure;

            // SVG canvas
            //
            const svg = d3.select(`#${svgID}`);

            // Check width of title
            //
            const myTitle = Contours[i].description;
            let myText = textSize(myTitle);
            let fontHeight = myText.height;
            let fontWidth = myText.width / myTitle.length;

            let containerWidth = +d3.select("#" + svgID).style('width').slice(0, -2);

            // Add site information
            //
            if (myText.width < containerWidth) {
               svg.append("text")
                    .attr('x', x_box_min * 0.1)
                    .attr('y', fontHeight * 0.85)
                    .attr('class', 'site_title')
                    .text(myTitle);
            } else {
                let myTexts = myTitle.split(/,/);
                let title = "";
                let x_text = x_box_min * 0.1;
                let y_text = fontHeight * 0.85;
                for (let ii = 0; ii < myTexts.length; ii++) {
                    if (([title, myTexts[ii]].join(',').length * fontWidth) > containerWidth) {
                        let mySiteText = svg.append("text")
                            .attr('x', x_text)
                            .attr('y', y_text)
                            .attr('class', 'site_title')
                            .text(title);
                        title = myTexts[ii];
                        x_text = x_box_min * 0.1 + fontWidth * 2.0;
                        y_text += fontHeight * 0.85;
                    } else {
                        if (title.length > 0) { title = [title, myTexts[ii]].join(","); } else { title = myTexts[ii]; }
                    }
                }

                svg.append("text")
                    .attr('x', x_text)
                    .attr('y', y_text)
                    .attr('class', 'site_title')
                    .text(title);
            }

            // Process data
            //
            let pointData = []
            let ThresholdAbove = null;
            let ThresholdBelow = null;
            if(Contours[i].ThresholdAbove) ThresholdAbove = Contours[i].ThresholdAbove
            if(Contours[i].ThresholdBelow) ThresholdBelow = Contours[i].ThresholdBelow
            for (let ii = 0; ii < Contours[i].datapoints.length; ii++) {
                
                if(ThresholdAbove && Contours[i].datapoint[ii] > ThresholdAbove) Contours[i].datapoint[ii] = null
                if(ThresholdBelow && Contours[i].datapoint[ii] < ThresholdBelow) Contours[i].datapoint[ii] = null

                let depth = Contours[i].datapoints[ii].depth;
                let value = Contours[i].datapoints[ii].concentration;
                let date  = Contours[i].datapoints[ii].date;
                let qualifier = Contours[i].datapoints[ii].qualifier;

                Contours[i].datapoints[ii] = { 'date': date, 'depth': +depth, 'value': value, 'qualifier': qualifier };
                if (value) { pointData.push({ 'date': +date, 'depth': +depth, 'value': value, 'qualifier': qualifier }); }
            }

            // Graph
            //
            let contourGraph = svg.append("g")
                .attr("class", `contourGraph-${svgID}`)

            // X axis scale
            //
            var maxXaxis = lastDropDate;
            var minXaxis = firstDropDate;

            let xScale = d3.scaleTime()
                .domain([minXaxis, maxXaxis]).nice()
                .range([0, x_axis])

            // X axis
            //
            let axisLine = contourGraph.append("g")
                .attr("class", "timeseries-x-axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_max})`)
                .call(d3.axisBottom(xScale).tickValues([]).tickSize(0))

            let axisBottom = contourGraph.append("g")
                .attr("class", "contour-x-axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_max + 10})`)
                .call(d3.axisBottom(xScale)
                      .tickFormat(d3.timeFormat('%b %d')))

            let tickCount = xScale.ticks().length
            axisBottom
                .selectAll('g.contour-x-axis g.tick')
                .append('text')
                .attr("dy", "3em")
                .attr("fill", "currentColor")
                .text((e, i) => {
                    if(i === 0 ) { return d3.timeFormat('%Y')(minXaxis) }
                    if(i === tickCount - 1) { return d3.timeFormat('%Y')(maxXaxis) }
                });
            
            contourGraph.append("g")
                .append("text")
                .attr("id", `contourGraph-Xaxislabel-${svgID}`)
                .attr("class", "x-axislabel")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_max})`)
                .attr("dy", "3em")
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-weight", "700")
                .text("Calendar");

            // Y axis [left side in feet]
            //
            let maxYaxis = d3.max(pointData, d => d.depth);
            let minYaxis = d3.min(pointData, d => d.depth);
            
            let yScale = d3.scaleLinear()
                .domain([maxYaxis, minYaxis]).nice()
                .range([y_axis, 0]);

            // Retrieve tick values from the scale
            //
            const ticks = yScale.ticks();

            // The actual tick step can be determined from the generated ticks.
            //
            const tickInterval = Math.abs(ticks[1] - ticks[0]);
            let yMin = yScale.domain()[0];
            let yMax = yScale.domain()[1];
            myLogger.info(`Values maximum value ${maxYaxis} minimum value ${minYaxis} Y axis maximum ${yMax} minimum ${yMin} tickInterval ${tickInterval}`);
            if(Math.abs((yMin - maxYaxis)) < tickInterval) yMin += tickInterval
            yScale.domain([yMin, yMax])
            
            // Add the Y Axis
            //
            contourGraph.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .call(d3.axisLeft(yScale))

            // Add the Y Axis label
            //
            contourGraph.append("text")
                .attr("transform", `translate(${x_box_min * 0.5}, ${y_box_min + y_axis * 0.5}) rotate(-90)`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .text("Depth, in meters");

            // Y axis [right side in feet]
            //
            var maxY2axis = yMin * 3.28084;
            var minY2axis = yMax * 3.28084;
            let y2Scale = d3.scaleLinear()
                .domain([maxY2axis, minY2axis]).nice()
                .range([y_axis, 0]);
            
            // Add secondary Y Axis
            //
            contourGraph.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${x_box_max}, ${y_box_min})`)
                .call(d3.axisRight(y2Scale))

             // Add secondary Y Axis label
            //
           contourGraph.append("text")
                .attr("transform", `translate(${x_box_max + x_box_min * 0.5}, ${y_box_min + y_axis * 0.5}) rotate(-90)`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .attr("dy", "0.5rem")
                .text("Depth, in feet");

            // Prepare color ramp
            //
            var maxValue = d3.max(pointData, d => d.value);
            var minValue = d3.min(pointData, d => d.value);
            [minValue, maxValue, interval] = get_max_min(minValue, maxValue);
            var numberTics = (maxValue - minValue) / interval;

            // Prepare a color palette for points
            //
            //var color = d3.scaleSequential(d3.interpolateCool)
            //let color = d3.scaleSequential(d3.interpolatePuRd).domain([maxValue, minValue])
            let color = d3.scaleSequential(d3.interpolateRdYlBu).domain([maxValue, minValue])

            // Show points
            //
            contourGraph.append("g")
                .selectAll("circle")
                .data(pointData)
                .enter()
                .append("circle")
                .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                .attr("cx", d => xScale(d.date))
                .attr("cy", d => yScale(d.depth))
                .attr("r", 3)
                .attr("stroke", d => color(d.value))
                .style("fill", d => color(d.value))
                .on('mouseover', function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 1)
                    tooltip
                        .html(`Date: ${formatDate(d.date)}<br>Depth: ${d.depth} m<br>${d.qualifier} value: ${d.value} ${unit_of_measure}`)
                        .style("left", event.pageX + "px")
                        .style("top", event.pageY - 28 + "px")
                })
                .on("mouseout", () => {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
                });

            // Mark qualifier for Approved/Provisional records
            //
            const qualifierGroups = d3.groups(pointData, d => d.qualifier)
            myLogger.info(`qualifierGroups}`);
            myLogger.info(qualifierGroups);

            // Define qualifier line
            //
            let strokeWidth = 6
            let yMid = y_axis + strokeWidth
            let qualifierLine = d3.line()
                .curve(d3.curveMonotoneX)
                .defined(function(d) { return d.color !== null; })
                .x(function(d) {
                    return xScale(d.date);
                })
                .y(yMid)

            // Add qualifiers
            //
            if(qualifierGroups.length > 0) {

                let dx = 10
                let dy = 60

                // Add qualifier to legend
                //
                let descriptions = d3.select(`.contourLegend-${svgID}`)
                if(descriptions.size() < 1) {
                    descriptions = contourGraph.append("g")
                        .attr("class", `contourLegend-${svgID}`)
                }
                
                let myText = descriptions.append("text")
                    .attr("id", "qualifierLink")
                    //.attr('class', qualifier)
                    .attr('x', x_box_min)
                    .attr('y', y_box_max)
                    .attr('dx', dx)
                    .attr('dy', dy)
                    .style("text-anchor", "start")
                    .style("font-family", "sans-serif")
                    .style("font-weight", "400")
                    .style("font-size", "0.9rem")
                    .text('Data approval period')
                
                dy += 10

                for(let ii = 0; ii < qualifierGroups.length; ii++) {
                    let qualifier = qualifierGroups[ii][0];
                    let data      = qualifierGroups[ii][1];
                    let color     = 'orange'
                    if(qualifier == 'Approved') color = 'blue'

                    // Add the line
                    //
                    contourGraph.append("path")
                        .datum(data)
                        .attr("id", qualifier)
                        .attr("class", "qualifierLine")
                        .attr("transform", `translate(${x_box_min}, ${y_box_min})`)
                        .attr("stroke", color)
                        .attr("stroke-width", strokeWidth)
                        .attr("stroke-opacity", 1.0)
                        .attr("d", qualifierLine)

                    let myRect = descriptions.append("rect")
                        .attr('id', 'qualifierLink')
                        .attr('class', qualifier)
                        .attr('x', `${x_box_min + dx}`)
                        .attr('y', `${y_box_max + dy}`)
                        .attr('width', `${strokeWidth * 2}`)
                        .attr('height', `${strokeWidth}`)
                        .attr('fill', color)
                        .attr('stroke', color)
                        .attr('stroke-width', strokeWidth)
                        .on('mouseover', function(d, i) {
                            let id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', 'yellow')
                        })
                        .on('mouseout', function(d, i) {
                            let id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', color)
                        })

                    let myText = descriptions.append("text")
                        .attr("id", "qualifierLink")
                        .attr('class', qualifier)
                        .attr('x', x_box_min)
                        .attr('y', y_box_max)
                        .attr('dx', `${dx + strokeWidth * 4}`)
                        .attr('dy', `${dy + 6}`)
                        .style("text-anchor", "start")
                        .style("font-family", "sans-serif")
                        .style("font-weight", "400")
                        .style("font-size", "0.8rem")
                        .text(qualifier)
                        .on('mouseover', function(d, i) {
                            var id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', 'yellow')
                        })
                        .on('mouseout', function(d, i) {
                            var id = d3.select(this).attr('class');
                            d3.selectAll("#" + id)
                                .transition()
                                .duration(100)
                                .attr('stroke-width', strokeWidth)
                                .attr('stroke', color)
                        })

                    dx += strokeWidth * 20
                }
            }

            // Add site text to each panel
            //
            contourGraph.append("text")
                .attr("class", "siteText")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min + y_axis * 0.15})`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text([agency_cd, site_no].join(" "));
            
            contourGraph.append("text")
                .attr("class", "siteText")
                .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min + y_axis * 0.25})`)
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text(station_nm);

            // Add the legend now
            //
            // https://bl.ocks.org/starcalibre/6cccfa843ed254aa0a0d
            //
            let legendFullHeight = y_axis;
            let legendFullWidth = 50;

            let legendMargin = { top: 20, bottom: 20, left: 5, right: 20 };

            // Use same margins as main plot
            //
            let legendWidth = legendFullWidth - legendMargin.left - legendMargin.right;
            var legendHeight = y_axis;

            let legendSvg = d3.select("#" + svgID)
                .append('g')
                .attr('width', legendFullWidth)
                .attr('height', legendFullHeight)
                .attr('transform', `translate(${x_box_max + x_box_min * 0.6 + legendMargin.right}, ${y_box_min})`)

            var gradient = legendSvg.append('defs')
                .append('linearGradient')
                .attr('id', 'gradient')
                .attr('x1', '0%') // bottom
                .attr('y1', '0%')
                .attr('x2', '0%') // to top
                .attr('y2', '100%')
                .attr('spreadMethod', 'pad');

            // Programatically generate the gradient for the legend
            // this creates an array of [pct, colour] pairs as stop
            // values for legend
            //
            var colorScale = [];
            for (var ii = 0; ii < 100; ii++) {
                var t = 0.01 * ii;
                var hexColor = d3.interpolateRdYlBu(t)
                colorScale.push([t, hexColor])
            }

            colorScale.forEach(function(d) {
                gradient.append('stop')
                    .attr('offset', d[0])
                    .attr('stop-color', d[1])
                    .attr('stop-opacity', 1);
            });

            legendSvg.append('rect')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('width', legendWidth)
                .attr('height', legendHeight)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .style('fill', 'url(#gradient)');

            // Create a scale and axis for the legend
            //
            let legendScale = d3.scaleLinear()
                .domain([minValue, maxValue])
                .range([legendHeight, 0]);

            let legendAxis = d3.axisRight()
                .scale(legendScale)
                .ticks(5);

            legendSvg.append("g")
                .attr("id", `legend-axis-${svgID}`)
                .attr("class", "legend axis")
                .attr("transform", `translate(${legendWidth}, 0)`)
                .call(legendAxis);

            // Determine axis tic dimensions
            //
            axisInfo  = getSvg(`#legend-axis-${svgID}`)
            xPosition = axisInfo.x
            yPosition = axisInfo.y
            ticWidth  = axisInfo.width
            ticHeight = axisInfo.height

            // Add the Legend Y Axis label
            //
            legendSvg.append("text")
                .attr("transform", `translate(${legendWidth * 0.7}, ${legendHeight * 0.5}) rotate(-90)`)
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle")
                .text(`Concentration in ${unit_of_measure}`);

        }

        d3.selectAll("#qualifierLink").on("click", function(event, d) {

            window.open('https://waterdata.usgs.gov/provisional-data-statement/', '_blank')
            
        });

        contourCharts = true;
        
        fadeModal(2000);
    }

    // No information
    //
    function noData(svgContainer) {

        svgContainer.append("text")
            .attr("transform", `translate(${x_box_min + x_axis * 0.5}, ${y_box_min + y_axis * 0.5}) rotate(-90)`)
            .attr('class', 'y_axis_label')
            .text("No Time Series Information");
    }

    function textSize(text) {
        if (!d3) return;
        let container = d3.select('body').append('svg');
        container.append('text').attr('x', -99999).attr('y', -99999).text(text);
        let size = container.node().getBBox();
        container.remove();
        return { width: size.width, height: size.height };
    }

    function getSvg(svgElement) {
        myLogger.info('getSvg')
        myLogger.info(svgElement)

        let svg = d3.select(svgElement); // Select your SVG element

        let boundingBox = svg.node().getBBox(); // Get bounding box

        return {x: boundingBox.x, y: boundingBox.y, width: boundingBox.width, height: boundingBox.height}
    }
}
