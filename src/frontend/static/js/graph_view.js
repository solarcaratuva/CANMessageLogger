// HTTP polling configuration
const POLLING_INTERVAL = 100; // milliseconds (0.1 seconds for very responsive live updates)
let pollingActive = false;
let currentPollingTimeout = null;

// Live data configuration
const LIVE_WINDOW_SIZE = 60; // seconds - how much historical data to show in live mode
let liveUpdatesEnabled = true; // Always keep live updates enabled
let viewMode = 'live'; // 'live', 'showAll', 'manual', 'liveScroll', 'zoom' - determines how to display data, but updates continue
let globalTimeRange = { min: 0, max: 60 }; // Global time range tracker

// Live Scroll configuration
let liveScrollConfig = {
    enabled: false,
    startTime: 0,
    endTime: 60,
    currentWindowStart: 0,
    currentWindowEnd: 60,
    timeDifferential: 10, // window size in seconds
    scrollIncrement: 0.1, // seconds to scroll by each time (small increment)
    intervalId: null
};

// Zoom configuration
let zoomConfig = {
    enabled: false,
    fixedStartTime: 0,
    fixedEndTime: 60
};

// Store active signals and their data
const activeSignals = new Map();
let globalRequestCounter = 0;
let visibleInFlight = false;
let visiblePending = null; // { startTime, endTime, zoomLevel, viewportWidth }
let lastVisibleRequestId = 0;

// Initialize Plotly graph
const graphDiv = document.getElementById('graphContainer');
const layout = {
    title: 'CAN Signal Data',
    xaxis: {
        title: 'Time',
        type: 'linear',
        rangeslider: { visible: false },
        autorange: true,
    },
    yaxis: {
        title: 'Value',
        autorange: true,
    },
    showlegend: true,
};

Plotly.newPlot(graphDiv, [], layout);

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle zoom and pan events (debounced)
graphDiv.on('plotly_relayout', debounce(function(eventdata) {
    if (eventdata['xaxis.range[0]'] && eventdata['xaxis.range[1]']) {
        // User manually changed the range - switch to manual mode
        viewMode = 'manual';
        console.log('User interaction detected - switched to manual mode');
        
        // Treat ranges as numeric seconds
        const startTime = Number(eventdata['xaxis.range[0]']);
        const endTime = Number(eventdata['xaxis.range[1]']);
        
        // Calculate zoom level based on time range
        const timeRange = Math.max(1, endTime - startTime); // seconds
        const zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / timeRange)));
        
        // Immediately request data for the new range
        requestVisibleRange(startTime, endTime, zoomLevel);
        
        console.log(`Manual range change: requesting ${startTime.toFixed(1)}-${endTime.toFixed(1)}s`);
    }
}, 200));

// Function to request data for a specific range (now using HTTP)
function requestDataRange(signalId, startTime, endTime, zoomLevel) {
    // For single signal requests, we'll use the bulk endpoint with one signal
    requestVisibleRange(startTime, endTime, zoomLevel, [signalId]);
}

// Bulk request for all active signals in current visible range (now using HTTP)
function requestVisibleRange(startTime, endTime, zoomLevel, specificSignalIds = null) {
    const viewportWidth = Math.floor(graphDiv.clientWidth || graphDiv.getBoundingClientRect().width || 1200);
    const signalIds = specificSignalIds || Array.from(activeSignals.keys());
    if (signalIds.length === 0) return;

    const params = { startTime, endTime, zoomLevel, viewportWidth };

    // Enhanced request coalescing for high-frequency updates
    if (visibleInFlight) {
        visiblePending = params; // Always keep the latest request
        return;
    }

    visibleInFlight = true;
    const requestId = ++globalRequestCounter;
    lastVisibleRequestId = requestId;

    // Use fetch API for HTTP request
    fetch('/get_visible_range', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            signal_ids: signalIds,
            start_time: startTime,
            end_time: endTime,
            zoom_level: zoomLevel,
            viewport_width: viewportWidth
        })
    })
    .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Log how many data points we received for each signal
                let totalPoints = 0;
                const signalCounts = {};
                Object.keys(data.signals).forEach(signalId => {
                    const pointCount = data.signals[signalId].x ? data.signals[signalId].x.length : 0;
                    signalCounts[signalId] = pointCount;
                    totalPoints += pointCount;
                });
                
                console.log(`📊 Range Query Results: ${totalPoints} total points across ${Object.keys(data.signals).length} signals`);
                console.log(`   Time range: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s (${(endTime - startTime).toFixed(2)}s duration)`);
                console.log(`   Points per signal:`, signalCounts);
                
                handleVisibleRangeUpdate({
                    signals: data.signals,
                    request_id: requestId
                });
            } else {
                console.error('Error fetching data:', data.message);
                updateDataStatus('inactive');
            }
        })
    .catch(error => {
        console.error('Network error:', error);
        updateDataStatus('inactive');
        visibleInFlight = false; // Reset on error
    });
}

