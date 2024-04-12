/**
 * Namespace: d3_lakeprofiler.js
 *
 * D3_lakeprofiler is a JavaScript library to provide a set of functions to build
 *  the Lake Profiler Web Site.
 *
 * version 3.16
 * April 6, 2024
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

/** Wrapper for renderGraphs. Encapsulates global variables to avoid any side effects.
 * @param {object} myHash - Incoming raw data from API (default rdb format).
 * @param {string} agency_cd - Agency that published the data.
 * @param {string} site_no - Number of gage, station, or sensor site.
 * @param {string} station_nm - Name of gage, station, or sensor site.
 */
function plotLakeProfile(myHash, agency_cd, site_no, station_nm) {
    //console.log('plotLakeProfile myHash');
    //console.log(myHash);
   
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

        var myParameterData = rawData.myParameterData;
        var myData = rawData.myData;
        var myTimeSeries = {};
        var numberRe = new RegExp(/^(\d+)_(\d+)$/);
        var qualifierRe = new RegExp(/_*(\D+)$/);

        //console.log(`Specified requested dates from ${rawData.startingDate} to ${rawData.endingDate} [${maxUserDays} days]`);

        startingDate = dayjs(rawData.startingDate).format('MMM DD, YYYY');
        endingDate   = dayjs(rawData.endingDate).format('MMM DD, YYYY');
        //console.log(`Specified requested dates from ${startingDate} to ${endingDate} [${maxUserDays} days]`);
        
        startingPorDate = dayjs(startingPorDate).format('MMM DD, YYYY');
        endingPorDate   = dayjs(endingPorDate).format('MMM DD, YYYY');
        //console.log(`Available dates from ${startingPorDate} to ${endingPorDate} [${maxDays} days]`);

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
        console.log('myParameterData')
        console.log(myParameterData)
        
        // Extract depth timeseries for profile and contour panels
        //
        var DepthSeries  = {};
        let profilesDescriptionRe   = /Variable Depth Profile Data/;
        let timeseriesDescriptionRe = /\[1 Meter Below The Surface\]/;
        let depthDescriptionRe      = /^Depth of sensor below water surface/;
        
        let myTsIdList = jQuery.map(myParameterData, function(element, index) {
            let myDescription = myParameterData[index].description;
            if (profilesDescriptionRe.test(myDescription) && depthDescriptionRe.test(myDescription)) {
                let myRecords   = myData[index];

                // Loop through parameter codes and datetime
                //
                for (let myRecord of myRecords) {
                    let myDate      = Date.parse(myRecord.date);
                    let myValue     = myRecord.value;

                    DepthSeries[myDate] = +myValue;
                }
            }
            else if (depthDescriptionRe.test(myDescription)) {
                let nothing = 'nothing';
            }
            else {

                return index;
            }
        });
        
        //console.log(`myTsIdList`);
        //console.log(myTsIdList);
        //console.log(DepthSeries);

        // Loop through record extracting specific fields
        //
        // Extract time-series set and reformat data to make it more copasetic for d3
        // data = An array of objects
        // concentrations = An array of three objects, each of which contains an array of objects
        //
        var Profiles    = [];
        var TimeSeries  = [];
        var Contours    = [];
        let firstDropDate = null;
        let lastDropDate = null;
        let firstSeriesDate = null;
        let lastSeriesDate = null;
        
        for (let tsID of myTsIdList) {
            
            let description = myParameterData[tsID].description;
            let param_cd    = myParameterData[tsID].parm_cd;
            var myRecords   = myData[tsID];
            var numRecords  = myRecords.length;
            //console.log(`tsID ${tsID} parameter ${param_cd} description ${description} Records ${numRecords}`);
            //console.log(`Parameter ${paramOrder.indexOf(param_cd)}`);

            // Loop through parameter codes and datetime
            //
            myTimeSeries = [];
            
            for (let myRecord of myRecords) {
                let myDate      = myRecord.date;
                let myValue     = myRecord.value;
                let myQualifier = myRecord.qualifier;
                let myDateTime  = Date.parse(myDate);

                if(myValue) { myValue = +myValue; }

                // Process record
                //
                if (profilesDescriptionRe.test(description)) {

                    let myDepth = '';
                    if(DepthSeries[myDateTime]) {
                        myDepth = DepthSeries[myDateTime];
                    }
                    myTimeSeries.push({ 'date': myDateTime,
                                        'concentration': myValue,
                                        'depth': +myDepth });
                }
                else {
                    myTimeSeries.push({ 'date': myDateTime,
                                        'concentration': myValue });
                }
            }
            if (profilesDescriptionRe.test(description)) {
                let myDescription = description.replace(profilesDescriptionRe, "")
                Profiles[paramOrder.indexOf(param_cd)] = {
                    tsid: tsID,
                    description: myDescription,
                    datapoints: myTimeSeries.slice()
                };
                Contours[paramOrder.indexOf(param_cd)] = {
                    tsid: tsID,
                    description: myDescription,
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
            else {
                let myDescription = description.replace(timeseriesDescriptionRe, "")
                TimeSeries[paramOrder.indexOf(param_cd)] = {
                    tsid: tsID,
                    description: myDescription,
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

        //console.log('Profiles timeseries');
        //console.log(Profiles);

        //console.log('Contours timeseries');
        //console.log(Contours);

        //console.log('TimeSeries timeseries');
        //console.log(TimeSeries);

        // When tab is clicked, create and render graphs for each site
        //
        $('button.tabNames').click(function() {
            let graphType = $(this).prop('id').replace('-tab', '');
            //console.log(`Clicked ${graphType}`);
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
                    tabContent.push(`<div class="tabName fs-5">${capitalize(tag)} Information</div>`);
                    tabContent.push(`<div class="tabContent fs-6 mt-2" id="${tag}Content"></div>`);
                } else {
                    tabContent.push(`<div id="${tag}" class="tab-pane fade in mt-2">`);
                    tabContent.push(`<div class="tabName fs-5">${capitalize(tag)} Information</div>`);
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
            $('#generalContent').load(file);
            return;
        }

        /** Read in help content and render it as text in the last tab
         *  @param {string} helpFile - text provide help and hints.
         */
        function loadHelpText(helpFile, defaultDays, availableRecord, moreDataLink) {

            //console.log('loadHelpText');
            //console.log(helpFile, defaultDays, startingPorDate, endingPorDate);

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
            siteInfoContent.push('<div class="tabName fs-5">General Site Information</div>');
            siteInfoContent.push('<p>');
            siteInfoContent.push('<div class="divTable">');
            siteInfoContent.push('<div class="divTableBody">');

            // Create entries
            //
            var longitude    = mySiteInfo.dec_long_va;
            siteInfoContent.push(
                ['<div class="divTableRow divTableBorder">',
                 '<div class="divEmptyCell">',
                 '<span class="label">',
                 'Site Decimal Longitude:',
                 '</span></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell">',
                 `${longitude}`,
                 '</div>'
                ].join('')
                );

            var latitude     = mySiteInfo.dec_lat_va;
            siteInfoContent.push(
                ['<div class="divTableRow divTableBorder">',
                 '<div class="divEmptyCell">',
                 '<span class="label">',
                 'Site Decimal Latitude:',
                 '</span></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell">',
                 `${latitude}`,
                 '</div>'
                ].join('')
            );

            var dec_coord_datum_cd = mySiteInfo.dec_coord_datum_cd;
            siteInfoContent.push(
                ['<div class="divTableRow divTableBorder">',
                 '<div class="divEmptyCell">',
                 '<span class="label">',
                 'Decimal Latitude-longitude datum:',
                 '</span></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell"></div>',
                 '<div class="divEmptyCell">',
                 `${dec_coord_datum_cd}`,
                 '</div>'
                ].join('')
            );

            siteInfoContent.push(
                ['<div class="divTableRow table-primary">',
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
                 'Counts',
                 '</div>',
                 '</div>'
                ].join('')
            );

            // Sort by parameter code
            //
            const myTsIdList = Object.keys(myParameterData)
                  .sort((a,b)=>myParameterData[a].parm_cd - myParameterData[b].parm_cd)

            for(myTsId of myTsIdList) {
                var myParmCd   = myParameterData[myTsId].parm_cd;
                var beginDate  = myParameterData[myTsId].begin_date;
                var endDate    = myParameterData[myTsId].end_date;
                var myParmName = myParameterData[myTsId].description
                var myCount    = myParameterData[myTsId].count_nu
                
                siteInfoContent.push(
                    ['<div class="divTableRow">',
                     '<div class="divTableCell">',
                     `${myParmName}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${myParmCd}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${beginDate}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${endDate}`,
                     '</div>',
                     '<div class="divTableCell">',
                     `${myCount}`,
                     '</div>',
                     '</div>'
                    ].join('')
                );
            }

            //  Finish entries
            //
            siteInfoContent.push('</div></div>');
            siteInfoContent.push('</p>');
            
            $('#siteinformation').html(siteInfoContent);
            return;
        }
        
        fadeModal(2000);
    }


    /** Utility to Capitalize first letter of a string
     * @param {string} data - Incoming string to capitalize
     */
    function capitalize(data) {
        return data.charAt(0).toUpperCase() + data.slice(1);
    }

    /** Exported call to begin render
     * @param {object} Profiles - Data to be rendered, unsorted
     * @param {object} myParameterData - Parameter titles and TSIDs to label graphs with
     * @param {string} agency_cd - Agency that published the data.
     * @param {string} site_no - Number of gage, station, or sensor site.
     * @param {string} station_nm - Name of gage, station, or sensor site.
     */
    function plotTimeProfiles(Profiles, agency_cd, site_no, station_nm, firstDropDate, lastDropDate) {

        console.log('Profiles timeseries');
        //console.log(Profiles);

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
            const svgID = ['svgProfiles', i].join("_"); // Creates and selects appropriate chart into svg variable
            const svg = d3.select("#" + svgID);
            const x_element = 'depth'; // Data to alter
            //const variableProfile = Profiles[i].datapoints // Capture only elements after the first drop date
            //const variableProfile = Profiles[i].datapoints.slice(0) // Capture only elements after the first drop date
            var formatDate = d3.timeFormat("%b %d %Y"); // TODO: find where duplicate is and rename
            const lines = []; // TSID specific, date filtered array of different drops for that day

            //console.log(myDescription)
            //console.log(Profiles[i].datapoints)

            // Set the ranges and save for later use
            const xScale = d3.scaleLinear().range([0, x_axis]);
            const yScale = d3.scaleLinear().range([y_axis, 0]);
            const y2Scale = d3.scaleLinear().range([y_axis, 0]);
            if (!profileScales[tsID]) { profileScales[tsID] = [] } // If first one, initialize a new array for it
            profileScales[tsID].push({ 'xScale': xScale, 'yScale': yScale })

            // Define axis'
            const xAxis = d3.axisBottom().scale(xScale);
            const yAxis = d3.axisLeft().scale(yScale);
            const y2Axis = d3.axisRight().scale(y2Scale);

            // Define Axis min and max values
            const maxXaxis = d3.max(Profiles[i].datapoints, d => d.concentration);
            const minXaxis = d3.min(Profiles[i].datapoints, d => d.concentration);
            const maxYaxis = d3.max(Profiles[i].datapoints, d => d.depth);
            const minYaxis = d3.min(Profiles[i].datapoints, d => d.depth);
            const maxY2axis = d3.max(Profiles[i].datapoints, d => d.depth * 3.28084);
            const minY2axis = d3.min(Profiles[i].datapoints, d => d.depth * 3.28084);

            // Define Date and Value min and max values
            //const maxDate = d3.max(Profiles[i].datapoints, d => d.date);
            const minDate = firstDropDate;
            const maxDate = lastDropDate;
            const maxValue = d3.max(Profiles[i].datapoints, d => d.concentration);
            const minValue = d3.min(Profiles[i].datapoints, d => d.concentration);

            // Set the domain of the axes
            xScale.domain([minXaxis, maxXaxis]);
            yScale.domain([maxYaxis, minYaxis]);
            y2Scale.domain([maxY2axis, minY2axis]);

            // Prepare a color palette for points
            // TODO is this needed/used?
            const color = d3.scaleSequential(d3.interpolateCool)
            color.domain([maxValue, minValue])

            // Generate Chart Shell
            setIntroTextDate(dayjs(maxDate).endOf('day')); // Set to text to reflect end of the day of the latest measurement
            generateChartShell(tsID, myDescription, svgID, svg);
            generateAxis(svg, xAxis, yAxis, y2Axis);
            addSiteText(svg);
            addNoDataBackground(svg);

            // Filter data for current day and store in lines
            const toSet = dayjs(maxDate)
            filterDataByDate(toSet, Profiles[i].datapoints, lines);
            //filterDataByDate(toSet, variableProfile, lines);

            // Add lines and circles for day to graph
            graphDay(lines, tsID, svg, xScale, yScale, x_element, maxDate);

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
                    console.log(`Clicked slider lock ${sliderLockStatus}`);
                });

            });
            
            return;
        }

        function generateChartShell(tsID, myDescription, svgID, svg) {
            // Local Variables
            let myTitle = `${myDescription} [${tsID}]`;
            const graphTitleSize = textSize(myTitle);
            const containerWidth = +d3.select("#" + svgID).style('width').slice(0, -2); // width of title
            let titles = myTitle.split(/,/);
            let fontHeight = graphTitleSize.height;
            let fontWidth = graphTitleSize.width / myTitle.length;
            let hold = '';
            let x_text = x_box_min * 0.1;
            let y_text = fontHeight * 0.75;


            // Put title on graph - if too large for container, put remaining portion of title on the next line
            if (graphTitleSize.width < containerWidth) {
                svg.append("text")
                    .attr('x', x_box_min * 0.1)
                    .attr('y', y_text)
                    .attr('class', 'site_title')
                    .text(myTitle);
                return
            } else {
                titles.forEach(titleSection => {
                    // If too big for container, render what fits and then start a new line
                    if (([hold, titleSection].join(',').length * fontWidth) > containerWidth) {
                        svg.append("text")
                            .attr('x', x_text)
                            .attr('y', y_text)
                            .attr('class', 'site_title')
                            .text(hold);
                        hold = titleSection;
                        x_text = x_box_min * 0.1 + fontWidth * 2.0;
                        y_text += fontHeight * 0.75
                    } else {
                        if (hold.length > 0) {
                            hold = [hold, titleSection].join(","); // Add title section to the rest of title
                        } else {
                            hold = titleSection; // First word in title
                        }
                    }
                });
            }

            // Add new title to chart and insert profiles element into DOM
            svg.attr("class", "svg border-2 border-black shadow mb-3 svgProfiles");

            svg.append("text")
                .attr('x', x_text)
                .attr('y', y_text)
                .attr('class', 'site_title')
                .text(hold);
            return;
        }

        function generateAxis(svg, xAxis, yAxis, y2Axis) {
            // Add the X Axis
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(" + [x_box_min, y_box_max].join(",") + ")")
                .call(xAxis);

            // Add the Y Axis
            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .call(yAxis)

            // Add secondary Y Axis
            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + [x_box_max, y_box_min].join(",") + ")")
                .call(y2Axis)

            // Add the Y Axis label
            var xLabel = x_box_min * 0.5;
            var yLabel = y_box_min + y_axis * 0.5;
            svg.append("text")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ") rotate(-90)")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .text("Depth, in meters");

            // Add the Secondary Y Axis label
            var xLabel = x_box_max + x_box_min * 0.5;
            var yLabel = y_box_min + y_axis * 0.5;
            svg.append("text")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ") rotate(90)")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .text("Depth, in feet");

            return;
        }

        function addNoDataBackground(svg) {
            // Add no data text keep hidden until needed
            const xLabel = x_box_min + x_axis * 0.5;
            const yLabel = y_box_min + y_axis * 0.5;
            var graphID = svg.attr("id");
            svg.append("text")
                .attr("id", graphID)
                .attr("class", "noData " + graphID)
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ")")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.0")
                .text('No data recorded for ');
            return
        }

        function addSiteText(svg) {
            const xLabel = x_box_min + x_axis * 0.5;
            const yLabel = y_box_min + y_axis * 0.15;
            const yLabel2 = y_box_min + y_axis * 0.25;

            // For agency and site number
            svg.append("text")
                .attr("class", "siteText")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ")")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text([agency_cd, site_no].join(" "));

            // For Station name
            svg.append("text")
                .attr("class", "siteText")
                .attr("transform", "translate(" + [xLabel, yLabel2].join(", ") + ")")
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

            //console.log(filteredByDate)

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

        function graphDay(lines, tsid, svg, xScale, yScale, x_element, maxDate) {

            // If no data for that day
            if (lines.length < 1) {
                var graphID = svg.attr("id");
                d3.selectAll("." + graphID)
                  .style("opacity", "1.0")
                  .text('No data recorded for ' + formatDate(maxDate))
                return;
            }
            // Loop through each drop and graph the line for it
            for (var c = 0; c < lines.length; ++c) {
                graphLines(lines[c], tsid, svg, c, xScale, yScale, x_element);
                graphDatapoints(lines[c], tsid, svg, c, xScale, yScale);
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
                .attr("id", ["line", tsid, count].join("_"))
                .attr("class", `line profileCharts lines_${tsid}`)
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .attr("d", line)
                // Styling
                .on('mouseover', function(d) {
                    const circleOver = this.attributes.id.textContent.replace('line', 'circle')
                    d3.select(this) //on mouseover of each line, give it a nice thick stroke
                        .style("stroke-width", '3px')
                        .style("stroke", '#B47846');
                    d3.selectAll(`#${circleOver}`)
                        .style("fill", '#B47846')
                        .style("stroke", 'black');
                })
                .on('mouseout', function(d) {
                    const circleOut = this.attributes.id.textContent.replace('line', 'circle')
                    d3.select(this) //on mouseover of each line, give it a nice thick stroke
                        .style("stroke-width", '2px')
                        .style("stroke", 'black');
                    d3.selectAll(`#${circleOut}`)
                        .style("fill", 'steelblue')
                        .style("stroke-width", '1.5px');
                })
        }

        function graphDatapoints(data, tsid, svg, count, xScale, yScale) {

            // Add the datapoint circles
            svg.append(`g`)
                .attr('class', `circles_${tsid}`)
                .selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("id", ["circle", tsid, count].join("_"))
                .attr("class", `circle profileCharts circles_${tsid}`)
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .attr("cx", d => xScale(d.concentration))
                .attr("cy", d => yScale(d.depth))
                .attr("r", 3)
                .attr("stroke", 'black')
                .style("fill", 'steelblue')
                .style("stroke-width", '1.5px')
                .on('mouseover',  d => {
                    tooltip
                        .text('Value: ' + d.concentration + '\nDepth: ' + d.depth)
                        .style("left", d3.event.pageX + "px")
                        .style("top", d3.event.pageY - 28 + "px")
                        //.transition()
                        //.duration(200)
                        .style("opacity", 1)
                })
                .on("mouseout", () => {
                    tooltip
                        //.transition()
                        //.duration(200)
                        .style("opacity", 0);
                });
            return;
        }

        function generateSlider(svg, minDate, maxDate, variableProfile, tsID, svgID, x_element, xScale, yScale, profileScales) {
            /** Set slider https://bl.ocks.org/officeofjane/47d2b0bfeecfcb41d2212d06d095c763
            /*             https://bl.ocks.org/officeofjane/b3f6a4f89a54fb193265b5c05659e17b
            */
            var targetValue = x_axis;
            var formatDateIntoYear = d3.timeFormat("%b %d");

            // targetValue is the length of the slider track
            const xSlider = d3.scaleTime()
                .domain([minDate, maxDate])
                .range([0, targetValue])
                .clamp(true);

            const y_slider = y_box_max + slider_box;

            // Translate places slider track on page
            const slider = svg.append("g")
                .attr("id", svgID)
                .attr("class", "slider")
                .attr("transform", "translate(" + [x_box_min, y_slider].join(",") + ")")

            // Actual slider labels: .data(xslider()) controls on-track labels
            slider.insert("g", ".track-overlay")
                .attr("class", "sliderticks")
                .attr("transform", "translate(0," + 18 + ")")
                .selectAll("text")
                .data(xSlider.ticks(9))
                .enter()
                .append("text")
                .attr("x", xSlider)
                .attr("y", 10)
                .attr("text-anchor", "middle")
                .text(function(d) { return formatDateIntoYear(d); });

            slider.append("line")
                .attr("class", "track")
                .attr("x1", xSlider.range()[0])
                .attr("x2", xSlider.range()[1])
                .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
                .attr("class", "track-inset")
                .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
                .attr("class", "track-overlay")
                .call(d3.drag()
                    .on("start.interrupt", function() { slider.interrupt(); })
                    .on("start drag", function() { sliderOnDrag(d3.event.x, xSlider, Profiles, tsID, svg, x_element, xScale, yScale, profileScales) })
                );

            // Actual slider circle: r is size of circle, handle is the class identifier
            slider.insert("circle", ".track-overlay")
                .attr("class", `handle handle_${tsID}`)
                .attr("r", 9)
                .attr("cx", xSlider(maxDate));


            // Label positioning and definition for slider
            slider.append("text")
                .attr("class", `sliderlabels sliderlabel_${tsID}`)
                .attr("text-anchor", "end")
                .text(formatDate(maxDate))
                .attr("transform", "translate(0," + (-15) + ")")
                .attr("x", xSlider(maxDate))
        }

        function sliderOnDrag(currentValue, xSlider, Profiles, tsID, svg, x_element, xScale, yScale, profileScales) {

            //console.log(`sliderLockStatus ${sliderLockStatus}`);
            //console.log(variableProfile);
            //console.log('profileScales');
            //console.log(profileScales);

            const currentDate = xSlider.invert(currentValue); // User moves slider to specified date
            const sliderLines = []

            // Check if graphing is locked to individual or all
            //
            if (sliderLockStatus) {
                const lockedSliderLines = []

                setIntroTextDate(currentDate);

                // Set slider to current date
                d3.selectAll(`.handle`)
                    .attr("cx", xSlider(currentDate));

                d3.selectAll(`.sliderlabels`)
                    .attr("x", xSlider(currentDate))
                    .text(formatDate(currentDate));

                d3.selectAll(".noData")
                    .style("opacity", "0.0")
                    .text('No data recorded for ');

                for (var i = 0; i < Profiles.length; i++) {
                    // Set specifics for each graph
                    let tsid = Profiles[i].tsid
                    //console.log(`tsid ${tsid}`);
                    
                    const lockedSvg = d3.select("#" + ['svgProfiles', i].join("_"));
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

                        // Individual Graphs
                        d3.selectAll(`.handle_${tsID}`)
                            .attr("cx", xSlider(currentDate));

                        d3.selectAll(`.sliderlabel_${tsID}`)
                            .attr("x", xSlider(currentDate))
                            .text(formatDate(currentDate));

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
        
        const formatDate = d3.timeFormat("%b %d");
        
        // Add text content above panels
        //
        var svgContent = [];
        svgContent.push('<span id="timeseriesIntro"></span>');
        svgContent.push('<span id="timeseriesText"></span>');
        svgContent.push('<ul style="list-style-type:none;">');

        // Add panels
        //
        for (var i = 0; i < TimeSeries.length; i++) {
            var tsID = TimeSeries[i].tsid;
            var myTitle = TimeSeries[i].description;
            //console.log(`TimeSeries -> ${tsID} ${myTitle}`);

            var svgID = ['svgTimeSeries', i].join("_");

            svgContent.push('<li>');
            svgContent.push('<svg id="' + svgID + '" class="svg border-2 border-black shadow mb-3"></svg>');
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
        for (var i = 0; i < TimeSeries.length; i++) {
            var tsID = TimeSeries[i].tsid;
            var svgID = ['svgTimeSeries', i].join("_");
            var myTitle = `${TimeSeries[i].description} [${tsID}]`;
            var myText = textSize(myTitle);
            var fontHeight = myText.height;

            // SVG canvas
            //
            var svg = d3.select("#" + svgID);

            // Check width of title
            //
            var containerWidth = +d3.select("#" + svgID).style('width').slice(0, -2);

            // Add site information
            //
            if (myText.width < containerWidth) {
                var myText = svg.append("text")
                    .attr('x', x_box_min * 0.1)
                    .attr('y', fontHeight * 0.75)
                    .attr('class', 'site_title')
                    .text(myTitle);
            } else {
                var fontHeight = myText.height;
                var fontWidth = myText.width / myTitle.length;
                var myTexts = myTitle.split(/,/);
                var title = "";
                var x_text = x_box_min * 0.1;
                var y_text = fontHeight * 0.75;
                for (var ii = 0; ii < myTexts.length; ii++) {
                    if (([title, myTexts[ii]].join(',').length * fontWidth) > containerWidth) {
                        var myText = svg.append("text")
                            .attr('x', x_text)
                            .attr('y', y_text)
                            .attr('class', 'site_title')
                            .text(title);
                        title = myTexts[ii];
                        x_text = x_box_min * 0.1 + fontWidth * 2.0;
                        y_text += fontHeight * 0.75;
                    } else {
                        if (title.length > 0) { title = [title, myTexts[ii]].join(","); } else { title = myTexts[ii]; }
                    }
                }

                var myText = svg.append("text")
                    .attr('x', x_text)
                    .attr('y', y_text)
                    .attr('class', 'site_title')
                    .text(title);
            }

            // Insert null to break line if missing value occurs
            //
            let tempL     = [];
            let deltaDate = null;
            //console.log(`TimeSeries ${myTitle} ${TimeSeries[i].datapoints.length}`);
            for (let ii = 1; ii < TimeSeries[i].datapoints.length; ii++) {
                currentDate = TimeSeries[i].datapoints[ii].date;
                if(!deltaDate) {
                    lastDate  = TimeSeries[i].datapoints[ii - 1].date;
                    tempCurrent = dayjs(currentDate).format('MMM DD, YYYY HH:mm');
                    tempLast    = dayjs(lastDate).format('MMM DD, YYYY HH:mm');
                    deltaDate = currentDate - lastDate;
                    //console.log(`deltaDate ${deltaDate} for current date ${tempCurrent} to last date ${tempLast}`);
                }
                else {
                    deltaTemp = currentDate - lastDate;
                    if(deltaTemp > deltaDate) {
                        tempCurrent = dayjs(currentDate).format('MMM DD, YYYY HH:mm');
                        tempLast    = dayjs(lastDate).format('MMM DD, YYYY HH:mm');
                        //console.log(`deltaTemp > deltaDate ${deltaTemp} for current date ${tempCurrent} to last date ${tempLast}`);
                        myDateTime = lastDate + deltaTemp;
                        myValue    = null;
                        tempL.push({'date': myDateTime, 'concentration': myValue });
                    }
                }
                lastDate = currentDate;
                tempL.push(TimeSeries[i].datapoints[ii]);
            }
            TimeSeries[i].datapoints = tempL.slice();

            // Set the ranges
            //
            var xScale = d3.scaleTime().range([0, x_axis]);
            var yScale = d3.scaleLinear().range([y_axis, 0]);

            // Define axes
            //
            //var xAxis = d3.axisBottom().tickFormat(formatDate).scale(xScale);
            var xAxis = d3.axisBottom()
                .tickFormat(function(date) {
                    if (d3.timeYear(date) < date) {
                        return d3.timeFormat('%b %d')(date);
                    } else {
                        return d3.timeFormat('%Y')(date);
                    }
                })
                .scale(xScale);
            var yAxis = d3.axisLeft().scale(yScale);

            // Define lines
            //
            var maxValue = d3.max(TimeSeries[i].datapoints, d => d.concentration);
            var minValue = d3.min(TimeSeries[i].datapoints, d => d.concentration);
            var maxDate = lastSeriesDate;
            var minDate = firstSeriesDate;

            // Set the domain of the axes
            //
            xScale.domain([minDate, maxDate]);
            yScale.domain([minValue, maxValue]);

            // Define line
            //
            var line = d3.line()
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
            svg.append("path")
                .datum(TimeSeries[i].datapoints)
                .attr("class", "line")
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .attr("d", line)

            // Show points
            //
            svg.append("g")
                .selectAll("circle")
                .data(TimeSeries[i].datapoints)
                .enter()
                .append("circle")
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .attr("cx", d => xScale(d.date))
                .attr("cy", d => yScale(d.concentration))
                .attr("r", 3)
                .style("opacity", 0)
                .on("mouseover", d => {
                    tooltip
                        .html('Date: ' + formatDate(d.date) + '<br>Value: ' + d.concentration)
                        .style("left", d3.event.pageX + "px")
                        .style("top", d3.event.pageY - 28 + "px")
                        .style("opacity", 1)
                })
                .on("mouseout", () => {
                    tooltip
                        .style("opacity", 0);
                });
            
            // Add the X Axis
            //
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(" + [x_box_min, y_box_max].join(",") + ")")
                .call(xAxis);

            // Add the Y Axis
            //
            svg
                .append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .call(yAxis)
                .append("text")
                .attr("class", "label")
                .attr("y", 6)
                .attr("dy", ".71em")
                .attr("dx", ".71em")
                .style("text-anchor", "beginning")
                .text("Concentration");

            // Add site text to each panel
            //
            var xLabel = x_box_min + x_axis * 0.5;
            var yLabel = y_box_min + y_axis * 0.15;
            var mySite = svg.append("text")
                .attr("class", "siteText")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ")")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text([agency_cd, site_no].join(" "));
            var yLabel = y_box_min + y_axis * 0.25;
            var mySite = svg.append("text")
                .attr("class", "siteText")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ")")
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
        
        const formatDate = d3.timeFormat("%b %d %Y");

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
        for (var i = 0; i < Contours.length; i++) {
            var tsID    = Contours[i].tsid;
            var myTitle = Contours[i].description;

            var svgID = ['svgContours', i].join("_");

            var myText = textSize(myTitle);
            var fontHeight = myText.height;

            // SVG canvas
            //
            var svg = d3.select("#" + svgID);

            // Check width of title
            //
            var containerWidth = +d3.select("#" + svgID).style('width').slice(0, -2);

            // Add site information
            //
            if (myText.width < containerWidth) {
                var myText = svg.append("text")
                    .attr('x', x_box_min * 0.1)
                    .attr('y', fontHeight * 0.75)
                    .attr('class', 'site_title')
                    .text(myTitle);
            } else {
                var fontHeight = myText.height;
                var fontWidth = myText.width / myTitle.length;
                var myTexts = myTitle.split(/,/);
                var title = "";
                var x_text = x_box_min * 0.1;
                var y_text = fontHeight * 0.75;
                for (var ii = 0; ii < myTexts.length; ii++) {
                    if (([title, myTexts[ii]].join(',').length * fontWidth) > containerWidth) {
                        var myText = svg.append("text")
                            .attr('x', x_text)
                            .attr('y', y_text)
                            .attr('class', 'site_title')
                            .text(title);
                        title = myTexts[ii];
                        x_text = x_box_min * 0.1 + fontWidth * 2.0;
                        y_text += fontHeight * 0.75;
                    } else {
                        if (title.length > 0) { title = [title, myTexts[ii]].join(","); } else { title = myTexts[ii]; }
                    }
                }

                var myText = svg.append("text")
                    .attr('x', x_text)
                    .attr('y', y_text)
                    .attr('class', 'site_title')
                    .text(title);
            }

            // Set the ranges
            //
            var xScale = d3.scaleTime().range([0, x_axis]);
            var yScale = d3.scaleLinear().range([y_axis, 0]);
            var y2Scale = d3.scaleLinear().range([y_axis, 0]);

            // Define axes
            //
            //var xAxis = d3.axisBottom().tickFormat(formatDate).scale(xScale);
            var xAxis = d3.axisBottom()
                .tickFormat(function(date) {
                    if (d3.timeYear(date) < date) {
                        return d3.timeFormat('%b %d')(date);
                    } else {
                        return d3.timeFormat('%Y')(date);
                    }
                })
                .scale(xScale);
            var yAxis = d3.axisLeft().scale(yScale);
            var y2Axis = d3.axisRight().scale(y2Scale);

            // Process data
            //
            let pointData = []
            for (var ii = 0; ii < Contours[i].datapoints.length; ii++) {
                var depth = Contours[i].datapoints[ii].depth;
                var value = Contours[i].datapoints[ii].concentration;
                var date  = Contours[i].datapoints[ii].date;
                Contours[i].datapoints[ii] = { 'date': date, 'depth': +depth, 'value': value };
                if (value) { pointData.push({ 'date': +date, 'depth': +depth, 'value': value }); }
            }

            // Define extent
            //
            var maxXaxis = lastDropDate;
            var minXaxis = firstDropDate;
            var maxYaxis = d3.max(pointData, d => d.depth);
            var minYaxis = d3.min(pointData, d => d.depth);
            var maxValue = d3.max(pointData, d => d.value);
            var minValue = d3.min(pointData, d => d.value);

            // Set the domain of the axes
            //
            xScale.domain([minXaxis, maxXaxis]);
            yScale.domain([maxYaxis, minYaxis]);

            // Define secondary Y axis
            //
            var maxY2axis = d3.max(pointData, d => d.depth * 3.28084);
            var minY2axis = d3.min(pointData, d => d.depth * 3.28084);
            y2Scale.domain([maxY2axis, minY2axis]);

            // Prepare
            //
            returnL = get_max_min(minValue, maxValue);
            minValue = returnL[0]
            maxValue = returnL[1]
            interval = returnL[2]
            var numberTics = (maxValue - minValue) / interval;

            // Prepare a color palette for points
            //
            var color = d3.scaleSequential(d3.interpolateCool)
            color.domain([maxValue, minValue])

            // Show points
            //
            svg.append("g")
                .selectAll("circle")
                .data(pointData)
                .enter()
                .append("circle")
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .attr("cx", d => xScale(d.date))
                .attr("cy", d => yScale(d.depth))
                .attr("r", 3)
                .attr("stroke", d => color(d.value))
                .style("fill", d => color(d.value))
                .on('mouseover',  d => {
                    tooltip
                        .html('Date: ' + formatDate(d.date) + '<br>Depth: ' + d.depth + '<br>Value: ' + d.value)
                        .style("left", d3.event.pageX + "px")
                        .style("top", d3.event.pageY - 28 + "px")
                        .style("opacity", 1)
                })
                .on("mouseout", () => {
                    tooltip
                        .style("opacity", 0);
                });

            // Add the X Axis
            //
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(" + [x_box_min, y_box_max].join(",") + ")")
                .call(xAxis);

            // Add the Y Axis
            //
            svg
                .append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + [x_box_min, y_box_min].join(",") + ")")
                .call(yAxis)
                .append("text")
                .attr("class", "label")
                .attr("y", 6)
                .attr("dy", ".71em")
                .attr("dx", ".71em")
                .style("text-anchor", "beginning")
                .text("Concentration");

            // Add the Y Axis label
            //
            var xLabel = x_box_min * 0.5;
            var yLabel = y_box_min + y_axis * 0.5;
            var myText = svg.append("text")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ") rotate(-90)")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .text("Depth, in meters");

            // Add secondary Y Axis
            //
            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + [x_box_max, y_box_min].join(",") + ")")
                .call(y2Axis)

            var xLabel = x_box_max + x_box_min * 0.5;
            var yLabel = y_box_min + y_axis * 0.5;
            var myText = svg.append("text")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ") rotate(90)")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .text("Depth, in feet");

            // Add site text to each panel
            //
            var xLabel = x_box_min + x_axis * 0.5;
            var yLabel = y_box_min + y_axis * 0.15;
            var mySite = svg.append("text")
                .attr("class", "siteText")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ")")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text([agency_cd, site_no].join(" "));
            var yLabel = y_box_min + y_axis * 0.25;
            var mySite = svg.append("text")
                .attr("class", "siteText")
                .attr("transform", "translate(" + [xLabel, yLabel].join(", ") + ")")
                .attr("font-weight", "bold")
                .style("text-anchor", "middle")
                .style("opacity", "0.2")
                .text(station_nm);

            // Add the legend now
            //
            // https://bl.ocks.org/starcalibre/6cccfa843ed254aa0a0d
            //
            var legendFullHeight = y_axis;
            var legendFullWidth = 50;

            var legendMargin = { top: 20, bottom: 20, left: 5, right: 20 };

            // Use same margins as main plot
            //
            var legendWidth = legendFullWidth - legendMargin.left - legendMargin.right;
            var legendHeight = legendFullHeight - legendMargin.top - legendMargin.bottom;
            var legendHeight = y_axis;

            var legend_x = x_box_max + x_box_min * 0.5 + legendMargin.right;
            var legend_y = y_box_min;

            var legendSvg = d3.select("#" + svgID)
                .attr('width', legendFullWidth)
                .attr('height', legendFullHeight)
                .append('g')
                .attr('transform', 'translate(' + legend_x + ',' + legend_y + ')');

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
                var hexColor = d3.interpolateCool(t)
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
                .style('fill', 'url(#gradient)');

            // Create a scale and axis for the legend
            //
            var legendScale = d3.scaleLinear()
                .domain([minValue, maxValue])
                .range([legendHeight, 0]);

            var legendAxis = d3.axisRight()
                .scale(legendScale)
                .ticks(5);

            legendSvg.append("g")
                .attr("class", "legend axis")
                .attr("transform", "translate(" + legendWidth + ", 0)")
                .call(legendAxis);

        }

        contourCharts = true;
        
        fadeModal(2000);
    }

    // No information
    //
    function noData(svgContainer) {
        // No log label
        //
        label_txt = "No Time Series Information";
        var label = "translate("
        label += [(x_box_max + x_box_min) * 0.5, +(y_box_max + y_box_min) * 0.5].join(", ");
        label += ") rotate(-90)";

        var myText = svgContainer.append("text")
            .attr("transform", label)
            .attr('class', 'y_axis_label')
            .text(label_txt);
    }

    function textSize(text) {
        if (!d3) return;
        var container = d3.select('body').append('svg');
        container.append('text').attr('x', -99999).attr('y', -99999).text(text);
        var size = container.node().getBBox();
        container.remove();
        return { width: size.width, height: size.height };
    }
}
