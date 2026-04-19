const socket = io();
// Duplicate so react can find it and name it nicely.
const socket_ = socket;

// grab our username from the username assigned by server in EJS file.
const ownUsername = $('#originalUsername')[0].innerText;

// register all buttons here for easier access
// less problems on debugging
const buttons = {
  red: '#red-button',
  green: '#green-button',
  claim: '#claimButton',
};

const responsiveLayoutHelpers = window.ProAvalonLobbyLayout || {};
let responsiveLayoutTimeout;
const DEFAULT_ROOM_CARD_SCALE = 100;
const MIN_ROOM_CARD_SCALE = 70;
const MAX_ROOM_CARD_SCALE = 130;
const ROOM_CARD_BASE_WIDTH = 146;
const ROOM_CARD_BASE_HEIGHT = 176;

function getRoomCardScalePercent() {
  const parsed = parseInt(docCookies.getItem('optionDisplayRoomCardScale'), 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_ROOM_CARD_SCALE;
  }

  return Math.min(MAX_ROOM_CARD_SCALE, Math.max(MIN_ROOM_CARD_SCALE, parsed));
}

function applyRoomCardScaleVariables() {
  const scaleMultiplier = getRoomCardScalePercent() / 100;
  const preferredWidth = Math.round(ROOM_CARD_BASE_WIDTH * scaleMultiplier);
  const preferredHeight = Math.round(ROOM_CARD_BASE_HEIGHT * scaleMultiplier);

  document.documentElement.style.setProperty(
    '--room-player-card-preferred-width',
    `${preferredWidth}px`
  );
  document.documentElement.style.setProperty(
    '--room-player-card-preferred-height',
    `${preferredHeight}px`
  );
}

function updateRoomCardScaleControlState(modernEnabled) {
  const modernCardsChecked = modernEnabled === true;
  const scaleSlider = $('#option_display_room_card_scale')[0];
  const avatarHeightInput = $('#option_display_avatar_container_height_text')[0];

  if (scaleSlider) {
    scaleSlider.disabled = modernCardsChecked === false;
  }

  if (avatarHeightInput) {
    avatarHeightInput.disabled = modernCardsChecked === true;
  }
}

function isMobileViewport() {
  return (
    responsiveLayoutHelpers.isMobileViewport &&
    responsiveLayoutHelpers.isMobileViewport()
  );
}

function syncGamePaneLayout() {
  const resizeParent = $('#div1Resize').parent();
  if (!resizeParent[0]) {
    return;
  }

  const parentWidth = resizeParent.width();
  if (parentWidth && Math.abs($('#div1Resize').width() - parentWidth) > 1) {
    $('#div1Resize').width(parentWidth);
  }

  if (isRoomPlayerCardsEnabled()) {
    $('#div1Resize').css('height', 'auto');
    $('#div2Resize').css('height', 'auto');

    if ($('#div1Resize').hasClass('ui-resizable')) {
      try {
        $('#div1Resize').resizable('disable');
      } catch (error) {
        // Ignore until the resizable widget is fully initialised.
      }
    }

    return;
  }

  if (isMobileViewport()) {
    const mobileRoomHeight = Math.max(
      260,
      Math.min(Math.round(window.innerHeight * 0.38), 420)
    );
    $('#div1Resize').height(mobileRoomHeight);
  } else {
    const storedHeight = parseInt(
      docCookies.getItem('optionDisplayHeightOfAvatarContainer'),
      10
    );
    const rootStyles = window.getComputedStyle(document.documentElement);
    const cardHeight =
      parseFloat(rootStyles.getPropertyValue('--room-player-card-height')) ||
      168;
    const roomPadding =
      parseFloat(rootStyles.getPropertyValue('--space-xl')) * 2 || 48;
    const missionTrackReserve = 76;
    const minimumBoardHeight = Math.ceil(
      cardHeight + roomPadding + missionTrackReserve
    );
    const roomContainer = document.querySelector('.room-container');
    const roomGap = roomContainer
      ? parseFloat(
          window.getComputedStyle(roomContainer).rowGap ||
            window.getComputedStyle(roomContainer).gap ||
            '0'
        ) || 0
      : 0;
    const topBarHeight = $('.roomInfoBar:visible').outerHeight(true) || 0;
    const bottomBarHeight = $('.roomHeaderButtons:visible').outerHeight(true) || 0;
    const requestedBoardHeight =
      !Number.isNaN(storedHeight) && storedHeight > 0 ? storedHeight : 260;
    const boardHeight = Math.max(requestedBoardHeight, minimumBoardHeight);
    const desktopRoomHeight = Math.max(
      410,
      boardHeight + topBarHeight + bottomBarHeight + roomGap * 2
    );

    $('#div1Resize').height(desktopRoomHeight);
  }

  $('#div2Resize').height(
    Math.max(0, resizeParent.height() - $('#div1Resize').height())
  );

  if ($('#div1Resize').hasClass('ui-resizable')) {
    try {
      $('#div1Resize').resizable(isMobileViewport() ? 'disable' : 'enable');
    } catch (error) {
      // Ignore until the resizable widget is fully initialised.
    }
  }
}

function refreshResponsiveLayout(redraw = false) {
  if (responsiveLayoutHelpers.applyResponsiveState) {
    responsiveLayoutHelpers.applyResponsiveState();
  }

  applyRoomCardScaleVariables();
  syncGamePaneLayout();
  updateTwoTabs(docCookies.getItem('optionDisplayTwoTabs') === 'true');
  extendTabContentToBottomInRoom();
  checkStatusBarWithHeight();

  if (redraw === true && roomPlayersData) {
    draw();
  } else if (responsiveLayoutHelpers.applyRoomLayoutClasses) {
    responsiveLayoutHelpers.applyRoomLayoutClasses(
      isRoomPlayerCardsEnabled(),
      getRoomPlayerDivs().length
    );
  }
}

function scheduleResponsiveLayoutRefresh(redraw = false, delay = 0) {
  clearTimeout(responsiveLayoutTimeout);
  responsiveLayoutTimeout = setTimeout(() => {
    refreshResponsiveLayout(redraw);
  }, delay);
}

setInterval(() => {
  const emptyTime = '--:--';

  const setGameTimer = (string) => {
    const gameTimer = $('.gameTimer')[0];
    if (!gameTimer) {
      return;
    }

    gameTimer.innerText = string;

    let isUrgent = false;
    if (string !== emptyTime) {
      const mins = parseInt(string.slice(0, 2), 10);
      const secs = parseInt(string.slice(-2), 10);
      isUrgent = mins === 0 && secs < 30;
    }

    gameTimer.classList.toggle('badge-game--urgent', isUrgent);
  }

  if (gameData && gameData.dateTimerExpires) {
    const dateTimerExpires = new Date(gameData.dateTimerExpires)

    if (dateTimerExpires.getTime() === new Date(0).getTime()) {
      setGameTimer(emptyTime);
    }
    else {
      const currentTime = new Date();
      const timeDiff = new Date(dateTimerExpires - currentTime);

      if (timeDiff < 0) {
        setGameTimer('00:00');
      }
      else {
        const padZero = (str) => {
          if (str.length === 1) {
            str = '0' + str;
          }
          return str;
        }
        let mins = padZero(timeDiff.getUTCMinutes().toString());
        let secs = padZero(timeDiff.getUTCSeconds().toString());

        setGameTimer( mins+ ':' + secs);
      }
    }
  }
  else {
    setGameTimer(emptyTime);
  }
}, 100);

// when the navbar is closed, re-extend the tab content to bottom.
$('.navbar-collapse').on('hidden.bs.collapse', () => {
  scheduleResponsiveLayoutRefresh(false, 10);
});

window.addEventListener('load', () => {
  scheduleResponsiveLayoutRefresh(false, 50);
});

// for the game
let roomPlayersData;
let roomSpectatorsData;
let seeData;
let gameData;
let roomInfoData;
let roomId;
let publicRoomId;
let roomJoinRef;
let gameStarted = false;

let isSpectator = false;

const DEFAULT_LISTED_EMPTY_ROOM_TTL_MINUTES = 10;
const DEFAULT_UNLISTED_EMPTY_ROOM_TTL_MINUTES = 72 * 60;

function getDefaultEmptyRoomTTLMinutes(isListedInLobby) {
  return isListedInLobby
    ? DEFAULT_LISTED_EMPTY_ROOM_TTL_MINUTES
    : DEFAULT_UNLISTED_EMPTY_ROOM_TTL_MINUTES;
}

function getRoomRefFromUrl() {
  const url = new URL(window.location.href);
  const publicRoomRef = url.searchParams.get('room');
  if (publicRoomRef) {
    return publicRoomRef;
  }

  const roomIdStr = url.searchParams.get('roomId');
  if (!roomIdStr) {
    return undefined;
  }

  const parsed = parseInt(roomIdStr, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function setRoomUrl(nextRoomRef) {
  if (nextRoomRef === undefined || nextRoomRef === null || nextRoomRef === '') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('room', nextRoomRef.toString());
  url.searchParams.delete('roomId');
  window.history.replaceState({}, '', url.toString());
}

function setLobbyUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.delete('roomId');
  window.history.replaceState({}, '', url.toString());
}

function copyTextHttpSafe(text) {
  if (!text) {
    return false;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'readonly');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  let copied = false;

  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }

  document.body.removeChild(textArea);
  return copied;
}

function isCurrentUserHost() {
  return roomInfoData && roomInfoData.isHost === true;
}

function isRoomPlayerCardsEnabled() {
  return docCookies.getItem('optionDisplayRoomPlayerCards') === 'true';
}

function getRoomPlayerDivs() {
  return document.querySelectorAll('#mainRoomBox > .playerDiv');
}

function getRoomPlayerDiv(index) {
  return getRoomPlayerDivs()[index];
}

// window resize, refresh responsive layout and repaint room users when needed.
window.addEventListener('resize', () => {
  scheduleResponsiveLayoutRefresh(Boolean(roomPlayersData), 25);
});

//= =====================================
// FUNCTIONS
//= =====================================

