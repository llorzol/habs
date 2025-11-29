/* Javascript library for checking URL arguments.
 *
 * Main is a JavaScript library to graph NwisWeb well construction information
 * for a site(s).
 *
 $Id: /var/www/html/habs/javascripts/gages/urlArguments.js, v 2.04 2024/06/03 19:37:41 llorzol Exp $
 $Revision: 2.04 $
 $Date: 2024/06/03 19:37:41 $
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
let fadeTime = 8000;

function checkSiteId(site_id) {

  var message = "Incorrectly formatted USGS site number or OWRD well log ID or CDWR well number: ";
  message    += "You must use the USGS station numbers, which are a number ";
  message    += "from 8 to 15 digits long. ";
  message    += "You must use the OWRD well log ID, which has a four-character county abbrevation ";
  message    += "along with from 1 to 7 digit well number. ";
  message    += "You must use the CDWR well numbers, which are 18-character string well number. ";
                
    if(!site_id)
      {
        openModal(message);
        fadeModal(fadeTime)
        return null;
      }
                
    site_id  = site_id.trim();

    // Test for USGS site number
    //
    var myRe = /^(\d{8,15})$/g;
    if(myRe.test(site_id))
      {
        return site_id;
      }

    // Test for OWRD well log ID
    //
    var myRe = /^([a-z]{4}){1}\s*(\d+)$/i;
    if(myRe.test(site_id))
      {
        var countyNam  = site_id.substring(0,4).toUpperCase();
        var wellId     = site_id.substring(4).trim();
        var site_id    = countyNam + ('0000000' + wellId).slice(-7);
        return site_id;
      }
                   
    // Test for CDWR well number
    //
    var myRe = /^([a-z0-9]{18})$/i;
    if(myRe.test(site_id))
      {
        return site_id;
      }
                   
    // Message
    //
    openModal(message);
    fadeModal(fadeTime)
                   
    // Return
    //
    return null;
}

function checkSiteId2(site) {

    if(!site)
      {
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }
    site  = site.trim();
    var myRe = /^[a-z0-9]+$/i;
    if(!myRe.test(site))
      {
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }

    return site;
}

function checkSiteNo(site_no) {

    if(!site_no)
      {
        var message = "Incorrectly formatted USGS site number: ";
        message    += "You must use the USGS station numbers, which are a number ";
        message    += "from 8 to 15 digits long (example 433152121281301). ";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }
    site_no  = site_no.trim();
    var myRe = /^\d{8,15}$/;
    if(!myRe.test(site_no))
      {
        var message = "Incorrectly formatted USGS site number: ";
        message    += "You must use the USGS station numbers, which are a number ";
        message    += "from 8 to 15 digits long (example 433152121281301). ";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }

    return site_no;
}

function checkCoopSiteNo(coop_site_no) {

    if(!coop_site_no)
      {
        var message = "Incorrectly formatted OWRD well log ID: ";
        message    += "You must use the OWRD well log ID, which has a four-character county abbrevation ";
        message    += "along with from 1 to 7 padded digit well number.";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }
    coop_site_no = coop_site_no.trim();
    var myRe = /^([a-z]{4})(\d{7})$/i;
    if(!myRe.test(coop_site_no))
      {
        var message = "Incorrectly formatted OWRD well log ID: ";
        message    += "You must use the OWRD well log ID, which has a four-character county abbrevation ";
        message    += "along with from 1 to 7 padded digit well number.";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }

    return coop_site_no;
}

function checkProject(project) {
    project       = project.trim();
    var myProject = /^[A-Za-z0-9_]+$/;
    if(!myProject.test(project))
      {
        var message = "Incorrectly formatted USGS project name";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }

    return project;
}

function checkNumber(UserNumber) {
    if(!Number(UserNumber))
      {
        var message = "Incorrectly formatted number";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }

    return true;
}

function checkDate(UserDate) {
    UserDate   = UserDate.trim();
    var myDate = /^\d{4}-\d{2}-\d{2}$/;
    if(!myDate.test(UserDate))
      {
        var message = "Incorrectly formatted date YYYY-MM-DD";
        openModal(message);
        fadeModal(fadeTime)
        return false;
      }

    return true;
}
