//serverid:channel,[]
var LOGS = {

};

var Manager = {
  currentChannel: {
    server_id : -1,
    channel: ""
  },
  servers:[],
  channels:[],
  server_template:_.template($('#server-template').html()),
  sendMessage:function() {
    var text = $('#text-input').val();  
    if(text==""){  
      return ;  
    } 
    try{  
      socket_action("sendLog",  {'server_id':this.currentChannel.server_id,'channel': this.currentChannel.channel, 'message' : text});
      message('<p class="event">Sent: '+text+'</p>')  
    } catch(exception){  
      message('<p class="warning">'+'</p>');  
    }  

    $('#text-input').val("");  
  },
  init:function() { 
    $(function(){
      $('#text-input').keypress(function(event) {  
        if (event.keyCode == '13') {  
          Manager.sendMessage();  
          return;
        }
      });
      var pstate=-1, state = 0, state_tap_string, state_idx;
      var _S = {NOT_ACTIVE:0,TAP_ACTIVE:1};

      function getState(keyCode, start, end) {
        var s;
        switch (keyCode) {
          case '9':
            if ( start == end ) {
              s = _S.TAP_ACTIVE;
            } else {
              s = _S.NOT_ACTIVE;
            }
            break;
          default:
            s = _S.NOT_ACTIVE
            break;
        }
        return s;
      }

      $('#text-input').keydown(function(event) {
        if (!Manager.currentChannel) return;
            
        var c_start = Cursor.getSelectionStart(this);
        var c_end = Cursor.getSelectionEnd(this);

        pstate = state;
        state = getState(event.keyCode, c_start, c_end);
        
        switch ([pstate,state].join('')) {
          case [_S.NOT_ACTIVE,_S.TAP_ACTIVE].join(''):
            var channel = Manager.getCurrentChannel();
            var value = this.value;

            var last_match = value.match(/\S+$/);
            var same_idx = -1;
            for ( var i = 0, _n = channel.members; i < _n ; i++ ){
              if ( channel.members[i].length < last_match.length ) {
                continue;
              } else if (channel.members[i]==last_match){
                same_idx = i;
              }
            }
            state_tap_string = last_match;
            //value.replace(/\S+$/,"asdf3")
            //this.setSelectionRange(l,l);
          
            //console.log(state_tap_string + " " + state);
            return false;

            break;
          case [_S.TAP_ACTIVE,_S.TAP_ACTIVE].join(''):
          
            break;
          default:
            state_tap_string = undefined;
            break;
        }
      });

      Manager.initAddServer();
    });
  },
  pushLogs:function(logs, noti) {
    if ( logs == null || logs.length == 0 ) return;
    var hasCurrentChannel = false;
    var currentChannelName = this.currentChannel.channel.toLowerCase();
    for ( var i = 0,_n=logs.length ; i < _n; i++) {
      var server_id = logs[i].server_id;
      var channel = logs[i].channel.toLowerCase();
      if ( server_id == this.currentChannel.server_id && channel == currentChannelName)
      {
        hasCurrentChannel = true;
      }

      LOGS[server_id] = LOGS[server_id] || {};
      LOGS[server_id][channel] = LOGS[server_id][channel] || [];
      var found = false;
      for ( var j = 0, _jn = LOGS[server_id][channel].length ; j < _jn ; j++ )
      {
        if ( logs[i].log_id == LOGS[server_id][channel][j].log_id ){
          found = true;
          break;
        }        
      }
      if ( !found ) {
        LOGS[server_id][channel].push(logs[i]);
        if ( noti && logs[i].noti ) {
          var channelInfo = this.getChannelByServerAndChannel(server_id,channel);
          NotificationCenter.showNotification(channel,logs[i].message, null, (function (g,channelInfo) { 
            return function () { 
              g.setCurrentChannel(channelInfo);
              this.cancel();
            }
          })(this,channelInfo));
        }
        LOGS[server_id][channel].sort(function(a,b){return (a.log_id>b.log_id) ? 1 : -1;})
      }
    }
    
    if ( hasCurrentChannel ) {
      this.updateChatting();
    }
  },
  getCurrentChannel:function() {
    return this.getChannelByServerAndChannel(this.currentChannel.server_id,this.currentChannel.channel);
  },
  getChannelByServerAndChannel:function(server_id,channel) {
    for ( var i = 0 ; i < Manager.channels.length ; i++ )
    {
      if ( Manager.channels[i].server_id == server_id && Manager.channels[i].channel == channel) {
        return Manager.channels[i];
      }
    }
  },
  getPastLogs: function() {
    this.currentChannel.isPastLogsLoading = this.currentChannel.isPastLogsLoading || false;
    if ( this.currentChannel.isPastLogsLoading ) return;
    this.currentChannel.isPastLogsLoading = true;
    var server_id = this.currentChannel.server_id;
    var channel = this.currentChannel.channel;
    socket_action("getPastLogs", {server_id : server_id, channel: channel, last_log_id:LOGS[server_id][channel][0].log_id});
  },
  updateChatting: function () {
    var server_id = this.currentChannel.server_id;
    var channel = this.currentChannel.channel.toLowerCase();
    LOGS[server_id] = LOGS[server_id] || {};
    LOGS[server_id][channel] = LOGS[server_id][channel] || [];
      
    var currentLogs = LOGS[this.currentChannel.server_id][channel];
    var lastLog = $("#chatLog .message:last");
    var last_log_id = -1;
    if ( lastLog.length > 0 ) {
      last_log_id = lastLog.attr('log_id');
    }
    for ( var i = 0, _n = currentLogs.length; i< _n ; i++ ) {
      if ( currentLogs[i].log_id <= last_log_id) continue;
      var $chatLog = $("#chatLog");
      var scrollToBottom = false;
      if ( $chatLog[0].scrollHeight - ($chatLog[0].scrollTop + $chatLog[0].clientHeight) < 50 ) {
        scrollToBottom = true;
      }
      $chatLog.append(makeLogDOM(currentLogs[i]));
      
      if ( scrollToBottom ) {
        $chatLog.scrollTop( $chatLog[0].scrollHeight - $chatLog[0].clientHeight );
      }
      
    }

    var firstLog = $("#chatLog .message:first");
    var first_log_id = -1;
    if ( firstLog.length > 0 ) {
      first_log_id = firstLog.attr('log_id');
    }
    for ( var i = 0, _n = currentLogs.length; i< _n ; i++ ) {
      if ( currentLogs[i].log_id == first_log_id) {
        $chatLog = $("#chatLog");
        var cumulateScrollTop = 0;
        var currentScroll = $chatLog.scrollTop()    
        for ( var j = i-1; j >=0 ; j-- ) {
          var $logDOM = makeLogDOM(currentLogs[j])
          $chatLog.prepend($logDOM);
          cumulateScrollTop += $logDOM.height()+10;
        }
        $chatLog.scrollTop(currentScroll+cumulateScrollTop);
        break;
      }     
    }

    function makeLogDOM(log) {
      var appendLog = log;
      var logTimeString = new Date(appendLog.timestamp).toTimeString().substr(0,5)
      var isSystemMessage = ( appendLog.from == undefined );
      var fromString;
      if ( isSystemMessage ) {
        fromString = "- ";
      } else {
        fromString = '<b>'+appendLog.from+': </b>';
      }
      var $message = $('<p class="message" log_id="'+appendLog.log_id+'"><span class="debug">'+appendLog.log_id+'  </span><span class="log-time">'+logTimeString+'</span>'+fromString+appendLog.message+'</p>');
      if ( isSystemMessage ) {
        $message.addClass("system");
      }

      if ( log.noti ) {
        $message.addClass("notification");
      }
      return $message;
    }
  },
  setCurrentChannel:function(channel_info) {
    var server_id = channel_info.server_id;
    var channel_name = channel_info.channel;
    if ( server_id != this.currentChannel.server_id || channel_name!= this.currentChannel.channel )
    {
      this.currentChannel.server_id = server_id;
      this.currentChannel.channel = channel_name;
      $("#irc-channel-topic").text(channel_info.topic);
      $("#chatLog").html("");
      this.updateChatting();  
    }
    var $li = $(".server-header[server_id="+server_id+"]").siblings().find("a").filter(function() { return $(this).text()==channel_name;}).parent();
    $("#serverList > li > ul > li").not($li).removeClass("active");
    $li.addClass("active");
  },
  setServers:function(connection_info) {
    var servers = connection_info['servers'];
    var channels = connection_info['channels'];

    this.servers = servers;
    this.channels = channels;

    this.updateServerListView();
    socket_action("getInitLogs",{});
  },
  updateServerListView:function() {
    //update by Manager's servers, channels
    var $serverList = $("#serverList");
    $serverList.html("");
    for (var i = 0 ; i < this.servers.length; i++) {
      var $server = this.servers[i];
      var $server_elem = $(this.server_template($server))
      $("#serverList").append($server_elem)
      var $channel_ul = $server_elem.find(".ul-channels");
      this.channels.sort(function(a,b) { return a.channel < b.channel ? -1 : 1;} )
      for ( var j = 0 ; j < this.channels.length; j++) {
        var $channel = this.channels[j];
        if ($channel.server_id == $server.id )
        {
          var $channel_li = $('<li><a href="'+$channel.channel+'"><i class="icon-chevron-right"></i>'+$channel.channel+'</a></li>');
          $channel_ul.append($channel_li);
          (function(server,channel,topic){
            $channel_li.click(function(){
              Manager.setCurrentChannel({"server_id":server,"channel":channel,"topic":topic});
            });
          })($server.id,$channel.channel,$channel.topic);
        }
      }
      var $channel_add = $('<li><a><i class="icon-plus"></i>ADD CHANNEL</a></li>')
      $channel_ul.append($channel_add);
      (function(server) {
        $channel_add.click(function() {
          var a= prompt("Enter Channel Name")
          if ( a ) {
            if ( !/^#.+$/.test(a) ) {
              alert("채널명에는 #이 필요합니다.")
              return;
            }
            socket_action('addChannel',{"server_id":server,"channel":a});
          }
        });
      })($server.id);
    }
    var $addServer_elem = $('<a id="ADD Server"><i class="icon-plus"></i>ADD SERVER</a>');
    $serverList.append($addServer_elem);
    $addServer_elem.click(function(){
      Manager.showAddServer();
    });   
  },
  initAddServer:function() {
    $("#addServer-form").submit(function(){

      $("#addServer-div").hide();  

      var data = {};
      $("#addServer-form input").each(function() {
        var $val;
        switch($(this).attr("type")) {
          case "text":
            $val = $(this).val();
            if ($(this).attr("integer")!=undefined) {
              $val = parseInt($val);
            }
            break;
          case "checkbox":
            $val = $(this).attr("checked")=="checked";
            break;
        }
        
        var $t = $(this).attr("name").split("-");
        if ( $t.length == 1 ) {
          data[$t[0]] = $val;
          return;
        } 
        data[$t[0]] = data[$t[0]] || {};
        data[$t[0]][$t[1]] = $val;
      })
      socket_action("addServer", {server : data});
      return false;
    });
    $("#addServer-div button:reset").click(function() {
      $("#addServer-div").hide();  
    });
  },
  showAddServer:function() {
    $("#addServer-div input").val("");
    $("#addServer-div").show();
  }
};
Manager.init();