let highlightedAvatars;
function draw() {
  // console.log("draw called");
  if (roomPlayersData) {
    highlightedAvatars = getHighlightedAvatars();

    drawAndPositionAvatars();
    drawClaimingPlayers(roomPlayersData.claimingPlayers);

    setTimeout(() => {
      // Enable the tooltip for hammer after 2 seconds for the screen to load and reposition
      $('.hammerSpan').tooltip();
    }, 2000);

    drawTeamLeader();
    drawMiddleBoxes();
    drawGuns();
    runPublicDataAvalon(gameData);

    scaleGameComponents();

    // default greyed out rn
    // enableDisableButtons();

    // console.log(highlightedAvatars);
    restoreHighlightedAvatars(highlightedAvatars);

    if (gameStarted === true) {
      drawExitedPlayers(gameData.gamePlayersInRoom);

      if (gameData.finished !== true) {
        $('#missionsBox').removeClass('invisible');

        // give it the default status message
        setStatusBarText(gameData.statusMessage);

        // draw the votes if there are any to show
        drawVotes(gameData.votes);

        if (typeof gameData.numSelectTargets === 'number') {
          if (
            gameData.numSelectTargets !== 0 &&
            gameData.numSelectTargets !== null
          ) {
            if (gameData.prohibitedIndexesToPicks) {
              enableSelectAvatars(gameData.prohibitedIndexesToPicks);
            } else {
              enableSelectAvatars();
            }
          }
        } else if (
          typeof gameData.numSelectTargets === 'object' &&
          gameData.numSelectTargets !== undefined &&
          gameData.numSelectTargets !== null
        ) {
          if (
            gameData.numSelectTargets[0] !== 0 &&
            gameData.numSelectTargets !== null
          ) {
            if (gameData.prohibitedIndexesToPicks) {
              enableSelectAvatars(gameData.prohibitedIndexesToPicks);
            } else {
              enableSelectAvatars();
            }
          }
        }
      }
    } else {
      // TODO REMOVE THIS LATER
      // if we are the host
      if (ownUsername === getUsernameFromIndex(0)) {
        currentOptions = getOptions();
        let str = '';

        currentOptions.forEach((element) => {
          str += `${element}, `;
        });

        // remove the last , and replace with .
        str = str.slice(0, str.length - 2);
        str += '.';

        setStatusBarText(`Current roles: ${str}`);
      } else {
        setStatusBarText('Waiting for game to start... ');
      }
    }

    activateAvatarButtons();
    enableDisableButtons();
    if (gameData) {
      checkSelectAvatarButtons(gameData.numSelectTargets);
    }
  } else {
    $('#mainRoomBox')[0].innerHTML = '';
  }
}

let selectedAvatars = {};
const numOfStatesOfHighlight = 3;
const selectedChat = {};
let playerInvestigations = {};
function activateAvatarButtons() {
  // console.log("activate avatar buttons");
  // console.log("LOL");
  // if(OPTION THING ADD HERE){
  const highlightButtons = document.querySelectorAll(
    '#mainRoomBox .avatarButton--highlight-player'
  );
  // add the event listeners for button press

  // console.log("added " + highlightButtons.length + " many listeners for highlightbuttons");

  for (var i = 0; i < highlightButtons.length; i++) {
    highlightButtons[i].addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      const playerDiv = this.closest('.playerDiv');
      if (!playerDiv) {
        return;
      }

      const username = playerDiv.getAttribute('usernameofplayer');
      if (!username) {
        return;
      }

      if (selectedAvatars[username] !== undefined) {
        selectedAvatars[username] += 1;
      } else {
        selectedAvatars[username] = 1;
      }

      selectedAvatars[username] =
        selectedAvatars[username] % (numOfStatesOfHighlight + 1);
      draw();
    });
  }

  const highlightChatButtons = document.querySelectorAll(
    '#mainRoomBox .avatarButton--highlight-chat'
  );
  // add the event listeners for button press
  for (var i = 0; i < highlightChatButtons.length; i++) {
    highlightChatButtons[i].addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      const playerDiv = this.closest('.playerDiv');
      if (!playerDiv) {
        return;
      }

      const username = playerDiv.getAttribute('usernameofplayer');
      const anonUsername = playerDiv.getAttribute('anonusernameofplayer');
      const chatItems = $(`.room-chat-list li span[username='${username}']${anonUsername ? `, .room-chat-list li span[username='${anonUsername}']` : ''}`);

      let playerHighlightColour = docCookies.getItem(
        `player${getIndexFromUsername(username)}HighlightColour`
      );

      const setHighlightColorToYellow = $('.setHighlightColorsToYellow')[0]
        .checked;

      if (setHighlightColorToYellow === true) {
        playerHighlightColour = '#ffff9e';
      }

      // console.log("Player highlight colour: " + playerHighlightColour);

      if (selectedChat[username] === true) {
        selectedChat[username] = false;
        chatItems.css('background-color', 'transparent');
        chatItems.css('color', '');
      } else {
        // console.log("set true");
        selectedChat[username] = true;
        chatItems.css('background-color', `${playerHighlightColour}`);
        chatItems.css('color', '#333');
      }
      draw();
    });
  }
}

function drawVotes(votes) {
  const divs = getRoomPlayerDivs();

  if (votes) {
    for (var i = 0; i < divs.length; i++) {
      if (votes[i] === 'approve') {
        $(getRoomPlayerDiv(i))
          .find('.approveLabel')
          .removeClass('invisible');
      }
      if (votes[i] === 'reject') {
        $(getRoomPlayerDiv(i))
          .find('.rejectLabel')
          .removeClass('invisible');
      }
      // document.querySelectorAll("#mainRoomBox div")[i].classList.add(votes[i]);
    }
  } else {
    for (var i = 0; i < divs.length; i++) {
      // document.querySelectorAll("#mainRoomBox div")[i].classList.remove("approve");
      // document.querySelectorAll("#mainRoomBox div")[i].classList.remove("reject");

      $(getRoomPlayerDiv(i)).find('.approveLabel').addClass('invisible');
      $(getRoomPlayerDiv(i)).find('.rejectLabel').addClass('invisible');
    }
  }
}

function enableSelectAvatars(prohibitedIndexesToPicks) {
  const divs = getRoomPlayerDivs();
  // add the event listeners for button press
  for (let i = 0; i < divs.length; i++) {
    if (
      prohibitedIndexesToPicks === undefined ||
      prohibitedIndexesToPicks.includes(i) === false
    ) {
      divs[i].addEventListener('click', function () {
        // console.log("avatar pressed");
        // toggle the highlight class
        this.classList.toggle('highlight-avatar');
        // change the pick team button to enabled/disabled
        checkSelectAvatarButtons(gameData.numSelectTargets);
      });
    }
  }
  // checkSelectAvatarButtons(gameData.numSelectTargets);
}

function drawMiddleBoxes() {
  const missionBoxes = document.querySelectorAll('.missionBox');
  const pickBoxes = document.querySelectorAll('.pickBox');

  if (gameData) {
    const currentMissionIndex = Math.min(gameData.missionHistory.length, 4);

    for (let i = 0; i < 5; i++) {
      const missionBox = missionBoxes[i];
      const pickBox = pickBoxes[i];
      const missionStatus = gameData.missionHistory[i];

      missionBox.classList.remove('missionBoxSucceed', 'missionBoxFail', 'missionBoxCurrent');

      if (missionStatus === 'succeeded') {
        missionBox.classList.add('missionBoxSucceed');
      } else if (missionStatus === 'failed') {
        missionBox.classList.add('missionBoxFail');
      } else if (i === currentMissionIndex) {
        missionBox.classList.add('missionBoxCurrent');
      }

      const numPlayersOnMission = gameData.numPlayersOnMission[i];
      if (numPlayersOnMission) {
        const numPlayersInGame = gameData.playerUsernamesOrdered.length;
        const numToInsert =
          numPlayersInGame >= 7 && i === 3
            ? `${numPlayersOnMission.toString()}*`
            : numPlayersOnMission.toString();

        missionBox.innerHTML = `<p>${numToInsert}</p>`;
      } else {
        missionBox.innerHTML = `<p></p>`;
      }

      if (i < gameData.pickNum) {
        pickBox.classList.add('pickBoxFill');
      } else {
        pickBox.classList.remove('pickBoxFill');
      }
    }
  } else {
    for (let j = 0; j < 5; j++) {
      missionBoxes[j].classList.remove('missionBoxFail', 'missionBoxSucceed', 'missionBoxCurrent');
      missionBoxes[j].innerText = '';
      pickBoxes[j].classList.remove('pickBoxFill');
    }
  }
}

const playerDivHeightPercent = 30;

function resetPlayerDivInlineLayout(divs) {
  divs.forEach((div) => {
    div.style.left = '';
    div.style.bottom = '';
    div.style.width = '';
    div.style.height = '';
    div.style.transform = '';
  });
}