function rebuildPlot() {
    const data = [];
    activeSignals.forEach((info) => {
        data.push({
            x: info.x || [],
            y: info.y || [],
            type: 'scattergl',
            mode: 'lines',
            name: info.name,
            line: { color: info.color },
            connectgaps: true
        });
    });
    Plotly.react(graphDiv, data, layout);
    
    // Always auto-range Y-axis for best visibility
    Plotly.relayout(graphDiv, {
        'yaxis.autorange': true
    });
}

// Apply the current view mode to the graph display
function applyViewMode() {
    switch (viewMode) {
        case 'live':
            // Live scrolling mode - show latest data in a rolling window
            if (globalTimeRange.max > globalTimeRange.min) {
                const latestTime = globalTimeRange.max;
                const windowStart = Math.max(0, latestTime - LIVE_WINDOW_SIZE);
                
                Plotly.relayout(graphDiv, {
                    'xaxis.range': [windowStart, latestTime + 2],
                    'xaxis.autorange': false
                });
            }
            break;
            
        case 'showAll':
            // Show all data mode - display entire dataset with live updates
            if (globalTimeRange.max > globalTimeRange.min) {
                const margin = (globalTimeRange.max - globalTimeRange.min) * 0.05;
                Plotly.relayout(graphDiv, {
                    'xaxis.range': [globalTimeRange.min - margin, globalTimeRange.max + margin],
                    'xaxis.autorange': false
                });
            }
            break;
            
        case 'liveScroll':
            // Live Scroll mode - show specified range window and scroll it to the right
            Plotly.relayout(graphDiv, {
                'xaxis.range': [liveScrollConfig.currentWindowStart, liveScrollConfig.currentWindowEnd],
                'xaxis.autorange': false
            });
            break;
            
        case 'zoom':
            // Zoom mode - fixed range view
            Plotly.relayout(graphDiv, {
                'xaxis.range': [zoomConfig.fixedStartTime, zoomConfig.fixedEndTime],
                'xaxis.autorange': false
            });
            break;
            
        case 'manual':
            // Manual mode - don't change the current range, user has set it
            // Do nothing, keep current range
            break;
    }
}

// Handle data updates from server (now a regular function)
function handleDataRangeUpdate(data) {
    const signalId = data.signal_id;
    const info = activeSignals.get(signalId);
    if (!info) return;

    // Drop stale responses
    if (typeof data.request_id === 'number' && typeof info.lastRequestId === 'number' && data.request_id < info.lastRequestId) {
        return;
    }

    // Expect compact arrays: x (timestamps as numbers), y (values)
    const x = Array.isArray(data.x) ? data.x : [];
    const y = Array.isArray(data.y) ? data.y : [];

    info.x = x;
    info.y = y;

    rebuildPlot();

    // Mark request complete and send any pending
    info.inFlight = false;
    if (info.pending) {
        const { startTime, endTime, zoomLevel } = info.pending;
        info.pending = null;
        // Immediately send the latest pending request
        requestVisibleRange(startTime, endTime, zoomLevel, [signalId]);
    }
}

// Handle bulk visible-range updates (now a regular function)
function handleVisibleRangeUpdate(payload) {
    if (typeof payload.request_id === 'number' && payload.request_id < lastVisibleRequestId) {
        return; // stale
    }
    const series = payload.signals || {};
    let hasData = false;
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    Object.keys(series).forEach((signalId) => {
        const info = activeSignals.get(signalId);
        if (!info) return;
        const s = series[signalId];
        info.x = Array.isArray(s.x) ? s.x : [];
        info.y = Array.isArray(s.y) ? s.y : [];
        
        // Track data presence and time range
        if (info.x.length > 0) {
            hasData = true;
            minTime = Math.min(minTime, Math.min(...info.x));
            maxTime = Math.max(maxTime, Math.max(...info.x));
        }
    });
    
    rebuildPlot();
    
    // Update global time range
    if (hasData) {
        globalTimeRange.min = Math.min(globalTimeRange.min, minTime);
        globalTimeRange.max = Math.max(globalTimeRange.max, maxTime);
        
        updateDataStatus('active', minTime, maxTime);
        
        // Apply view mode after updating data
        applyViewMode();
    } else {
        updateDataStatus('inactive');
    }

    visibleInFlight = false;
    if (visiblePending) {
        const { startTime, endTime, zoomLevel } = visiblePending;
        visiblePending = null;
        requestVisibleRange(startTime, endTime, zoomLevel);
    }
}

