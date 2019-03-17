// ==UserScript==
// @name         grepodata city indexer DEV
// @namespace    grepodata
// @version      3.05
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

// Script parameters
let gd_version = '3.05';
let index_key = "04h4u8yu";
let index_hash = "709c966982feb61f5797e8b642bb1a7a";

// Variables
let gd_w = unsafeWindow || window, $ = gd_w.jQuery || jQuery;
let time_regex = /([0-5]\d)(:)([0-5]\d)(:)([0-5]\d)(?!.*([0-5]\d)(:)([0-5]\d)(:)([0-5]\d))/gm;
let day_regex = /([0-3]\d)(.)([0-3]\d)(.)([0-3]\d)(?=.*([0-5]\d)(:)([0-5]\d)(:)([0-5]\d))/gm;

function Translate() {
  this.nl = {ADD:'Indexeren',SEND:'bezig..',ADDED:'Geindexeerd',MANUAL:'handmatig',NEVER:'nooit',AND:'en',VIEW:'Intel bekijken',CHECK_UPDATE:'Controleer op updates',ABOUT:'Deze tool verzamelt informatie over vijandige steden in een handig overzicht. Rapporten kunnen geindexeerd worden in een unieke index die gedeeld kan worden met alliantiegenoten',INDEX_LIST:'Je draagt momenteel bij aan de volgende indexen',COUNT_1:'Je hebt al ',COUNT_2:' rapporten verzameld in deze sessie',COLLECT_INBOX_1:'Verzamel intel uit mijn ',COLLECT_INBOX_2:'rapporten inbox',COLLECT_FORUM:'alliantie forum',COLLECT_MESSAGE:'berichten inbox'};
  this.en = {ADD:'Index',SEND:'sending..',ADDED:'Indexed',MANUAL:'manual',NEVER:'never',AND:'and',VIEW:'View enemy city index',CHECK_UPDATE:'Check for updates',ABOUT:'This tool allows you to easily collects enemy city intelligence and add them to your very own private index that can be shared with your alliance',INDEX_LIST:'You are currently contributing intel to the following indexes',COUNT_1:'You have contributed ',COUNT_2:' reports in this session',COLLECT_INBOX_1:'Collect enemy intel from my ',COLLECT_INBOX_2:'reports inbox',COLLECT_FORUM:'alliance forum',COLLECT_MESSAGE:'message inbox'};
  this.get = function(field) {
    switch(Game.locale_lang.substring(0, 2)) {
      case 'nl':
        return this.nl[field];
      default:
        return this.en[field];
    }
  };
  this.formatDate = function(date) {
    let join = '-';
    let format = [];
    let date_locale = Game.locale_lang.replace('_','-');
    switch(date_locale.substring(0, 2)) {
      case 'nl': format = [{day:'2-digit'},  {month:'2-digit'}, {year:'2-digit'}]; join = '-'; break;
      case 'de': format = [{day:'2-digit'},  {month:'2-digit'}, {year:'2-digit'}]; join = '.'; break;
      case 'en': format = [{year:'numeric'}, {month:'2-digit'}, {day:'2-digit'}];  join = '-'; break;
      default: return null;
    }
    return [
      date.toLocaleString(date_locale,format[0]),
      date.toLocaleString(date_locale,format[1]),
      date.toLocaleString(date_locale,format[2])
    ].join(join);
  };
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

  $('.rh'+reportHash).each(function() {
    $(this).css( "color",'#36cd5b');
    $(this).find('.middle').get(0).innerText = lang.get('ADDED') + ' ✓';
    $(this).off("click");
  });
  $.ajax({
    url: "https://api.grepodata.com/indexer/addreport",
    data: data,
    type: 'post',
    crossDomain: true,
    dataType: 'json',
    success: function(data) {
      pushForumHash(reportHash);
    },
    error: function(jqXHR, textStatus) {console.log("error saving forum report");},
    timeout: 20000
  });
  gd_indicator();
}