function drawAndPositionAvatars() {
  applyRoomCardScaleVariables();
  const w = $('#mainRoomBox').width();
  const h = $('#mainRoomBox').height();

  const numPlayers = roomPlayersData.length; // 3;

  // generate the divs in the html
  let str = '';
  // console.log("Game started: " + gameStarted);
  if (gameStarted === true) {
    // draw the players according to what the client sees (their role sees)
    for (var i = 0; i < numPlayers; i++) {
      // check if the user is on the spy list.
      // if they are, they are spy
      if (
        gameData.see &&
        gameData.see.spies &&
        gameData.see.spies.indexOf(roomPlayersData[i].username) !== -1
      ) {
        str += strOfAvatar(roomPlayersData[i], 'spy');
      }
      // else they are a res
      else {
        str += strOfAvatar(roomPlayersData[i], 'res');
      }
    }
  }
  // when game has not yet started, everyone is a res image
  else {
    for (var i = 0; i < numPlayers; i++) {
      str += strOfAvatar(roomPlayersData[i], 'res');
    }
  }

  // set the divs into the box
  $('#mainRoomBox').html(str);
  const roomPlayerCardsEnabled = isRoomPlayerCardsEnabled();
  $('#mainRoomBox').toggleClass(
    'room-player-cards-enabled',
    roomPlayerCardsEnabled
  );

  //= ==============================================
  // POSITIONING SECTION
  //= ==============================================

  // set the positions and sizes
  // console.log("numPlayers: " + numPlayers)
  const divs = Array.from(getRoomPlayerDivs());
  const roomLayoutMode = responsiveLayoutHelpers.applyRoomLayoutClasses
    ? responsiveLayoutHelpers.applyRoomLayoutClasses(
        roomPlayerCardsEnabled,
        numPlayers
      )
    : roomPlayerCardsEnabled
    ? 'desktop-modern'
    : 'desktop-legacy';

  resetPlayerDivInlineLayout(divs);

  if (roomLayoutMode === 'mobile-modern' || roomLayoutMode === 'mobile-legacy') {
    return;
  }

  if (roomLayoutMode === 'desktop-modern') {
    positionPlayerCards(divs, w, h);
    return;
  }

  let scaleWidthDown;
  if (numPlayers === 6) {
    scaleWidthDown = 0.8;
  } else {
    scaleWidthDown = 0.8;
  }
  const scaleHeightDown = 1;

  const a = (w / 2) * scaleWidthDown;
  const b = (h / 2) * scaleHeightDown;

  const playerLocations = generatePlayerLocations(numPlayers, a, b);

  for (var i = 0; i < numPlayers; i++) {
    // console.log("player position: asdflaksdjf;lksjdf");
    const offsetX = w / 2;
    let offsetY = h / 2;

    // reduce the height so that the bottom of avatars dont crash into the bottom.
    offsetY *= 1;

    // console.log("offsetY: " + offsetY);

    const strX = `${playerLocations.x[i] + offsetX}px`;
    const strY = `${playerLocations.y[i] + offsetY}px`;

    divs[i].style.left = strX;
    divs[i].style.bottom = strY;

    const ratioXtoY = 1;

    divs[i].style.height = `${playerDivHeightPercent}%`;

    const maxAvatarHeight = $('#option_display_max_avatar_height')[0].value;
    // console.log($(divs[i]).height());
    if ($(divs[i]).height() > maxAvatarHeight) {
      divs[i].style.height = `${maxAvatarHeight}px`;
    }

    // was trying to set width of div to be same as length of text but that doesnt work
    // cos guns also expand.

    //   if($($(divs[i])[0]).find(".role-p")[0] ){
    //     var canvas = document.createElement("canvas");
    //     var ctx=canvas.getContext("2d");

    //     ctx.font = $("#option_display_font_size_text").val(); + "px";
    //     var roleHere = $($(divs[i])[0]).find(".role-p")[0].innerHTML;
    //     console.log($($(divs[i])[0]).find(".role-p")[0].innerHTML);

    //     var widthOfRole = ctx.measureText(roleHere).width;

    //     if(divs[i].offsetHeight < widthOfRole){
    //         divs[i].style.width =  widthOfRole + "px";

    //         if($($(divs[i])[0]).find(".gun")[0] ){
    //             $($(divs[i])[0]).find(".gun")[0].height(divs[i].offsetHeight + "px");
    //         }

    //       }
    //   }

    //   var canvas = document.createElement("canvas");
    //   var ctx=canvas.getContext("2d");
    //   var roleHere = $($(divs[i]).find(".role-p")).innerHTML;
    //   var widthOfRole = Math.floor(ctx.measureText(roleHere).width);

    divs[i].style.width = `${divs[i].offsetHeight * ratioXtoY}px`;

    const divHeightPos = $(divs[i]).position().top * 1.4;
    const translateValue = (-100 / (2 * b)) * (divHeightPos - 2 * b);

    $(divs[i]).css('transform', `translate(-50%, ${translateValue}%)`);

    // //size of the avatar img
    // divs[i].style.width = 30 + "%";
    // divs[i].style.height = 30 + "%";

    // //get which one is smaller, width or height and then
    // //force square
    // if(divs[i].offsetWidth < divs[i].offsetHeight){
    //     divs[i].style.height = divs[i].offsetWidth + "px";
    //     // console.log("width smaller, make height smaller to square");
    // } else{
    //     divs[i].style.width = divs[i].offsetHeight + "px";
    //     // console.log("height smaller, make width smaller to square");
    // }
  }
}

function positionPlayerCards(divs, w, h) {
  const numPlayers = divs.length;
  if (numPlayers === 0) {
    return;
  }

  const rootStyles = window.getComputedStyle(document.documentElement);
  const preferredWidth =
    parseFloat(rootStyles.getPropertyValue('--room-player-card-preferred-width')) ||
    ROOM_CARD_BASE_WIDTH;
  const preferredHeight =
    parseFloat(rootStyles.getPropertyValue('--room-player-card-preferred-height')) ||
    ROOM_CARD_BASE_HEIGHT;
  const cardGap = Math.max(12, Math.min(20, w * 0.015));
  const horizontalPadding = Math.max(12, Math.min(32, w * 0.03));
  const usableWidth = Math.max(w - horizontalPadding * 2, 120);
  const actualCardWidth = Math.max(96, Math.min(preferredWidth, usableWidth));
  const columns = Math.max(
    1,
    Math.min(
      numPlayers,
      Math.floor((usableWidth + cardGap) / (actualCardWidth + cardGap))
    )
  );
  const rowCount = Math.ceil(numPlayers / columns);
  const cardHeight = Math.round(
    preferredHeight * (actualCardWidth / preferredWidth)
  );
  const maxGridWidth =
    columns * actualCardWidth + Math.max(columns - 1, 0) * cardGap;
  const singleRow = rowCount === 1;

  $('#mainRoomBox').toggleClass('room-cards-single-row', singleRow);
  $('#mainRoomBox').toggleClass('room-cards-multi-row', rowCount > 1);
  $('#mainRoomBox').css('--room-grid-columns', `${columns}`);
  $('#mainRoomBox').css('--room-grid-max-width', `${maxGridWidth}px`);
  $('#mainRoomBox').css('--room-player-card-width', `${actualCardWidth}px`);
  $('#mainRoomBox').css('--room-player-card-height', `${cardHeight}px`);
  $('#mainRoomBox').css('--room-player-card-gap', `${cardGap}px`);
}

let lastPickNum = 0;
let lastMissionNum = 0;
function drawGuns() {
  if (isRoomPlayerCardsEnabled() || isMobileViewport()) {
    $('.gun').css('visibility', 'hidden');
    $('.gun').removeClass('gunAfter');
    $('.gun').addClass('gunBefore');
    return;
  }

  if (!getRoomPlayerDiv(0)) {
    return;
  }

  $('.gun').css('visibility', '');
  $('.gun img').css('width', `${$(getRoomPlayerDiv(0)).width()}px`);
  $('.gun').css('width', `${$(getRoomPlayerDiv(0)).width()}px`);

  if (gameData && gameData.phase) {
    if (gameData.toShowGuns === false) {
      $('.gun').css('left', '50%');
      $('.gun').css('top', '50%');
      $('.gun').css('transform', 'translate(-50%,-50%)');
      $('.gun').removeClass('gunAfter');
      $('.gun').addClass('gunBefore');
    }
  } else {
    $('.gun').css('left', '50%');
    $('.gun').css('top', '50%');
    $('.gun').css('transform', 'translate(-50%,-50%)');
    $('.gun').removeClass('gunAfter');
    $('.gun').addClass('gunBefore');
  }

  if (
    gameData &&
    (lastPickNum !== gameData.pickNum || lastMissionNum !== gameData.missionNum)
  ) {
    // $(".gun").css("width", $("#mainRoomBox div").width() + "px");
    $('.gun').css('left', '50%');
    $('.gun').css('top', '50%');
    $('.gun').css('transform', 'translate(-50%,-50%)');
    $('.gun').removeClass('gunAfter');
    $('.gun').addClass('gunBefore');

    if (gameData && gameData.proposedTeam) {
      // gameData.propsedTeam
      for (let i = 0; i < gameData.proposedTeam.length; i++) {
        // console.log("not hidden stuff");
        // set the div string and add the gun

        const widOfGun = $('.gun').width();
        const heightOfGun = $('.gun').height();
        const useGun = $('#optionDisplayUseOldGameIcons')[0].checked;
        var icon;
        if (useGun === false) {
          icon = 'shieldOrange';
        } else {
          icon = 'gun';
        }
        if ($('#optionDisplayUseSmallIconsCrownShield')[0].checked === false) {
          if (icon === 'shieldOrange') {
            icon = 'shieldOrangeBig';
          }
        }
        const offsetGunPos = pics[icon].position;

        $($('.gun')[i]).animate(
          {
            top: `${$(
              getRoomPlayerDiv(getIndexFromUsername(gameData.proposedTeam[i]))
            ).position().top +
              heightOfGun * offsetGunPos.y
              }px`,
            left: `${$(
              getRoomPlayerDiv(getIndexFromUsername(gameData.proposedTeam[i]))
            ).position().left +
              widOfGun / offsetGunPos.x
              }px`,
          },
          500
        );
        $($('.gun')[i]).removeClass('gunBefore');
        $($('.gun')[i]).addClass('gunAfter');

        lastPickNum = gameData.pickNum;
        lastMissionNum = gameData.missionNum;
      }
    }
  } else {
    adjustGunPositions();
  }
}

function adjustGunPositions() {
  if (isRoomPlayerCardsEnabled()) {
    return;
  }

  if (gameData && gameData.proposedTeam) {
    for (let i = 0; i < gameData.proposedTeam.length; i++) {
      const widOfGun = $('.gun').width();
      const heightOfGun = $('.gun').height();
      const useGun = $('#optionDisplayUseOldGameIcons')[0].checked;
      var icon;
      if (useGun === false) {
        icon = 'shieldOrange';
      } else {
        icon = 'gun';
      }
      if ($('#optionDisplayUseSmallIconsCrownShield')[0].checked === false) {
        if (icon === 'shieldOrange') {
          icon = 'shieldOrangeBig';
        }
      }
      const offsetGunPos = pics[icon].position;
      $($('.gun')[i]).css(
        'top',
        `${$(
          getRoomPlayerDiv(getIndexFromUsername(gameData.proposedTeam[i]))
        ).position().top +
        heightOfGun * offsetGunPos.y
        }px`
      );
      $($('.gun')[i]).css(
        'left',
        `${$(
          getRoomPlayerDiv(getIndexFromUsername(gameData.proposedTeam[i]))
        ).position().left +
        widOfGun / offsetGunPos.x
        }px`
      );
    }
  }
}