// Handle errors (now handled in fetch catch blocks)

// Function to update data status indicator and time range display
function updateDataStatus(status, minTime, maxTime) {
    // Update the HTML status indicator if the function exists
    if (typeof window.updateDataIndicator === 'function') {
        window.updateDataIndicator(status);
    }
    
    // Update time range displays if elements exist
    if (minTime !== undefined && maxTime !== undefined && isFinite(minTime) && isFinite(maxTime)) {
        const currentTimeElement = document.getElementById('currentTimestamp');
        const timeRangeElement = document.getElementById('timeRange');
        
        if (currentTimeElement) {
            currentTimeElement.textContent = `Current Time: ${maxTime.toFixed(3)}s`;
        }
        if (timeRangeElement) {
            timeRangeElement.textContent = `Data Range: ${minTime.toFixed(3)}s - ${maxTime.toFixed(3)}s`;
        }
        
        // Store global time range for other functions to use
        window.globalMinTime = minTime;
        window.globalMaxTime = maxTime;
    }
}

// Function to start Live Scroll scrolling
function startLiveScrolling() {
    if (liveScrollConfig.intervalId) {
        clearInterval(liveScrollConfig.intervalId);
    }
    
    liveScrollConfig.intervalId = setInterval(() => {
        if (viewMode === 'liveScroll' && liveScrollConfig.enabled) {
            // Get the latest current time from the most recent data points
            let latestCurrentTime = 0;
            activeSignals.forEach((signalData) => {
                if (signalData.x && signalData.x.length > 0) {
                    const signalMaxTime = Math.max(...signalData.x);
                    latestCurrentTime = Math.max(latestCurrentTime, signalMaxTime);
                }
            });
            
            // Fallback to global time range if no signal data
            if (latestCurrentTime === 0) {
                latestCurrentTime = globalTimeRange.max || Date.now() / 1000;
            }
            
            const newStartTime = latestCurrentTime - liveScrollConfig.timeDifferential;
            
            // Update the window to show the last timeDifferential seconds from current time
            liveScrollConfig.currentWindowStart = newStartTime;
            liveScrollConfig.currentWindowEnd = latestCurrentTime;
            
            console.log(`Live Scroll: moving window to ${liveScrollConfig.currentWindowStart.toFixed(1)}-${liveScrollConfig.currentWindowEnd.toFixed(1)} (last ${liveScrollConfig.timeDifferential}s from current time ${latestCurrentTime.toFixed(1)})`);
            applyViewMode();
        }
    }, 100); // 0.1 second intervals (100ms) for truly live scrolling
}

// Function to stop Live Scroll scrolling
function stopLiveScrolling() {
    if (liveScrollConfig.intervalId) {
        clearInterval(liveScrollConfig.intervalId);
        liveScrollConfig.intervalId = null;
    }
}

