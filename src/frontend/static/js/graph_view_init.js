document.addEventListener('DOMContentLoaded', function() {
  // HTTP polling-based data fetching (handled by graph_view.js)
  
  // Note: Graph initialization is now handled by graph_view.js
  
  // Mode flags
  let zoomWithScroll = false;
  let zoomRange = false;
  let autoRange = true;
  
  // Time window
  let startTime = 0;
  let endTime = 60;
  let timeWindow = endTime - startTime;
  
  // Data tracking variables
  let globalMinTime = Infinity;
  let globalMaxTime = -Infinity;
  // Track last timestamp for each signal to detect gaps
  let lastTimestamps = {};
  
  // For tracking whether we've received any data
  let dataReceived = false;
  
  // Load saved state from localStorage
  let savedState = null;
  if (window.graphView && window.graphView.loadStateFromStorage) {
    savedState = window.graphView.loadStateFromStorage();
    console.log('Loaded saved state:', savedState);
  }
  
  // Restore view mode and configs from storage
  if (window.graphView && window.graphView.restoreViewModeFromStorage) {
    window.graphView.restoreViewModeFromStorage();
  }
  
  // Restore input values from storage
  if (window.graphView && window.graphView.loadInputValuesFromStorage) {
    const savedInputs = window.graphView.loadInputValuesFromStorage();
    if (savedInputs) {
      if (savedInputs.startTime !== undefined) {
        document.getElementById('startTime').value = savedInputs.startTime;
      }
      if (savedInputs.endTime !== undefined) {
        document.getElementById('endTime').value = savedInputs.endTime;
      }
      if (savedInputs.timeDifferential !== undefined) {
        document.getElementById('timeDifferential').value = savedInputs.timeDifferential;
      }
    }
  }
  
  // Update live data indicator function (make it globally available)
  function updateDataIndicator(status) {
    const indicator = document.getElementById('liveDataIndicator');
    const statusText = document.getElementById('dataStatusText');
    
    switch(status) {
      case 'receiving':
        indicator.className = 'data-indicator receiving';
        statusText.textContent = 'Receiving Data';
        break;
      case 'active':
        indicator.className = 'data-indicator active';
        statusText.textContent = 'Live Data';
        break;
      case 'paused':
        indicator.className = 'data-indicator inactive';
        statusText.textContent = 'Paused';
        break;
      case 'warning':
        indicator.className = 'data-indicator receiving';
        statusText.textContent = 'Slow Data';
        break;
      default:
        indicator.className = 'data-indicator inactive';
        statusText.textContent = 'No Data';
    }
  }
  
  // Make function globally available for graph_view.js
  window.updateDataIndicator = updateDataIndicator;
  
  // Initialize indicator
  updateDataIndicator('inactive');
  
  // Debug message function
  function logDebug(message) {
    console.log(`[Graph] ${new Date().toISOString()}: ${message}`);
  }
  
  // Function to fetch and populate available signal types
  function fetchSignalTypes() {
    logDebug("Fetching signal types...");
    fetch('/get_can_message_types')
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          logDebug(`Received message types: ${Object.keys(data.message_types).length} message types`);
          populateSignalCheckboxes(data.message_types);
        } else {
          logDebug(`Error in response: ${JSON.stringify(data)}`);
        }
      })
      .catch(error => {
        logDebug(`Error fetching CAN message types: ${error}`);
        console.error('Error fetching CAN message types:', error);
      });
  }
  
  // Function to populate the signal checkboxes
  function populateSignalCheckboxes(messageTypes) {
    const signalSelectorsDiv = document.getElementById('signalSelectors');
    signalSelectorsDiv.innerHTML = '';
    
    // Get saved signals to restore checkbox states
    const savedSignals = savedState && savedState.signals ? savedState.signals.map(s => s.id) : [];
    console.log('Restoring checkboxes for saved signals:', savedSignals);
    
    Object.keys(messageTypes).sort().forEach(messageType => {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message-type mb-3';
      
      const messageHeader = document.createElement('div');
      messageHeader.className = 'message-header d-flex justify-content-between';
      
      const messageLabel = document.createElement('h5');
      messageLabel.textContent = messageType;
      messageLabel.className = 'mb-2';
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn-sm btn-outline-info toggle-btn';
      toggleBtn.textContent = 'Toggle All';
      toggleBtn.dataset.messageType = messageType;
      
      messageHeader.appendChild(messageLabel);
      messageHeader.appendChild(toggleBtn);
      messageDiv.appendChild(messageHeader);
      
      const signalsDiv = document.createElement('div');
      signalsDiv.className = 'signals pl-3';
      
      Object.keys(messageTypes[messageType]).sort().forEach(signalName => {
        const signalType = messageTypes[messageType][signalName];
        
        // Remove the type check to show all signals
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';
        
        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.className = 'form-check-input signal-checkbox';
        checkboxInput.id = `${messageType}.${signalName}`;
        checkboxInput.dataset.messageType = messageType;
        checkboxInput.dataset.signalName = signalName;
        
        // Restore checkbox state if it was previously selected
        const signalId = `${messageType}.${signalName}`;
        if (savedSignals.includes(signalId)) {
          checkboxInput.checked = true;
        }
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'form-check-label';
        checkboxLabel.htmlFor = `${messageType}.${signalName}`;
        checkboxLabel.textContent = `${signalName} (${signalType})`;  // Show signal type in label
        
        checkboxDiv.appendChild(checkboxInput);
        checkboxDiv.appendChild(checkboxLabel);
        signalsDiv.appendChild(checkboxDiv);
        
        // Add event listener to checkbox
        checkboxInput.addEventListener('change', function() {
          const id = `${this.dataset.messageType}.${this.dataset.signalName}`;
          const signalName = `${this.dataset.messageType}.${this.dataset.signalName}`;
          
          if (this.checked) {
            // Add signal using the new graph_view.js API
            const randomColor = getRandomColor();
            console.log('Attempting to add signal:', id, 'graphView available:', !!window.graphView);
            if (window.graphView && window.graphView.addSignal) {
              window.graphView.addSignal(id, signalName, randomColor);
              logDebug(`Added signal ${id} to graph`);
            } else {
              console.error('graphView not available, window.graphView:', window.graphView);
              // Fallback: try again after a short delay in case scripts are still loading
              setTimeout(() => {
                if (window.graphView && window.graphView.addSignal) {
                  window.graphView.addSignal(id, signalName, randomColor);
                  logDebug(`Added signal ${id} to graph (delayed)`);
                }
              }, 100);
            }
          } else {
            // Remove signal using the new graph_view.js API
            console.log('Attempting to remove signal:', id, 'graphView available:', !!window.graphView);
            if (window.graphView && window.graphView.removeSignal) {
              window.graphView.removeSignal(id);
              logDebug(`Removed signal ${id} from graph`);
            } else {
              console.error('graphView not available for removal, window.graphView:', window.graphView);
            }
          }
        });
      });
      
      messageDiv.appendChild(signalsDiv);
      signalSelectorsDiv.appendChild(messageDiv);
    });
    
    // After populating checkboxes, restore the saved signals
    if (savedState && savedState.signals && savedState.signals.length > 0) {
      console.log('Restoring saved signals...');
      savedState.signals.forEach(signal => {
        // Trigger the checkbox change event to add the signal
        const checkbox = document.getElementById(signal.id);
        if (checkbox && checkbox.checked) {
          // Add signal using the saved color
          if (window.graphView && window.graphView.addSignal) {
            window.graphView.addSignal(signal.id, signal.name, signal.color);
            logDebug(`Restored signal ${signal.id} from localStorage`);
          }
        }
      });
    }
    
    // Add toggle button event listeners after signals are restored
    Object.keys(messageTypes).sort().forEach(messageType => {
      const toggleBtn = document.querySelector(`button[data-message-type="${messageType}"]`);
      if (!toggleBtn) return;
      
      // Add event listener to toggle button
      toggleBtn.addEventListener('click', function() {
        const messageType = this.dataset.messageType;
        const checkboxes = document.querySelectorAll(`.signal-checkbox[data-message-type="${messageType}"]`);
        
        // Check if all are checked
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        // Toggle all checkboxes
        checkboxes.forEach(cb => {
          cb.checked = !allChecked;
          // Trigger change event
          const event = new Event('change');
          cb.dispatchEvent(event);
        });
      });
    });
  }
  
  // Utility function to generate random colors
  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  // HTTP polling status management
  let lastDataTime = 0;
  let dataReceiveCheckInterval;
  
  function startDataStatusChecking() {
    updateDataIndicator('active');
    logDebug('HTTP polling status checking started');
    
    // Check for data activity every 2 seconds
    dataReceiveCheckInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastDataTime > 5000) { // No data for 5 seconds
        updateDataIndicator('inactive');
      } else if (now - lastDataTime > 2000) { // Slow data
        updateDataIndicator('warning');
      } else {
      updateDataIndicator('active');
      }
    }, 2000);
  }
  
  // Start checking data status
  startDataStatusChecking();
  
  // Note: CAN message handling is now done by graph_view.js using HTTP polling
  // This provides better performance and memory management with proper downsampling
  
  // Function to update the active button states
  function updateButtonStates(activeButtonId) {
    // Remove active class from all buttons
    document.querySelectorAll('.control-button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to the selected button
    if (activeButtonId) {
      document.getElementById(activeButtonId).classList.add('active');
    }
  }
  
  // Function to show/hide appropriate input fields based on mode
  function showInputsForMode(mode) {
    const zoomInputs = document.getElementById('zoomInputs');
    const liveScrollInputs = document.getElementById('liveScrollInputs');
    
    if (mode === 'zoom') {
      zoomInputs.style.display = 'flex';
      liveScrollInputs.style.display = 'none';
    } else if (mode === 'liveScroll') {
      zoomInputs.style.display = 'none';
      liveScrollInputs.style.display = 'flex';
    } else if (mode === 'showAll') {
      // Hide all inputs for show all mode
      zoomInputs.style.display = 'none';
      liveScrollInputs.style.display = 'none';
    } else {
      // Default: show zoom inputs
      zoomInputs.style.display = 'flex';
      liveScrollInputs.style.display = 'none';
    }
  }
  
  // Event listeners for control buttons
  // Pause/Resume toggle button
  const pauseBtn = document.getElementById('pauseResumeBtn');
  const pauseIcon = document.getElementById('pauseResumeIcon');
  const pauseText = document.getElementById('pauseResumeText');
  
  // Restore pause state from localStorage
  let isPaused = false;
  if (window.graphView && window.graphView.loadPauseStateFromStorage) {
    isPaused = window.graphView.loadPauseStateFromStorage();
    if (isPaused) {
      pauseIcon.className = 'fa fa-play mr-1';
      pauseText.textContent = 'Resume';
    }
  }

  pauseBtn.addEventListener('click', function() {
    if (!isPaused) {
      // Pause polling
      if (window.graphView && window.graphView.stopPolling) {
        window.graphView.stopPolling();
      }
      isPaused = true;
      pauseIcon.className = 'fa fa-play mr-1';
      pauseText.textContent = 'Resume';
      updateDataIndicator('paused');
      logDebug('Polling paused by user');
      // Save pause state
      if (window.graphView && window.graphView.savePauseStateToStorage) {
        window.graphView.savePauseStateToStorage(true);
      }
    } else {
      // Resume polling
      if (window.graphView && window.graphView.startPolling) {
        window.graphView.startPolling();
      }
      isPaused = false;
      pauseIcon.className = 'fa fa-pause mr-1';
      pauseText.textContent = 'Pause';
      logDebug('Polling resumed by user');
      // Save pause state
      if (window.graphView && window.graphView.savePauseStateToStorage) {
        window.graphView.savePauseStateToStorage(false);
      }
    }
  });

  document.getElementById('zoomBtn').addEventListener('click', function() {
    // Show zoom inputs and get values
    showInputsForMode('zoom');
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 60;
    
    // Save input values
    if (window.graphView && window.graphView.saveInputValuesToStorage) {
      window.graphView.saveInputValuesToStorage({ startTime, endTime, timeDifferential: parseFloat(document.getElementById('timeDifferential').value) || 10 });
    }
    
    if (window.graphView && window.graphView.setZoomMode) {
      window.graphView.setZoomMode(startTime, endTime);
      updateButtonStates('zoomBtn');
      logDebug(`Zoom mode activated: fixed range [${startTime}, ${endTime}]`);
    }
  });
  
  document.getElementById('zoomScrollBtn').addEventListener('click', function() {
    // Show live scroll inputs and get values
    showInputsForMode('liveScroll');
    const timeDifferential = parseFloat(document.getElementById('timeDifferential').value) || 10;
    
    // Save input values
    if (window.graphView && window.graphView.saveInputValuesToStorage) {
      window.graphView.saveInputValuesToStorage({ startTime: parseFloat(document.getElementById('startTime').value) || 0, endTime: parseFloat(document.getElementById('endTime').value) || 60, timeDifferential });
    }
    
    if (window.graphView && window.graphView.setLiveScrollMode) {
      // Use actual current time from data, not user input
      window.graphView.setLiveScrollMode(timeDifferential);
      updateButtonStates('zoomScrollBtn');
      logDebug(`Live Scroll mode activated: showing last ${timeDifferential}s from current data time`);
    }
  });
  
  // Event listener for auto range button - REMOVED as per user request
  // Auto Range functionality has been removed
  
  // Event listener for show all data button
  document.getElementById('showAllDataBtn').addEventListener('click', function() {
    // Hide all inputs for show all mode
    showInputsForMode('showAll');
    
    if (window.graphView && window.graphView.showAllData) {
      window.graphView.showAllData();
      updateButtonStates('showAllDataBtn');
      logDebug('Show all data activated');
    }
  });
  
  // Apply Range button removed - functionality integrated into Zoom and Live Scroll buttons
  
  // Add Enter key functionality for input fields
  document.getElementById('startTime').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      // Trigger zoom mode with current values
      const startTime = parseFloat(document.getElementById('startTime').value) || 0;
      const endTime = parseFloat(document.getElementById('endTime').value) || 60;
      
      if (window.graphView && window.graphView.setZoomMode) {
        window.graphView.setZoomMode(startTime, endTime);
        updateButtonStates('zoomBtn');
        logDebug(`Zoom mode activated via Enter: fixed range [${startTime}, ${endTime}]`);
      }
    }
  });
  
  document.getElementById('endTime').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      // Trigger zoom mode with current values
      const startTime = parseFloat(document.getElementById('startTime').value) || 0;
      const endTime = parseFloat(document.getElementById('endTime').value) || 60;
      
      if (window.graphView && window.graphView.setZoomMode) {
        window.graphView.setZoomMode(startTime, endTime);
        updateButtonStates('zoomBtn');
        logDebug(`Zoom mode activated via Enter: fixed range [${startTime}, ${endTime}]`);
      }
    }
  });
  
  document.getElementById('timeDifferential').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      // Trigger live scroll mode with current value
      const timeDifferential = parseFloat(document.getElementById('timeDifferential').value) || 10;
      
      if (window.graphView && window.graphView.setLiveScrollMode) {
        window.graphView.setLiveScrollMode(timeDifferential);
        updateButtonStates('zoomScrollBtn');
        logDebug(`Live Scroll mode activated via Enter: showing last ${timeDifferential}s from current data time`);
      }
    }
  });
  
  // Select all / Clear all buttons
  document.getElementById('selectAllBtn').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.signal-checkbox');
    checkboxes.forEach(cb => {
      if (!cb.checked) {
        cb.checked = true;
        // Trigger change event
        const event = new Event('change');
        cb.dispatchEvent(event);
      }
    });
    logDebug('Selected all signals');
  });
  
  document.getElementById('clearAllBtn').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.signal-checkbox');
    checkboxes.forEach(cb => {
      if (cb.checked) {
        cb.checked = false;
        // Trigger change event
        const event = new Event('change');
        cb.dispatchEvent(event);
      }
    });
    logDebug('Cleared all signals');
  });
  
  // Restore view mode and button states after a short delay to ensure UI is ready
  setTimeout(() => {
    if (window.graphView && window.graphView.restoreViewModeFromStorage) {
      const savedViewMode = localStorage.getItem('graphView:viewMode');
      if (savedViewMode) {
        console.log('Restoring view mode:', savedViewMode);
        
        // Update button states based on saved view mode
        switch(savedViewMode) {
          case 'live':
            updateButtonStates(null); // No button active for default live mode
            showInputsForMode('zoom');
            break;
          case 'liveScroll':
            updateButtonStates('zoomScrollBtn');
            showInputsForMode('liveScroll');
            // Restore live scroll mode
            const timeDiff = parseFloat(document.getElementById('timeDifferential').value) || 10;
            if (window.graphView.setLiveScrollMode) {
              window.graphView.setLiveScrollMode(timeDiff);
            }
            break;
          case 'zoom':
            updateButtonStates('zoomBtn');
            showInputsForMode('zoom');
            // Restore zoom mode
            const startT = parseFloat(document.getElementById('startTime').value) || 0;
            const endT = parseFloat(document.getElementById('endTime').value) || 60;
            if (window.graphView.setZoomMode) {
              window.graphView.setZoomMode(startT, endT);
            }
            break;
          case 'showAll':
            updateButtonStates('showAllDataBtn');
            showInputsForMode('showAll');
            if (window.graphView.showAllData) {
              window.graphView.showAllData();
            }
            break;
          case 'manual':
            updateButtonStates(null);
            showInputsForMode('zoom');
            break;
        }
      }
    }
  }, 500);
  
  // Initialize by fetching signal types
  fetchSignalTypes();
  logDebug('Graph view initialized');
});

