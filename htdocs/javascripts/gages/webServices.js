/* NwisWeb Javascript plotting library for jQuery and flot.
 *
 * A JavaScript library to retrieve NwisWeb information
 * such as the discrete groundwater measurements for a site(s).
 *
 $Id: /var/www/html/habs/javascripts/gages/webServices.js, v 4.03 2025/10/11 18:14:28 llorzol Exp $
 $Revision: 4.03 $
 $Date: 2025/10/11 18:14:28 $
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

var indexField = "site_no";

// Parse Site information output from site data service in RDB format
//
function parseMonitoringLocationJson(data) {
    myLogger.info("parseMonitoringLocationJson");
    myLogger.debug(data);

    let mySiteInfo = null;

    // Parse data
    //
    if(data.properties) {
        mySiteInfo = data.properties;
        mySiteInfo.dec_coord_datum_cd = data.properties.original_horizontal_datum_name;
    }
    if(data.geometry) {
        mySiteInfo.dec_long_va = data.geometry.coordinates[0];
        mySiteInfo.dec_lat_va = data.geometry.coordinates[1];
    }

    return mySiteInfo;

}

// Parse time-series meta information
//
function parseTimeSeriesJson(data) {
    myLogger.info("parseTimeSeriesJson");
    myLogger.debug(data);

    let myParameterData = {};
    
    let profilesDescriptionRe   = /Variable Depth Profile Data/i;
    let timeseriesDescriptionRe = /1 Meter Below The Surface/i;
    let depthDescriptionRe      = /^Depth of sensor below water surface/i;

    // Parse data
    //
    if(data.numberReturned) {
        if(data.numberReturned > 0) {
            for(let i = 0; i < data.numberReturned; i++) {

                // Features
                //
                let myRecords = data.features[i];
                //myLogger.info(myRecords);
                
                let myGuid = data.features[i].id;

                myParameterData[myGuid] = {};
                myParameterData[myGuid].parameter   = data.features[i].properties.parameter_code;
                myParameterData[myGuid].unit_of_measure = data.features[i].properties.unit_of_measure;

                myParameterData[myGuid].begin_date = data.features[i].properties.begin.substring(0, 10);
                myParameterData[myGuid].end_date   = data.features[i].properties.end.substring(0, 10);

                // Identify depth id and profile and timerseries ids
                //
                let seriesType = null
                let parameter_description  = data.features[i].properties.parameter_description;
                let sublocation_identifier = data.features[i].properties.sublocation_identifier;
                let web_description        = data.features[i].properties.web_description;
                //myLogger.info(`${parameter_description} ${sublocation_identifier} ${web_description} `);
                
                if(profilesDescriptionRe.test(sublocation_identifier) && depthDescriptionRe.test(parameter_description)) {
                    seriesType = 'depth'
                }
                else if (profilesDescriptionRe.test(sublocation_identifier)) {
                    seriesType = 'profile'
                }
                else if (timeseriesDescriptionRe.test(web_description)) {
                    seriesType = 'timeseries'
                }
                myParameterData[myGuid].parameter_description = parameter_description;
                myParameterData[myGuid].sublocation_identifier = sublocation_identifier;
                myParameterData[myGuid].web_description = web_description;
                myParameterData[myGuid].seriesType = seriesType;

                // Thresholds
                //
                let myThresholds = myRecords.properties.thresholds;
                for(let ii = 0; ii < myThresholds.length; ii++) {
                    let myName   = myThresholds[ii].Name
                    let myDescription   = myThresholds[ii].Description
                    let myColor   = myThresholds[ii].DisplayColor
                    let Type = myThresholds[ii].Type
                    let ReferenceValue = null
                    
                    let Periods   = myThresholds[ii].Periods
                    for(let iii = 0; iii < Periods.length; iii++) {
                        ReferenceValue = Periods[iii].ReferenceValue
                        //let StartTime = Periods[i].StartTime
                        //let EndTime   = Periods[i].EndTime
                        //let AppliedTime = Periods[i].AppliedTime
                    }

                    myParameterData[myGuid][Type] = ReferenceValue;
                }
            }
        }
    }

    return myParameterData;

}

// Parse IV measurements output from iv data service in RDB format
//
function parseIvRDB(dataRDB, myParameters) {
    myLogger.info("parseIvRDB");

    let myParameterData = {};
 
    // Split the data into lines
    //
    let fileLines = dataRDB.split(/\r?\n/);

    // Filter out comment header lines
    //
    let commentLines = fileLines.filter(line => line.startsWith("#") && line.length > 3);
    myLogger.debug('commentLines');
    myLogger.debug(commentLines);

    // Parse from header explanations
    //
    let myParameterInfo = /^# Data provided for site/;
    let myAgingInfo = /^# Data-value qualification codes included in this output/;
    let noDataInfo   = /No sites found matching all criteria/;
    
    let profilesDescriptionRe   = /Variable Depth Profile Data/;
    let timeseriesDescriptionRe = /\[1 Meter Below The Surface\]/;
    let depthDescriptionRe      = /^Depth of sensor below water surface/;

    let profileFields = [];
    let timeseriesFields = [];
    let depthField;

    // Parse qualifiers from header lines
    //
    while(commentLines.length > 0) {
        
        let fileLine = commentLines.shift().trim();

        // No site information
        //
        if (noDataInfo.test(fileLine)) {
            // myLogger.info("mySiteData");
            // myLogger.info(mySiteData);

            return { "message": "No sites found matching all criteria" };
        }

        // Header portion for parameter information
        //
        else if (myParameterInfo.test(fileLine)) {
            //myLogger.info("myParameterInfo");

            while (commentLines.length > 0) {
                fileLine = jQuery.trim(commentLines.shift());

                if (myAgingInfo.test(fileLine)) { break; }

                let Fields = fileLine.split(/\s+/);
                let blank = Fields.shift();
                let ts_id = Fields.shift();
                let parameter_cd = Fields.shift();
                let description = Fields.join(" ");
                let seriesType = null

                // Identify depth ts_id and profile and timerseries ts_ids
                //
                if(profilesDescriptionRe.test(description) && depthDescriptionRe.test(description)) {
                    depthField = `${ts_id}_${parameter_cd}`;
                    seriesType = 'depth'
                }
                else if (profilesDescriptionRe.test(description)) {
                    profileFields.push(`${ts_id}_${parameter_cd}`);
                    seriesType = 'profile'
                }
                else if (timeseriesDescriptionRe.test(description) && !depthDescriptionRe.test(description)) {
                    timeseriesFields.push(`${ts_id}_${parameter_cd}`);
                    seriesType = 'timeseries'
                }

                myParameterData[ts_id] = {};
                myParameterData[ts_id].parameter = parameter_cd;
                myParameterData[ts_id].description = description;
                myParameterData[ts_id].seriesType = seriesType;
            }
            
            myLogger.info("myParameterData");
            myLogger.info(myParameterData);
            myLogger.info(`depthField ${depthField}`);
            myLogger.info(`profileFields \n\t ${profileFields.join(' \n\t')}\n`);
            myLogger.info(`timeseriesFields \n\t ${timeseriesFields.join(' \n\t')}\n`);
       }
    }
    
    // Filter out comment lines (assuming they start with '#')
    //
    let dataLines = fileLines.filter(line => !line.startsWith("#"));

    // Remove format line
    //
    dataLines.splice(1, 1);
     
    // Data lines
    //
    let myData = d3.tsvParse(dataLines.join('\n'))
    myLogger.info('IV POR');
    myLogger.debug(myData);
    let Fields = myData.columns;
    myLogger.debug(Fields);

    // build data fields
    //
    let myRe = /^\d+_\d+$/    
    let ivFields = Fields.filter(line => myRe.test(line));
    myLogger.info(`ivFields \n\t ${ivFields.join(' \n\t')}\n`);
    let ymdhmOptions = { timeZone: timeZone,
                         timeZoneName: "short",
                         year: "numeric",
                         month: "short",
                         day: "numeric",
                         hour: '2-digit',
                         minute: '2-digit'
                       };

    // Loop through data
    //
    let myIvData = {};
    for(let i = 0; i < myData.length; i++) {
        let myRecord = myData[i];
        let datetime = myRecord.datetime.trim().replace(' ','T');
        let tz_cd    = myRecord.tz_cd
        let myDate   = Date.parse(datetime);
        //let myDate   = Date.parse(datetime).toLocaleString("en-US", { timeZone: timeZone });
        //let myDate   = new Intl.DateTimeFormat("en-US", ymdhmOptions).format(date);
        let myDepth  = myRecord[depthField]
        
        for(let myIvField of profileFields) {
            if(myRecord[myIvField]) {
                let [ts_id, myCode] = myIvField.split('_');
                if(!myIvData[ts_id]) { myIvData[ts_id] = []; }
                let myColumn  = `${myIvField}_cd`
                let qualifier = 'Provisional'
                if(myRecord[myColumn]) {
                    if(myRecord[myColumn].includes('A')) {
                        qualifier = 'Approved'
                    }
                }
                myIvData[ts_id].push({ 'date': myDate, 'concentration': +myRecord[myIvField], 'depth': +myDepth, 'qualifier': qualifier})
                myLogger.debug(`myIvData ${myIvField} ${myRecord[myIvField]} ${myRecord[myColumn]} ${qualifier}`);
            }
        }
        
        for(let myIvField of timeseriesFields) {
            if(myRecord[myIvField]) {
                let [ts_id, myCode] = myIvField.split('_');
                if(!myIvData[ts_id]) { myIvData[ts_id] = []; }
                let myColumn  = `${myIvField}_cd`
                let qualifier = 'Provisional'
                if(myRecord[myColumn]) {
                    if(myRecord[myColumn].includes('A')) {
                        qualifier = 'Approved'
                    }
                }
                myIvData[ts_id].push({ 'date': myDate, 'concentration': +myRecord[myIvField], 'depth': +myDepth, 'qualifier': qualifier})
                myLogger.debug(`myIvData ${myIvField} ${myRecord[myIvField]} ${myRecord[myColumn]} ${qualifier}`);
            }
        }
    }
    myLogger.info("myIvData");
    myLogger.info(myIvData);

    return [myIvData, myParameterData];

}

// Parse IV parameter descriptions
//
function parseParameterRDB(dataRDB) {
    myLogger.info("parseParameterRDB");

    let myParameterData = {};

    // Split the data into lines
    //
    let fileLines = dataRDB.split(/\r?\n/);

    // Filter out comment header lines
    //
    let commentLines = fileLines.filter(line => line.startsWith("#") && line.length > 3);
    myLogger.debug('commentLines');
    myLogger.debug(commentLines);

    // Parse from header explanations
    //
    let myParameterInfo = /^# Data provided for site/;
    let myAgingInfo = /^# Data-value qualification codes included in this output/;
    let noDataInfo   = /No sites found matching all criteria/;
    
    let profilesDescriptionRe   = /Variable Depth Profile Data/;
    let timeseriesDescriptionRe = /\[1 Meter Below The Surface\]/;
    let depthDescriptionRe      = /^Depth of sensor below water surface/;

    // Parse parameter information from header lines
    //
    while(commentLines.length > 0) {
        
        let fileLine = commentLines.shift().trim();

        // No site information
        //
        if (noDataInfo.test(fileLine)) {
            // myLogger.info("mySiteData");
            // myLogger.info(mySiteData);

            return myParameterData;
        }

        // Header portion for parameter information
        //
        else if (myParameterInfo.test(fileLine)) {
            //myLogger.info("myParameterInfo");

            while (commentLines.length > 0) {
                fileLine = jQuery.trim(commentLines.shift());

                if (myAgingInfo.test(fileLine)) { break; }

                let Fields = fileLine.split(/\s+/);
                let blank = Fields.shift();
                let ts_id = Fields.shift();
                let parameter_cd = Fields.shift();
                let description = Fields.join(" ");
                let seriesType = null

                // Identify depth ts_id and profile and timerseries ts_ids
                //
                if(profilesDescriptionRe.test(description) && depthDescriptionRe.test(description)) {
                    seriesType = 'depth'
                }
                else if (depthDescriptionRe.test(description)) {
                    seriesType = 'profile'
                }
                else if (timeseriesDescriptionRe.test(description) && !depthDescriptionRe.test(description)) {
                    seriesType = 'timeseries'
                }

                myParameterData[ts_id] = {};
                myParameterData[ts_id].parameter = parameter_cd;
                myParameterData[ts_id].description = description;
                myParameterData[ts_id].seriesType = seriesType;
            }
            
            myLogger.debug("myParameterData");
            myLogger.debug(myParameterData);
        }
    }

    return myParameterData;

}

// Parse Site information output from site data service in RDB format
//
function parseSitePorRDB(dataRDB) {
    myLogger.info("parseSitePorRDB");
    myLogger.debug(dataRDB);

    let myPorData = {};
    let mySiteInfo = null;
    let myFields = {};
 
    // Split the data into lines
    //
    let fileLines = dataRDB.split(/\r?\n/);

    // Filter out comment header lines
    //
    let commentLines = fileLines.filter(line => line.startsWith("#") && line.length > 3);
    myLogger.debug('commentLines');
    myLogger.debug(commentLines);

    // Parse from header explanations
    //
    let myFieldsInfo = /^# The following selected fields are included in this output/;
    let noDataInfo   = /No sites found matching all criteria/;

    // Parse qualifiers from header lines
    //
    while(commentLines.length > 0) {
        
        let fileLine = commentLines.shift().trim();

        // No site information
        //
        if (noDataInfo.test(fileLine)) {
            // myLogger.info("mySiteData");
            // myLogger.info(mySiteData);

            return { "message": "No sites found matching all criteria" };
        }
 
        // Header portion for site status information
        //
        else if (myFieldsInfo.test(fileLine)) {

            while (commentLines.length > 0) {
                let fileLine = commentLines.shift().trim();
                fileLine = fileLine.replace(/^#\s+/,'')

                let [myField, myDescription] = fileLine.split('--')
                myField = myField.trim().toLowerCase()
                myDescription = myDescription.trim()
                if (!myFields[myField]) {
                    myFields[myField] = myDescription
                }
            }
        }
    }
    myLogger.debug('myFields');
    myLogger.debug(myFields);

    // Filter out comment lines (assuming they start with '#')
    //
    let dataLines = fileLines.filter(line => !line.startsWith("#"));

    // Remove format line
    //
    dataLines.splice(1, 1);
      
    // Data lines
    //
    let myData = d3.tsvParse(dataLines.join('\n'))
    myLogger.info('IV POR');
    myLogger.debug(myData);
    let Fields = myData.columns;
    myLogger.debug(Fields);

    // Loop through data
    //
    for(let i = 0; i < myData.length; i++) {
        let myRecord = myData[i];

        let ts_id        = myRecord.ts_id
        let parm_cd      = myRecord.parm_cd
        let count_nu     = myRecord.count_nu
        let data_type_cd = myRecord.data_type_cd
        let begin_date   = myRecord.begin_date
        let end_date     = myRecord.end_date
        let loc_web_ds   = myRecord.loc_web_ds

        // Create hash
        //
        if (!mySiteInfo) {
            mySiteInfo = {};
            for(let ii = 0; ii < myData.length; ii++) {
                mySiteInfo[Fields[ii]] = myRecord[Fields[ii]];
            }
        }

        if (!myPorData[ts_id]) { myPorData[ts_id] = {}; }

        myPorData[ts_id] = {
            'parm_cd': parm_cd,
            'loc_web_ds': loc_web_ds,
            'begin_date': begin_date,
            'end_date': end_date,
            'count_nu': count_nu
        };
    }
         myLogger.info('Done');
         myLogger.info(mySiteInfo);
         myLogger.info(myPorData);
         myLogger.info(myFields);

    return [mySiteInfo, myPorData, myFields];

}

// Water-Quality measurements
//
var wqFields = [
    'agency_cd',
    'site_no',
    'sample_dt',
    'sample_tm',
    'sample_end_dt',
    'sample_end_tm',
    'sample_start_time_datum_cd',
    'tm_datum_rlbty_cd',
    'coll_ent_cd',
    'medium_cd',
    'tu_id',
    'body_part_id',
    'parm_cd',
    'remark_cd',
    'result_va',
    'val_qual_tx',
    'meth_cd',
    'dqi_cd',
    'rpt_lev_va',
    'rpt_lev_cd',
    'lab_std_va',
    'anl_ent_cd'
];

// Parse Water-Quality measurements output from NwisWeb request in RDB format
//
function parseWqRDB(dataRDB) {
    myLogger.info("parseWqRDB");
    
    var myData = {};
    var myParameters = {};
    var coll_ent_cds = {};
    var remark_cds = {};
    var val_qual_txs = {};
    var meth_cds = {};
    var dqi_cds = {};
    var rpt_lev_cds = {};

    var Fields = [];

    // Parse from header explanations
    //
    var myParameterInfo = /^# To view additional data-quality attributes, output the results using these options/;
    var myPcodesInfo = /^#\s+P\d{5}\s+/;
    var myCollectionInfo = /^# Description of coll_ent_cd and anl_ent_cd/;
    var myRemarkInfo = /^# Description of remark_cd/;
    var myQualAcyInfo = /^# Description of val_qual_tx/;
    var myMethodInfo = /^# Description of meth_cd/;
    var myDqiInfo = /^# Description of dqi_cd/;
    var myReportInfo = /^# Description of rpt_lev_cd:/;

    // Parse in lines
    //
    var fileLines = dataRDB.split(lineRe);

    // Column names on header line
    //
    while (fileLines.length > 0) {
        var fileLine = jQuery.trim(fileLines.shift());
        if (fileLine.length < 1) {
            continue;
        }
        if (!myRe.test(fileLine)) {
            break;
        }

        // Header portion for site status information
        //
        if (myParameterInfo.test(fileLine)) {
            fileLines.shift(); // skip line
            fileLines.shift(); // skip line
            fileLines.shift(); // skip line
            //myLogger.info("Parameter line ");

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }
                if (myPcodesInfo.test(fileLine)) {
                    var Fields = fileLine.split(/\s+/);
                    var parameter_cd = Fields[1];

                    // Remove parameter codes in unParameterCodes [No need to graph these parameter codes]
                    //
                    if (jQuery.inArray(parameter_cd, unParameterCodes) < 0)
                    {
                        myParameters[parameter_cd] = {};
                        myParameters[parameter_cd] = Fields.slice(3).join(" ");
                    }
                }
            }
        }

        // Description of coll_ent_cd in header portion
        //
        if (myCollectionInfo.test(fileLine)) {
            //fileLines.shift(); // skip blank line

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }

                var Fields = fileLine.split(/\s+/);
                var coll_ent_cd = Fields[1];
                coll_ent_cds[coll_ent_cd] = {};
                coll_ent_cds[coll_ent_cd] = Fields.slice(3).join(" ");
            }
        }

        // Description of remark_cd in header portion
        //
        if (myRemarkInfo.test(fileLine)) {
            //fileLines.shift(); // skip blank line

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }

                var Fields = fileLine.split(/\s+/);
                var remark_cd = Fields[1];
                remark_cds[remark_cd] = {};
                remark_cds[remark_cd] = Fields.slice(3).join(" ");
            }
        }

        // Description of val_qual_tx in header portion
        //
        if (myQualAcyInfo.test(fileLine)) {
            //fileLines.shift(); // skip blank line

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }

                var Fields = fileLine.split(/\s+/);
                var val_qual_tx = Fields[1];
                val_qual_txs[val_qual_tx] = {};
                val_qual_txs[val_qual_tx] = Fields.slice(3).join(" ");
            }
        }

        // Description of meth_cd in header portion
        //
        if (myMethodInfo.test(fileLine)) {
            fileLines.shift(); // skip blank line

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }

                var Fields = fileLine.split(/\s+/);
                var meth_cd = Fields[1];
                meth_cds[meth_cd] = {};
                meth_cds[meth_cd] = Fields.slice(3).join(" ");
            }
        }

        // Description of dqi_cd in header portion
        //
        if (myDqiInfo.test(fileLine)) {
            fileLines.shift(); // skip blank line

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }

                var Fields = fileLine.split(/\s+/);
                var dqi_cd = Fields[1];
                dqi_cds[dqi_cd] = {};
                dqi_cds[dqi_cd] = Fields.slice(3).join(" ");
            }
        }

        // Description of rpt_lev_cd in header portion
        //
        if (myReportInfo.test(fileLine)) {
            fileLines.shift(); // skip blank line

            while (fileLines.length > 0) {
                fileLine = jQuery.trim(fileLines.shift());
                if (myRe.test(fileLine)) {
                    if (fileLine.length < 5) { break; }
                }

                var Fields = fileLine.split(/\s+/);
                var rpt_lev_cd = Fields[1];
                rpt_lev_cds[rpt_lev_cd] = {};
                rpt_lev_cds[rpt_lev_cd] = Fields.slice(3).join(" ");
            }
        }
    }

    // Check index column name in file
    //
    var Fields = fileLine.split(delimiter);
    if (jQuery.inArray(indexField, Fields) < 0) {
        var message = "Header line of column names does not contain " + indexField + " column\n";
        message += "Header line contains " + Fields.join(", ");
        message_dialog("Warning", message);
        close_dialog();
        return false;
    }

    // Format line in header portion [skip]
    //
    var fileLine = jQuery.trim(fileLines.shift());

    // Available parameter codes
    //
    var myParamsL = jQuery.map(myParameters, function(element,index) {return index});

    // Data lines
    //
    var count = 0;
    while (fileLines.length > 0) {
        fileLine = jQuery.trim(fileLines.shift());
        if (myRe.test(fileLine)) {
            continue;
        }
        if (fileLine.length > 1) {
            var Values  = fileLine.split(delimiter);
            var site_no = Values[jQuery.inArray(indexField, Fields)];

            // Key does not exist [First time seen; create it]
            //
            if (!myData[site_no]) {
                myData[site_no] = [];
                count = 0;
            }

            // Build data structure
            //
            if (!myData[site_no][count]) { myData[site_no][count] = {}; }
            
            myData[site_no][count].sample_dt = Values[jQuery.inArray('sample_dt', Fields)];
            myData[site_no][count].sample_tm = Values[jQuery.inArray('sample_tm', Fields)];
            myData[site_no][count].sample_start_time_datum_cd = Values[jQuery.inArray('sample_start_time_datum_cd', Fields)];
            
            for (var i = 0; i < myParamsL.length; i++) {
                var Value = Values[jQuery.inArray(myParamsL[i].toLowerCase(), Fields)];
                //myLogger.info("Parameter " + myParamsL[i] + "--> " + Value);
                if (!Value) { Value = ""; }
                myData[site_no][count][myParamsL[i]] = Value;
            }
            count++;
        }
    }

    return {
        "WaterQuality": myData,
        "ParameterCodes": myParameters,
        "coll_ent_cds": coll_ent_cds,
        "RemarkCodes": remark_cds,
        "val_qual_txs": val_qual_txs,
        "meth_cds": meth_cds,
        "dqi_cds": dqi_cds,
        "rpt_lev_cds": rpt_lev_cds
    };

}
