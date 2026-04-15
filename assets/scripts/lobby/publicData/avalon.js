function getPublicCardChipLabel(key) {
  const labelByKey = {
    lady: 'Lady',
    ref: 'Ref',
    sire: 'Sire',
  };

  return labelByKey[key] || icons[key].toolTip;
}

function runPublicDataAvalon(gameDataInc) {
  const gd = gameDataInc;

  // Roles and cards special data
  if (gd) {
    // Show the assassin shot
    if (gd.publicData.roles.assassinShotUsername) {
      drawAssassinateIcon(
        getIndexFromUsername(gd.publicData.roles.assassinShotUsername)
      );
    }
    if (gd.publicData.roles.assassinShotUsername2) {
      drawAssassinateIcon(
        getIndexFromUsername(gd.publicData.roles.assassinShotUsername2)
      );
    }

    // Reset cards container
    $('.playerDiv')
      .find('.cardsContainer')
      .each(function resetCardsContainer() {
        this.innerHTML = '';
      });

    // Draw cards:
    for (const key in gd.publicData.cards) {
      if (gd.publicData.cards.hasOwnProperty(key) === true) {
        // Skip if we don't have any record of the card to draw/display.
        if (icons.hasOwnProperty(key) === false) {
          continue;
        }

        const { index } = gd.publicData.cards[key];

        var card;
        if (isRoomPlayerCardsEnabled()) {
          card = `<span class='cardObject cardObjectChip' title='${icons[key].toolTip}'>${escapeHtml(
            getPublicCardChipLabel(key)
          )}</span>`;
        } else if (icons[key].iconType === 'bootstrapGlyphicon') {
          card = `<span data-toggle='tooltip' data-placement='left' title='${icons[key].toolTip}' class='cardObject glyphicon ${icons[key].glyph}' style=''></span> `;
        } else if (icons[key].iconType === 'base64') {
          card = `<img class="cardObject" data-toggle="tooltip" data-placement="left" title="${icons[key].toolTip}" src="${icons[key].glyph}" />`;
        } else {
          card = 'Undefined! Something went wrong.';
        }

        const padding = isRoomPlayerCardsEnabled()
          ? ''
          : "<span class='cardObject glyphicon glyphicon-asterisk' style='visibility: hidden;'></span> ";

        const playerCardContainer = $(getRoomPlayerDiv(index)).find(
          '.cardsContainer'
        )[0];
        if (!playerCardContainer) {
          continue;
        }

        playerCardContainer.innerHTML += card;
        playerCardContainer.innerHTML += padding;

        // Initialise the tooltip.
        if (isRoomPlayerCardsEnabled() === false) {
          $('.cardObject').tooltip();
        }
      }
    }
  }
}

function drawAssassinateIcon(indexOfPlayer) {
  if (!getRoomPlayerDiv(indexOfPlayer)) {
    return;
  }

  if (isRoomPlayerCardsEnabled()) {
    $(getRoomPlayerDiv(indexOfPlayer))
      .find('.playerStateBadges')
      .append(
        "<span class='playerStateBadge playerStateBadge-danger'>Shot</span>"
      );
    return;
  }

  // set the div string and add the star\\
  let str = getRoomPlayerDiv(indexOfPlayer).innerHTML;

  const darkModeEnabled = $('#option_display_dark_theme')[0].checked;
  const useBullet = $('#optionDisplayUseOldGameIcons')[0].checked;

  let icon;
  if (useBullet === true && darkModeEnabled === false) {
    icon = 'bullet';
  } else if (useBullet === true && darkModeEnabled === true) {
    icon = 'bulletDark';
  } else if (useBullet === false) {
    icon = 'dagger';
  }

  str = `${str}<span><img class='assassinateIcon' src='${pics[icon].path}' style='${pics[icon].style}'></span>`;

  // update the str in the div
  getRoomPlayerDiv(indexOfPlayer).innerHTML = str;

  if (useBullet === false) {
    // var raiseBy = $(".assassinateIcon").height()*0.22;
    playerRatio = $('.playerDiv').height() / 128;
    // k is a random constant to scale with
    const k = -20;
    $('.assassinateIcon').css('top', `${playerRatio * k}px`);
  }

  // $(".bullet")[0].style.top = 0;
}