function drawTeamLeader() {
  if (isRoomPlayerCardsEnabled()) {
    return;
  }

  let playerIndex;
  if (gameStarted === false) {
    playerIndex = 0;
  } else {
    playerIndex = gameData.teamLeader;
  }
  // set the div string and add the star
  if (getRoomPlayerDiv(playerIndex)) {
    let str = getRoomPlayerDiv(playerIndex).innerHTML;

    let icon;
    if ($('#optionDisplayUseOldGameIcons')[0].checked === true) {
      icon = 'star';
    } else if (
      $('#optionDisplayUseSmallIconsCrownShield')[0].checked === true
    ) {
      icon = 'crown';
    } else {
      icon = 'crownBig';
    }

    str = `${str}<img class='leaderIcon' src='${pics[icon].path}' style='${pics[icon].style}'>`;
    // update the str in the div
    getRoomPlayerDiv(playerIndex).innerHTML = str;
  }
}

function drawClaimingPlayers(claimingPlayers) {
  $(buttons.claim)[0].innerText = 'Claim';

  // Initially when someone creates a room, enable claim button
  if (isSpectator === false) {
    $(buttons.claim).removeClass('disabled');
  }

  for (let i = 0; i < roomPlayersData.length; i++) {
    if (roomPlayersData[i].claim && roomPlayersData[i].claim === true) {
      if (isRoomPlayerCardsEnabled() === false && getRoomPlayerDiv(
        getIndexFromUsername(roomPlayersData[i].username)
      )) {
        let str =
          getRoomPlayerDiv(getIndexFromUsername(roomPlayersData[i].username))
            .innerHTML;
        str += "<span><img src='pictures/claim.png' class='claimIcon'></span>";
        // update the str in the div
        getRoomPlayerDiv(getIndexFromUsername(roomPlayersData[i].username))
          .innerHTML = str;

        // $(".claimIcon")[0].style.top = $("#mainRoomBox div")[playerIndex].style.width;
      }

      if (roomPlayersData[i].username === (gameData ? gameData.username : ownUsername)) {
        $(buttons.claim)[0].innerText = 'Unclaim';
      }
    }
  }
}

function drawExitedPlayers(playersStillInRoom) {
  const arrayOfUsernames = [];
  for (var i = 0; i < roomPlayersData.length; i++) {
    arrayOfUsernames.push(roomPlayersData[i].username);
  }

  for (var i = 0; i < arrayOfUsernames.length; i++) {
    // if(roomPlayersData[i].claim && roomPlayersData[i].claim === true){
    if (playersStillInRoom.indexOf(arrayOfUsernames[i]) === -1) {
      if (getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i]))) {
        getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i])).classList.add(
          'leftRoom'
        );

        if (
          isRoomPlayerCardsEnabled() &&
          $(getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i])))
            .find('.playerStateBadge-offline').length === 0
        ) {
          $(getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i])))
            .find('.playerStateBadges')
            .append(buildPlayerStateBadge('Away', 'offline'));
        }
      }
      if ($('.avatarImgInRoom')[getIndexFromUsername(arrayOfUsernames[i])]) {
        $('.avatarImgInRoom')[
          getIndexFromUsername(arrayOfUsernames[i])
        ].classList.add('leftRoom');
      }
    } else if (
      $('.avatarImgInRoom')[getIndexFromUsername(arrayOfUsernames[i])]
    ) {
      if (getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i]))) {
        getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i])).classList.remove(
          'leftRoom'
        );

        $(getRoomPlayerDiv(getIndexFromUsername(arrayOfUsernames[i])))
          .find('.playerStateBadge-offline')
          .remove();
      }
      $('.avatarImgInRoom')[
        getIndexFromUsername(arrayOfUsernames[i])
      ].classList.remove('leftRoom');
    }
  }
}

function checkSelectAvatarButtons(num) {
  if (typeof num === 'number') {
    // if they've selected the right number of players, then allow them to send
    if (
      countHighlightedAvatars() == num ||
      `${countHighlightedAvatars()}*` == num
    ) {
      // console.log("RUN THIS");
      // btnRemoveHidden("green");

      btnRemoveDisabled('green');
    } else {
      // btnRemoveHidden("green");
      enableDisableButtons();
    }
  } else if (typeof num === 'object' && num !== null && num !== undefined) {
    // if they've selected the right number of players, then allow them to send
    if (num.includes(countHighlightedAvatars()) === true) {
      btnRemoveDisabled('green');
    } else {
      // btnRemoveHidden("green");
      enableDisableButtons();
    }
  }
}
function enableDisableButtons() {
  // Hide the buttons. Unhide them as we need.
  document.querySelector(buttons.green).classList.add('hidden');
  document.querySelector(buttons.red).classList.add('hidden');
  document.querySelector('#restartRoomButton').classList.add('hidden');
  // Claim button is never hidden, only disabled
  // document.querySelector(buttons["claim"]).classList.add("hidden");

  // Disable the buttons. Enable them as we need them.
  document.querySelector(buttons.green).classList.add('disabled');
  document.querySelector(buttons.red).classList.add('disabled');

  document.querySelector(buttons.claim).classList.add('disabled');

  const ourUsername = gameData ? gameData.username : ownUsername;
  // are we a player sitting down?
  let isPlayer = false;
  for (var i = 0; i < roomPlayersData.length; i++) {
    if (roomPlayersData[i].username === ourUsername) {
      // if we are a player sitting down, then yes, we are a player
      isPlayer = true;
      break;
    }
  }
  isSpectator = !isPlayer;

  // determine if we are spectator or not
  for (var i = 0; i < roomPlayersData.length; i++) {
    if (roomPlayersData[i].username === ourUsername) {
      isSpectator = false;
      break;
    }
  }

  // if we aren't a spectator, then remove the disable on the claim button
  if (isSpectator === false) {
    btnRemoveDisabled('claim');
  }

  if (gameStarted === false) {
    // Host
    if (ownUsername === getUsernameFromIndex(0)) {
      btnRemoveHidden('green');
      btnRemoveDisabled('green');
      btnSetText('green', 'Start');

      btnRemoveHidden('red');
      btnRemoveDisabled('red');
      btnSetText('red', 'Kick');

      // set the stuff for the kick modal buttons
      $(buttons.red).attr('data-toggle', 'modal');
      $(buttons.red).attr('data-target', '#kickModal');

      document.querySelector('#options-button').classList.remove('hidden');
    }
    // we are spectator
    else if (isSpectator === true) {
      btnRemoveHidden('green');
      btnRemoveDisabled('green');
      btnSetText('green', 'Join');
    }
    // we are a player sitting down, before game has started
    else {
      btnRemoveHidden('red');
      btnRemoveDisabled('red');
      btnSetText('red', 'Spectate');
    }

    // if we are not the host, then un-bind the red button from the kick modal
    if (ownUsername !== getUsernameFromIndex(0)) {
      $(buttons.red).attr('data-toggle', '');
      $(buttons.red).attr('data-target', '');
    }
  }
  // if game started and we are a player:
  else if (gameStarted === true && isSpectator === false) {
    if (gameData.buttons.green.hidden === false) {
      btnRemoveHidden('green');
    }
    if (gameData.buttons.green.disabled === false) {
      btnRemoveDisabled('green');
    }
    if (gameData.buttons.green.setText !== undefined) {
      btnSetText('green', gameData.buttons.green.setText);
    }

    if (gameData.buttons.red.hidden === false) {
      btnRemoveHidden('red');
    }
    if (gameData.buttons.red.disabled === false) {
      btnRemoveDisabled('red');
    }
    if (gameData.buttons.red.setText !== undefined) {
      btnSetText('red', gameData.buttons.red.setText);
    }
  }

  if (gameStarted === true && isCurrentUserHost()) {
    document.querySelector('#restartRoomButton').classList.remove('hidden');
    if (gameData && gameData.phase === 'Finished') {
      document.querySelector('#restartRoomButton').innerText = 'New game';
    } else if (gameData && gameData.phase === 'Voided') {
      document.querySelector('#restartRoomButton').innerText = 'Restart lobby';
    } else {
      document.querySelector('#restartRoomButton').innerText = 'Cancel game';
    }
  }
}

function checkEntryExistsInArray(array, entry) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === entry) {
      return true;
    }
  }
  return false;
}

function countHighlightedAvatars() {
  const divs = getRoomPlayerDivs();
  let count = 0;
  for (let i = 0; i < divs.length; i++) {
    if (divs[i].classList.contains('highlight-avatar') === true) {
      count++;
    }
  }
  return count;
}

function getHighlightedAvatars() {
  let str = '';

  const divs = getRoomPlayerDivs();

  const arr = [];

  for (let i = 0; i < divs.length; i++) {
    if (divs[i].classList.contains('highlight-avatar') === true) {
      // we need to use getUsernameFromIndex otherwise
      // we will get info from the individual player
      // such as a percy seeing a merlin?.
      str = `${str + getUsernameFromIndex(i)} `;
      arr.push(getUsernameFromIndex(i));
    }
  }
  return arr;
}

function restoreHighlightedAvatars(usernames) {
  usernames.forEach((username) => {
    $(getRoomPlayerDiv(getIndexFromUsername(username))).addClass(
      'highlight-avatar'
    );
  });
}

function getIndexFromUsername(username) {
  if (roomPlayersData) {
    for (let i = 0; i < roomPlayersData.length; i++) {
      if (roomPlayersData[i].username === username) {
        return i;
      }
    }
  } else {
    return false;
  }
}

function getUsernameFromIndex(index) {
  if (roomPlayersData[index]) {
    return roomPlayersData[index].username;
  }

  return false;
}

