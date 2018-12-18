// ==UserScript==
// @name         grepodata city indexer 04h4u8yu
// @namespace    grepodata
// @version      3.02
// @author       grepodata.com
// @updateURL    https://api.grepodata.com/userscript/cityindexer_709c966982feb61f5797e8b642bb1a7a.user.js
// @downloadURL	 https://api.grepodata.com/userscript/cityindexer_709c966982feb61f5797e8b642bb1a7a.user.js
// @description  The grepodata city indexer script automatically collects enemy reports from your alliance forum and adds them to your unique enemy city index.
// @include      http://nl63.grepolis.com/game/*
// @include      https://nl63.grepolis.com/game/*
// @include      https://grepodata.com*
// @exclude      view-source://*
// @icon         https://grepodata.com/assets/images/grepodata_icon.ico
// @copyright	   2016+, grepodata
// ==/UserScript==

let gd_version = '3.02';
let index_key = "04h4u8yu";
let index_hash = "709c966982feb61f5797e8b642bb1a7a";
let gd_w = unsafeWindow || window, $ = gd_w.jQuery || jQuery;

function Translate() {
  this.nl = {ADD:'Indexeren',SEND:'bezig..',ADDED:'Geindexeerd',MANUAL:'handmatig',NEVER:'nooit',AND:'en',VIEW:'Intel bekijken',CHECK_UPDATE:'Controleer op updates',ABOUT:'Deze tool verzamelt informatie over vijandige steden in een handig overzicht. Rapporten kunnen geindexeerd worden in een unieke index die gedeeld kan worden met alliantiegenoten',INDEX_LIST:'Je draagt momenteel bij aan de volgende indexen',COUNT_1:'Je hebt al ',COUNT_2:' rapporten verzameld in deze sessie',COLLECT_INBOX_1:'Verzamel intel uit mijn ',COLLECT_INBOX_2:'rapporten inbox',COLLECT_FORUM:'alliantie forum',COLLECT_MESSAGE:'berichten inbox'};
  this.en = {ADD:'Index',SEND:'sending..',ADDED:'Indexed',MANUAL:'manual',NEVER:'never',AND:'and',VIEW:'View enemy city index',CHECK_UPDATE:'Check for updates',ABOUT:'This tool allows you to easily collects enemy city intelligence and add them to your very own private index that can be shared with your alliance',INDEX_LIST:'You are currently contributing intel to the following indexes',COUNT_1:'You have contributed ',COUNT_2:' reports in this session',COLLECT_INBOX_1:'Collect enemy intel from my ',COLLECT_INBOX_2:'reports inbox',COLLECT_FORUM:'alliance forum',COLLECT_MESSAGE:'message inbox'};
  this.get = function(field) {
    switch(Game.locale_lang.substring(0, 2)) {
      case 'nl':
        return this.nl[field];
        break;
      default:
        return this.en[field];
    }
  }
}
let lang = new Translate();

