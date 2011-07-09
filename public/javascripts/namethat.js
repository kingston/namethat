// File: application.js
// Description: Contains the main code for the NameThat application using the
// Facebook API
// Author: Kingston Tam

var nameThat = {
  settings: {
    maxFriends: 1000, // Maximum friends to load
    maxPhotos: 25, // Maximum number of photos to load per person
    conections: true // Use the connections table?
  },

  cachedFriends: null,

  challengeData: {},

  /**
  * Initializes the nameThat application.
  * @remarks Requires the FB object to have been initialized first.
  **/
  initialize: function() {
    // Check if user is already logged in
    FB.getLoginStatus(function(response) {
      $("#fb-loading").hide();
      if (response.session) {
        nameThat._loggedInHandler(response.session);
      }
      else {
        $("#fb-login").show();
        FB.Event.subscribe('auth.login', function(response) {
          nameThat._loggedInHandler(response.session);
        });
      }
    });
    
    // Attach event handlers
    $("#next-photo").click(nameThat.showNextPhoto);
    $("#check").click(nameThat.checkAnswer);
    $("#answer").keypress(nameThat._textEnterHandler);
    $("body").keypress(nameThat._textEnterHandler);
    $("#skip-question").click(nameThat.skipQuestion);
    $("#tag-photo").click(nameThat.highlightPhoto);
  },

  /**
  * Gets called when the user is logged in
  **/
  _loggedInHandler: function(session) {
    $("#fb-login").hide();
    $("#namethat-loading").show(); 

    // Load friends
    var maxFriends = nameThat.settings.maxFriends;
    var subQuery;
    if (nameThat.settings.connections) {
      subQuery = "SELECT uid2 FROM friend WHERE uid1 = me() LIMIT " + maxFriends;
    } else {
      subQuery = "SELECT target_id FROM connection WHERE source_id = me() AND target_type='user' LIMIT " + maxFriends;
    }
    FB.api({
      method: "fql.query",
      query: "SELECT uid, name, pic_big FROM user WHERE uid IN (" + subQuery + ")"
    },
    function(response) {
      if (response.length == 0) {
        $("#namethat-loading").hide();
        $("#error-pane").show();
        return;
      }
      nameThat.cachedFriends = response;
      $("#namethat-loading").hide();
      $("#namethat-app").show();
      nameThat.startChallenge();
    });
  },

  /**
  * Handles keyboard shortcuts when in the textbox
  **/
  _textEnterHandler: function(e) {
    code = (e.keyCode ? e.keyCode : e.which);
    var preventDefault = true;
    switch (code) {
      case 33: // ! 
        nameThat.showNextPhoto();
        e.preventDefault();
        break;
      case 35: // #
        nameThat.highlightPhoto();
        e.preventDefault();
        break;
      case 62: // >
        nameThat.skipQuestion();
        e.preventDefault();
        break;
      case 13: // Enter
        nameThat.checkAnswer();
        e.preventDefault();
        break;
      default:
        preventDefault = false;
    }
    if (preventDefault) {
      e.preventDefault();
    }
  },

  /**
   * Starts the NameThat challenge
   **/
  startChallenge: function() {
    nameThat.challengeData = {
      friends: utils.shuffle(nameThat.cachedFriends),
      curFriendId: 0,
      correctAnswers: 0,
      totalAnswers: 0
    };
    nameThat.showQuestion();
  },

  /**
   * Shows a new question
   **/
  showQuestion: function() {
    var data = nameThat.challengeData;
    
    data.curFriendId = (data.curFriendId + 1) % data.friends.length;
    data.curFriend = data.friends[data.curFriendId];
    data.curFriend.curPhotoIdx = -1;

    $("#friend-photo").attr("src", $("#loading-image").attr("src"));
    $("#friend-photo").attr("src", data.curFriend.pic_big);
    $("#answer").val("");
    $("#circle-image").stop(true, true).hide();

    // Update score
    var percent = Math.round((data.correctAnswers / data.totalAnswers) * 100);
    if (data.totalAnswers === 0) percent = 100;
    $("#score").html(data.correctAnswers + " out of " + data.totalAnswers + " (" + percent + "%)");

    $("#answer").focus();
  },

  /**
   * Shows the next photo tagged, loading if necessary
   **/
  showNextPhoto: function() {
    curFriend = nameThat.challengeData.curFriend;
    $("#friend-photo").attr("src", $("#loading-image").attr("src"));
    var photosLoaded = function() {
      if (curFriend.photos.length == 0) {
        nameThat.showStatus("Sorry, no photos available :(", "info", true);
        $("#friend-photo").attr("src", nameThat.challengeData.curFriend.pic_big);
        return;
      }
      curFriend.curPhotoIdx = (curFriend.curPhotoIdx + 1) % curFriend.photos.length;
      $("#friend-photo").attr("src", curFriend.photos[curFriend.curPhotoIdx].src_big);
    };
    if (curFriend.photos === undefined) {
      var maxPhotos = nameThat.settings.maxPhotos;
      FB.api({
        method: "fql.query",
        query: "SELECT pid, src_big FROM photo WHERE pid IN (SELECT pid FROM photo_tag WHERE subject='" + curFriend.uid + "' ORDER BY created DESC LIMIT " + (maxPhotos * 2) + ") LIMIT " + maxPhotos },
        function(response) {
          curFriend.photos = response;
          photosLoaded(response);
        }
      );
    } else {
      photosLoaded(curFriend.photos);
    }
    $("#answer").focus();
  },

  /**
   * Checks the answer with the friend's name
   **/
  checkAnswer: function() {
    var answer = utils.removeDiacritics($("#answer").val().toLowerCase());
    if (answer.length < 3) {
      nameThat.showStatus("Enter a bit more than just " + answer.length + " character" + (answer.length == 1 ? "" : "s"), "info", true);
      return;
    }
    var name = nameThat.challengeData.curFriend.name;

    var components = answer.split(" ");
    var correct = true;
    var normalizedName = utils.removeDiacritics(name.toLowerCase()); 
    for (var i in components) {
      if (normalizedName.indexOf(components[i]) === -1) {
        correct = false;
        break;
      }
    }
    if (correct) {
      nameThat.challengeData.correctAnswers++;
      nameThat.showStatus("Correct! That person was " + name + ".", "correct", true);
    } else {
      nameThat.showStatus("Sorry!  That person was " + name + ".", "wrong", false);
    }
    nameThat.challengeData.totalAnswers++;
    nameThat.showQuestion();
  },

  /**
   * Skips the question without testing the user's answer
   **/
  skipQuestion: function() {
    nameThat.showStatus("Question skipped... btw, that was " + nameThat.challengeData.curFriend.name + ".", "info", true);
    nameThat.showQuestion();
  },

  /**
   * Shows a status message on the application window and hides it after
   * a period of time
   **/
  showStatus: function(text, klass, fade) {
    $("#status").stop(true, true).html(text);
    $("#status").removeClass("correct wrong info");
    $("#status").addClass(klass);
    $("#status").css({ opacity: 1});
    if (fade) {
      $("#status").delay(1200).animate({opacity: 0}, 500);
    }
  },

  /**
   * Shows where the user was tagged if possible
   **/
  highlightPhoto: function() {
    curFriend = nameThat.challengeData.curFriend;

    if (curFriend.photos === undefined || curFriend.photos.length == 0) {
      nameThat.showStatus("No tags available - sorry", "info", true);
      return;
    }
    FB.api({
      method: "fql.query",
      query: "SELECT xcoord, ycoord FROM photo_tag WHERE pid = '" +curFriend.photos[curFriend.curPhotoIdx].pid + "' AND subject = '" + curFriend.uid + "' LIMIT 1" },
      function(response) {
        if (response.length == 0) {
          nameThat.showStatus("No tags available - sorry", "info", true);
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
}
