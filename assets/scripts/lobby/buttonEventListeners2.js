async function redButtonFunction() {
  if (document.querySelector('#red-button').classList.contains('disabled') === true) {
    return;
  }

  if (gameStarted === false) {
    // non-host player standing up
    if (document.querySelector('#red-button').innerText === 'Spectate') {
      socket.emit('standUpFromGame');
      socket.emit('setClaim', false);
      enableDisableButtons();
    }
    // host opening kick menu
    else {
      let str = '<h4>Select the players you want to kick.</h4>';
      str += '<div class="btn-group-vertical" data-toggle="buttons">';
      for (let i = 0; i < roomPlayersData.length; i++) {
        if (ownUsername !== roomPlayersData[i].username) {
          str += '<label class="btn btn-mine">';
          str += `<input name="${roomPlayersData[i].username}" id="${roomPlayersData[i].username}" type="checkbox" autocomplete="off">${roomPlayersData[i].username}`;
          str += '</label>';
          str += '<br>';
        } else {
          str += '<label class="btn btn-mine" style="display: none;">';
          str += `<input name="${roomPlayersData[i].username}" id="${roomPlayersData[i].username}" type="checkbox" autocomplete="off">${roomPlayersData[i].username}`;
          str += '</label>';
          str += '<br>';
        }
      }
      str += '</div>';
      $('#kickModalContent')[0].innerHTML = str;
    }
  } else if (await confirmUserClick('no')) {
    if (
      gameData.phase === 'VotingTeam' ||
      gameData.phase === 'VotingMission'
    ) {
      socket.emit('gameMove', ['no', []]);
    }
  }

  $('#mainRoomBox div').removeClass('highlight-avatar');
}

async function greenButtonFunction() {
  if (document.querySelector('#green-button').classList.contains('disabled') === true) {
    return;
  }

  if (isSpectator === true) {
    socket.emit('join-game', roomId);
  } else if (gameStarted === false) {
    const startGameData = {
      options: getOptions(),
      gameMode: $($('.gameModeSelect')[1]).val(),
      timeouts: {
        default: ((parseInt($('#startGameOptionsDefaultPhaseTimeoutMin').val()) * 60 + parseInt($('#startGameOptionsDefaultPhaseTimeoutSec').val())) * 1000).toString(),
        critMission: ((parseInt($('#startGameOptionsCritMissionTimeoutMin').val()) * 60 + parseInt($('#startGameOptionsCritMissionTimeoutSec').val())) * 1000).toString(),
        assassination: ((parseInt($('#startGameOptionsAssassinationPhaseTimeoutMin').val()) * 60 + parseInt($('#startGameOptionsAssassinationPhaseTimeoutSec').val())) * 1000).toString(),
      },
      anonymousMode: $('#startGameOptionsAnonymousMode')[0].checked,
      revealExactSpyRolesToSpies: $('#startGameOptionsRevealExactSpyRolesToSpies')[0].checked,
    };
    socket.emit('startGame', startGameData);
  } else if (await confirmUserClick('yes')) {
    if (
      gameData.phase === 'VotingTeam' ||
      gameData.phase === 'VotingMission'
    ) {
      socket.emit('gameMove', ['yes', []]);
    } else {
      socket.emit('gameMove', ['yes', getHighlightedAvatars()]);
    }
  }

  $('#mainRoomBox div').removeClass('highlight-avatar');
}