// report info is converted to a 32 bit hash to be used as unique id
String.prototype.report_hash = function() {
  let hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

// Add the given forum report to the index
let reportsFoundForum=[];
function addToIndexFromForum(reportId, reportElement, reportPoster, reportHash) {
  let reportJson = JSON.parse(mapDOM(reportElement, true));
  let reportText = reportElement.innerText;

  let data = {
    'key': gd_w.gdIndexScript,
    'type': 'default',
    'report_hash': reportHash || '',
    'report_text': reportText,
    'report_json': reportJson,
    'script_version': gd_version,
    'report_poster': reportPoster
  };

  if (gd_settings.forum === 'manual') {
    let repBtn = $('#gd_index_f_txt_' + reportId).get(0);
    if (repBtn !== undefined) {repBtn.innerText = lang.get('SEND');}
  }
  $.ajax({
    url: "https://api.grepodata.com/indexer/addreport",
    data: data,
    type: 'post',
    crossDomain: true,
    dataType: 'json',
    success: function(data) {
      if (reportHash!==null){
        reportsFoundForum.push(reportHash);
      }
      if ($('#gd_index_f_' + reportId).get(0)) {
        $('#gd_index_f_' + reportId).get(0).style.color = '#36cd5b';
        $('#gd_index_f_txt_' + reportId).get(0).innerText = lang.get('ADDED') + ' ✓';
      }
    },
    error: function(jqXHR, textStatus) {console.log("error saving report");},
    timeout: 20000
  });
  gd_indicator();
}

// Add the given inbox report to the index
let reportsFoundInbox = [];
function addToIndexFromInbox(reportHash, reportElement) {
  let reportJson = JSON.parse(mapDOM(reportElement, true));
  let reportText = reportElement.innerText;

  let data = {
    'key': gd_w.gdIndexScript,
    'type': 'inbox',
    'report_hash': reportHash,
    'report_text': reportText,
    'report_json': reportJson,
    'script_version': gd_version,
    'report_poster': gd_w.Game.player_name || '',
    'report_poster_id': gd_w.Game.player_id || 0,
    'report_poster_ally_id': gd_w.Game.alliance_id || 0,
  };

  $.ajax({
    url: "https://api.grepodata.com/indexer/inboxreport",
    data: data,
    type: 'post',
    crossDomain: true,
    success: function(data) {
      if (gd_settings.inbox === 'manual') {
        let btn = document.getElementById("gd_index_rep_txt");
        let btnC = document.getElementById("gd_index_rep_");
        btnC.setAttribute('style', 'color: #36cd5b; float: right;');
        btn.innerText = lang.get('ADDED') + ' ✓';
      }
      reportsFoundInbox.push(reportHash);
    },
    error: function(jqXHR, textStatus) {
      let btn = document.getElementById("gd_index_rep_txt");
      btn.innerText = 'Failed to index';
    },
    timeout: 20000
  });
  gd_indicator();
}


function mapDOM(element, json) {
  let treeObject = {};

  // If string convert to document Node
  if (typeof element === "string") {
    if (window.DOMParser) {
      parser = new DOMParser();
      docNode = parser.parseFromString(element,"text/xml");
    } else { // Microsoft strikes again
      docNode = new ActiveXObject("Microsoft.XMLDOM");
      docNode.async = false;
      docNode.loadXML(element);
    }
    element = docNode.firstChild;
  }

  //Recursively loop through DOM elements and assign properties to object
  function treeHTML(element, object) {
    object["type"] = element.nodeName;
    let nodeList = element.childNodes;
    if (nodeList != null) {
      if (nodeList.length) {
        object["content"] = [];
        for (let i = 0; i < nodeList.length; i++) {
          if (nodeList[i].nodeType == 3) {
            object["content"].push(nodeList[i].nodeValue);
          } else {
            object["content"].push({});
            treeHTML(nodeList[i], object["content"][object["content"].length -1]);
          }
        }
      }
    }
    if (element.attributes != null) {
      if (element.attributes.length) {
        object["attributes"] = {};
        for (let i = 0; i < element.attributes.length; i++) {
          object["attributes"][element.attributes[i].nodeName] = element.attributes[i].nodeValue;
        }
      }
    }
  }
  treeHTML(element, treeObject);

  return (json) ? JSON.stringify(treeObject) : treeObject;
}

// Inbox reports
function parseInboxReport() {
  let reportElement = document.getElementById("report_report");
  if (reportElement != null) {
    let footerElement = reportElement.getElementsByClassName("game_list_footer")[0];
    let reportText = reportElement.outerHTML;
    let footerText = footerElement.outerHTML;
    if (footerText.indexOf('gd_index_rep_') < 0
      && reportText.indexOf('report_town_bg_quest') < 0
      && reportText.indexOf('flagpole ghost_town') < 0
      && reportText.indexOf('support_report_cities') < 0
      && reportText.indexOf('big_horizontal_report_separator') < 0
      && reportText.indexOf('report_town_bg_attack_spot') < 0
      && (reportText.indexOf('/images/game/towninfo/attack.png') >= 0
        || reportText.indexOf('/images/game/towninfo/espionage') >= 0
        || reportText.indexOf('/images/game/towninfo/breach.png') >= 0
        || reportText.indexOf('/images/game/towninfo/attackSupport.png') >= 0
        || reportText.indexOf('/images/game/towninfo/take_over.png') >= 0
        || reportText.indexOf('/images/game/towninfo/support.png') >= 0)
    ) {
      let headerElement = document.getElementById("report_report_header");
      let dateElement = document.getElementById("report_date");
      let headerText = headerElement.outerHTML;
      let dateText = dateElement.outerHTML;
      let reportHash = (headerText+dateText).report_hash();
      let addBtn = document.createElement('a');
      addBtn.setAttribute('href', '#');
      addBtn.setAttribute('id', 'gd_index_rep_');
      addBtn.setAttribute('class', 'button');
      let styleStr = 'float: right;';
      addBtn.setAttribute('style', styleStr);
      let txtSpan = document.createElement('span');
      txtSpan.setAttribute('id', 'gd_index_rep_txt');

      let reportFound = false;
      for (let j = 0; j < reportsFoundInbox.length; j++) {
        if (reportsFoundInbox[j] === reportHash) {
          reportFound = true;
        }
      }
      if (reportFound) {
        addBtn.setAttribute('style', 'color: #36cd5b; float: right;');
        txtSpan.innerText = lang.get('ADDED') + ' ✓';
      } else {
        txtSpan.innerText = lang.get('ADD') + ' +';
      }

      txtSpan.setAttribute('class', 'middle');
      let rightSpan = document.createElement('span');
      rightSpan.setAttribute('class', 'right');
      let leftSpan = document.createElement('span');
      leftSpan.setAttribute('class', 'left');
      rightSpan.appendChild(txtSpan);
      leftSpan.appendChild(rightSpan);
      addBtn.appendChild(leftSpan);
      if (!reportFound) {
        addBtn.addEventListener('click', function() {
          if ($('#gd_index_rep_txt').get(0)) {
            $('#gd_index_rep_txt').get(0).innerText = lang.get('SEND');
          }
          addToIndexFromInbox(reportHash, reportElement);
        }, false);
      }
      footerElement.appendChild(addBtn);
    }
  }
}

function addForumReportById(reportId) {
  let reportElement = document.getElementById(reportId);

  // Find report poster
  let inspectedElement = reportElement.parentElement;
  let search_limit = 20;
  let found = false;
  let reportPoster = '_';
  while (!found && search_limit > 0 && inspectedElement !== null) {
    try {
      let owners = inspectedElement.getElementsByClassName("bbcodes_player");
      if (owners.length !== 0) {
        for (let g = 0; g < owners.length; g++) {
          if (owners[g].parentElement.classList.contains('author')) {
            reportPoster = owners[g].innerText;
            if (reportPoster === '') reportPoster = '_';
            found = true;
          }
        }
      }
      inspectedElement = inspectedElement.parentElement;
    }
    catch (err) {
    }
    search_limit -= 1;
  }

  let header = reportElement.getElementsByClassName('published_report_header bold')[0];
  let reportHash = null;
  if (header !== undefined) {
    reportHash = header.innerText.trim().replace(/\s+/g, '.').report_hash();
    for (let j = 0; j < reportsFoundForum.length; j++) {
      if (reportsFoundForum[j] === reportHash) {
        return;
      }
    }
  }
  addToIndexFromForum(reportId, reportElement, reportPoster, reportHash);
}

// Forum reports
function parseForumReport() {
  let reportsInView = document.getElementsByClassName("bbcodes published_report");

  //process reports
  if (reportsInView.length > 0) {
    for (let i = 0; i < reportsInView.length; i++) {
      let reportElement = reportsInView[i];
      let reportId = reportElement.id;

      if (!$('#gd_index_f_' + reportId).get(0)) {

        let bSpy = false;
        if (reportElement.getElementsByClassName("espionage_report").length > 0) {
          bSpy = true;
        } else if (reportElement.getElementsByClassName("report_units").length < 2
          || reportElement.getElementsByClassName("conquest").length > 0) {
          // ignore non intel reports
          continue;
        }

        let header = reportElement.getElementsByClassName('published_report_header bold')[0];
        let reportHash = null;
        let exists = false;
        if (header !== undefined) {
          reportHash = header.innerText.trim().replace(/\s+/g, '.').report_hash();
          for (let j = 0; j < reportsFoundForum.length; j++) {
            if (reportsFoundForum[j] === reportHash) {
              exists = true;
            }
          }
        }

        if (bSpy === true) {
          $(reportElement).append('<div class="gd_indexer_footer" style="background: #fff; height: 28px;">\n' +
            '    <a href="#" id="gd_index_f_'+reportId+'" report_id="'+reportId+'" class="button" style="float: right; top: 1px;"><span class="left"><span class="right"><span id="gd_index_f_txt_'+reportId+'" class="middle">'+lang.get('ADD')+' +</span></span></span></a>\n' +
            '    </div>');
        } else {
          $(reportElement).append('<div class="gd_indexer_footer" style="height: 28px; margin-top: -28px;">\n' +
            '    <a href="#" id="gd_index_f_'+reportId+'" report_id="'+reportId+'" class="button" style="float: right; top: 1px;"><span class="left"><span class="right"><span id="gd_index_f_txt_'+reportId+'" class="middle">'+lang.get('ADD')+' +</span></span></span></a>\n' +
            '    </div>');
        }

        if (exists===true) {
          $('#gd_index_f_' + reportId).get(0).style.color = '#36cd5b';
          $('#gd_index_f_txt_' + reportId).get(0).innerText = lang.get('ADDED') + ' ✓';
        } else {
          $('#gd_index_f_' + reportId).click(function () {
            addForumReportById($(this).attr('report_id'));
          });
        }
      }
    }
  }
}

let gd_settings = {
  inbox: 'manual',
  forum: 'manual'
};
function settings() {
  if (!$("#gd_indexer").get(0)) {
    $(".settings-menu ul:last").append('<li id="gd_li"><svg aria-hidden="true" data-prefix="fas" data-icon="university" class="svg-inline--fa fa-university fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="color: #2E4154;width: 16px;width: 15px;vertical-align: middle;margin-top: -2px;"><path fill="currentColor" d="M496 128v16a8 8 0 0 1-8 8h-24v12c0 6.627-5.373 12-12 12H60c-6.627 0-12-5.373-12-12v-12H24a8 8 0 0 1-8-8v-16a8 8 0 0 1 4.941-7.392l232-88a7.996 7.996 0 0 1 6.118 0l232 88A8 8 0 0 1 496 128zm-24 304H40c-13.255 0-24 10.745-24 24v16a8 8 0 0 0 8 8h464a8 8 0 0 0 8-8v-16c0-13.255-10.745-24-24-24zM96 192v192H60c-6.627 0-12 5.373-12 12v20h416v-20c0-6.627-5.373-12-12-12h-36V192h-64v192h-64V192h-64v192h-64V192H96z"></path></svg><a id="gd_indexer" href="#" style="    margin-left: 4px;">GrepoData City Indexer</a></li>');

    let settingsHtml = '<div id="gd_settings_container" style="display: none; position: absolute; top: 0; bottom: 0; right: 0; left: 232px; padding: 0px; overflow: auto;">\n' +
      '    <div id="gd_settings" style="position: relative;">\n' +
      '\t\t<div class="section" id="s_gd_city_indexer">\n' +
      '\t\t\t<div class="game_header bold" style="margin: -5px -10px 15px -10px; padding-left: 10px;">GrepoData city indexer settings</div>\n' +
      '\t\t\t<p>'+lang.get('ABOUT')+'.</p>' +
      '\t\t\t<p>'+lang.get('INDEX_LIST')+': ';
    gd_w.gdIndexScript.forEach(function(i) {settingsHtml = settingsHtml + '<a href="https://grepodata.com/indexer/'+i+'" target="_blank">'+i+'</a> ';});
    settingsHtml = settingsHtml + '</p>' + (count>0?'<p>'+lang.get('COUNT_1')+count+lang.get('COUNT_2')+'.</p>':'') +
      '<hr>\n' +
      '\t\t\t<p style="    margin-bottom: 10px; margin-left: 10px;">'+lang.get('COLLECT_INBOX_1')+
      '<span style="background: url(https://gpnl.innogamescdn.com/images/game/autogenerated/layout/layout_6492c98.png) no-repeat -635px -117px;\n' +
      '    margin-right: 4px; position: relative; width: 26px; height: 26px; top: 6px; left: 0px; display: -webkit-inline-box; padding-top: 6px; padding-left: 6px;">\n' +
      '<span class="icon" style="background: url(https://gpnl.innogamescdn.com/images/game/autogenerated/layout/layout_6492c98.png) no-repeat -678px -669px;\n' +
      '    width: 24px; height: 21px; display: -webkit-inline-box;">\n' +
      '\t</span>\n' +
      '</span>'+
      '<strong>'+lang.get('COLLECT_INBOX_2')+'</strong>:</p>\n' +
      '\t\t\t<div style="margin-left: 30px;" class="checkbox_new inbox_manual'+(gd_settings.inbox=='manual'?' checked':'')+'">\n' +
      '\t\t\t\t<div class="cbx_icon"></div><div class="cbx_caption">'+lang.get('MANUAL')+'</div>\n' +
      '\t\t\t</div>\n' +
      '\t\t\t<div style="margin-left: 30px;" class="checkbox_new inbox_never'+(gd_settings.inbox=='never'?' checked':'')+'">\n' +
      '\t\t\t\t<div class="cbx_icon"></div><div class="cbx_caption">'+lang.get('NEVER')+'</div>\n' +
      '\t\t\t</div>\n' +
      '<p id="gd_s_saved_inbox" style="display: none; position: absolute; left: 50px; margin: 0;"><strong>Saved ✓</strong></p> '+
      '\t\t\t<br><br><br><hr>\n' +
      '\t\t\t<p style="    margin-bottom: 10px; margin-left: 10px;">' + lang.get('COLLECT_INBOX_1') +
      '<span style="background: url(https://gpnl.innogamescdn.com/images/game/autogenerated/layout/layout_6492c98.png) no-repeat -635px -117px;\n' +
      '    margin-right: 4px; position: relative; width: 27px; height: 26px; top: 6px; left: 0px; display: -webkit-inline-box; padding-top: 6px; padding-left: 5px;">\n' +
      '<span class="icon" style="background: url(https://gpnl.innogamescdn.com/images/game/autogenerated/layout/layout_6492c98.png) no-repeat -702px -669px;\n' +
      '    width: 24px; height: 21px; display: -webkit-inline-box;">\n' +
      '\t</span>\n' +
      '</span>' +
      '<strong>'+lang.get('COLLECT_FORUM')+'</strong> '+lang.get('AND')+' ' +
      '<span style="background: url(https://gpnl.innogamescdn.com/images/game/autogenerated/layout/layout_6492c98.png) no-repeat -635px -117px;\n' +
      '    margin-right: 4px; position: relative; width: 27px; height: 26px; top: 6px; left: 0px; display: -webkit-inline-box; padding-top: 6px; padding-left: 5px;">\n' +
      '<span class="icon" style="background: url(https://gpnl.innogamescdn.com/images/game/autogenerated/layout/layout_6492c98.png) no-repeat -606px -669px;\n' +
      '    width: 24px; height: 21px; display: -webkit-inline-box;">\n' +
      '\t</span>\n' +
      '</span>' +
      '<strong>'+lang.get('COLLECT_MESSAGE')+'</strong>:</p>\n' +
      '\t\t\t<div style="margin-left: 30px;" class="checkbox_new forum_manual'+(gd_settings.forum=='manual'?' checked':'')+'">\n' +
      '\t\t\t\t<div class="cbx_icon"></div><div class="cbx_caption">'+lang.get('MANUAL')+'</div>\n' +
      '\t\t\t</div>\n' +
      '\t\t\t<div style="margin-left: 30px;" class="checkbox_new forum_never'+(gd_settings.forum=='never'?' checked':'')+'">\n' +
      '\t\t\t\t<div class="cbx_icon"></div><div class="cbx_caption">'+lang.get('NEVER')+'</div>\n' +
      '\t\t\t</div>\n' +
      '<p id="gd_s_saved_forum" style="display: none; position: absolute; left: 50px; margin: 0;"><strong>Saved ✓</strong></p> '+
      '\t\t\t<br><br><br><hr>\n' +
      '\t\t\t<a href="https://grepodata.com/indexer/'+index_key+'" target="_blank">'+lang.get('VIEW')+'</a>\n' +
      '<p style="font-style: italic; font-size: 10px; float: right; margin:0px;">GrepoData city indexer v'+gd_version+' [<a href="https://api.grepodata.com/userscript/cityindexer_'+index_hash+'.user.js" target="_blank">'+lang.get('CHECK_UPDATE')+'</a>]</p>'+
      '\t\t</div>\n' +
      '    </div>\n' +
      '</div>';
    $(".settings-menu").parent().append(settingsHtml);

    $(".settings-link").click(function () {
      $('#gd_settings_container').get(0).style.display = "none";
      $('.settings-container').get(0).style.display = "block";
      gdsettings=false;
    });

    $("#gd_indexer").click(function () {
      $('.settings-container').get(0).style.display = "none";
      $('#gd_settings_container').get(0).style.display = "block";
    });

    $(".inbox_manual").click(function () { settingsCbx('inbox','manual'); });
    $(".inbox_never").click(function () { settingsCbx('inbox','never'); });
    $(".forum_manual").click(function () { settingsCbx('forum','manual'); });
    $(".forum_never").click(function () { settingsCbx('forum','never'); });

    if (gdsettings===true) {
      $('.settings-container').get(0).style.display = "none";
      $('#gd_settings_container').get(0).style.display = "block";
    }
  }
}

function settingsCbx(type, frequency) {
  if (frequency === 'manual') {$('.'+type+'_manual').get(0).classList.add("checked");}
  else {$('.'+type+'_manual').get(0).classList.remove("checked");}
  if (frequency === 'never') {$('.'+type+'_never').get(0).classList.add("checked");}
  else {$('.'+type+'_never').get(0).classList.remove("checked");}
  gd_settings[type] = frequency;
  saveSettings();
  $('#gd_s_saved_'+type).get(0).style.display = 'block';
  setTimeout(function () {
    if($('#gd_s_saved_'+type).get(0)){$('#gd_s_saved_'+type).get(0).style.display = 'none';}
  }, 3000);
}

function saveSettings() {
  document.cookie = "gd_city_indexer_s = " + JSON.stringify(gd_settings);
}
function readSettings() {
  let result = document.cookie.match(new RegExp('gd_city_indexer_s=([^;]+)'));
  result && (result = JSON.parse(result[1]));
  if (result !== null) {
    // Disable auto uploading to comply with the rules => only manual uploads are allowed
    if (!result.forum || result.forum!=='never') {
      result.forum='manual';
    }
    if (!result.inbox || result.inbox!=='never') {
      result.inbox='manual';
    }
    gd_settings = result;
  }
}

// Loads a list of report ids that have already been added. This is used to avoid duplicates
function loadIndexHashlist() {
  try {
    if (gd_w.gdIndexScript.length === 1) {
      $.ajax({
        method: "get",
        url: "https://api.grepodata.com/indexer/getlatest?key=" + index_key + "&player_id=" + gd_w.Game.player_id
      }).done(function (b) {
        try {
          if (gd_w.gdIndexScript.length === 1) {
            if (b['i'] !== undefined) {
              $.each(b['i'], function (b, d) {
                reportsFoundInbox.push(d)
              });
            }
            if (b['f'] !== undefined) {
              $.each(b['f'], function (b, d) {
                reportsFoundForum.push(d)
              });
            }
          }
        } catch (u) {
        }
      });
    }
  } catch (w) {}
}

let count = 0;
function gd_indicator() {
  count = count + 1;
  $('#gd_index_indicator').get(0).innerText = count;
  $('#gd_index_indicator').get(0).style.display = 'inline';
  $('.gd_settings_icon').tooltip('Indexed Reports: ' + count);
}

let gdsettings = false;
function enableCityIndex(key) {
  if (gd_w.gdIndexScript === undefined) {
    gd_w.gdIndexScript = [key];

    console.log('Grepodata city indexer '+index_key+' active. (version: '+gd_version+')');
    readSettings();
    setTimeout(loadIndexHashlist, 2000);
    $.Observer(gd_w.GameEvents.game.load).subscribe('GREPODATA', function (e, data) {
      $(document).ajaxComplete(function (e, xhr, opt) {
        let url = opt.url.split("?"), action = "";
        if (typeof(url[1]) !== "undefined" && typeof(url[1].split(/&/)[1]) !== "undefined") {
          action = url[0].substr(5) + "/" + url[1].split(/&/)[1].substr(7);
        }
        switch (action) {
          case "/report/view":
            // Parse reports straight from inbox
            if (gd_settings.inbox === 'manual') {
              parseInboxReport();
            }
            break;
          case "/message/view":
          case "/alliance_forum/forum":
            // Parse reports from forum and messages
            if (gd_settings.forum === 'manual') {
              setTimeout(parseForumReport, 200);
            }
            break;
          case "/player/index":
            settings();
            break;
        }
      });
    });

    // settings btn
    $('.gods_area').append('<div class="btn_settings circle_button gd_settings_icon" style="right: 0px; top: 95px; z-index: 10;">\n' +
      '\t<div style="margin: 7px 0px 0px 4px; width: 24px; height: 24px;">\n' +
      '\t<svg aria-hidden="true" data-prefix="fas" data-icon="university" class="svg-inline--fa fa-university fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="color: #18bc9c; width: 18px;"><path fill="currentColor" d="M496 128v16a8 8 0 0 1-8 8h-24v12c0 6.627-5.373 12-12 12H60c-6.627 0-12-5.373-12-12v-12H24a8 8 0 0 1-8-8v-16a8 8 0 0 1 4.941-7.392l232-88a7.996 7.996 0 0 1 6.118 0l232 88A8 8 0 0 1 496 128zm-24 304H40c-13.255 0-24 10.745-24 24v16a8 8 0 0 0 8 8h464a8 8 0 0 0 8-8v-16c0-13.255-10.745-24-24-24zM96 192v192H60c-6.627 0-12 5.373-12 12v20h416v-20c0-6.627-5.373-12-12-12h-36V192h-64v192h-64V192h-64v192h-64V192H96z"></path></svg>\n' +
      '\t</div>\n' +
      '<span class="indicator" id="gd_index_indicator" data-indicator-id="indexed" style="background: #182B4D;display: none;z-index: 10000; position: absolute;bottom: 18px;right: 0px;border: solid 1px #ffca4c; height: 12px;color: #fff;font-size: 9px;border-radius: 9px;padding: 0 3px 1px;line-height: 13px;font-weight: 400;">0</span>' +
      '</div>');
    $('.gd_settings_icon').click(function () {
      if (!GPWindowMgr.getOpenFirst(Layout.wnd.TYPE_PLAYER_SETTINGS)) {
        gdsettings = true;
      }
      Layout.wnd.Create(GPWindowMgr.TYPE_PLAYER_SETTINGS, 'Settings');
      setTimeout(function () {gdsettings = false}, 5000)
    });
    $('.gd_settings_icon').tooltip('GrepoData City Indexer ' + index_key);
  } else {
    gd_w.gdIndexScript.push(key);
    console.log('duplicate indexer script. index ' + key + ' is running in extend mode.')
  }
}

// Watch for angular app route change
function grepodataObserver(path) {
  let initWatcher = setInterval(function () {
    if (gd_w.location.pathname.indexOf("/indexer/"+index_key) >= 0 && gd_w.location.pathname != path) {
      clearInterval(initWatcher);
      messageObserver();
    } else if (path != "" && gd_w.location.pathname != path) {
      path = '';
    }
  }, 300);
}

// Hide install message on grepodata.com/indexer
function messageObserver() {
  let timeout = 20000;
  let initWatcher = setInterval(function () {
    timeout = timeout - 100;
    if ($('#help_by_contributing').get(0)) {
      clearInterval(initWatcher);
      // Hide install banner if script is already running
      $('#help_by_contributing').get(0).style.display = 'none';
      if ($('#new_index_install_tips').get(0) && $('#new_index_waiting').get(0)) {
        $('#new_index_waiting').get(0).style.display = 'block';
        $('#new_index_install_tips').get(0).style.display = 'none';
      }
      if ($('#new_index_install').get(0)) {
        $('#new_index_install').get(0).style.display = 'none';
      }
      if ($('#userscript_version').get(0)) {
        $('#userscript_version').append('<div id="gd_version">'+gd_version+'</div>');
      }
      grepodataObserver(gd_w.location.pathname);
    } else if (timeout <= 0) {
      clearInterval(initWatcher);
      grepodataObserver(gd_w.location.pathname);
    }
  }, 100);
}

if(gd_w.location.href.indexOf("grepodata.com") >= 0){
  // Viewer (grepodata.com)
  console.log("init grepodata.com viewer");
  grepodataObserver('');
} else if((gd_w.location.pathname.indexOf("game") >= 0)){
  // Indexer (in-game)
  enableCityIndex(index_key);
}