// Add the given inbox report to the index
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

  if (gd_settings.inbox === 'manual') {
    let btn = document.getElementById("gd_index_rep_txt");
    let btnC = document.getElementById("gd_index_rep_");
    btnC.setAttribute('style', 'color: #36cd5b; float: right;');
    btn.innerText = lang.get('ADDED') + ' ✓';
  }
  $.ajax({
    url: "https://api.grepodata.com/indexer/inboxreport",
    data: data,
    type: 'post',
    crossDomain: true,
    success: function(data) {
      pushInboxHash(reportHash);
    },
    error: function(jqXHR, textStatus) {console.log("error saving inbox report");},
    timeout: 20000
  });
  gd_indicator();
}

function pushInboxHash(hash) {
  if (gd_w.reportsFoundInbox === undefined) {
    gd_w.reportsFoundInbox=[];
  }
  gd_w.reportsFoundInbox.push(hash);
}
function pushForumHash(hash) {
  if (gd_w.reportsFoundForum === undefined) {
    gd_w.reportsFoundForum=[];
  }
  gd_w.reportsFoundForum.push(hash);
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

function addForumReportById(reportId, reportHash) {
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

        let reportHash = null;
        try {
          // parse report hash
          let header = reportElement.getElementsByClassName('published_report_header bold')[0];
          let headerText = header.getElementsByClassName('bold')[0].innerText;
          let dateText = header.getElementsByClassName('reports_date small')[0].innerText;
          let dateString = dateText;
          try {
            let day = dateText.match(day_regex);
            if (day != null) {
              // Date is not today
              day = day[0];
            } else {
              // Date is today
              day = lang.formatDate(new Date());
            }
            let time = dateText.match(time_regex);
            if (time != null && day != null) {
              dateString = day + '.' + time[0];
            }
          } catch (e) {}
          let reportText = headerText +'.'+ dateString;
          reportText = reportText.trim().replace(/\s+/g, '.');
          if (reportText!==null && reportText!=='') {
            reportHash = reportText.report_hash();
          }
        } catch(err) {
          reportHash = null;
        }

        let exists = false;
        if (reportHash !== null && reportHash !== 0) {
          for (let j = 0; j < gd_w.reportsFoundForum.length; j++) {
            if (gd_w.reportsFoundForum[j] == reportHash) {
              exists = true;
            }
          }
        }

        if (reportHash == null) {
          reportHash = '';
        }
        if (bSpy === true) {
          $(reportElement).append('<div class="gd_indexer_footer" style="background: #fff; height: 28px;">\n' +
            '    <a href="#" id="gd_index_f_'+reportId+'" report_hash="'+reportHash+'" report_id="'+reportId+'" class="button rh'+reportHash+'" style="float: right; top: 1px;"><span class="left"><span class="right"><span id="gd_index_f_txt_'+reportId+'" class="middle">'+lang.get('ADD')+' +</span></span></span></a>\n' +
            '    </div>');
        } else {
          $(reportElement).append('<div class="gd_indexer_footer" style="height: 28px; margin-top: -28px;">\n' +
            '    <a href="#" id="gd_index_f_'+reportId+'" report_hash="'+reportHash+'" report_id="'+reportId+'" class="button rh'+reportHash+'" style="float: right; top: 1px;"><span class="left"><span class="right"><span id="gd_index_f_txt_'+reportId+'" class="middle">'+lang.get('ADD')+' +</span></span></span></a>\n' +
            '    </div>');
        }

        if (exists===true) {
          $('#gd_index_f_' + reportId).get(0).style.color = '#36cd5b';
          $('#gd_index_f_txt_' + reportId).get(0).innerText = lang.get('ADDED') + ' ✓';
        } else {
          $('#gd_index_f_' + reportId).click(function () {
            addForumReportById($(this).attr('report_id'), $(this).attr('report_hash'));
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

    // let layoutUrl = 'https' + window.getComputedStyle(document.getElementsByClassName('icon')[0], null).background.split('("https')[1].split('"')[0];
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
      // '<span style="background: url('+layoutUrl+') no-repeat -635px -117px;\n' +
      // '    margin-right: 4px; position: relative; width: 26px; height: 26px; top: 6px; left: 0px; display: -webkit-inline-box; padding-top: 6px; padding-left: 6px;">\n' +
      // '<span class="icon" style="background: url('+layoutUrl+') no-repeat -678px -669px;\n' +
      // '    width: 24px; height: 21px; display: -webkit-inline-box;">\n' +
      // '\t</span>\n' +
      // '</span>'+
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
      // '<span style="background: url('+layoutUrl+') no-repeat -635px -117px;\n' +
      // '    margin-right: 4px; position: relative; width: 27px; height: 26px; top: 6px; left: 0px; display: -webkit-inline-box; padding-top: 6px; padding-left: 5px;">\n' +
      // '<span class="icon" style="background: url('+layoutUrl+') no-repeat -702px -669px;\n' +
      // '    width: 24px; height: 21px; display: -webkit-inline-box;">\n' +
      // '\t</span>\n' +
      // '</span>' +
      '<strong>'+lang.get('COLLECT_FORUM')+'</strong> '+lang.get('AND')+' ' +
      // '<span style="background: url('+layoutUrl+') no-repeat -635px -117px;\n' +
      // '    margin-right: 4px; position: relative; width: 27px; height: 26px; top: 6px; left: 0px; display: -webkit-inline-box; padding-top: 6px; padding-left: 5px;">\n' +
      // '<span class="icon" style="background: url('+layoutUrl+') no-repeat -606px -669px;\n' +
      // '    width: 24px; height: 21px; display: -webkit-inline-box;">\n' +
      // '\t</span>\n' +
      // '</span>' +
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
function loadIndexHashlist(extendMode) {
  try {
    $.ajax({
      method: "get",
      url: "https://api.grepodata.com/indexer/getlatest?key=" + index_key + "&player_id=" + gd_w.Game.player_id
    }).done(function (b) {
      try {
        if (gd_w.reportsFoundForum === undefined) {gd_w.reportsFoundForum=[];}
        if (gd_w.reportsFoundInbox === undefined) {gd_w.reportsFoundInbox=[];}

        if (extendMode === false) {
          if (b['i'] !== undefined) {
            $.each(b['i'], function (b, d) {
              gd_w.reportsFoundInbox.push(d)
            });
          }
          if (b['f'] !== undefined) {
            $.each(b['f'], function (b, d) {
              gd_w.reportsFoundForum.push(d)
            });
          }
        } else {
          // Running in extend mode, merge with existing list
          if (b['f'] !== undefined) {
            gd_w.reportsFoundForum = gd_w.reportsFoundForum.filter(value => -1 !== b['f'].indexOf(value));
          }
          if (b['i'] !== undefined) {
            gd_w.reportsFoundInbox = gd_w.reportsFoundInbox.filter(value => -1 !== b['i'].indexOf(value));
          }
        }
      } catch (u) {
      }
    });
  } catch (w) {}
}

function loadTownIntel(id) {
  try {
    $('.info_tab_content_'+id).empty();
    $('.info_tab_content_'+id).append('Loading intel..');
    $.ajax({
      method: "get",
      url: "https://api.grepodata.com/indexer/api/town?key=" + index_key + "&id=" + id
    }).error( function (err) {
      $('.info_tab_content_'+id).empty();
      $('.info_tab_content_'+id).append('<div style="text-align: center"><br/><br/>' +
        'No intel available at the moment.<br/>Index some new reports about this town to collect intel.<br/><br/>' +
        '<a href="https://grepodata.com/indexer/'+index_key+'" target="_blank" style="">Index homepage: '+index_key+'</a></div>');
    }).done(function (b) {
      try {
        console.log(b);
        $('.info_tab_content_'+id).css( "max-height",'100%');
        $('.info_tab_content_'+id).css( "height",'100%');
        let tooltips = [];

        $('.info_tab_content_'+id).empty();

        // Version check
        if (b.hasOwnProperty('latest_version') && b.latest_version != null && b.latest_version.toString() !== gd_version) {
          let updateHtml =
            '<div class="gd-update-available" style=" background: #b93b3b; color: #fff; text-align: center; border-radius: 10px; padding-bottom: 2px;">' +
            'New userscript version available: ' +
            '<a href="https://api.grepodata.com/userscript/cityindexer_'+index_hash+'.user.js" class="gd-ext-ref" target="_blank" ' +
            'style="color: #c5ecdb; text-decoration: underline;">Update now!</a></div>';
            $('.info_tab_content_'+id).append(updateHtml);
          $('.gd-update-available').tooltip((b.hasOwnProperty('update_message')?b.update_message:b.latest_version));
        }

        // Buildings
        let build = '<div class="gd_build_'+id+'" style="padding: 5px 0;">';
        let date = '';
        for (let j = 0; j < Object.keys(b.buildings).length; j++) {
          let name = Object.keys(b.buildings)[j];
          let value = b.buildings[name].level.toString();
          if (value != null && value != '' && value.indexOf('%') < 0) {
            date = b.buildings[name].date;
            build = build + '<div class="building_header building_icon40x40 '+name+' regular" id="icon_building_'+name+'" ' +
              'style="margin-left: 3px; width: 32px; height: 32px;">' +
              '<div style="position: absolute; top: 17px; margin-left: 8px; z-index: 10; color: #fff; font-size: 12px; font-weight: 700; text-shadow: 1px 1px 3px #000;">'+value+'</div>' +
              '</div>';
          }
        }
        build = build + '</div>';
        $('.info_tab_content_'+id).append(build);
        $('.gd_build_'+id).tooltip('Buildings as of: ' + date);

        let table =
          '<div class="game_border" style="max-height: 100%;">\n' +
          '   <div class="game_border_top"></div><div class="game_border_bottom"></div><div class="game_border_left"></div><div class="game_border_right"></div>\n' +
          '   <div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div><div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>\n' +
          '   <div class="game_header bold">\n' +
          'Town intel for: ' + b.name + '<a href="https://grepodata.com/indexer/'+index_key+'" class="gd-ext-ref" target="_blank" style="float: right; color: #fff; text-decoration: underline;">Enemy city index: '+index_key+'</a>\n' +
          '   </div>\n' +
          '   <div style="height: 280px;">' +
          '     <ul class="game_list" style="display: block; width: 100%; height: 280px; overflow-x: hidden; overflow-y: auto;">\n';
        for (let j = 0; j < Object.keys(b.intel).length; j++) {
          let intel = b.intel[j];
          let row = '';

          // Type
          if (intel.type != null && intel.type != '') {
            let typeUrl = '';
            let tooltip = '';
            let flip = true;
            switch (intel.type) {
              case 'enemy_attack':
                typeUrl = '/images/game/towninfo/attack.png';
                tooltip = 'Enemy attack';
                break;
              case 'friendly_attack':
                flip = false;
                typeUrl = '/images/game/towninfo/attack.png';
                tooltip = 'Friendly attack';
                break;
              case 'attack_on_conquest':
                typeUrl = '/images/game/towninfo/conquer.png';
                tooltip = 'Attack on conquest';
                break;
              case 'support':
                typeUrl = '/images/game/towninfo/support.png';
                tooltip = 'Sent in support';
                break;
              case 'spy':
                typeUrl = '/images/game/towninfo/espionage_2.67.png';
                if (intel.silver != null && intel.silver != '') {
                  tooltip = 'Silver used: ' + intel.silver;
                }
                break;
              default:
                typeUrl = '/images/game/towninfo/attack.png';
            }
            let typeHtml =
              '<div style="height: 0px; margin-top: -5px; ' +
              (flip?'-moz-transform: scaleX(-1); -o-transform: scaleX(-1); -webkit-transform: scaleX(-1); transform: scaleX(-1); filter: FlipH; -ms-filter: "FlipH";':'') +
              '"><div style="background: url('+typeUrl+');\n' +
              '    padding: 0;\n' +
              '    height: 50px;\n' +
              '    width: 50px;\n' +
              '    position: relative;\n' +
              '    display: inherit;\n' +
              '    transform: scale(0.6, 0.6);-ms-transform: scale(0.6, 0.6);-webkit-transform: scale(0.6, 0.6);' +
              '    box-shadow: 0px 0px 9px 0px #525252;" class="intel-type-'+id+'-'+j+'"></div></div>';
            row = row +
              '<div style="display: table-cell; ">' +
              typeHtml +
              '</div>';
            tooltips.push(tooltip);
          } else {
            row = row + '<div style="display: table-cell;"></div>';
          }

          // Date
          row = row + '<div style="display: table-cell; width: 100px; padding-top: 3px;" class="bold">' + intel.date + '</div>';

          // units
          let unitHtml = '';
          let killed = false;
          for (let i = 0; i < Object.keys(intel.units).length; i++) {
            let unit = intel.units[i];
            let size = 10;
            switch (Math.max(unit.count.toString().length, unit.killed.toString().length)) {
              case 1: case 2: size = 11; break;
              case 3: size = 10; break;
              case 4: size = 8; break;
              case 5: size = 6; break;
              default: size = 10;
            }
            if (unit.killed > 0) {killed=true;}
            unitHtml = unitHtml +
              '<div class="unit_icon25x25 '+unit.name+'" style="overflow: unset; font-size: '+size+'px; text-shadow: 1px 1px 3px #000; color: #fff; font-weight: 700; border: 1px solid #626262; padding: 10px 0 0 0; line-height: 13px; height: 15px; text-align: right; margin-right: 2px;">' +
              unit.count +
              (unit.killed > 0 ? '   <div class="report_losts" style="position: absolute; margin: 4px 0 0 0; font-size: '+(size-1)+'px; text-shadow: none;">-'+unit.killed+'</div>\n' : '') +
              '</div>';
          }
          if (intel.hero != null) {
            unitHtml = unitHtml +
              '<div class="hero_icon_border golden_border" style="display: inline-block;">\n' +
              '    <div class="hero_icon_background">\n' +
              '        <div class="hero_icon hero25x25 '+intel.hero.toLowerCase()+'"></div>\n' +
              '    </div>\n' +
              '</div>';
          }
          row = row + '<div style="display: table-cell;"><div><div class="origin_town_units" style="position: absolute; padding-left: 30px; margin: 5px 0 5px 0; '+(killed?'height: 37px;':'')+'">' + unitHtml + '</div></div></div>';

          // Wall
          if (intel.wall != null && intel.wall != '' && intel.wall.indexOf('%') < 0) {
            row = row +
              '<div style="display: table-cell; width: 50px; float: right;">' +
              '<div class="sprite-image" style="display: inline-block; font-weight: 600;">' +
              '<div style="position: absolute; top: 19px; margin-left: 8px; z-index: 10; color: #fff; font-size: 10px; text-shadow: 1px 1px 3px #000;">'+intel.wall+'</div>' +
              '<img src="https://gpnl.innogamescdn.com/images/game/main/buildings_sprite_40x40.png" alt="icon" ' +
              'width="40" height="40" style="object-fit: none;object-position: -40px -80px;width: 40px;height: 40px;' +
              'transform: scale(0.68, 0.68);-ms-transform: scale(0.68, 0.68);-webkit-transform: scale(0.68, 0.68);' +
              'padding-left: -7px; margin: -48px 0 0 0px; position:absolute;">' +
              '</div></div>';
          } else {
            row = row + '<div style="display: table-cell;"></div>';
          }

          let rowHeader = '<li class="'+(j % 2 === 0 ? 'odd':'even')+'" style="display: inherit; width: 100%; padding: 0 0 '+(killed?'1':'')+'5px 0;">';
          table = table + rowHeader + row + '</li>\n';
        }
        table = table + '</div></ul></div>';
        $('.info_tab_content_'+id).append(table);
        for (let j = 0; j < tooltips.length; j++) {
          $('.intel-type-'+id+'-'+j).tooltip(tooltips[j]);
        }

        let world = Game.world_id;
        let exthtml =
          '<div style="display: list-item" class="gd-ext-ref">' +
          (b.player_id!=null&&b.player_id!=0?'   <a href="https://grepodata.com/indexer/player/'+index_key+'/'+world+'/'+b.player_id+'" target="_blank" style="float: left;"><img alt="" src="/images/game/icons/player.png" style="float: left; padding-right: 2px;">('+b.player_name+') Show player intel</a>':'') +
          (b.alliance_id!=null&&b.alliance_id!=0?'   <a href="https://grepodata.com/indexer/alliance/'+index_key+'/'+world+'/'+b.alliance_id+'" target="_blank" style="float: right;"><img alt="" src="/images/game/icons/ally.png" style="float: left; padding-right: 2px;">Show alliance intel</a>':'') +
          '</div>';
        $('.info_tab_content_'+id).append(exthtml);
        $('.gd-ext-ref').tooltip('Opens in new tab');

      } catch (u) {
        console.log(u);
        $('.info_tab_content_'+id).empty();
        $('.info_tab_content_'+id).append('<div style="text-align: center"><br/><br/>' +
          'No intel available at the moment.<br/>Index some new reports about this town to collect intel.<br/><br/>' +
          '<a href="https://grepodata.com/indexer/'+index_key+'" target="_blank" style="">Index homepage: '+index_key+'</a></div>');
      }
    });
  } catch (w) {
    console.log(w);
    $('.info_tab_content_'+id).empty();
    $('.info_tab_content_'+id).append('<div style="text-align: center"><br/><br/>' +
      'No intel available at the moment.<br/>Index some new reports about this town to collect intel.<br/><br/>' +
      '<a href="https://grepodata.com/indexer/'+index_key+'" target="_blank" style="">Index homepage: '+index_key+'</a></div>');
  }
}

let count = 0;
function gd_indicator() {
  count = count + 1;
  $('#gd_index_indicator').get(0).innerText = count;
  $('#gd_index_indicator').get(0).style.display = 'inline';
  $('.gd_settings_icon').tooltip('Indexed Reports: ' + count);
}

function viewTownIntel(xhr) {
  let town_id = xhr.responseText.match(/(?<=\[town\]).*?(?=\[\\\/town\])/gs)[0];

  // Add intel button and handle click event
  let intelBtn = '<div id="gd_index_town_'+town_id+'" town_id="'+town_id+'" class="button_new gdtv'+town_id+'" style="float: right; bottom: 4px;">' +
    '<div class="left"></div>' +
    '<div class="right"></div>' +
    '<div class="caption js-caption">'+lang.get('VIEW')+'<div class="effect js-effect"></div></div></div>';
  $('.info_tab_content_'+town_id + ' > .game_inner_box > .game_border > ul.game_list > li.odd').filter(':first').append(intelBtn);

  // Handle click
  $('#gd_index_town_' + town_id).click(function () {
    let panel_root = $('.info_tab_content_'+town_id).parent().parent().parent().get(0);
    panel_root.getElementsByClassName('active')[0].classList.remove('active');
    loadTownIntel(town_id);
  });
}

let gdsettings = false;
function enableCityIndex(key) {
  if (gd_w.gdIndexScript === undefined) {
    gd_w.gdIndexScript = [key];

    console.log('Grepodata city indexer '+index_key+' active. (version: '+gd_version+')');
    readSettings();
    setTimeout(function() {loadIndexHashlist(false);}, 2000);
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
          case "/town_info/info":
            viewTownIntel(xhr);
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
    console.log('duplicate indexer script. index ' + key + ' is running in extend mode.');

    // Merge id lists
    setTimeout(function() {loadIndexHashlist(true);}, 8000 * (gd_w.gdIndexScript.length-1));
  }
}

// Watch for angular app route change
function grepodataObserver(path) {
  let initWatcher = setInterval(function () {
    if (gd_w.location.pathname.indexOf("/indexer/") >= 0 &&
      gd_w.location.pathname.indexOf(index_key) >= 0 &&
      gd_w.location.pathname != path) {
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
      //if ($('#new_index_install').get(0)) {
      //  $('#new_index_install').get(0).style.display = 'none';
      //}
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