var Channel = Backbone.Model.extend({
  defaults: function() {
    return {
      channel: "Unknown Channel Name",
      last_log: {
        channel: "",
        from: "", //userName
        log_id: -1 , //log_id
        message: "", //message
        server_id: -1,
        timestamp: 0 //, //timestamp 134997575971
      },
      server_id : -1,
      topic:"",
      user_count :0 
    };
  }
});

var ChannelList = Backbone.Collection.extend({
  model: Channel
});

var ChannelView = Backbone.View.extend({
  tagName: "li",
  events: {
    "click": "setActive"
  },
  initialize: function() {
    this.model.bind('change', this.render, this);
    _.bindAll(this, 'render');
  },
  render: function() {
    var channel_name = this.model.get('channel');
    $(this.el).html('<a><i class="icon-chevron-right"></i>'+channel_name+'</a>');
    return this;
  },
  setActive: function() {
    var $t = this.model;
    $t.set('active',true);
    serverListView.collection.each(function(e){ 
      if($t!=e) {
        e.set('active',false); 
      }
    });

    var channel_name = $t.get('channel');
    $("#irc-channel-name").text(channel_name);
    Manager.setCurrentChannel($t.toJSON());
  }
});

var ChannelListView  = Backbone.View.extend({
  initialize: function(channels){
    this.collection = new ChannelList();
    for ( var i = 0 ; i < channels.length; i++) {
      this.collection.add(new Channel(channels[i]));
    }

    this.render();
  },
  render: function(){
    $(this.el).html("");
    var self = this;
    _(this.collection.models).each(function(item){ // in case collection is not empty
      self.appendItem(item);
    }, this);
    return this
  },
  appendItem: function(item){
    var channelView = new ChannelView({
      model: item
    });
    $(this.el).append(channelView.render().el);
  }  
});