// Polling mechanism for continuous data updates
function startPolling() {
    if (pollingActive) return;
    pollingActive = true;
    
    // Set status to receiving immediately
    updateDataStatus('receiving');
    
    function poll() {
        if (!pollingActive) return;
        
        if (activeSignals.size > 0) {
            let startTime, endTime, zoomLevel;
            
            if (viewMode === 'live') {
                // Live mode: request latest data with rolling window
                const now = globalTimeRange.max || Date.now() / 1000;
                endTime = now + 5; // Add buffer for new data
                startTime = Math.max(0, endTime - LIVE_WINDOW_SIZE * 2);
                zoomLevel = 3;
            } else if (viewMode === 'showAll') {
                // Show all mode: request entire dataset plus buffer for new data
                const now = globalTimeRange.max || Date.now() / 1000;
                startTime = Math.max(0, globalTimeRange.min - 5); // Small buffer before start
                endTime = now + 5; // Buffer for new data
                zoomLevel = 2; // Lower zoom for large range
            } else if (viewMode === 'liveScroll') {
                // Live Scroll mode: request data for current scrolling window with buffer
                const buffer = liveScrollConfig.timeDifferential * 0.2;
                startTime = Math.max(0, liveScrollConfig.currentWindowStart - buffer);
                endTime = liveScrollConfig.currentWindowEnd + buffer;
                zoomLevel = 3;
            } else if (viewMode === 'zoom') {
                // Zoom mode: request data for fixed zoom range with buffer
                const buffer = (zoomConfig.fixedEndTime - zoomConfig.fixedStartTime) * 0.1;
                startTime = Math.max(0, zoomConfig.fixedStartTime - buffer);
                endTime = zoomConfig.fixedEndTime + buffer;
                zoomLevel = 5; // Higher zoom for fixed range
            } else {
                // Manual mode: request data for currently visible range
                const rng = graphDiv.layout && graphDiv.layout.xaxis && graphDiv.layout.xaxis.range;
                if (rng && rng.length >= 2) {
                    // Use visible range with some buffer
                    const visibleStart = Number(rng[0]);
                    const visibleEnd = Number(rng[1]);
                    const rangeSize = visibleEnd - visibleStart;
                    const buffer = rangeSize * 0.1; // 10% buffer on each side
                    
                    startTime = Math.max(0, visibleStart - buffer);
                    endTime = visibleEnd + buffer;
                    zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / rangeSize)));
                    
                    console.log(`Manual mode polling: visible ${visibleStart.toFixed(1)}-${visibleEnd.toFixed(1)}s, requesting ${startTime.toFixed(1)}-${endTime.toFixed(1)}s`);
                } else {
                    // Fallback: request recent data
                    const now = globalTimeRange.max || Date.now() / 1000;
                    endTime = now + 5;
                    startTime = Math.max(0, endTime - LIVE_WINDOW_SIZE);
                    zoomLevel = 3;
                }
            }
            
            requestVisibleRange(startTime, endTime, zoomLevel);
        }
        
        // Schedule next poll
        currentPollingTimeout = setTimeout(poll, POLLING_INTERVAL);
    }
    
    poll();
}

function stopPolling() {
    pollingActive = false;
    if (currentPollingTimeout) {
        clearTimeout(currentPollingTimeout);
        currentPollingTimeout = null;
    }
    // Stop live scrolling when polling stops
    stopLiveScrolling();
    // Set status to inactive when polling stops
    updateDataStatus('paused');
}

// Function to add a new signal to the graph
function addSignal(signalId, signalName, color) {
    if (activeSignals.has(signalId)) return;
    
    // Store signal info
    activeSignals.set(signalId, {
        name: signalName,
        color: color,
        x: [],
        y: [],
        inFlight: false,
        pending: null,
        lastRequestId: 0
    });

    // Build or update the plot using react
    rebuildPlot();
    
    // Start polling if this is the first signal
    if (activeSignals.size === 1) {
        startPolling();
    }
    
    // Get initial data (bulk)
    const currentRange = graphDiv.layout.xaxis.range;
    if (currentRange) {
        const startTime = Number(currentRange[0]);
        const endTime = Number(currentRange[1]);
        const timeRange = Math.max(1, endTime - startTime);
        const zoomLevel = Math.max(1, Math.min(10, Math.floor(100 / timeRange)));
        requestVisibleRange(startTime, endTime, zoomLevel);
    }
}

// Function to remove a signal from the graph
function removeSignal(signalId) {
    const signalData = activeSignals.get(signalId);
    if (!signalData) return;
    
    activeSignals.delete(signalId);
    rebuildPlot();
    
    // Stop polling if no signals remain
    if (activeSignals.size === 0) {
        stopPolling();
    }
}

// Mode switching functions - all keep live updates active
function setLiveMode() {
    viewMode = 'live';
    stopLiveScrolling(); // Stop any live scrolling
    liveScrollConfig.enabled = false;
    zoomConfig.enabled = false;
    console.log('Switched to live scrolling mode (updates continue)');
    applyViewMode();
    // Immediately request live data
    if (pollingActive && activeSignals.size > 0) {
        const now = globalTimeRange.max || Date.now() / 1000;
        requestVisibleRange(Math.max(0, now - LIVE_WINDOW_SIZE), now + 5, 3);
    }
}