function renderBotControlModal() {
  const seatList = document.querySelector('#botControlSeatList');
  if (!seatList) {
    return;
  }

  if (!roomPlayersData || isCurrentUserHost() !== true) {
    seatList.innerHTML = '<p class="text-muted">Only the current host can manage bots.</p>';
    return;
  }

  const rankedNote =
    roomInfoData &&
    (roomInfoData.botUsed === true || roomInfoData.seatSwitchUsed === true)
      ? '<p class="text-warning">This room has used seat switching and is locked to unranked until restart.</p>'
      : '';

  const connectedSpectators =
    roomInfoData && Array.isArray(roomInfoData.connectedSpectators)
      ? roomInfoData.connectedSpectators
      : [];

  const renderSeatSwitchMenu = (player) => {
    const optionItems = [];
    const seenSpectators = new Set();

    const pushOption = (label, controllerType, controllerUsername, enabled, current) => {
      optionItems.push(`
        <li class="${enabled ? '' : 'disabled'}">
          <a href="#" data-seat-controller-option="true" data-seat-username="${escapeHtml(
            player.username
          )}" data-controller-type="${controllerType}"${
            controllerUsername
              ? ` data-controller-username="${escapeHtml(controllerUsername)}"`
              : ''
          }>
            ${current ? "<span class='glyphicon glyphicon-ok'></span> " : ''}
            ${escapeHtml(label)}
          </a>
        </li>`);
    };

    pushOption(
      'SimpleBot',
      'bot',
      '',
      player.controllerType !== 'bot',
      player.controllerType === 'bot'
    );

    pushOption(
      'Original player',
      'original',
      '',
      player.originalPlayerConnected === true || player.controllerType === 'original',
      player.controllerType === 'original'
    );

    if (
      player.controllerType === 'spectator' &&
      player.controllerUsername &&
      seenSpectators.has(player.controllerUsername) === false
    ) {
      seenSpectators.add(player.controllerUsername);
      pushOption(
        player.controllerUsername,
        'spectator',
        player.controllerUsername,
        false,
        true
      );
    }

    connectedSpectators.forEach((spectatorUsername) => {
      if (!spectatorUsername || seenSpectators.has(spectatorUsername) === true) {
        return;
      }

      seenSpectators.add(spectatorUsername);
      pushOption(
        spectatorUsername,
        'spectator',
        spectatorUsername,
        player.controllerType !== 'spectator' ||
          player.controllerUsername !== spectatorUsername,
        player.controllerType === 'spectator' &&
          player.controllerUsername === spectatorUsername
      );
    });

    return `
      <div class="btn-group">
        <button
          type="button"
          class="btn btn-xs btn-default dropdown-toggle"
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
          title="Switch seat controller"
        >
          <span class="glyphicon glyphicon-transfer"></span>
          <span class="caret"></span>
        </button>
        <ul class="dropdown-menu dropdown-menu-right">
          ${optionItems.join('')}
        </ul>
      </div>`;
  };

  const seatRows = roomPlayersData
    .map((player) => {
      const actions = [];
      const status = [];

      if (player.isBot === true) {
        status.push('Standalone bot');
        if (gameStarted === false) {
          actions.push(
            `<button type="button" class="btn btn-xs btn-danger" data-bot-action="remove-standalone" data-username="${player.username}">Remove</button>`
          );
        }
      } else if (gameStarted === true) {
        if (player.controllerType === 'bot') {
          status.push(`Controlled by ${player.controllerUsername || 'SimpleBot'}`);
        } else if (player.controllerType === 'spectator') {
          status.push(`Controlled by ${player.controllerUsername}`);
        } else if (player.disconnected === true) {
          status.push('Absent');
        } else {
          status.push('Controlled by original player');
        }

        if (player.awaitingHumanRestore === true) {
          status.push('Original player connected');
        }

        if (player.disconnected === true) {
          status.push('Controller away');
        }

        if (player.isBot !== true) {
          actions.push(renderSeatSwitchMenu(player));
        }
      } else if (player.disconnected === true) {
        status.push('Absent');
        actions.push(
          `<button type="button" class="btn btn-xs btn-primary" data-bot-action="takeover-seat" data-username="${player.username}">Assign bot</button>`
        );
      } else {
        status.push('Connected');
      }

      return `
        <div class="well well-sm" style="margin-bottom: 0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 0.75rem; flex-wrap: wrap;">
            <div>
              <strong>${player.username}</strong>
              <div class="text-muted">${status.join(' • ') || 'No bot actions available'}</div>
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap: wrap;">
              ${actions.join('')}
            </div>
          </div>
        </div>`;
    })
    .join('');

  seatList.innerHTML =
    rankedNote +
    (seatRows || '<p class="text-muted">No seats currently support bot actions.</p>');
}

//= =====================================
// BUTTON EVENT LISTENERS
//= =====================================
document
  .querySelector('#green-button')
  .addEventListener('click', greenButtonFunction);
document
  .querySelector('#red-button')
  .addEventListener('click', redButtonFunction);

$('#botControlModal').on('show.bs.modal', () => {
  renderBotControlModal();
});

document.querySelector('#botAddButton').addEventListener('click', () => {
  const count = parseInt(document.querySelector('#botAddCount').value, 10);
  socket.emit('bot-add', count);
});

document.querySelector('#botRemoveAllButton').addEventListener('click', () => {
  socket.emit('bot-remove', 'all');
});

document.querySelector('#botControlSeatList').addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-bot-action]');
  const controllerOption = event.target.closest('[data-seat-controller-option]');

  if (actionButton) {
    const username = actionButton.getAttribute('data-username');
    const action = actionButton.getAttribute('data-bot-action');

    if (action === 'remove-standalone') {
      socket.emit('bot-remove', username);
    } else if (action === 'takeover-seat') {
      socket.emit('bot-takeover', username);
    }
    return;
  }

  if (controllerOption) {
    if (controllerOption.parentElement.classList.contains('disabled')) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    socket.emit('seat-controller-set', {
      seatUsername: controllerOption.getAttribute('data-seat-username'),
      controllerType: controllerOption.getAttribute('data-controller-type'),
      controllerUsername:
        controllerOption.getAttribute('data-controller-username') || undefined,
    });
  }
});