var Server = Backbone.Model.extend({
  defaults: function() {
    return {
      name: "Unknown Server Name",
      id : -1,
      channels : [],
      active : false
    };
  },

});

var ServerList = Backbone.Collection.extend({
  model: Server
});

var ServerView = Backbone.View.extend({
  tagName: "li",
  template: _.template($('#server-template').html()),
  initialize: function() {
    this.model.bind('change', this.render, this);
    
    _.bindAll(this, 'render');
  },
  render: function() {
    $(this.el).addClass("active");
    var channels = this.model.get('channels');
    
    this.$el.html(this.template(this.model.toJSON()));
    this.$('.ul-channels').append(
      (new ChannelListView(channels)).render().$el
    )
    return this;
  },
  setActive: function() {
    var $t = this.model;
    $t.set('active',true);
    serverListView.collection.each(function(e){ 
      if($t!=e) {
        e.set('active',false); 
      }
    });
  }
})

var ServerListView  = Backbone.View.extend({
  el: $("#serverList"),
  initialize: function(servers){
    this.collection = new ServerList();
    for ( var i = 0 ; i < servers.length; i++) {
      this.collection.add(new Server(servers[i]));
    }

    this.render();
  },
  render: function(){
    var self = this;
    $(this.el).html("");
    _(this.collection.models).each(function(item){ // in case collection is not empty
      self.appendItem(item);
    }, this);
  },
  appendItem: function(item){
    var serverView = new ServerView({
      model: item
    });
    $(this.el).append(serverView.render().el);
  }  
});