function buildRoomGlyph(kind) {
  switch (kind) {
    case 'leader':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M4 18.5h16M6 18.5V7.5l3 2.25 3-4 3 4 3-2.25v11' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path></svg>";
    case 'hammer':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M6.5 8.25 11 3.75l3.25 3.25-4.5 4.5M10.5 4.25l7.75 7.75M6.75 17.25l7.5-7.5 3 3-7.5 7.5H6.75Z' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path></svg>";
    case 'claim':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M6.5 20V4.25M7.25 5.25h8.75l-1.75 3 1.75 3H7.25' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path></svg>";
    case 'team':
      return "<svg viewBox='0 0 24 24' focusable='false'><circle cx='8' cy='9' r='2.25' stroke='currentColor' stroke-width='1.7' fill='none'></circle><circle cx='16.25' cy='8' r='1.85' stroke='currentColor' stroke-width='1.7' fill='none'></circle><path d='M4.75 17.75a3.75 3.75 0 0 1 6.5-2.5M14 17.25l2 2 4-4' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path></svg>";
    case 'offline':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M4.5 9.5a11 11 0 0 1 15 0M7.5 12.5a6.8 6.8 0 0 1 6.25-1.3M10.5 15.5a3 3 0 0 1 1.5-.4M4 4l16 16' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path><circle cx='12' cy='19' r='1.2' fill='currentColor'></circle></svg>";
    case 'danger':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M12 5.25v6.5M12 16.5v.25M6.5 20h11a2 2 0 0 0 1.72-3L13.72 7.5a2 2 0 0 0-3.44 0L4.78 17A2 2 0 0 0 6.5 20Z' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path></svg>";
    case 'approve':
      return "<svg viewBox='0 0 24 24' focusable='false'><circle cx='12' cy='12' r='8.25' stroke='currentColor' stroke-width='1.7' fill='none'></circle><path d='m8.75 12.25 2.25 2.25 4.5-4.75' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' fill='none'></path></svg>";
    case 'reject':
      return "<svg viewBox='0 0 24 24' focusable='false'><circle cx='12' cy='12' r='8.25' stroke='currentColor' stroke-width='1.7' fill='none'></circle><path d='m9 9 6 6M15 9l-6 6' stroke='currentColor' stroke-width='1.9' stroke-linecap='round'></path></svg>";
    case 'investigation-res':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M2.75 12s3.25-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.25 5.5-9.25 5.5S2.75 12 2.75 12Z' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none' stroke-dasharray='2 1.3'></path><circle cx='12' cy='12' r='2.4' fill='currentColor'></circle></svg>";
    case 'investigation-spy':
      return "<svg viewBox='0 0 24 24' focusable='false'><path d='M2.75 12s3.25-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.25 5.5-9.25 5.5S2.75 12 2.75 12Z' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none' stroke-dasharray='2 1.3'></path><path d='M10.2 12a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 0 0-3.6 0Z' fill='currentColor'></path></svg>";
    default:
      return "<svg viewBox='0 0 24 24' focusable='false'><circle cx='12' cy='12' r='3' fill='currentColor'></circle></svg>";
  }
}

function buildPlayerStateBadge(label, modifier) {
  const glyphKey = modifier === 'danger' ? 'danger' : modifier;
  return `<span class='playerStateBadge playerStateBadge-${modifier}' title='${escapeHtml(
    label
  )}' aria-label='${escapeHtml(label)}'><span class='playerStateBadgeIcon' aria-hidden='true'>${buildRoomGlyph(
    glyphKey
  )}</span></span>`;
}

function getPlayerAllianceLabel(alliance) {
  return alliance === 'spy' ? 'Spy' : 'Resistance';
}

function sanitizeCssColorToken(value) {
  if (typeof value !== 'string') {
    return 'transparent';
  }

  const trimmedValue = value.trim();
  if (
    /^#[0-9a-f]{3,8}$/i.test(trimmedValue) ||
    /^(rgb|hsl)a?\([^)]*\)$/i.test(trimmedValue)
  ) {
    return trimmedValue;
  }

  return 'transparent';
}

function buildAvatarActionIcon(kind) {
  if (kind === 'chat') {
    return `
      <span class='avatarButtonIcon' aria-hidden='true'>
        <svg viewBox='0 0 24 24' focusable='false'>
          <path d='M6 7.75h12M6 12h7.5M7.5 18.25l-2.75 2v-4A4.75 4.75 0 0 1 0 11.5v-3A4.75 4.75 0 0 1 4.75 3.75h14.5A4.75 4.75 0 0 1 24 8.5v3a4.75 4.75 0 0 1-4.75 4.75H7.5Z' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' fill='none'></path>
        </svg>
      </span>`;
  }

  return `
    <span class='avatarButtonIcon' aria-hidden='true'>
      <svg viewBox='0 0 24 24' focusable='false'>
        <circle cx='12' cy='8' r='3.25' stroke='currentColor' stroke-width='1.7' fill='none'></circle>
        <path d='M6.25 18a5.75 5.75 0 0 1 11.5 0' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' fill='none'></path>
        <path d='M3.5 12h2.25M18.25 12h2.25M12 3.5v2.25' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'></path>
      </svg>
    </span>`;
}

function buildVoteResultBadge(voteKind) {
  const label = voteKind === 'approve' ? 'Approve vote' : 'Reject vote';
  return `<span class='${voteKind}Label invisible' title='${label}' aria-label='${label}'><span class='voteBadgeIcon' aria-hidden='true'>${buildRoomGlyph(
    voteKind
  )}</span></span>`;
}

function getInvestigationMarkerMarkup(username) {
  const investigation = playerInvestigations[username];
  if (!investigation) {
    return '';
  }

  const alliance = investigation.alliance === 'spy' ? 'spy' : 'res';
  const readableAlliance = alliance === 'spy' ? 'Spy' : 'Resistance';
  const sourceText = investigation.sourceCard
    ? ` via ${investigation.sourceCard}`
    : '';
  const markerLabel = `Seen as ${readableAlliance}${sourceText}. This result may be deceptive.`;

  return `<span class='playerInvestigationMarker playerInvestigationMarker-${alliance}' title='${escapeHtml(
    markerLabel
  )}' aria-label='${escapeHtml(
    markerLabel
  )}'><span class='playerInvestigationMarkerIcon' aria-hidden='true'>${buildRoomGlyph(
    `investigation-${alliance}`
  )}</span></span>`;
}

