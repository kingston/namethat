// File: application.js
// Description: Contains the main code for the NameThat application using the
// Facebook API
// Author: Kingston Tam

var nameThat = {
  settings: {
    maxFriends: 1000, // Maximum friends to load
    maxPhotos: 25, // Maximum number of photos to load per person
    connections: false // Use the connections table?
  },

  cachedFriends: null,

  cachedFriendLists: null,

  currentFriendList: null,

  challengeData: {},

  /**
  * Initializes the nameThat application.
  * @remarks Requires the FB object to have been initialized first.
  **/
  initialize: function() {
    // Check if user is already logged in
    FB.getLoginStatus(function(response) {
      $("#fb-loading").hide();
      if (response.status === 'connected') {
        nameThat._loggedInHandler(response.session);
      } else {
        $("#fb-login").show();
        FB.Event.subscribe('auth.login', function(response) {
          nameThat._loggedInHandler(response.session);
        });
      }
    });
    
    // Attach event handlers
    $("#next-photo").click(nameThat.showNextPhoto);
    $("#check-answer").click(nameThat.checkAnswer);
    $("body").keypress(nameThat._textEnterHandler);
    $("#skip-question").click(nameThat.skipQuestion);
    $("#tag-photo").click(nameThat.highlightPhoto);
    $("#options-link").click(nameThat.showOptionsPanel);
    $("#list-perms-link").click(nameThat.getFriendListPermissions);

    // Set up options dialog
    $("#options-panel").dialog({
      autoOpen: false,
      height: 300,
      width: 350,
      modal: true,
      open: nameThat.prepareOptionsDialog,
      buttons: {
        Cancel: function() { $(this).dialog("close") },
        "Save Changes": nameThat.saveChangesHandler
      }
    });

    // Make things pretty
    $("#check-answer").button({ icons: { primary: "ui-icon-check" } });
    $("#next-photo").button({ icons: { primary: "ui-icon-arrowreturnthick-1-s" } });
    $("#tag-photo").button({ icons: { primary: "ui-icon-tag" } });
    $("#skip-question").button( { icons: { primary: "ui-icon-seek-next" } });

    // Tooltips
    $(".action-button").tooltip();
  },

  _fetchFriends: function(responseHandler) {
    var maxFriends = nameThat.settings.maxFriends;
    var subQuery;
    if (nameThat.currentFriendList !== null) {
      subQuery = "SELECT uid FROM friendlist_member WHERE flid = " + nameThat.currentFriendList + " LIMIT " + maxFriends;
    } else if (nameThat.settings.connections) {
      subQuery = "SELECT target_id FROM connection WHERE source_id = me() AND target_type='user' LIMIT " + maxFriends;
    } else {
      subQuery = "SELECT uid2 FROM friend WHERE uid1 = me() LIMIT " + maxFriends;
    }
    FB.api({
      method: "fql.query",
      query: "SELECT uid, name, pic_big FROM user WHERE uid IN (" + subQuery + ")"
    },
    function(response) {
      nameThat.cachedFriends = response;
      responseHandler(response);
    });
  },

  /**
  * Gets called when the user is logged in
  **/
  _loggedInHandler: function(session) {
    $("#fb-login").hide();
    $("#namethat-loading").show(); 

    nameThat._fetchFriends(function(response) {
      if (response.length == 0 || response.hasOwnProperty('error_msg')) {
        $("#namethat-loading").hide();
        $("#error-pane").show();
        return;
      }
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
      case 49: // 1 
        nameThat.showNextPhoto();
        e.preventDefault();
        break;
      case 35: // #
      case 50: // 2
        nameThat.highlightPhoto();
        e.preventDefault();
        break;
      case 62: // >
      case 51: // 3
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
   * Populates the friend list data in the select box
   */
  _populateFriendList: function(response) {
    nameThat.cachedFriendLists = response;
    $("#friend-list option").remove();
    option = $("<option></option>").val("none").text("(all)");
    if (nameThat.currentFriendList === null) {
      option.attr('selected', 'selected');
    }
    $("#friend-list").append(option);
    for (var i = 0; i < response.length; i++) {
      friendList = response[i];
      option = $("<option></option>").val(friendList.flid).text(friendList.name)
      if (friendList.flid === nameThat.currentFriendList) {
        option.attr('selected', 'selected');
      }
      $("#friend-list").append(option);
    }
  },

  /**
   * Prepares the data in the options panel
   */
  prepareOptionsDialog: function() {
    if (nameThat.cachedFriendLists === null) {
      FB.api({
        method: "fql.query",
        query: "SELECT flid, name FROM friendlist WHERE owner=me()"},
        nameThat._populateFriendList
      );
      // Fire a simulataneous query to see if we have permission
      FB.api("/me/permissions", function(response) {
        permissions = response.data[0];
        if (!permissions.hasOwnProperty("read_friendlists")) {
          $("#friend-list").hide();
          $("#list-perms-link").show();
        }
      });
    } else {
      nameThat._populateFriendList(nameThat.cachedFriendLists);
    }
  },

  /**
   * Handles when the user wants to authorize friend lists
   */
  getFriendListPermissions: function() {
    FB.login(function(response) {
      if (response.authResponse) {
        $('#list-perms-link').hide();
        $('#friend-list').show();
        // A little bit of repeat code (REFACTOR)
        FB.api({
          method: "fql.query",
          query: "SELECT flid, name FROM friendlist WHERE owner=me()"},
          nameThat._populateFriendList
        );
      }
    }, {scope: 'read_friendlists'});
  },

  /**
   * Shows the options panel to the user
   */
  showOptionsPanel: function() {
    $("#options-panel").dialog("open");
    return false;
  },

  /**
   * Handles when save changes is pressed on the options panel
   */
  saveChangesHandler: function() {
    // do stuff
    var oldFriendList = nameThat.currentFriendList;
    var newFriendList = $("#friend-list option:selected").val();
    newFriendList = newFriendList === "none" ? null : newFriendList;
    if (oldFriendList !== newFriendList) {
      if (!confirm("Changing the friend list will reset the challenge.  Continue?")) {
        return;
      }
      nameThat.currentFriendList = newFriendList;
      nameThat._fetchFriends(function(response) {
        nameThat.startChallenge();
      });
    }
    $(this).dialog("close");
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