var socket;  


function connect(callback_onopen) {
  var host = "ws://laika.redfeel.net:9001/";  
  try{  
    socket = new WebSocket(host);  
    message('<p class="event">Socket Status: '+socket.readyState+'</p>');  
    socket.onopen = function(){  
     message('<p class="event">Socket Status: '+socket.readyState+' (open)'+'</p>');  
     callback_onopen();
    }  
    socket.onmessage = function(msg){  
      if ( JSON.parse(msg.data).type !="pushLog")
        message('<p class="message">Received: '+msg.data+'</p>');  
      socket_message(msg);
    }  
    socket.onclose = function(){  
      message('<p class="event">Socket Status: '+socket.readyState+' (Closed)'+'</p>');  
      tryAuth();
    }  
  } catch(exception){  
    message('<p>Error'+exception+'</p>');  
  }    
}

function sent_log(type,data){  
  try{  
    message('<p class="event">Sent by system: '+type +" data: "+JSON.stringify(data)+'</p>');  
  } catch(exception){  
    message('<p class="warning">'+'</p>');  
  }  

}  

function message(msg){  
  $('#debugLog').append(msg);  
  var currentScroll = $("#debugLog").scrollTop()
  $("#debugLog").scrollTop(currentScroll+40);
}  
  
function socket_action(action_name, data) {
  if ( action_name!="pushLogs") sent_log(action_name,data);

  socket.send(JSON.stringify({"type":action_name, "data": data}));
}