function strOfAvatar(playerData, alliance) {
  const cardModeEnabled = isRoomPlayerCardsEnabled();
  const useOriginalAvatars =
    $('#option_display_original_avatars')[0].checked === true;
  const hasVisibleCustomAvatar = !playerData.avatarHide;
  let picLink = 'avatars/base-res.svg';

  if (alliance === 'spy') {
    picLink = 'avatars/base-spy.svg';
  }

  if (useOriginalAvatars === true) {
    picLink = alliance === 'spy' ? 'avatars/base-spy.svg' : 'avatars/base-res.svg';
  } else if (
    alliance === 'res' &&
    playerData.avatarImgRes &&
    hasVisibleCustomAvatar
  ) {
    picLink = playerData.avatarImgRes;
  } else if (
    alliance === 'spy' &&
    playerData.avatarImgSpy &&
    hasVisibleCustomAvatar
  ) {
    picLink = playerData.avatarImgSpy;
  }

  // add in the role of the player, and the percy info
  let role = '';

  // to get the lengths of the words or usernames
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${$('#option_display_font_size_text').val()}px sans-serif`;

  // can improve this code here
  if (gameStarted === true && gameData.phase === 'Finished') {
    var roleWid =
      ctx.measureText(
        gameData.see.roles[getIndexFromUsername(playerData.username)]
      ).width + 20;

    role = `<p class='role-p' style='width: ${roleWid}px; margin: auto;'>${escapeHtml(
      gameData.see.roles[getIndexFromUsername(playerData.username)]
    )}</p>`;
  } else if (gameStarted === true && gameData !== undefined) {
    // if rendering our own player, give it the role tag
    if (playerData.username === gameData.username) {
      var roleWid = ctx.measureText(gameData.role).width + 20;
      role = `<p class='role-p' style='width: ${roleWid}px; margin: auto;'>${escapeHtml(
        gameData.role
      )}</p>`;
    } else if (gameData.see && gameData.see.roleTags) {
      for (const username in gameData.see.roleTags) {
        const roleTag = gameData.see.roleTags[username];

        if (playerData.username === username) {
          var roleWid = ctx.measureText(roleTag).width + 20;
          role = `<p class='role-p' style='width: ${roleWid}px; margin: auto;'>${escapeHtml(
            roleTag
          )}</p>`;
        }
      }
    }
  } else if (playerData.disconnected === true) {
    var roleWid = ctx.measureText('Disconnected').width + 20;
    role = `<p class='role-p' style='width: ${roleWid}px; margin: auto;'>Disconnected</p>`;
  }

  // add in the hammer star
  let hammerStar = '';
  // console.log(playerData.username);
  // console.log(ctx.font);
  const nameWid = ctx.measureText(playerData.username).width;
  // console.log(nameWid);

  const firstPlayerDiv = getRoomPlayerDiv(0);
  const widOfBox = firstPlayerDiv ? $(firstPlayerDiv).width() : 0;
  // console.log(widOfBox);

  const littleProtrudingEdgeWid = (nameWid - widOfBox) / 2;
  const offsetDist = nameWid - littleProtrudingEdgeWid + 5;

  var searchTerm = 'hammer';
  if (docCookies.getItem('optionDisplayDarkTheme') === 'true') {
    searchTerm = 'hammer-dark';
  }

  if (cardModeEnabled === false && gameStarted === false) {
    // give hammer star to the host
    if (playerData.username === getUsernameFromIndex(0)) {
      hammerStar =
        `<span class='hammerSpan' style='position: absolute; left: ${offsetDist}px; bottom: 2px;'>` +
        `<img style='width: 16px; height: 16px;' data-toggle='tooltip' data-placement='left' title='${icons[searchTerm].toolTip}' src=${icons[searchTerm].glyph}>` +
        '</span>';
    }
  } else if (
    cardModeEnabled === false &&
    gameData &&
    playerData.username === getUsernameFromIndex(gameData.hammer)
  ) {
    hammerStar =
      `<span class='hammerSpan' style='position: absolute; left: ${offsetDist}px; bottom: 2px;'>` +
      `<img style='width: 16px; height: 16px;' data-toggle='tooltip' data-placement='left' title='${icons[searchTerm].toolTip}' src=${icons[searchTerm].glyph}>` +
      '</span>';
  }

  let playerStateBadges = '';
  if (cardModeEnabled === true) {
    const stateBadges = [];
    const isCurrentLeader =
      gameStarted === false
        ? playerData.username === getUsernameFromIndex(0)
        : gameData &&
          playerData.username === getUsernameFromIndex(gameData.teamLeader);
    const isHammerHolder =
      gameStarted === true &&
      gameData &&
      playerData.username === getUsernameFromIndex(gameData.hammer);
    const isOnCurrentTeam =
      gameStarted === true &&
      gameData &&
      gameData.proposedTeam &&
      gameData.proposedTeam.indexOf(playerData.username) !== -1;

    if (isCurrentLeader) {
      stateBadges.push(buildPlayerStateBadge('Leader', 'leader'));
    }
    if (isHammerHolder) {
      stateBadges.push(buildPlayerStateBadge('Hammer', 'hammer'));
    }
    if (playerData.claim === true) {
      stateBadges.push(buildPlayerStateBadge('Claim', 'claim'));
    }
    if (isOnCurrentTeam) {
      stateBadges.push(buildPlayerStateBadge('Team', 'team'));
    }
    if (playerData.disconnected === true) {
      stateBadges.push(buildPlayerStateBadge('Away', 'offline'));
    }

    playerStateBadges = `<span class='playerStateBadges'>${stateBadges.join(
      ''
    )}</span>`;
  } else {
    playerStateBadges = "<span class='playerStateBadges'></span>";
  }

  let selectedAvatar = '';
  if (selectedAvatars[playerData.username] === 1) {
    selectedAvatar = 'selected-avatar-1';
    // console.log("HI");
  } else if (selectedAvatars[playerData.username] === 2) {
    selectedAvatar = 'selected-avatar-2';
  } else if (selectedAvatars[playerData.username] === 3) {
    selectedAvatar = 'selected-avatar-3';
  }

  // Set the colour of the button itself
  let colourToHighlightChatButton;
  const indexOfPlayer = getIndexFromUsername(playerData.username);
  var searchTerm = `player${indexOfPlayer}HighlightColour`;
  if (selectedChat[playerData.username] === true) {
    colourToHighlightChatButton = sanitizeCssColorToken(
      docCookies.getItem(searchTerm)
    );
  } else {
    colourToHighlightChatButton = 'transparent';
  }

  const escapedUsername = escapeHtml(playerData.username);
  const escapedAnonUsername = playerData.anonUsername
    ? `anonusernameofplayer='${escapeHtml(playerData.anonUsername)}'`
    : '';
  const usernameTextClass = cardModeEnabled
    ? 'username-p username-p-card'
    : 'username-p';
  const allianceLabel = getPlayerAllianceLabel(alliance);
  const investigationMarkup = getInvestigationMarkerMarkup(playerData.username);
  const playerClassNames = ['playerDiv'];

  if (cardModeEnabled === true) {
    playerClassNames.push('playerDiv-card', `playerAlliance-${alliance}`);
  }

  if (selectedAvatar) {
    playerClassNames.push(selectedAvatar);
  }
  if (playerData.disconnected === true) {
    playerClassNames.push('leftRoom');
  }

  let str = `<div usernameofplayer='${escapedUsername}' ${escapedAnonUsername} class='${playerClassNames.join(
    ' '
  )}'>`;

  str += "<span class='avatarOptionButtons'>";
  str += `<button type='button' id='highlightAvatarButton' class='avatarButton avatarButton--highlight-player' title='Cycle player highlight' aria-label='Cycle player highlight'>${buildAvatarActionIcon(
    'player'
  )}</button>`;
  str += `<button type='button' id='highlightChatButton' class='avatarButton avatarButton--highlight-chat${
    selectedChat[playerData.username] === true ? ' is-active' : ''
  }' title='Highlight this player in chat' aria-label='Highlight this player in chat' style='--chat-highlight-colour: ${colourToHighlightChatButton};'>${buildAvatarActionIcon(
    'chat'
  )}<span class='avatarButtonAccent' aria-hidden='true'></span></button>`;
  str += '</span>';
  str += playerStateBadges;

  str += buildVoteResultBadge('approve');
  str += buildVoteResultBadge('reject');
  str += "<span class='playerCardGlow'></span>";
  str += "<span class='playerCardInset'></span>";
  if (cardModeEnabled === true) {
    str += `<span class='playerCardWatermark playerCardWatermark-${alliance}' aria-hidden='true'></span>`;
    str += `<span class='playerCardAllianceLabel'>${allianceLabel}</span>`;
    str += "<span class='playerCardDivider playerCardDivider-top' aria-hidden='true'></span>";
    str += "<span class='playerCardDivider playerCardDivider-bottom' aria-hidden='true'></span>";
    str += "<span class='playerCardContent'>";
    str += `<span class='playerCardNameplate'><p class='${usernameTextClass}'> ${escapedUsername} </p>${role}</span>`;
    str += "<span class='playerCardMetaRow'><span class=\"cardsContainer\"></span>";
    str += investigationMarkup;
    str += '</span>';
    str += '</span>';
  } else {
    str += "<span class='playerAvatarFrame'></span>";
    str += "<span class='playerLegacyContent'>";
    str += `<img class='avatarImgInRoom' src='${picLink}' alt='${escapedUsername}'>`;
    str += "<span class='playerLegacyDetails'>";
    str += `<p class='${usernameTextClass}'> ${escapedUsername} ${hammerStar} </p>${role}`;
    str += '<span class="cardsContainer"></span>';
    str += '</span>';
    str += '</span>';
  }
  str += '</div>';

  return str;
}

function changeView() {
  $('.lobby-container').toggleClass('inactive-window');
  $('.game-container').toggleClass('inactive-window');

  scheduleResponsiveLayoutRefresh(Boolean(roomPlayersData), 120);
}

// var chatBoxToNavTab = {
//     "all-chat-lobby": "",
//     "all-chat-room": "All Chat",
//     "room-chat-room": "Game Chat"
// }

function scrollDown(chatBox, hardScroll) {
  // example input of chatBox: all-chat-room

  if (chatBox[0] === '#') {
    chatBox = chatBox.slice(1, chatBox.length);
  }

  const searchStrScrollBox = `#${chatBox}`;
  const searchStrListBox = `#${chatBox}-list`;

  const scrollBox = $(searchStrScrollBox);
  const listBox = $(searchStrListBox);

  const searchStrBar = `#${chatBox}-bar`;

  const cutOffPixelsToScroll = 20;

  // console.log("diff is " + (listBox.height() - scrollBox.scrollTop() - scrollBox.height()) );

  // if the user is scrolled away

  let heightOfLastMessage = listBox.children().last().height();

  const lastMessages = listBox.children();

  if (lastMessages.length !== 0) {
    let lastMessage = lastMessages[lastMessages.length - 1];
    let extraHeight = $(lastMessage).height() - 20;

    let i = lastMessages.length - 1 - 1;
    while (lastMessage.classList.contains('myQuote')) {
      lastMessage = lastMessages[i];
      extraHeight += $(lastMessage).height() - 20;
      i--;
    }

    heightOfLastMessage = (lastMessages.length - 1 - i) * 20;

    // console.log("Height: " + heightOfLastMessage);

    if (
      listBox.height() - scrollBox.scrollTop() - scrollBox.height() >
      5 + heightOfLastMessage + extraHeight
    ) {
      // Show user that there is a new message with the red bar.
      // Show because the only time this will trigger is when a new message comes in anyway
      $(searchStrBar).removeClass('hidden');
    } else {
      scrollBox.scrollTop(listBox.height());
      $(searchStrBar).addClass('hidden');
    }
  }

  if (hardScroll === true) {
    // $("#mydiv").scrollTop($("#mydiv")[0].scrollHeight);

    scrollBox.scrollTop(scrollBox[0].scrollHeight);
  }
}

const arrayOfChatBoxes = [
  '#all-chat-lobby',
  '#all-chat-room',
  '#room-chat-room',
  '#all-chat-room2',
  '#room-chat-room2',
];

for (let i = 0; i < arrayOfChatBoxes.length; i++) {
  const chatBoxToEvent = arrayOfChatBoxes[i];

  // console.log("Chatbox is: " + chatBoxToEvent);

  $(chatBoxToEvent).on('scroll', function () {
    chatBox = `#${this.id}`;
    checkUnreadMessagesBar(chatBox);
  });
}

function checkUnreadMessagesBar(chatBox) {
  // console.log("chatbox : " + chatBox);

  const searchStrScrollBox = `${chatBox}`;
  const searchStrListBox = `${chatBox}-list`;
  const searchStrBar = `${chatBox}-bar`;

  const scrollBox = $(searchStrScrollBox);
  const listBox = $(searchStrListBox);

  // console.log("SCROLL");
  // console.log("IF: " + !(listBox.height() - scrollBox.scrollTop() - scrollBox.height() > 20));

  // if user is at the bottom
  if (!(listBox.height() - scrollBox.scrollTop() - scrollBox.height() > 20)) {
    $(searchStrBar).addClass('hidden');
  }
}

// This bit was for updating the red bar when a person comes back into the tab
// but its too hard to implement rn so no need rn.
// $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
//     var target = $(e.target).attr("href") // activated tab

//   // console.log($(target));

//     var chatBox = "#" + $(target)[0].childNodes[1].id;
//   // console.log(chatBox);
//     // console.log(e);
//   });

function toRadians(angle) {
  return angle * (Math.PI / 180);
}

// some setups result in collisions of avatars
// so set up some custom degree positions for avatars at certain
// game sizes

// key = num of players in game
// 2nd key = player position
// value = angle
const customSteps = {
  6: {
    0: 26,
    1: 90,
    2: 154,
    3: 206,
    4: 270,
    5: 334,
  },

  7: {
    1: 35,
    3: 157,
    4: 203,
    6: 325,
  },
  8: {
    1: 35,

    3: 145,
    5: 215,

    7: 325,
  },
  9: {
    1: 30,
    2: 70,
    3: 140,
    4: 167,

    5: 193,
    6: 220,
    7: 290,
    8: 330,
  },
  10: {
    0: 13,
    1: 40,
    2: 90,
    3: 140,
    4: 167,

    5: 193,
    6: 220,
    7: 270,
    8: 320,
    9: 347,
  },
};