function setLiveScrollMode(timeDifferential) {
    viewMode = 'liveScroll';
    stopLiveScrolling(); // Stop any existing scrolling
    
    // Get the actual current time from the most recent data points
    let currentTime = 0;
    activeSignals.forEach((signalData) => {
        if (signalData.x && signalData.x.length > 0) {
            const signalMaxTime = Math.max(...signalData.x);
            currentTime = Math.max(currentTime, signalMaxTime);
        }
    });
    
    // Fallback to global time range if no signal data
    if (currentTime === 0) {
        currentTime = globalTimeRange.max || Date.now() / 1000;
    }
    
    const startTime = currentTime - timeDifferential;
    
    // Configure live scroll with time differential
    liveScrollConfig.enabled = true;
    liveScrollConfig.startTime = startTime;
    liveScrollConfig.endTime = currentTime;
    liveScrollConfig.currentWindowStart = startTime;
    liveScrollConfig.currentWindowEnd = currentTime;
    liveScrollConfig.timeDifferential = timeDifferential; // Store the window size
    
    zoomConfig.enabled = false;
    
    console.log(`Switched to live scroll mode: showing last ${timeDifferential}s from current data time ${currentTime.toFixed(1)} (${startTime.toFixed(1)}-${currentTime.toFixed(1)}), scrolls by ${liveScrollConfig.scrollIncrement}s every 0.1 seconds`);
    applyViewMode();
    startLiveScrolling();
    
    // Immediately request data for the initial range
    if (pollingActive && activeSignals.size > 0) {
        const buffer = timeDifferential * 0.2;
        requestVisibleRange(Math.max(0, startTime - buffer), currentTime + buffer, 3);
    }
}

function setZoomMode(startTime, endTime) {
    viewMode = 'zoom';
    stopLiveScrolling(); // Stop any live scrolling
    
    // Configure zoom
    zoomConfig.enabled = true;
    zoomConfig.fixedStartTime = startTime;
    zoomConfig.fixedEndTime = endTime;
    
    liveScrollConfig.enabled = false;
    
    console.log(`Switched to zoom mode: fixed range ${startTime}-${endTime} (updates continue)`);
    applyViewMode();
    
    // Immediately request data for the zoom range
    if (pollingActive && activeSignals.size > 0) {
        const buffer = (endTime - startTime) * 0.1;
        requestVisibleRange(Math.max(0, startTime - buffer), endTime + buffer, 5);
    }
}

function setManualMode() {
    viewMode = 'manual';
    stopLiveScrolling(); // Stop any live scrolling
    liveScrollConfig.enabled = false;
    zoomConfig.enabled = false;
    console.log('Switched to manual mode (updates continue)');
    // Don't apply view mode here - let user control the range
    // But request data for current visible range
    if (pollingActive && activeSignals.size > 0) {
        const rng = graphDiv.layout && graphDiv.layout.xaxis && graphDiv.layout.xaxis.range;
        if (rng && rng.length >= 2) {
            const startTime = Math.max(0, Number(rng[0]) - 5);
            const endTime = Number(rng[1]) + 5;
            requestVisibleRange(startTime, endTime, 3);
        }
    }
}

function showAllData() {
    viewMode = 'showAll';
    stopLiveScrolling(); // Stop any live scrolling
    liveScrollConfig.enabled = false;
    zoomConfig.enabled = false;
    console.log('Switched to show all data mode (updates continue)');
    applyViewMode();
    // Immediately request all data
    if (pollingActive && activeSignals.size > 0) {
        const now = globalTimeRange.max || Date.now() / 1000;
        requestVisibleRange(Math.max(0, globalTimeRange.min - 5), now + 5, 2);
    }
}

// Export functions for use in other files
window.graphView = {
    addSignal,
    removeSignal,
    startPolling,
    stopPolling,
    setLiveMode,
    setLiveScrollMode,
    setZoomMode,
    setManualMode,
    showAllData
};

// Debug logging
console.log('graph_view.js loaded successfully');
console.log('graphDiv element found:', !!graphDiv);
console.log('window.graphView exported:', !!window.graphView);
console.log(`Polling interval: ${POLLING_INTERVAL}ms (${1000/POLLING_INTERVAL} updates/second)`);
console.log('View mode:', viewMode, '- Live updates enabled:', liveUpdatesEnabled);