function getHash(key) {
  var keyvals = location.hash.substr(1).split("&");
  for ( var i = 0 ; i < keyvals.length ; i++ ) {
    if ( keyvals[i].split("=")[0] == key ) {
      return keyvals[i].split("=")[1]
    }
  }
  return "";
}

function getLocal(key) {
  return localStorage.getItem(key);
}

function saveToLocalKey(key,val) {
  localStorage.setItem(key,val);
}

function saveHashToLocal() {
  if ( undefined != localStorage ) {
    var keyvals = location.hash.substr(1).split("&");
    for ( var i = 0 ; i < keyvals.length ; i++ ) {
      var keyval = keyvals[i].split("=")
      localStorage.setItem(keyval[0],keyval[1]);
    }      
  }
  location.hash = "";
}

function clearLocal() {
  if ( undefined != localStorage ) {
    localStorage.removeItem("access_token")
    localStorage.removeItem("auth_key")
  }
}

function socket_message(msg) {
  var data = JSON.parse(msg.data);

  if ( data.status != 0 ) {
    switch (data.status) {
      case -401:
        clearLocal();
        tryAuth();
        return;
        break;
      case -404:
      //type error 알수없는 요청
        break;
      case -500:
      //서버 에러.. 알수없는에러..
        if ( data.type == "register") {
          clearLocal();
          tryAuth();
          return;
        }
        break;
      default:
      
    }
    alert(data.status + " error");
    return;
  }
  
  var inner_data = data.data;
  switch(data.type) {
    case "register":
      saveToLocalKey("auth_key",inner_data.auth_key);
      socket_action("login",{"auth_key":inner_data.auth_key})
      break;
    case "login":
    case "addServer":
    case "addChannel":
      socket_action("getServers",{});
      break;
    case "getServers":
      Manager.setServers(inner_data); // { servers:[],channels:[]}
      break;
    case "getInitLogs":
      Manager.pushLogs(inner_data.logs, false);
      break;
    case "getPastLogs":
      Manager.currentChannel.isPastLogsLoading = false;
      Manager.pushLogs(inner_data.logs, false);
      break;
    case "pushLog":
    case "sendLog":
      Manager.pushLogs([inner_data.log], true);
      //ACK : socket_action("pushLogs",{"log_ids":ids});
      break;
    default:
      //alert("unkown data type")
  }
}

var serverListView;

function tryAuth() {
  if ( getLocal("auth_key") ) {
    connect((function(auth_key) {
      return function () {
        socket_action("login",{"auth_key":auth_key})
      }
    })(getLocal("auth_key")));
    return;
  }

  var hasTokenHash = (getHash("access_token").length > 0);
  if ( hasTokenHash || getLocal("access_token") && getLocal("access_token").length > 0 ) {
    if ( hasTokenHash ) { saveHashToLocal(); }
    $("#auth").attr("href","./");
    $("#auth").click(function() {
      clearLocal();
    })
    $("#auth span").text("Logout");
    connect((function(access_token) {
      return function () {
        socket_action("register",{"access_token":access_token});
      }
    })(getLocal("access_token")));
  } else {
    var auth_url = "https://accounts.google.com/o/oauth2/auth?"
    var params = { scope : "https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile",
    redirect_uri : location.protocol+"//"+location.hostname,
    client_id : "812906460657-6m0d0bsmrtqjt2h9jd29kui3pdg69eb2.apps.googleusercontent.com",
    response_type :"token",
    state: "/profile" };
    var str=[]; for ( i in params) str.push(i+"="+params[i]);

    $("#auth").attr("href",auth_url+str.join("&"));
    $("#auth span").text("Sign in");
  }  
}