function generatePlayerLocations(numOfPlayers, a, b) {
  // CONICS :D
  const x_ = [];
  const y_ = [];
  const step = 360 / numOfPlayers;
  const tiltOffset = 0;
  // console.log("Step: " + step);

  // for 6p and 10p, rotate slightly so that usernames dont collide
  // with the role text
  if (numOfPlayers === 6) {
    // var tiltOffset = step / 2;
  }

  for (let i = 0; i < numOfPlayers; i++) {
    if (customSteps[numOfPlayers] && customSteps[numOfPlayers][i]) {
      x_[i] =
        a *
        Math.cos(toRadians(customSteps[numOfPlayers][i] + 90 + tiltOffset)) *
        1;
      y_[i] =
        b *
        Math.sin(toRadians(customSteps[numOfPlayers][i] + 90 + tiltOffset)) *
        1;
    } else {
      // get the coordinates. Note the +90 is to rotate so that
      // the first person is at the top of the screen
      x_[i] = a * Math.cos(toRadians(step * i + 90 + tiltOffset)) * 1;
      y_[i] = b * Math.sin(toRadians(step * i + 90 + tiltOffset)) * 1;
      // x_[i] = a*(Math.cos(toRadians((step*i) + 90)));
      // y_[i] = b*(Math.sin(toRadians((step*i) + 90)));
    }
  }

  const object = {
    x: x_,
    y: y_,
  };
  return object;
}

// Note this function will also draw the card history
function drawVoteHistory(data) {

  if (!data.voteHistory) {
    return;
  }

  // Vote history:
  const numOfPicksPerMission = [];
  var str = '';
  // top row where missions are displayed
  // extra <td> set is for the top left corner of the table
  str += '<tr><td></td>';

  for (var i = 0; i < data.missionNum; i++) {
    var colour;
    if (data.missionHistory[i] === 'succeeded') {
      colour = '#99c4ff';
    } else if (data.missionHistory[i] === 'failed') {
      colour = '#fa4f4f';
    } else {
      colour = 'transparent';
    }

    str += `<td style='width: 11em; background-color: ${colour}; color: black;' colspan='' class='missionHeader${i + 1
      }'>Mission ${i + 1}</td>`;
  }
  str += '</tr>';

  const keyArray = [];
  // push the first person first
  keyArray[0] = roomPlayersData[0].username;

  // for every username in a clockwise direction
  for (var i = roomPlayersData.length - 1; i > 0; i--) {
    keyArray[roomPlayersData.length - i] = roomPlayersData[i].username;
  }

  for (let k = 0; k < keyArray.length; k++) {
    str += '<tr>';
    // print username in the first column
    str += `<td>${keyArray[k]}</td>`;

    // Individual mission voteHistory
    // for every mission
    for (var i = 0; i < data.voteHistory[keyArray[k]].length; i++) {
      numOfPicksPerMission[i] = 0;

      // for every pick
      for (let j = 0; j < data.voteHistory[keyArray[k]][i].length; j++) {
        // console.log(data.voteHistory[key][i][j]);

        str += `<td class='${data.voteHistory[keyArray[k]][i][j]}''>`;

        if (data.voteHistory[keyArray[k]][i][j].includes('VHpicked') === true) {
          str += "<i class='glyphicon glyphicon-ok'></i>";
        }

        str += '</td>';
        numOfPicksPerMission[i]++;
      }
    }
    str += '</tr>';
  }

  $('.voteHistoryTableClass')[0].innerHTML = str;
  $('.voteHistoryTableClass')[1].innerHTML = str;

  // set the right colspans for the mission headers
  for (var i = 0; i < numOfPicksPerMission.length; i++) {
    const id = `.missionHeader${i + 1}`;

    const allHeaders = $(id);

    $(id).attr('colspan', numOfPicksPerMission[i]);
  }

  // Card history:

  var str = "<h5 style='margin: 0;'><b><u>Card history:</u></b></h5>";

  for (const key in data.publicData.cards) {
    if (data.publicData.cards.hasOwnProperty(key) === true) {
      const c = data.publicData.cards[key];

      if (c.history !== undefined && c.name !== undefined) {
        str += `<em>${c.name}: </em>`;
      }

      c.history.forEach((username) => {
        str += `${username} -> `;
      });
    }

    str = str.slice(0, str.length - 4);
    str += '<br>';
  }

  $('.cardHistoryClass')[0].innerHTML = str;
  $('.cardHistoryClass')[1].innerHTML = str;

  //  ProNub -> Bot2 -> Bot123 ->
}

function getOptions() {
  // console.log($("#rolesCardsButtonGroup label"));
  const rolesCards = $('#rolesCardsButtonGroup label');

  const selectedRolesCards = [];
  for (let i = 0; i < rolesCards.length; i++) {
    // Check if this role/card is selected or not
    let isActive = false;
    for (let j = 0; j < rolesCards[i].classList.length; j++) {
      if (rolesCards[i].classList[j] === 'active') {
        isActive = true;
        break;
      }
    }
    // If it is not selected, don't add it.
    if (isActive === false) {
      continue;
    }

    const name = rolesCards[i].innerText.trim();
    selectedRolesCards.push(name);
  }
  // console.log(selectedRolesCards);

  return selectedRolesCards;
}

function getKickPlayers() {
  const data = {};

  for (let i = 0; i < roomPlayersData.length; i++) {
    // console.log(unescapeHtml(roomPlayersData[i].username));
    // if ($("#" + roomPlayersData[i].username)[0].checked === true) {
    if (
      $(`#${$.escapeSelector(unescapeHtml(roomPlayersData[i].username))}`)[0]
        .checked === true
    ) {
      data[roomPlayersData[i].username] = true;
    }
  }

  return data;
}

const gameEndSoundPlayed = false;
function resetAllGameData() {
  roomId = undefined;
  publicRoomId = undefined;
  roomJoinRef = undefined;
  roomInfoData = undefined;
  // reset all the variables
  roomPlayersData = undefined;
  seeData = undefined;
  gameData = undefined;
  gameStarted = false;
  // note do not reset our own username.
  isSpectator = false;

  selectedAvatars = {};
  playerInvestigations = {};

  print_gameplay_text_game_started = false;
  print_gameplay_text_picked_team = false;
  print_gameplay_text_vote_results = false;
  print_last_mission_num = 1;

  oldProposedTeam = false;

  // hide the options cog
  document.querySelector('#options-button').classList.add('hidden');
  document.querySelector('#restartRoomButton').classList.add('hidden');
  setLobbyUrl();

  // reset room-chat
  // console.log("RESET ROOM CHAT");
  $('.room-chat-list').html('');

  // reset the vh table
  // $("#voteHistoryTable")[0].innerHTML = "";
  $('.voteHistoryTableClass')[0].innerHTML = '';
  $('.voteHistoryTableClass')[1].innerHTML = '';

  $('.cardHistoryClass')[0].innerHTML = '';
  $('.cardHistoryClass')[1].innerHTML = '';

  $('#missionsBox').addClass('invisible');

  lastPickNum = 0;
  lastMissionNum = 0;

  // leaving room so reset the possible autocomplete stuff
  // autoCompleteStrs = currentOnlinePlayers;
}

function resetGameToWaitingLobby() {
  gameData = undefined;
  gameStarted = false;
  seeData = undefined;
  selectedAvatars = {};
  playerInvestigations = {};

  print_gameplay_text_game_started = false;
  print_gameplay_text_picked_team = false;
  print_gameplay_text_vote_results = false;
  print_last_mission_num = 1;

  oldProposedTeam = false;

  document.querySelector('#options-button').classList.remove('hidden');
  document.querySelector('#restartRoomButton').classList.add('hidden');

  $('.room-chat-list').html('');
  $('.voteHistoryTableClass')[0].innerHTML = '';
  $('.voteHistoryTableClass')[1].innerHTML = '';
  $('.cardHistoryClass')[0].innerHTML = '';
  $('.cardHistoryClass')[1].innerHTML = '';
  $('#missionsBox').addClass('invisible');

  lastPickNum = 0;
  lastMissionNum = 0;

  enableDisableButtons();
  draw();
}

let tempVar = 0;

const gameContainer = $('.game-container')[0];

function extendTabContentToBottomInRoom() {
  if (!gameContainer) {
    return;
  }

  document.querySelectorAll('.room-tabs-column').forEach((tabColumn) => {
    if (window.getComputedStyle(tabColumn).display === 'none') {
      return;
    }

    const $tabColumn = $(tabColumn);
    const navHeight = $tabColumn.find('.nav').first().height() || 0;
    tempVar = navHeight > 40 ? 37 : 0;

    const rect = tabColumn.getBoundingClientRect();
    const columnTop = rect.top || 0;
    const nextHeight = Math.max(
      220,
      Math.floor(window.innerHeight - columnTop) - 24 - tempVar
    );

    tabColumn.style.height = `${nextHeight}px`;
    $tabColumn.find('.tab-content').height(`${nextHeight}`);
  });
}

