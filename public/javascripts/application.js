// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

// NameThat application in a box using Facebook APIs

function initApp() {
  //Check if already logged in
  FB.getLoginStatus(function(response) {
    if (response.session) {
      logged_in(response.session);
    }
    else {
      $("#fb-login").show();
      FB.Event.subscribe('auth.login', function(response) {
        logged_in(response.session);
      });
    }
  });
  $("#check").click(function() {
    checkAnswer();
  });
  $("#answer").keypress(function(e)
  {
    code = (e.keyCode ? e.keyCode : e.which);
    if (code == 33) {
      showNextPhoto();
      e.preventDefault();
    } else if (code == 35) {
      highlightPhoto();
      e.preventDefault();
    } else if (code == 62) {
      skipQuestion();
      e.preventDefault();
    } else if (code == 13) checkAnswer();
  });
  $("#skip-question").click(function() {
    skipQuestion();
  });
}

function logged_in(session) {
  $("#fb-login").hide();
  init_challenge(session);
}

var appstate = {};

function init_challenge(session) {
  $("#namethat-loading").show(); 

  //Add event handlers
  $("#next-photo").click(showNextPhoto);

  FB.api({
    method: "fql.query",
    query: "SELECT uid, name, pic_big FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me() LIMIT 1000)"
  },
  function(response) {
    appstate.friends = shuffle(response);
    startChallenge();
  }
  );
}

function startChallenge() {
  appstate.curFriendId = 0;
  appstate.correctAnswers = 0;
  appstate.totalAnswers = 0;
  showQuestion();
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]

shuffle = function(o){ //v1.0
  for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};

function showQuestion() {
  appstate.curFriendId = (appstate.curFriendId + 1) % appstate.friends.length;
  appstate.curFriend = appstate.friends[appstate.curFriendId];
  appstate.curFriend.curPhotoIdx = -1;
  $("#friend-photo").attr("src", $("#loading-image").attr("src"));
  $("#friend-photo").attr("src", appstate.curFriend.pic_big);
  $("#namethat-loading").hide();
  $("#namethat-app").show();
  $("#answer").val("");
  var percent = Math.round((appstate.correctAnswers / appstate.totalAnswers) * 100);
  if (appstate.totalAnswers === 0) percent = 100;
  $("#score").html(appstate.correctAnswers + " out of " + appstate.totalAnswers + " (" + percent + "%)");
  $("#answer").focus();
}

function showNextPhoto() {
  curFriend = appstate.curFriend;
  $("#friend-photo").attr("src", $("#loading-image").attr("src"));
  var photosLoaded = function() {
    if (curFriend.photos.length == 0) {
      showStatus("Sorry, no photos available :(", "info", true);
      $("#friend-photo").attr("src", appstate.curFriend.pic_big);
      return;
    }
    curFriend.curPhotoIdx = (curFriend.curPhotoIdx + 1) % curFriend.photos.length;
    $("#friend-photo").attr("src", curFriend.photos[curFriend.curPhotoIdx].src_big);
  };
  if (curFriend.photos === undefined) {
    FB.api({
      method: "fql.query",
      query: "SELECT pid, src_big FROM photo WHERE pid IN (SELECT pid FROM photo_tag WHERE subject=" + curFriend.uid + " LIMIT 50) LIMIT 20" },
      function(response) {
        curFriend.photos = response;
        photosLoaded(response);
      }
    );
  } else {
    photosLoaded(curFriend.photos);
  }
}

function checkAnswer() {
  var answer = $("#answer").val().toLowerCase();
  if (answer.length < 3) {
    showStatus("Enter a bit more than just " + answer.length + " character" + (answer.length == 1 ? "" : "s"), "info", true);
    return;
  }
  var name = appstate.curFriend.name;

  var components = answer.split(" ");
  var correct = true;
  for (var i in components) {
    if (name.toLowerCase().indexOf(components[i]) === -1) {
      correct = false;
      break;
    }
  }
  if (correct) {
    appstate.correctAnswers++;
    showStatus("Correct! That person was " + name + ".", "correct", true);
  } else {
    showStatus("Sorry!  That person was " + name + ".", "wrong", false);
  }
  appstate.totalAnswers++;
  showQuestion();
}

function skipQuestion() {
  showStatus("Question skipped... btw, that was " + appstate.curFriend.name + ".", "info", true);
  showQuestion();
}

function showStatus(text, klass, fade) {
  $("#status").stop(true, true).html(text);
  $("#status").removeClass("correct wrong info");
  $("#status").addClass(klass);
  $("#status").css({ opacity: 1});
  if (fade) {
    $("#status").delay(1200).animate({opacity: 0}, 500);
  }
}

function highlightPhoto() {
  curFriend = appstate.curFriend;

  if (curFriend.photos === undefined || curFriend.photos.length == 0) {
    showStatus("No tags available - sorry", "info", true);
    return;
  }
  FB.api({
    method: "fql.query",
    query: "SELECT xcoord, ycoord FROM photo_tag WHERE pid = " +curFriend.photos[curFriend.curPhotoIdx].pid + " AND subject = " + curFriend.uid + " LIMIT 1" },
    function(response) {
      if (response.length == 0) {
        showStatus("No tags available - sorry", "info", true);
        return;
      }
      var obj = response[0];
      var circle = $("#circle-image");
      var friendPhoto = $("#friend-photo");
      var pos = friendPhoto.position();
      var newtop = pos.top + obj.ycoord / 100.0 * friendPhoto.height() - 50;
      var newleft = pos.left + obj.xcoord / 100.0 * friendPhoto.width() - 50;
      circle.css({ top: newtop, left: newleft });
      circle.stop(true, true).show().delay(1000).fadeOut(500);
    }
  );
}