$(function(){
  tryAuth();
});

$(function() {
  $(window).resize(function() {
    $("#chatLog,#debugLog").height($(this).height()-150);
  }).resize();
  $("#chatLog").scroll(function(e){ 
    var scrollTop = this.scrollTop;
    if ( $(this)[0].scrollHeight > $(window).height()-150 ) {
      if ( scrollTop < 200 ) {
        Manager.getPastLogs();
      }
    } 
  });
  
  $("#debugLog").hide();          
  $("#debug-checkbox").click(function () {
    if ( $("#debug-checkbox").attr('checked')=="checked" ) {
      $("#debugLog").show();          
    } else {
      $("#debugLog").hide();          
    }
  });
});


/* debug */
(function (g) { 
  var BE = [38, 38, 40, 40, 37, 39, 37, 39, 66/*"b"*/, 65/*"a"*/], CE = 0;  
  $(g).keydown(function(e) {
    if (e.keyCode == BE[CE]) {
      CE++;
      if ( CE == BE.length) {
        $(".debug").removeClass("debug");
        CE = 0;
      }
    } else {
      CE = 0;
    }
  });
})(window);


var NotificationCenter = {
  permission:0,
  init:function (){
    if ( !window.webkitNotifications ) return;
    this.permission = window.webkitNotifications.checkPermission();
    if (this.permission == 0) { // 0 is PERMISSION_ALLOWED
      $("#request_permission").hide();
      // function defined in step 2
      notification_test = window.webkitNotifications.createNotification(
        '/image/icon.png', 'Hello World!','You can get Notifications!');
      notification_test.ondisplay = function() {  };
      notification_test.onclick = function() {
        notification_test.cancel();
      };
      notification_test.show();
    } else {
      $("#request_permission").click(function() {
        window.webkitNotifications.requestPermission();
      });
    }  
  },
  showNotification:function(title,content,ondisplay,onclick) {
    if ( !window.webkitNotifications ) return;
    this.permission = window.webkitNotifications.checkPermission();
    if (this.permission == 0) { // 0 is PERMISSION_ALLOWED
      var notification = window.webkitNotifications.createNotification(
        '/image/icon.png', title, content);
      notification.ondisplay = ondisplay;
      notification.onclick = onclick;
      notification.show();
    } else if ( this.permission == 2) {
      $("#request_permission").text('check your browser setting. it\'s not allowed');
    } else {
      $("#request_permission").show();
      $("#request_permission").click(function() {
        window.webkitNotifications.requestPermission();
      });
    }
  }
};

$(function() {
  NotificationCenter.init();
});

(function(g){
  function getSelectionStart(o) {
    if (o.createTextRange) {
      var r = document.selection.createRange().duplicate()
      r.moveEnd('character', o.value.length)
      if (r.text == '') return o.value.length
      return o.value.lastIndexOf(r.text)
    } else return o.selectionStart
  }

  function getSelectionEnd(o) {
    if (o.createTextRange) {
      var r = document.selection.createRange().duplicate()
      r.moveStart('character', -o.value.length)
      return r.text.length
    } else return o.selectionEnd
  }
  window.Cursor = {
    getSelectionStart : getSelectionStart,
    getSelectionEnd : getSelectionEnd
  };
})(window);