let lastChatBoxCommand = '';
function checkMessageForCommands(message, chatBox) {
  arrayMessage = message.split(' ');
  // console.log("arr message: " + arrayMessage);

  if (message[0] === '/') {
    // console.log("COMMAND INPUT DETECTED");
    let validCommandFound = false;

    // need to change this to only up to the first space
    messageCommand = arrayMessage[0].slice(1, arrayMessage[0].length);

    let commandCalled = '';

    // cycle through the commands and try to find the command.
    for (var key in commands) {
      if (commands.hasOwnProperty(key)) {
        // console.log(key + " -> " + commands[key]);
        if (messageCommand === commands[key].command) {
          // console.log("Command: " + commands[key].command + " called.");
          commandCalled = commands[key].command;
          validCommandFound = true;
          break;
        }
      }
    }

    if (adminCommands) {
      for (var key in adminCommands) {
        if (adminCommands.hasOwnProperty(key)) {
          // console.log(key + " -> " + commands[key]);
          if (messageCommand === adminCommands[key].command) {
            // console.log("admin");
            // console.log("Command: " + commands[key].command + " called.");
            commandCalled = adminCommands[key].command;
            validCommandFound = true;

            break;
          }
        }
      }
    }

    if (modCommands) {
      for (var key in modCommands) {
        if (modCommands.hasOwnProperty(key)) {
          // console.log(key + " -> " + commands[key]);
          if (messageCommand === modCommands[key].command) {
            // console.log("mods");
            // console.log("Command: " + commands[key].command + " called.");
            commandCalled = modCommands[key].command;
            validCommandFound = true;

            break;
          }
        }
      }
    }

    if (percivalCommands) {
      for (var key in percivalCommands) {
        if (percivalCommands.hasOwnProperty(key)) {
          // console.log(key + " -> " + commands[key]);
          if (messageCommand === percivalCommands[key].command) {
            // console.log("percivals");
            // console.log("Command: " + commands[key].command + " called.");
            commandCalled = percivalCommands[key].command;
            validCommandFound = true;

            break;
          }
        }
      }
    }

    if (TOCommands) {
      for (var key in TOCommands) {
        if (TOCommands.hasOwnProperty(key)) {
          // console.log(key + " -> " + commands[key]);
          if (messageCommand === TOCommands[key].command) {
            commandCalled = TOCommands[key].command;
            validCommandFound = true;
            break;
          }
        }
      }
    }

    if (validCommandFound === false) {
      // console.log("Command invalid");
      const str = `/${messageCommand} is not a valid command. Type /help for a list of commands.`;
      const data = {
        message: str,
        classStr: 'server-text',
        dateCreated: new Date(),
      };
      if (chatBox === 'allChat') {
        addToAllChat(data);
      } else if (chatBox === 'roomChat') {
        addToRoomChat(data);
      }
    }
    // If game hasn't started and we have the roomchat command, don't do anything.
    else if (gameData === undefined && messageCommand === 'roomchat') {
      // Do nothing
    } else {
      // sending command to server
      // console.log("Sending command: " + messageCommand + " to server.");
      // console.log("ASDF");
      socket.emit('messageCommand', {
        command: messageCommand,
        args: arrayMessage,
      });
    }

    lastChatBoxCommand = chatBox;
    return true;
  }

  return false;
}

function updateDarkTheme(checked) {
  if (checked === true) {
    $('body')[0].classList.add('dark');
    $('.well').addClass('dark');
    $('input').addClass('dark');
    $('textarea').addClass('dark');
    $('.btn-default').addClass('btn-inverse');
    $('.navbar').addClass('navbar-inverse');
    $('#playerHighlightColourButton').addClass('buttonDark');
    $('#playerHighlightColourButton2').addClass('buttonDark');
    $('#removeHighlight').addClass('buttonDark');
    $('#removeHighlight2').addClass('buttonDark');
  } else {
    $('body')[0].classList.remove('dark');
    $('.well').removeClass('dark');
    $('input').removeClass('dark');
    $('textarea').removeClass('dark');
    $('.btn-default').removeClass('btn-inverse');
    $('.navbar').removeClass('navbar-inverse');
    $('#playerHighlightColourButton').removeClass('buttonDark');
    $('#playerHighlightColourButton2').removeClass('buttonDark');
    $('#removeHighlight').removeClass('buttonDark');
    $('#removeHighlight2').removeClass('buttonDark');
  }

  draw();
}

function updateTwoTabs(checked) {
  const enabled = checked === true && isMobileViewport() === false;

  $('#tabs1').toggleClass('col-xs-6', enabled);
  $('#tabs1').toggleClass('tabs1TwoTabs', enabled);
  $('#tabs2').toggleClass('tabs2TwoTabs', enabled);
  $('#tabs2').toggleClass('displayNoneClass', enabled === false);
  $('#reportDivRoom').toggleClass('displayNoneReportClass', enabled);

  extendTabContentToBottomInRoom();
}

function updateRoomPlayerCards(checked) {
  $('#mainRoomBox').toggleClass('room-player-cards-enabled', checked === true);
  updateRoomCardScaleControlState(checked === true);

  if (responsiveLayoutHelpers.applyRoomLayoutClasses) {
    responsiveLayoutHelpers.applyRoomLayoutClasses(checked === true, getRoomPlayerDivs().length);
  }

  syncGamePaneLayout();

  if (roomPlayersData) {
    draw();
  }
}

function unescapeHtml(unsafe) {
  return unsafe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function scaleGameComponents() {
  gameTableHeight = $('#mainRoomBox').height();

  var startScalingHeight = 400;
  var maxHeightOfBoxes = 60; // in px
  var scaleFactor = maxHeightOfBoxes / startScalingHeight;

  var setHeightOfMissionBox = gameTableHeight * scaleFactor;

  var ratioToReduce = setHeightOfMissionBox / maxHeightOfBoxes;

  // console.log("Reduce by: " + ratioToReduce);
  if (ratioToReduce > 1) {
    ratioToReduce = 1;
  }

  // Scale the middle boxes
  $('#missionsBox').css(
    'transform',
    `translateX(-50%) scale(${ratioToReduce})`
  );

  if (isRoomPlayerCardsEnabled()) {
    $('#missionsBox').css('transform', 'none');
    $('.approveLabel').css('transform', 'none');
    $('.rejectLabel').css('transform', 'none');
    return;
  }

  // Scale the guns/pick icon
  const playerDivHeightRatio = $('.playerDiv').height() / 128;
  const useGun = docCookies.getItem('optionDisplayUseOldGameIcons');
  let maxHeight = 0;
  let maxWidth = 0;
  // Use shield
  if (useGun === 'false') {
    if ($('#optionDisplayUseSmallIconsCrownShield')[0].checked === true) {
      maxHeight = pics.shieldOrange.maxDims.y;
      maxWidth = pics.shieldOrange.maxDims.x;
    } else {
      maxHeight = pics.shieldOrangeBig.maxDims.y;
      maxWidth = pics.shieldOrangeBig.maxDims.x;
    }
  }
  // Use gun
  else {
    maxHeight = pics.gun.maxDims.y;
    maxWidth = pics.gun.maxDims.x;
  }

  // $(".gunImg").css("height", "100%");
  // $(".gunImg").css("height", "100%");
  // needs to be scaled this way as reducing img size still overshoots
  $('.gunImg').css('max-height', `${maxHeight * playerDivHeightRatio}px`);
  $('.gunImg').css('max-width', `${maxWidth * playerDivHeightRatio}px`);

  // Scale the crown/leader star in the same way
  const useStar = docCookies.getItem('optionDisplayUseOldGameIcons');
  // Use star
  if (useStar === 'true') {
    maxHeight = pics.star.maxDims.y;
    maxWidth = pics.star.maxDims.x;
  }
  // Use crown
  else if ($('#optionDisplayUseSmallIconsCrownShield')[0].checked === true) {
    maxHeight = pics.crown.maxDims.y;
    maxWidth = pics.crown.maxDims.x;
  } else {
    maxHeight = pics.crownBig.maxDims.y;
    maxWidth = pics.crownBig.maxDims.x;
  }
  $('.leaderIcon').css(
    'max-height',
    `${maxHeight * (playerDivHeightRatio - 0.05)}px`
  );
  $('.leaderIcon').css('max-width', `${maxWidth * playerDivHeightRatio}px`);

  // Scale the Assassin icon in the same way
  const useBullet = docCookies.getItem('optionDisplayUseOldGameIcons');
  // Use bullet
  if (useBullet === 'true') {
    maxHeight = parseInt(pics.bullet.maxHeight);
  }
  // Use dagger
  else {
    maxHeight = parseInt(pics.dagger.maxHeight);
  }
  $('.assassinateIcon').css(
    'max-height',
    `${maxHeight * playerDivHeightRatio}px`
  );

  // Scale the approve reject labels
  var startScalingHeight = 200;
  var maxHeightOfBoxes = 60; // in px
  var scaleFactor = maxHeightOfBoxes / startScalingHeight;

  var setHeightOfMissionBox = gameTableHeight * scaleFactor;

  var ratioToReduce = setHeightOfMissionBox / maxHeightOfBoxes;
  if (ratioToReduce > 1) {
    ratioToReduce = 1;
  }
  // also scale the approve reject buttons
  $('.approveLabel').css(
    'transform',
    `translateX(-50%) scale(${ratioToReduce})`
  );
  $('.rejectLabel').css(
    'transform',
    `translateX(-50%) scale(${ratioToReduce})`
  );
}

const sounds = {
  slap: 'slap.mp3',
  buzz: 'ding.mp3',
  ding: 'ding.mp3',
  'game-start': 'game-start.mp3',
  'game-end': 'game-end.mp3',
  highDing: 'highDing.mp3',
  'game-start-ready': 'game-start-ready.mp3',
  pat: 'pat.mp3',
  poke: 'poke.mp3',
  punch: 'punch.mp3',
  hug: 'hug.mp3',
};

// get all the sound files and prepare them.
const soundFiles = {};
for (const key in sounds) {
  if (sounds.hasOwnProperty(key)) {
    soundFiles[key] = new Audio(`sounds/${sounds[key]}`);
  }
}

function playSound(soundToPlay) {
  if ($('#option_notifications_sound_enable')[0].checked === false) {
    return false;
  }
  if (
    gameStarted &&
    $('#option_notifications_sound_enable_in_game')[0].checked === false
  ) {
    return false;
  }

  soundFiles[soundToPlay].volume =
    $('#option_notifications_sound_volume')[0].value / 100;
  soundFiles[soundToPlay].play();
  return true;
}

function displayNotification(title, body, icon, tag) {
  if (
    Notification.permission === 'granted' &&
    $('#option_notifications_desktop_enable')[0].checked === true
  ) {
    const options = {
      body,
      icon,
      tag,
    };

    const notif = new Notification(title, options);
  }
}

function showYourTurnNotification(ToF) {
  // Display the green button if its your turn.
  if (ToF === true) {
    $(buttons.green).removeClass('hidden');
  } else if (ToF === false) {
    $(buttons.green).addClass('hidden');
  } else {
    console.log('error in show your turn notifications');
  }
}

function btnRemoveHidden(btnStr) {
  document.querySelector(buttons[btnStr]).classList.remove('hidden');
}
function btnRemoveDisabled(btnStr) {
  document.querySelector(buttons[btnStr]).classList.remove('disabled');
}
function btnSetText(btnStr, text) {
  document.querySelector(buttons[btnStr]).innerText = text;
}
