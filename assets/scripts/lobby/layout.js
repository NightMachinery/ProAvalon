(function attachLobbyLayoutHelpers() {
  const MOBILE_MAX_WIDTH = 767;
  const SMALL_DESKTOP_MAX_WIDTH = 1023;
  let activeLobbyPanelId = 'col2';

  function isMobileViewport() {
    return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
  }

  function isSmallDesktopViewport() {
    return window.matchMedia(
      `(min-width: ${MOBILE_MAX_WIDTH + 1}px) and (max-width: ${SMALL_DESKTOP_MAX_WIDTH}px)`
    ).matches;
  }

  function getDesktopCardColumns(numPlayers) {
    if (!numPlayers || numPlayers <= 0) {
      return 1;
    }

    if (numPlayers <= 4) {
      return Math.min(numPlayers, isSmallDesktopViewport() ? 4 : 5);
    }

    if (isSmallDesktopViewport()) {
      return Math.min(4, Math.max(3, Math.ceil(numPlayers / 2)));
    }

    return Math.min(5, Math.ceil(numPlayers / 2));
  }

  function getRoomLayoutMode(modernEnabled) {
    if (isMobileViewport()) {
      return modernEnabled === true ? 'mobile-modern' : 'mobile-legacy';
    }

    return modernEnabled === true ? 'desktop-modern' : 'desktop-legacy';
  }

  function applyRoomLayoutClasses(modernEnabled, numPlayers) {
    const roomContainer = document.querySelector('.room-container');
    const mainRoomBox = document.getElementById('mainRoomBox');
    if (!roomContainer || !mainRoomBox) {
      return getRoomLayoutMode(modernEnabled);
    }

    const mode = getRoomLayoutMode(modernEnabled);
    const isMobile = mode.indexOf('mobile-') === 0;
    const isModern = mode.indexOf('-modern') !== -1;

    roomContainer.classList.toggle('room-layout-mobile', isMobile);
    roomContainer.classList.toggle('room-layout-desktop', !isMobile);
    roomContainer.classList.toggle('room-layout-modern', isModern);
    roomContainer.classList.toggle('room-layout-legacy', !isModern);
    roomContainer.setAttribute('data-room-layout-mode', mode);

    mainRoomBox.classList.toggle('room-layout-mobile', isMobile);
    mainRoomBox.classList.toggle('room-layout-desktop', !isMobile);
    mainRoomBox.classList.toggle('room-layout-modern', isModern);
    mainRoomBox.classList.toggle('room-layout-legacy', !isModern);
    mainRoomBox.setAttribute('data-room-layout-mode', mode);
    mainRoomBox.style.setProperty(
      '--room-grid-columns',
      String(getDesktopCardColumns(numPlayers || 0))
    );

    return mode;
  }

  function setLobbyMobilePanel(nextPanelId) {
    activeLobbyPanelId = nextPanelId === 'col1' ? 'col1' : 'col2';

    const panels = document.querySelectorAll('.lobby-mobile-panel');
    const tabs = document.querySelectorAll('.lobby-mobile-tab');
    const mobile = isMobileViewport();

    panels.forEach((panel) => {
      const isActive = !mobile || panel.id === activeLobbyPanelId;
      panel.classList.toggle('active', isActive);
      panel.toggleAttribute('hidden', !isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    tabs.forEach((tab) => {
      const isActive = tab.getAttribute('data-target') === activeLobbyPanelId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });
  }

  function bindLobbyMobileTabs() {
    document.querySelectorAll('.lobby-mobile-tab').forEach((tab) => {
      if (tab.dataset.bound === 'true') {
        return;
      }

      tab.addEventListener('click', () => {
        setLobbyMobilePanel(tab.getAttribute('data-target'));
      });
      tab.dataset.bound = 'true';
    });
  }

  function applyResponsiveState() {
    bindLobbyMobileTabs();
    document.body.classList.toggle('mobile-viewport', isMobileViewport());
    setLobbyMobilePanel(activeLobbyPanelId);
  }

  window.ProAvalonLobbyLayout = {
    MOBILE_MAX_WIDTH,
    SMALL_DESKTOP_MAX_WIDTH,
    applyResponsiveState,
    applyRoomLayoutClasses,
    getDesktopCardColumns,
    getRoomLayoutMode,
    isMobileViewport,
    isSmallDesktopViewport,
    setLobbyMobilePanel,
  };

  applyResponsiveState();
})();