// re-draw the game screen when the modal is closed to update the roles in the center well.
$('#roleOptionsModal').on('hidden.bs.modal', (e) => {
  draw();
  // console.log("test");
});

// Set the event listener for the button
$('#kickButton')[0].addEventListener('click', () => {
  const players = getKickPlayers();

  // kick the selected players one by one
  for (const key in players) {
    if (players.hasOwnProperty(key)) {
      socket.emit('kickPlayer', key);
      // console.log("kick player: " + key);
    }
  }
});

document
  .querySelector('#danger-alert-box-button')
  .addEventListener('click', () => {
    if (
      document
        .querySelector('#danger-alert-box')
        .classList.contains('disconnect')
    ) {
    } else {
      document
        .querySelector('#danger-alert-box')
        .classList.add('inactive-window');
      document
        .querySelector('#danger-alert-box-button')
        .classList.add('inactive-window');
    }
  });

document
  .querySelector('#success-alert-box-button')
  .addEventListener('click', () => {
    document
      .querySelector('#success-alert-box')
      .classList.add('inactive-window');
    document
      .querySelector('#success-alert-box-button')
      .classList.add('inactive-window');
  });

document.querySelector('#backButton').addEventListener('click', () => {
  leaveRoom();
});

let copyRoomLinkFeedbackTimeout;

function setCopyRoomLinkButtonState(text, className) {
  const copyButton = document.querySelector('#copyRoomLinkButton');
  copyButton.innerText = text;
  copyButton.classList.remove('btn-info', 'btn-success', 'btn-danger');
  copyButton.classList.add(className);
}

document.querySelector('#copyRoomLinkButton').addEventListener('click', () => {
  const inviteRef = publicRoomId || roomJoinRef;
  if (!inviteRef) {
    return;
  }

  const copied = copyTextHttpSafe(
    `${window.location.origin}/lobby?room=${inviteRef}`,
  );

  clearTimeout(copyRoomLinkFeedbackTimeout);
  setCopyRoomLinkButtonState(copied ? 'Copied!' : 'Copy failed', copied ? 'btn-success' : 'btn-danger');

  copyRoomLinkFeedbackTimeout = window.setTimeout(() => {
    setCopyRoomLinkButtonState('Copy link', 'btn-info');
  }, 1500);
});

document.querySelector('#restartRoomButton').addEventListener('click', async () => {
  if (document.querySelector('#restartRoomButton').classList.contains('hidden')) {
    return;
  }

  let title = 'Restart lobby?';
  let text = 'This will return the room to the waiting lobby with the same players and settings.';
  if (gameData && gameData.phase !== 'Finished' && gameData.phase !== 'Voided') {
    title = 'Cancel current game?';
    text = 'This will cancel the current game and return everyone to the waiting lobby.';
  }

  const result = await Swal.fire({
    title,
    text,
    type: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Restart lobby',
  });

  if (result.value) {
    socket.emit('restart-room');
  }
});

function leaveRoom() {
  changeView();
  socket.emit('leave-room', '');

  // console.log("LEAVE");
  resetAllGameData();
}

function joinRoom(roomRef, nextRoomId, nextPublicRoomId) {
  socket.emit('join-room', roomRef);
  // change the view to the room instead of lobby
  roomId = nextRoomId;
  publicRoomId = nextPublicRoomId;
  roomJoinRef = roomRef;
  setRoomUrl(roomRef);
  // set the spectator to true
  isSpectator = true;
  // change to the game room view
  changeView();
}

function setNewRoomTTLInputToDefault() {
  const listedInLobby = $('.listedInLobby')[1].checked;
  $('#emptyRoomTTLMinutes').val(getDefaultEmptyRoomTTLMinutes(listedInLobby));
}

document.querySelector('#claimButton').addEventListener('click', () => {
  // INCOMPLETE
  // disallow innertext change to "unclaim" when spectators
  // click a disabled claim button
  if (isSpectator === false) {
    const btnText = $('#claimButton').text();
    if (btnText === 'Claim') {
      socket.emit('setClaim', true);
    } else {
      socket.emit('setClaim', false);
    }
  }
});

// New room code (When its opened, open the modal and reset to default settings)
$('#newRoom').on('click', (data) => {
  $('#newRoomModal').modal('show');
  // password empty default
  $('#newRoomPassword').val('');
  // 10p default
  $('.maxNumPlayers').val('10');
  $('.listedInLobby')[1].checked = true;
  setNewRoomTTLInputToDefault();

  // $(".gun").css("visibility", "hidden");

  $('.gun').removeClass('gunAfter');
  $('.gun').addClass('gunBefore');
});

$('#createNewRoomButton').on('click', (data) => {
  if (!gameModesLoaded) {
    return;
  }

  const sendObj = {
    maxNumPlayers: $($('.maxNumPlayers')[1]).val(),
    newRoomPassword: $('#newRoomPassword').val(),
    gameMode: $($('.gameModeSelect')[1]).val(),
    muteSpectators: $('.muteSpectators')[1].checked,
    disableVoteHistory: $('.disableVoteHistory')[1].checked,
    listedInLobby: $('.listedInLobby')[1].checked,
    emptyRoomTTLMinutes: $('#emptyRoomTTLMinutes').val(),
    ranked: $($('.rankedSelect')[1]).val(),
  };

  // Update the settings in the in room settings menu.
  $($('.maxNumPlayers')[0]).val(sendObj.maxNumPlayers);
  $($('.gameModeSelect')[0]).val(sendObj.gameMode);
  $('.muteSpectators')[0].checked = sendObj.muteSpectators;
  $('.disableVoteHistory')[0].checked = sendObj.disableVoteHistory;
  $('.listedInLobby')[0].checked = sendObj.listedInLobby;
  $($('.rankedSelect')[0]).val(sendObj.ranked);

  socket.emit('newRoom', sendObj);
  resetAllGameData();

  $('#newRoomModal').modal('hide');
});

$('#newRoomModal .listedInLobby').on('change', () => {
  setNewRoomTTLInputToDefault();
});

$('#startGameOptionsDefaultPhaseTimeoutMin').on('change', () => {
  handleTimeoutInput('#startGameOptionsDefaultPhaseTimeoutMin');
});

$('#startGameOptionsDefaultPhaseTimeoutSec').on('change', () => {
  handleTimeoutInput('#startGameOptionsDefaultPhaseTimeoutSec');
});

$('#startGameOptionsCritMissionTimeoutMin').on('change', () => {
  handleTimeoutInput('#startGameOptionsCritMissionTimeoutMin');
});

$('#startGameOptionsCritMissionTimeoutSec').on('change', () => {
  handleTimeoutInput('#startGameOptionsCritMissionTimeoutSec');
});

$('#startGameOptionsAssassinationPhaseTimeoutMin').on('change', () => {
  handleTimeoutInput('#startGameOptionsAssassinationPhaseTimeoutMin');
});

$('#startGameOptionsAssassinationPhaseTimeoutSec').on('change', () => {
  handleTimeoutInput('#startGameOptionsAssassinationPhaseTimeoutSec');
});

function handleTimeoutInput(inputId) {
  let input = $(inputId)[0];
  let val = parseInt(input.value, 10);

  if (val <= 0 || isNaN(val) || val.toString() !== input.value) {
    input.value = 0;
  } else if (val > 60) {
    input.value = 60;
  }
}

// Triggers swal on unexpected move if misclick prevention is enabled
async function confirmUserClick(button) {
  if ($('#option_gameplay_prevent_misclicks')[0].checked !== true) {
    return true;
  }

  let str = '';
  if (gameData.phase === 'VotingTeam') {
    const isPlayerOnTeam = gameData.proposedTeam.includes(gameData.username);

    // catch hammerrej
    if (gameData.pickNum === 5) {
      if (
        $('#option_gameplay_prevent_hammerrej')[0].checked === true &&
        button === 'no'
      ) {
        str = 'Really reject hammer?'
      }
    // catch onrej
    } else if (
      $('#option_gameplay_prevent_onrej_m' + gameData.missionNum)[0].checked === true &&
      isPlayerOnTeam &&
      button === 'no'
    ) {
      str = "You're on the team!"
    // catch offapp
    } else if (
      $('#option_gameplay_prevent_offapp_m' + gameData.missionNum)[0].checked === true &&
      !isPlayerOnTeam &&
      button === 'yes'
    ) {
      str = "You're off the team!"
    }
  }

  if (str === '') {
    return true;
  }

  let timeout = 0;
  if (gameData.dateTimerExpires) {
    timeout = new Date(gameData.dateTimerExpires).getTime() - Date.now();
  }

  const input = await swal({
    title: str,
    type: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: button === 'yes' ? 'Approve' : 'Reject',
    confirmButtonColor: button === 'yes' ? '#5cb85c' : '#d9534f',
    timer: timeout
  });

  return Boolean(input.value);
}
